const express = require("express");
const router = express.Router();

const {
  createCategory,
  getAllCategories,
  deleteCategory,
} = require("../controllers/categoryController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// public
router.get("/", getAllCategories);

// admin
router.post("/", protect, authorizeRoles("admin"), createCategory);
router.delete("/:id", protect, authorizeRoles("admin"), deleteCategory);

module.exports = router;
