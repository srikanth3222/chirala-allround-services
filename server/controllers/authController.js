const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOtpSMS } = require("../utils/sendOtp");

// mobile validation (+91 format)
const isValidMobile = (mobile) => {
  return /^\+91\d{10}$/.test(mobile);
};

exports.registerUser = async (req, res) => {
  try {
    const { name, mobile, password, role, category } = req.body;

// basic validation
if (!name || !mobile || !password) {
  return res.status(400).json({
    message: "Name, mobile and password are required",
  });
}

// 🔥 provider-specific validation
if (role === "provider" && !category) {
  return res.status(400).json({
    message: "Category is required for providers",
  });
}

    if (!isValidMobile(mobile)) {
      return res.status(400).json({
        message: "Mobile must be in +91XXXXXXXXXX format",
      });
    }

    // check if user exists
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({
        message: "Mobile number already registered",
      });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create user
    const user = await User.create({
      name,
      mobile,
      password: hashedPassword,
      role,
      category: role === "provider" ? category : undefined,
    });

    // generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    // validation
    if (!mobile || !password) {
      return res.status(400).json({
        message: "Mobile and password are required",
      });
    }

    // find user
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }
     // 🔥 suspension check
    if (user.status === "suspended") {
       return res.status(403).json({
        message: "Your account is suspended",
    });
}
    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get All Users (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "customer" }).select("-password");

    res.status(200).json({
      count: users.length,
      users,
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get All Providers
exports.getAllProviders = async (req, res) => {
  try {
    const providers = await User.find({
      role: "provider",
    }).select("-password");

    res.status(200).json({
      count: providers.length,
      providers,
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get All Admins
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("-password");

    res.status(200).json({
      count: admins.length,
      admins,
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Suspend or Activate Provider (Admin)
exports.updateProviderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user || user.role !== "provider") {
      return res.status(404).json({
        message: "Provider not found",
      });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      message: `Provider ${status} successfully`,
      user,
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

// ============================
// OTP FUNCTIONS
// ============================

// Helper: generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP for password reset
exports.sendOTP = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "No account found with this mobile number" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Your account is suspended" });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    // 📱 Send OTP via Fast2SMS
    try {
      await sendOtpSMS(user.mobile, otp);
    } catch (smsErr) {
      console.error("[sendOTP] SMS delivery failed:", smsErr.message);
      return res.status(500).json({ message: "Failed to send OTP. Please try again." });
    }

    res.status(200).json({
      message: "OTP sent successfully",
      ...(process.env.NODE_ENV !== "production" && { devOTP: otp }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify OTP and reset password
exports.verifyOTPResetPassword = async (req, res) => {
  try {
    const { mobile, otp, newPassword } = req.body;

    if (!mobile || !otp || !newPassword) {
      return res.status(400).json({
        message: "Mobile, OTP, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "No OTP requested. Please request a new OTP." });
    }

    if (new Date() > user.otpExpiry) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Reset password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      message: "Password reset successful! You can now login.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Send OTP for login (alternative to password)
exports.sendLoginOTP = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "No account found with this mobile number" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Your account is suspended" });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    // 📱 Send Login OTP via Fast2SMS
    try {
      await sendOtpSMS(user.mobile, otp);
    } catch (smsErr) {
      console.error("[sendLoginOTP] SMS delivery failed:", smsErr.message);
      return res.status(500).json({ message: "Failed to send OTP. Please try again." });
    }

    res.status(200).json({
      message: "OTP sent successfully",
      ...(process.env.NODE_ENV !== "production" && { devOTP: otp }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify OTP and login
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile and OTP are required" });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Your account is suspended" });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "No OTP requested" });
    }

    if (new Date() > user.otpExpiry) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================
// PROFILE FUNCTIONS
// ============================

// Get logged-in user's profile
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -otp -otpExpiry");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update logged-in user's profile address
exports.updateMyProfile = async (req, res) => {
  try {
    const { name, email, address } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name && name.trim()) user.name = name.trim();
    if (email !== undefined) user.email = email.trim();

    if (address) {
      user.address = {
        fullAddress: address.fullAddress?.trim() || "",
        area: address.area?.trim() || "",
        landmark: address.landmark?.trim() || "",
      };
    }

    await user.save({ validateModifiedOnly: true });

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        address: user.address,
        wallet: user.wallet,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};