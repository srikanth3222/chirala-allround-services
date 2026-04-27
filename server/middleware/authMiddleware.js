const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    let token;

    // get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // if no token
    if (!token) {
      return res.status(401).json({
        message: "Not authorized, no token",
      });
    }

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // get user
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        message: "Your account is suspended. Contact admin.",
      });
    }

    req.user = user;

    next();

  } catch (error) {
    console.error("Auth middleware error");
    return res.status(401).json({
      message: "Not authorized, token failed",
    });
  }
};