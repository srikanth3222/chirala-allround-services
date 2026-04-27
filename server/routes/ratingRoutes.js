const express = require("express");
const router = express.Router();

const {
  createRating,
  getServiceRatings,
  checkRating,
  getLatestReviews,
} = require("../controllers/ratingController");

const { protect } = require("../middleware/authMiddleware");

// Public
router.get("/latest", getLatestReviews);
router.get("/service/:serviceId", getServiceRatings);

// Protected - create rating & check if rated
router.post("/", protect, createRating);
router.get("/check/:bookingId", protect, checkRating);

module.exports = router;
