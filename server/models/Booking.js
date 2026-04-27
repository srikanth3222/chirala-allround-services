const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    date: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "provider_requested", "confirmed", "completed", "cancelled"],
      default: "pending",
    },

    // ── Location & Notes ──
    address: {
      fullAddress: { type: String, default: "" },
      area: { type: String, default: "" },
      landmark: { type: String, default: "" },
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      isProvided: { type: Boolean, default: false },
    },
    notes: {
      type: String,
      default: "",
    },

    // ── Real-time Service Status ──
    serviceStatus: {
      type: String,
      enum: [
        "confirmed",
        "provider_assigned",
        "on_the_way",
        "arrived",
        "in_progress",
        "completed",
      ],
      default: "confirmed",
    },

    cancelledBy: {
      type: String,
      enum: ["customer", "admin"],
    },
    rescheduleRequest: {
      requestedBy: {
        type: String,
        enum: ["customer", "admin"],
      },
      newDate: Date,
      newTimeSlot: String,
      reason: String,
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
      },
    },
    completionOtp: {
      type: String,
    },
    completionOtpExpiry: {
      type: Date,
    },
    completionOtpVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Performance indexes
bookingSchema.index({ status: 1 });
bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ date: -1 });
bookingSchema.index({ createdAt: -1 });

bookingSchema.virtual("rating", {
  ref: "Rating",
  localField: "_id",
  foreignField: "booking",
  justOne: true,
});

bookingSchema.set("toJSON", { virtuals: true });
bookingSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Booking", bookingSchema);