const Booking = require("../models/Booking");
const Service = require("../models/Service");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const Notification = require("../models/Notification");
const { getIO, onlineProviders, onlineCustomers, onlineAdmins } = require("../socket");
const { sendOtpSMS } = require("../utils/sendOtp");


// Create Booking (pending — no provider assigned yet)

exports.createBooking = async (req, res) => {
  try {
    const { serviceId, date, timeSlot, address, location, notes } = req.body;

    if (!serviceId || !date || !timeSlot) {
      return res.status(400).json({
        message: "Service, date and timeSlot are required",
      });
    }

    if (!address || !address.fullAddress?.trim() || !address.area?.trim()) {
      return res.status(400).json({
        message: "Full Address and Area are required",
      });
    }

    // get service
    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    // Prevent duplicate booking by same user on same date
    const existingBooking = await Booking.findOne({
      service: serviceId,
      customer: req.user._id,
      date: new Date(date),
    });

    if (existingBooking) {
      return res.status(400).json({
        message: "You have already booked this service on this date",
      });
    }

    // Create booking as pending
    const booking = await Booking.create({
      service: service._id,
      customer: req.user._id,
      date,
      timeSlot,
      address: {
        fullAddress: address.fullAddress.trim(),
        area: address.area.trim(),
        landmark: address.landmark?.trim() || "",
      },
      location: {
        lat: location?.lat,
        lng: location?.lng,
        isProvided: location?.isProvided || false,
      },
      notes: notes?.trim() || "",
      status: "pending",
    });

    // Notify all admins via DB
    await notifyAdmins(
      "New Booking Placed",
      "A customer has placed a new booking. Please assign a provider.",
      "general",
      booking._id
    );

    // Notify all online admins about the new booking in real-time
    try {
      const io = getIO();
      const { onlineAdmins } = require("../socket");
      Object.values(onlineAdmins).forEach((socketId) => {
        io.to(socketId).emit("newBooking", {
          message: "A new booking has been placed!",
          booking,
        });
      });
    } catch (socketErr) {
      console.error("Socket emit error:", socketErr);
    }

    res.status(201).json({
      message: "Booking submitted! Please wait while we find the best provider for you.",
      booking,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Server error",
    });
  }
};

// Confirm Booking — Admin assigns a provider (sends request, does NOT auto-confirm)
exports.confirmBooking = async (req, res) => {
  try {
    const { providerId } = req.body;
    const bookingId = req.params.id;

    if (!providerId) {
      return res.status(400).json({
        message: "Provider ID is required",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        message: "Only pending bookings can have a provider assigned",
      });
    }

    // Validate provider
    const provider = await User.findOne({
      _id: providerId,
      role: "provider",
      status: "active",
    });

    if (!provider) {
      return res.status(400).json({
        message: "Provider not found or not active",
      });
    }

    // Check if provider already has a confirmed OR pending-request booking on that date
    const providerConflict = await Booking.findOne({
      provider: providerId,
      date: booking.date,
      status: { $in: ["confirmed", "provider_requested"] },
    });

    if (providerConflict) {
      return res.status(400).json({
        message: "This provider is already booked or has a pending request on this date. Choose another.",
      });
    }

    // Assign provider — status becomes provider_requested (waiting for provider acceptance)
    booking.provider = providerId;
    booking.status = "provider_requested";
    booking.serviceStatus = "provider_assigned";
    await booking.save({ validateModifiedOnly: true });

    // Create notification for provider
    await Notification.create({
      user: providerId,
      title: "New Job Request",
      message: `You have been requested for a new booking: ${booking.service?.title || 'Service'}. Please accept or decline.`,
      type: "booking_confirmed",
      relatedId: booking._id,
    });

    // Notify provider via socket — they will see it in their "New Requests" section
    const io = getIO();
    const providerSocket = onlineProviders[provider._id.toString()];

    if (providerSocket) {
      io.to(providerSocket).emit("newBooking", {
        message: "New job request assigned to you — please accept or decline",
        booking,
      });
    }

    res.status(200).json({
      message: "Job request sent to provider. Waiting for provider acceptance.",
      booking,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Server error",
    });
  }
};

