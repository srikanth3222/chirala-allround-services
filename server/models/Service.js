const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true
    },
    title: {
      en: { type: String, required: true },
      te: { type: String, default: "" },
    },
    description: {
      en: { type: String, default: "" },
      te: { type: String, default: "" },
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Rich content fields
    backgroundImage: {
      type: String,
      default: "",
    },
    images: [{ type: String }],
    videos: [{ type: String }],
    details: {
      en: { type: String, default: "" },
      te: { type: String, default: "" },
    },
    faq: [
      {
        question_en: { type: String, default: "" },
        answer_en: { type: String, default: "" },
        question_te: { type: String, default: "" },
        answer_te: { type: String, default: "" },
      },
    ],
    // Keywords for smart search
    keywords: {
      type: [String],
      default: [],
    },
    // Custom SEO Overrides
    seoTitle: {
      en: { type: String, default: "" },
      te: { type: String, default: "" },
    },
    seoDescription: {
      en: { type: String, default: "" },
      te: { type: String, default: "" },
    },
    // Featured service
    isFeatured: {
      type: Boolean,
      default: false,
    },
    // Cached rating data
    avgRating: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);