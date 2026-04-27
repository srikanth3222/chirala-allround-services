/**
 * Smart Search Controller
 * Uses Fuse.js for fuzzy matching + keyword expansion for synonym-aware search.
 */

const Fuse = require("fuse.js");
const Service = require("../models/Service");
const { expandKeywords } = require("../utils/keywordExpander");

// Fuse.js configuration
const FUSE_OPTIONS = {
  keys: [
    { name: "title.en", weight: 0.35 },
    { name: "keywords", weight: 0.3 },
    { name: "title.te", weight: 0.2 },
    { name: "description.en", weight: 0.2 },
    { name: "description.te", weight: 0.1 },
    { name: "category", weight: 0.15 },
  ],
  threshold: 0.4,          // 0 = exact match, 1 = match anything
  distance: 200,           // how far to search from expected position
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,     // for frontend highlight support
  shouldSort: true,
  findAllMatches: true,
  ignoreLocation: true,     // search entire string, not just beginning
};

/**
 * GET /api/v1/services/search?q=keyword
 * Smart search with fuzzy matching + keyword expansion
 */
exports.smartSearch = async (req, res) => {
  try {
    const { q } = req.query;

    // Handle empty query
    if (!q || !q.trim()) {
      return res.status(200).json({
        success: true,
        query: "",
        expandedKeywords: [],
        count: 0,
        data: [],
      });
    }

    const query = q.trim();

    // Step 1: Expand keywords with synonyms
    const expandedKeywords = expandKeywords(query);

    // Step 2: Fetch matched services from DB (lean for performance)
    const regex = new RegExp(query, 'i');
    const dbFilter = {
      $or: [
        { "title.en": regex },
        { "title.te": regex },
        { "description.en": regex },
        { "description.te": regex },
        { keywords: { $in: expandedKeywords } }
      ]
    };

    const matchedServices = await Service.find(dbFilter)
      .populate("provider", "name mobile")
      .lean();

    if (!matchedServices.length) {
      return res.status(200).json({
        success: true,
        query,
        expandedKeywords,
        count: 0,
        data: [],
      });
    }

    // Step 3: Run Fuse.js search for each expanded keyword for ranking and highlighting
    const fuse = new Fuse(matchedServices, FUSE_OPTIONS);

    // Collect results from all expanded keywords
    const resultMap = new Map(); // serviceId -> { item, bestScore, matches }

    expandedKeywords.forEach((keyword) => {
      const fuseResults = fuse.search(keyword);

      fuseResults.forEach((result) => {
        const id = result.item._id.toString();
        const existing = resultMap.get(id);

        if (!existing || result.score < existing.bestScore) {
          resultMap.set(id, {
            item: result.item,
            bestScore: result.score,
            matches: result.matches || [],
          });
        }
      });
    });

    // Step 4: Sort by best score (lower = better match) and limit
    const ranked = Array.from(resultMap.values())
      .sort((a, b) => a.bestScore - b.bestScore)
      .slice(0, 20); // Top 20 results

    // Step 5: Format response with match info for highlighting
    const data = ranked.map((r) => ({
      ...r.item,
      _searchScore: Math.round((1 - r.bestScore) * 100), // 0-100 relevance
      _matchedFields: [...new Set(r.matches.map((m) => m.key))],
    }));

    return res.status(200).json({
      success: true,
      query,
      expandedKeywords,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Smart search error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};
