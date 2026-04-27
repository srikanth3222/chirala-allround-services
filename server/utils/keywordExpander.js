/**
 * Keyword Expansion Utility
 * Maps user search terms to related synonyms for broader, smarter search results.
 * Add new mappings as your service catalog grows.
 */

const keywordMap = {
  // Plumbing / Water related
  plumber: ["plumbing", "pipe", "leak", "tap", "drain", "water", "faucet", "toilet"],
  plumbing: ["plumber", "pipe", "leak", "tap", "drain", "water", "faucet"],
  pipe: ["plumbing", "plumber", "leak", "drain"],
  leak: ["plumbing", "plumber", "pipe", "water", "tap"],
  tap: ["plumbing", "plumber", "faucet", "water"],
  drain: ["plumbing", "plumber", "pipe", "clog", "blockage"],

  // Cleaning
  cleaning: ["clean", "deep cleaning", "home cleaning", "floor", "kitchen", "bathroom", "wash", "mop", "sweep"],
  clean: ["cleaning", "deep cleaning", "home cleaning", "wash"],
  "deep cleaning": ["cleaning", "home cleaning", "floor", "kitchen", "bathroom"],
  "home cleaning": ["cleaning", "deep cleaning", "house", "floor", "kitchen"],

  // Electrical
  electrician: ["electrical", "wiring", "switch", "fan", "light", "socket", "circuit"],
  electrical: ["electrician", "wiring", "switch", "fan", "light", "socket"],
  wiring: ["electrician", "electrical", "switch", "circuit"],

  // Beauty / Makeup
  makeup: ["bridal makeup", "beauty", "salon", "marriage", "facial", "bridal", "parlour"],
  beauty: ["makeup", "salon", "facial", "bridal makeup", "parlour", "spa"],
  bridal: ["bridal makeup", "makeup", "beauty", "wedding", "mehendi"],
  "bridal makeup": ["makeup", "bridal", "beauty", "wedding"],
  salon: ["beauty", "makeup", "haircut", "facial", "parlour"],
  facial: ["beauty", "salon", "skin", "spa", "parlour"],

  // Painting
  painting: ["painter", "paint", "wall", "interior", "exterior", "colour", "color"],
  painter: ["painting", "paint", "wall", "interior", "exterior"],
  paint: ["painting", "painter", "wall", "colour", "color"],

  // Carpentry
  carpenter: ["carpentry", "wood", "furniture", "door", "cabinet", "shelf"],
  carpentry: ["carpenter", "wood", "furniture", "door", "cabinet"],
  furniture: ["carpenter", "carpentry", "wood", "table", "chair", "sofa"],

  // AC / Appliance
  ac: ["air conditioner", "cooling", "ac repair", "ac service", "hvac"],
  "ac repair": ["ac", "air conditioner", "cooling", "ac service"],
  "ac service": ["ac", "air conditioner", "ac repair"],

  // Pest Control
  pest: ["pest control", "cockroach", "termite", "ant", "mosquito", "bug"],
  "pest control": ["pest", "cockroach", "termite", "ant", "mosquito"],

  // Events / Catering
  catering: ["food", "cooking", "event", "party", "function", "wedding"],
  event: ["events", "party", "function", "wedding", "decoration", "catering"],
  events: ["event", "party", "function", "wedding", "decoration"],
  wedding: ["bridal", "event", "decoration", "catering", "mehendi", "function"],
  decoration: ["event", "wedding", "party", "function", "flower"],

  // General Home
  repair: ["fix", "service", "maintenance", "broken"],
  fix: ["repair", "service", "maintenance", "broken"],
  service: ["repair", "fix", "maintenance"],
  home: ["house", "home cleaning", "home repair", "domestic"],

  // Telugu keywords (common search terms)
  "ప్లంబింగ్": ["plumbing", "plumber", "pipe", "leak"],
  "శుభ్రపరచడం": ["cleaning", "clean", "home cleaning"],
  "విద్యుత్": ["electrician", "electrical", "wiring"],
};

/**
 * Expands a search query into an array of related keywords.
 * @param {string} query - The user's raw search input
 * @returns {string[]} Array of unique expanded keywords
 */
function expandKeywords(query) {
  if (!query || typeof query !== "string") return [];

  const normalized = query.trim().toLowerCase();
  const words = normalized.split(/\s+/);

  const expanded = new Set();
  // Always include the original query and its words
  expanded.add(normalized);
  words.forEach((w) => expanded.add(w));

  // Check full query match first
  if (keywordMap[normalized]) {
    keywordMap[normalized].forEach((syn) => expanded.add(syn.toLowerCase()));
  }

  // Then check each individual word
  words.forEach((word) => {
    if (keywordMap[word]) {
      keywordMap[word].forEach((syn) => expanded.add(syn.toLowerCase()));
    }
  });

  return Array.from(expanded);
}

module.exports = { expandKeywords, keywordMap };
