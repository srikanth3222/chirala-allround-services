const express = require("express");
const router = express.Router();

const {
  createBooking,
  getMyBookings,
  getProviderBookings,
  getAllBookings,
  confirmBooking,
  generateCompletionOtp,
  verifyCompletionOtp,
  cancelBooking,
  requestReschedule,
  adminReschedule,
  rescheduleResponse,
  adminRescheduleDecision,
  updateServiceStatus,
  acceptBooking,
  declineBooking,
} = require("../controllers/bookingController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// admin routes
router.get("/", protect, authorizeRoles("admin"), getAllBookings);
router.put("/:id/confirm", protect, authorizeRoles("admin"), confirmBooking);
router.put("/:id/admin-reschedule", protect, authorizeRoles("admin"), adminReschedule);
router.put("/:id/admin-reschedule-decision", protect, authorizeRoles("admin"), adminRescheduleDecision);

// customer
router.post("/", protect, createBooking);
router.get("/my", protect, getMyBookings);
router.put("/:id/cancel", protect, cancelBooking);
router.put("/:id/reschedule-request", protect, requestReschedule);
router.put("/:id/reschedule-response", protect, rescheduleResponse);

// provider
router.get("/provider", protect, authorizeRoles("provider"), getProviderBookings);
router.post("/:id/generate-completion-otp", protect, authorizeRoles("provider"), generateCompletionOtp);
router.post("/:id/verify-completion-otp", protect, authorizeRoles("provider"), verifyCompletionOtp);
router.put("/:id/update-status", protect, authorizeRoles("provider"), updateServiceStatus);
router.put("/:id/accept", protect, authorizeRoles("provider"), acceptBooking);
router.put("/:id/decline", protect, authorizeRoles("provider"), declineBooking);

module.exports = router;