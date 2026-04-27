const Category = require("../models/Category");

// Create subcategory
exports.createCategory = async (req, res) => {
  try {
    const { name, mainCategory, icon } = req.body;

    // Support both multilingual object and legacy flat string
    const nameObj = typeof name === "object" ? name : { en: name, te: "" };

    if (!nameObj.en || !mainCategory) {
      return res.status(400).json({
        message: "Name (English) and main category are required",
      });
    }

    const existing = await Category.findOne({
      "name.en": { $regex: new RegExp(`^${nameObj.en}$`, "i") },
      mainCategory,
    });

    if (existing) {
      return res.status(400).json({
        message: "This category already exists",
      });
    }

    const category = await Category.create({
      name: nameObj,
      mainCategory,
      icon: icon || "🔧",
    });

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Server error",
    });
  }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({
      mainCategory: 1,
      "name.en": 1,
    });

    res.status(200).json({
      count: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    await category.deleteOne();

    res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