// Get My Bookings
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      customer: req.user._id,
    })
      .populate("service")
      .populate("provider", "name mobile")
      .populate("rating")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: bookings.length,
      bookings,
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get Provider Bookings
exports.getProviderBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      provider: req.user._id,
      status: { $in: ["provider_requested", "confirmed", "completed", "cancelled"] },
    })
      .populate("service")
      .populate("customer", "name mobile")
      .populate("rating")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: bookings.length,
      bookings: bookings,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Accept Job Request — Provider accepts a provider_requested booking
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("service")
      .populate("customer", "name mobile");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "provider_requested") {
      return res.status(400).json({
        message: "Only pending job requests can be accepted",
      });
    }

    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not assigned to this booking",
      });
    }

    booking.status = "confirmed";
    booking.serviceStatus = "provider_assigned";
    await booking.save({ validateModifiedOnly: true });

    // Create notification for customer
    await Notification.create({
      user: booking.customer._id,
      title: "Booking Confirmed",
      message: `Your booking for ${booking.service?.title} has been confirmed.`,
      type: "booking_confirmed",
      relatedId: booking._id,
    });

    // Notify customer via socket
    const io = getIO();
    const customerSocket = onlineCustomers[booking.customer._id.toString()];
    if (customerSocket) {
      io.to(customerSocket).emit("bookingConfirmed", {
        message: "Your booking has been confirmed by the provider!",
        booking,
      });
    }

    // Notify all online admins
    for (const adminId in onlineAdmins) {
      io.to(onlineAdmins[adminId]).emit("bookingAccepted", {
        message: `Provider accepted booking`,
        booking,
      });
    }

    await notifyAdmins(
      "Provider Accepted Job",
      `A provider has accepted the job request for ${booking.service?.title}.`,
      "general",
      booking._id
    );

    res.status(200).json({
      message: "Job accepted! Booking is now confirmed.",
      booking,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Decline Job Request — Provider declines, booking returns to pending for reassignment
exports.declineBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "provider_requested") {
      return res.status(400).json({
        message: "Only pending job requests can be declined",
      });
    }

    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not assigned to this booking",
      });
    }

    // Return to pending so admin can reassign
    booking.status = "pending";
    booking.provider = undefined;
    booking.serviceStatus = "confirmed"; // reset to default
    await booking.save({ validateModifiedOnly: true });

    // Notify all online admins so they can reassign
    const io = getIO();
    for (const adminId in onlineAdmins) {
      io.to(onlineAdmins[adminId]).emit("bookingDeclined", {
        message: `Provider declined the job request — needs reassignment`,
        booking,
      });
    }

    await notifyAdmins(
      "Provider Declined Job",
      "A provider has declined the job request. The booking is back to pending.",
      "general",
      booking._id
    );

    res.status(200).json({
      message: "Job declined. The booking is back in the pending queue.",
      booking,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};


// Get All Bookings (Admin)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("customer", "name mobile")
      .populate("provider", "name mobile")
      .populate("service", "title category price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: bookings.length,
      bookings,
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Generate Completion OTP — provider triggers, OTP sent to customer
exports.generateCompletionOtp = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("customer", "mobile"); // need mobile for SMS

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({
        message: "Only confirmed bookings can be completed",
      });
    }

    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not assigned to this booking",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    booking.completionOtp = hashedOtp;
    booking.completionOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    booking.completionOtpVerified = false;
    await booking.save({ validateModifiedOnly: true });

    // 📱 Send OTP to customer via SMS (Fast2SMS)
    try {
      await sendOtpSMS(booking.customer.mobile, otp);
    } catch (smsErr) {
      console.error("[generateCompletionOtp] SMS delivery failed:", smsErr.message);
      return res.status(500).json({ message: "Failed to send OTP. Please try again." });
    }

    // Also notify customer via socket in real-time
    const io = getIO();
    const customerId = booking.customer?._id?.toString();
    const customerSocket = onlineCustomers[customerId];

    if (customerSocket) {
      io.to(customerSocket).emit("otpGenerated", {
        bookingId: booking._id,
        otp,
      });
    }

    res.status(200).json({
      message: "OTP sent to customer via SMS. Ask the customer for the code.",
      ...(process.env.NODE_ENV !== "production" && { devOtp: otp }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Verify Completion OTP — provider submits OTP, booking completed if valid
exports.verifyCompletionOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({
        message: "Only confirmed bookings can be completed",
      });
    }

    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not assigned to this booking",
      });
    }

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    if (!booking.completionOtp || !booking.completionOtpExpiry) {
      return res.status(400).json({
        message: "No completion OTP requested. Generate one first.",
      });
    }

    // Check expiry
    if (new Date() > booking.completionOtpExpiry) {
      booking.completionOtp = undefined;
      booking.completionOtpExpiry = undefined;
      await booking.save({ validateModifiedOnly: true });
      return res.status(400).json({
        message: "OTP expired. Please generate a new one.",
      });
    }

    // Verify hashed OTP
    const isMatch = await bcrypt.compare(otp, booking.completionOtp);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark as completed + clear OTP
    booking.status = "completed";
    booking.completionOtpVerified = true;
    booking.completionOtp = undefined;
    booking.completionOtpExpiry = undefined;
    await booking.save({ validateModifiedOnly: true });

    // Create notification for customer
    await Notification.create({
      user: booking.customer,
      title: "Service Completed",
      message: `Your service for booking has been successfully completed.`,
      type: "service_update",
      relatedId: booking._id,
    });

    // Create notification for provider
    await Notification.create({
      user: booking.provider,
      title: "Job Completed",
      message: `You have successfully completed the service job.`,
      type: "service_update",
      relatedId: booking._id,
    });

    // Notify customer & provider via socket
    const io = getIO();
    const customerSocket = onlineCustomers[booking.customer.toString()];
    const providerSocket = onlineProviders[booking.provider.toString()];

    if (customerSocket) {
      io.to(customerSocket).emit("bookingCompleted", {
        message: "Your service has been completed!",
        booking,
      });
    }

    if (providerSocket) {
      io.to(providerSocket).emit("bookingCompleted", {
        message: "Booking completed successfully!",
        booking,
      });
    }

    res.status(200).json({
      message: "Booking completed successfully!",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Cancel Booking — Customer cancels pending or confirmed booking
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "This is not your booking" });
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        message: "Only pending or confirmed bookings can be cancelled",
      });
    }

    booking.status = "cancelled";
    booking.cancelledBy = "customer";
    await booking.save({ validateModifiedOnly: true });

    // Notify provider if one was assigned
    if (booking.provider) {
      await Notification.create({
        user: booking.provider,
        title: "Booking Cancelled",
        message: "A customer has cancelled their booking with you.",
        type: "general",
        relatedId: booking._id,
      });

      const io = getIO();
      const providerSocket = onlineProviders[booking.provider.toString()];
      if (providerSocket) {
        io.to(providerSocket).emit("bookingCancelled", {
          message: "A booking has been cancelled by the customer",
          booking,
        });
      }
    }

    await notifyAdmins(
      "Booking Cancelled",
      "A customer has cancelled their booking.",
      "general",
      booking._id
    );

    res.status(200).json({ message: "Booking cancelled", booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Customer requests reschedule
exports.requestReschedule = async (req, res) => {
  try {
    const { newDate, newTimeSlot, reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "This is not your booking" });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({
        message: "Only confirmed bookings can be rescheduled",
      });
    }

    if (!newDate || !newTimeSlot) {
      return res.status(400).json({
        message: "New date and time slot are required",
      });
    }

    booking.rescheduleRequest = {
      requestedBy: "customer",
      newDate,
      newTimeSlot,
      reason: reason || "",
      status: "pending",
    };
    await booking.save({ validateModifiedOnly: true });

    res.status(200).json({
      message: "Reschedule request submitted",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Admin proposes reschedule to customer
exports.adminReschedule = async (req, res) => {
  try {
    const { newDate, newTimeSlot, reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        message: "Only pending or confirmed bookings can be rescheduled",
      });
    }

    if (!newDate || !newTimeSlot) {
      return res.status(400).json({
        message: "New date and time slot are required",
      });
    }

    booking.rescheduleRequest = {
      requestedBy: "admin",
      newDate,
      newTimeSlot,
      reason: reason || "",
      status: "pending",
    };
    await booking.save({ validateModifiedOnly: true });

    // Create notification for customer
    await Notification.create({
      user: booking.customer,
      title: "Reschedule Proposed",
      message: `An admin has proposed a new time for your booking. Please review.`,
      type: "reschedule_request",
      relatedId: booking._id,
    });

    // Notify customer via socket
    const io = getIO();
    const customerSocket = onlineCustomers[booking.customer.toString()];
    if (customerSocket) {
      io.to(customerSocket).emit("rescheduleProposed", {
        message: "Admin has proposed rescheduling your booking",
        booking,
      });
    }

    res.status(200).json({
      message: "Reschedule proposal sent to customer",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Customer responds to admin's reschedule proposal
exports.rescheduleResponse = async (req, res) => {
  try {
    const { accept } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "This is not your booking" });
    }

    if (
      !booking.rescheduleRequest ||
      booking.rescheduleRequest.requestedBy !== "admin" ||
      booking.rescheduleRequest.status !== "pending"
    ) {
      return res.status(400).json({
        message: "No pending reschedule proposal from admin",
      });
    }

    if (accept) {
      booking.date = booking.rescheduleRequest.newDate;
      booking.timeSlot = booking.rescheduleRequest.newTimeSlot;
      booking.rescheduleRequest.status = "accepted";
    } else {
      booking.rescheduleRequest.status = "rejected";
    }

    await booking.save({ validateModifiedOnly: true });

    res.status(200).json({
      message: accept
        ? "Reschedule accepted — booking updated"
        : "Reschedule rejected — original booking kept",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Admin responds to customer's reschedule request
exports.adminRescheduleDecision = async (req, res) => {
  try {
    const { accept } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (
      !booking.rescheduleRequest ||
      booking.rescheduleRequest.requestedBy !== "customer" ||
      booking.rescheduleRequest.status !== "pending"
    ) {
      return res.status(400).json({
        message: "No pending reschedule request from customer",
      });
    }

    if (accept) {
      booking.date = booking.rescheduleRequest.newDate;
      booking.timeSlot = booking.rescheduleRequest.newTimeSlot;
      booking.rescheduleRequest.status = "accepted";
    } else {
      booking.rescheduleRequest.status = "rejected";
    }

    await booking.save({ validateModifiedOnly: true });

    // Create notification for customer
    await Notification.create({
      user: booking.customer,
      title: accept ? "Reschedule Approved" : "Reschedule Rejected",
      message: accept 
        ? "Your request to reschedule has been approved by the admin."
        : "Your request to reschedule has been rejected.",
      type: "reschedule_request",
      relatedId: booking._id,
    });

    // Notify customer via socket
    const io = getIO();
    const customerSocket = onlineCustomers[booking.customer.toString()];
    if (customerSocket) {
      io.to(customerSocket).emit("rescheduleDecided", {
        message: accept
          ? "Your reschedule request has been accepted!"
          : "Your reschedule request was rejected",
        accepted: accept,
        booking,
      });
    }

    res.status(200).json({
      message: accept
        ? "Reschedule approved — booking updated"
        : "Reschedule rejected",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Update Service Status (Provider — real-time tracking)
exports.updateServiceStatus = async (req, res) => {
  try {
    const { serviceStatus } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not assigned to this booking",
      });
    }

    if (["cancelled", "completed"].includes(booking.status)) {
      return res.status(400).json({
        message: "Cannot update status of cancelled or completed booking",
      });
    }

    const allowedStatuses = [
      "on_the_way",
      "arrived",
      "in_progress",
    ];

    if (!allowedStatuses.includes(serviceStatus)) {
      return res.status(400).json({
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
      });
    }

    booking.serviceStatus = serviceStatus;
    await booking.save({ validateModifiedOnly: true });

    // Format human readable status
    const statusText = serviceStatus.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Create notification for customer
    await Notification.create({
      user: booking.customer,
      title: "Service Update",
      message: `Your service provider is now: ${statusText}.`,
      type: "service_update",
      relatedId: booking._id,
    });

    // Notify customer via socket
    const io = getIO();
    const customerSocket = onlineCustomers[booking.customer.toString()];

    if (customerSocket) {
      io.to(customerSocket).emit("serviceStatusUpdated", {
        bookingId: booking._id,
        serviceStatus,
      });
    }

    // Notify all online admins
    for (const adminId in onlineAdmins) {
      io.to(onlineAdmins[adminId]).emit("serviceStatusUpdated", {
        bookingId: booking._id,
        serviceStatus,
      });
    }

    res.status(200).json({
      message: `Status updated to ${serviceStatus}`,
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Helper to notify all admins
const notifyAdmins = async (title, message, type, relatedId) => {
  try {
    const User = require('../models/User');
    const Notification = require('../models/Notification');
    const admins = await User.find({ role: 'admin' }).select('_id');
    const notifications = admins.map(admin => ({
      user: admin._id,
      title,
      message,
      type,
      relatedId
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.error("Failed to notify admins:", err);
  }
};
