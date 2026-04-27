const express = require("express");
const router = express.Router();
const { getMyNotifications, markAsRead, markAllAsRead } = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

// All notification routes are protected
router.use(protect);

router.get("/my", getMyNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);

module.exports = router;
