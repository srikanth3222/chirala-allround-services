const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getAllUsers,
  getAllProviders,
  getAllAdmins,
  updateProviderStatus,
  sendOTP,
  verifyOTPResetPassword,
  sendLoginOTP,
  verifyLoginOTP,
  getMyProfile,
  updateMyProfile,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// OTP routes (public)
router.post("/send-otp", sendOTP);
router.post("/verify-otp-reset", verifyOTPResetPassword);
router.post("/send-login-otp", sendLoginOTP);
router.post("/verify-login-otp", verifyLoginOTP);

// profile routes (protected)
router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateMyProfile);

// admin routes
router.get("/users", protect, authorizeRoles("admin"), getAllUsers);
router.get("/providers", protect, authorizeRoles("admin"), getAllProviders);
router.get("/admins", protect, authorizeRoles("admin"), getAllAdmins);
router.put("/providers/:id/status", protect, authorizeRoles("admin"), updateProviderStatus);

module.exports = router;