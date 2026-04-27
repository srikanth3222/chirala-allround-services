const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      match: [/^\+91\d{10}$/, "Please use a valid mobile number (+91XXXXXXXXXX)"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["customer", "provider", "admin"],
      default: "customer",
    },

    category: {
      type: String,
   },
    status: {
      type: String,
      enum: ["active", "suspended"],
    default: "active",
   },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    // Optional email
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    // Saved address for quick booking
    address: {
      fullAddress: { type: String, default: "" },
      area: { type: String, default: "" },
      landmark: { type: String, default: "" },
    },
    // Wallet / Cashback
    wallet: {
      balance: { type: Number, default: 0 },
      transactions: [
        {
          type: { type: String, enum: ["credit", "debit"], required: true },
          amount: { type: Number, required: true },
          description: { type: String, default: "" },
          date: { type: Date, default: Date.now },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);