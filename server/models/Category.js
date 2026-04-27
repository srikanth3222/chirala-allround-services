const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true, trim: true },
      te: { type: String, default: "", trim: true },
    },
    mainCategory: {
      type: String,
      enum: ["home", "personal", "events", "catering", "more"],
      required: true,
    },
    icon: {
      type: String,
      default: "🔧",
    },
  },
  { timestamps: true }
);

// Prevent duplicate subcategories within the same main category
categorySchema.index({ "name.en": 1, mainCategory: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
