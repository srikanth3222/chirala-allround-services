const express = require("express");
const router = express.Router();

const {
  createService,
  getAllServices,
  getSingleService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const { smartSearch } = require("../controllers/searchController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload");

// public routes
router.get("/search", smartSearch); // Smart search must come before /:id
router.get("/", getAllServices);
router.get("/:id", getSingleService);

// protected (with file upload)
router.post("/", protect, authorizeRoles("admin"), upload.single("backgroundImage"), createService);
router.put("/:id", protect, authorizeRoles("admin"), upload.single("backgroundImage"), updateService);
router.delete("/:id", protect, authorizeRoles("admin"), deleteService);

module.exports = router;