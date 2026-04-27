const { keywordMap } = require("./keywordExpander");

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "a", "an", "service", "services", "in", "on", "at", "to", "of", "is", "are"
]);

/**
 * Auto-generates keywords based on title, description, and category.
 * @param {Object} params
 * @param {string} params.title - Service title (English)
 * @param {string} params.description - Service description (English)
 * @param {string} params.category - Service category name
 * @returns {string[]} Array of unique, relevant keywords
 */
function generateKeywords({ title = "", description = "", category = "" }) {
  const words = [];

  // 1. Extract words from title, description, category
  const textToProcess = `${title} ${description} ${category}`.toLowerCase();
  
  // Replace punctuation with spaces and split by whitespace
  const rawWords = textToProcess.replace(/[^\w\s\u0C00-\u0C7F]/g, " ").split(/\s+/);

  rawWords.forEach((word) => {
    if (word && !STOP_WORDS.has(word) && word.length > 2) {
      words.push(word);
    }
  });

  const expanded = new Set(words);

  // 2. Add category-based keywords and synonyms using the existing keywordMap
  words.forEach((word) => {
    if (keywordMap[word]) {
      keywordMap[word].forEach((syn) => expanded.add(syn.toLowerCase()));
    }
  });

  // Check full category name as well
  const catNormalized = category.trim().toLowerCase();
  if (keywordMap[catNormalized]) {
    keywordMap[catNormalized].forEach((syn) => expanded.add(syn.toLowerCase()));
  }
  
  // Category might be "Deep Home Cleaning", we also want to check words in it
  const catWords = catNormalized.replace(/[^\w\s]/g, " ").split(/\s+/);
  catWords.forEach(word => {
    if (keywordMap[word]) {
       keywordMap[word].forEach((syn) => expanded.add(syn.toLowerCase()));
    }
  });

  return Array.from(expanded);
}

module.exports = { generateKeywords };
