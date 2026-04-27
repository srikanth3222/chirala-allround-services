/**
 * Get localized text from a multilingual field.
 * Handles both new {en, te} objects and legacy flat strings.
 * 
 * @param {object|string} field - The multilingual field (e.g., service.title)
 * @param {string} lang - Current language code ("en" or "te")
 * @returns {string} The localized string with English fallback
 */
export const getLocalizedText = (field, lang = "en") => {
  if (!field) return "";
  if (typeof field === "string") return field; // legacy flat string
  return field[lang] || field.en || "";
};
