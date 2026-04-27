const Rating = require("../models/Rating");
const Booking = require("../models/Booking");
const Service = require("../models/Service");

// Create Rating (customer only, after completion)
exports.createRating = async (req, res) => {
  try {
    const { bookingId, rating, review } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ message: "Booking ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify customer owns this booking
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only rate your own bookings" });
    }

    // Must be completed
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "You can only rate completed bookings" });
    }

    // Check if already rated
    const existingRating = await Rating.findOne({ booking: bookingId });
    if (existingRating) {
      return res.status(400).json({ message: "You have already rated this booking" });
    }

    const newRating = await Rating.create({
      booking: bookingId,
      customer: req.user._id,
      provider: booking.provider,
      service: booking.service,
      rating: Math.round(rating),
      review: review || "",
    });

    // Update service avgRating
    const serviceRatings = await Rating.find({ service: booking.service });
    const avg = serviceRatings.reduce((sum, r) => sum + r.rating, 0) / serviceRatings.length;
    await Service.findByIdAndUpdate(booking.service, {
      avgRating: Math.round(avg * 10) / 10,
      totalRatings: serviceRatings.length,
    });

    res.status(201).json({
      message: "Rating submitted successfully",
      rating: newRating,
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already rated this booking" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Get Ratings for a Service
exports.getServiceRatings = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(serviceId);
    let targetServiceId = serviceId;

    if (!isObjectId) {
      const service = await Service.findOne({ slug: serviceId });
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      targetServiceId = service._id;
    }

    const ratings = await Rating.find({ service: targetServiceId })
      .populate("customer", "name")
      .sort({ createdAt: -1 });

    // Compute average
    const avg = ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10
      : 0;

    res.status(200).json({
      count: ratings.length,
      average: avg,
      ratings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Check if a booking is already rated
exports.checkRating = async (req, res) => {
  try {
    const rating = await Rating.findOne({ booking: req.params.bookingId });
    res.status(200).json({ rated: !!rating, rating });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get latest reviews for testimonials carousel
exports.getLatestReviews = async (req, res) => {
  try {
    const ratings = await Rating.find({ review: { $ne: "" } })
      .populate("customer", "name")
      .populate("service", "title")
      .sort({ createdAt: -1 })
      .limit(15);

    res.status(200).json({ ratings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
