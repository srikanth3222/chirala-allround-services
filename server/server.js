const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const { protect } = require("./middleware/authMiddleware");

const http = require("http");
const { initSocket } = require("./socket");

dotenv.config();
connectDB();

const app = express();

// CORS config — uses CLIENT_URL from .env
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
  : ["https://chirala-allround-services.vercel.app,https://chirala-allround-services-nq01a9bpw-srikanth3222s-projects.vercel.app,http://localhost:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Global rate limit — 200 req per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
}));

// Strict rate limit for auth routes — 15 req per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: "Too many auth attempts, please try again later." },
});

app.use(express.json());

// Serve uploaded files
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// routes
app.use("/api/v1/auth", authLimiter, require("./routes/authRoutes"));
app.use("/api/v1/services", require("./routes/serviceRoutes"));
app.use("/api/v1/bookings", require("./routes/bookingRoutes"));
app.use("/api/v1/categories", require("./routes/categoryRoutes"));
app.use("/api/v1/ratings", require("./routes/ratingRoutes"));
app.use("/api/v1/notifications", require("./routes/notificationRoutes"));

// protected route
app.get("/api/v1/protected", protect, (req, res) => {
  res.json({
    message: "You are authorized",
    user: req.user,
  });
});

app.get("/", (req, res) => {
  res.send("API Running");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
  const status = err.status || 500;
  res.status(status).json({
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// CREATE SERVER
const server = http.createServer(app);

// INIT SOCKET (pass allowed origins)
initSocket(server, allowedOrigins);

// START SERVER
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS allowed: ${allowedOrigins.join(", ")}`);
});