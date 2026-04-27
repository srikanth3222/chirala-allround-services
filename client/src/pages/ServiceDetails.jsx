import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import API from "../utils/api";
import { getLocalizedText } from "../utils/i18nHelpers";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";

const timeSlots = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

const categoryIconMap = {
  "Wasing Machine": "🧺", "AC Deep Cleaning": "❄️", "Hair Cutting": "✂️",
  "Plumbing": "🔧", "Electrical": "⚡", "Painting": "🎨",
};

const ServiceDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  // Booking state
  const [bookingDate, setBookingDate] = useState("");
  const [bookingSlot, setBookingSlot] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [userLocation, setUserLocation] = useState({ lat: null, lng: null, isProvided: false });
  const [locationLoading, setLocationLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Address selection state
  const [userProfile, setUserProfile] = useState(null);
  const [useSavedAddress, setUseSavedAddress] = useState(true);
  const [saveToProfile, setSaveToProfile] = useState(false);

  // Ratings
  const [ratings, setRatings] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    fetchService();
    fetchRatings();
    // Fetch user profile if logged in to check for saved address
    const token = localStorage.getItem("token");
    if (token) {
      API.get("/auth/me")
        .then((res) => setUserProfile(res.data.user))
        .catch(() => setUserProfile(null));
    }
  }, [slug]);

  const fetchService = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get(`/services/${slug}`);
      const fetchedService = res.data;
      
      // Auto-redirect to slug if accessed via old ID
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(slug);
      if (isObjectId && fetchedService.slug && fetchedService.slug !== slug) {
        navigate(`/services/${fetchedService.slug}`, { replace: true });
        return;
      }
      
      setService(fetchedService);
    } catch (err) {
      setError(err.response?.data?.message || "Service not found");
    } finally {
      setLoading(false);
    }
  };

  const fetchRatings = async () => {
    try {
      const res = await API.get(`/ratings/service/${slug}`);
      setRatings(res.data.ratings);
      setAvgRating(res.data.average);
      setTotalRatings(res.data.count);
    } catch (_) {}
  };

  const getMinDate = () => {
    // Allow booking from today
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Parse the start hour from a slot string like "9:00 AM - 11:00 AM"
  const getSlotStartHour = (slot) => {
    const [startPart] = slot.split(" - ");
    const [time, meridiem] = startPart.split(" ");
    let [hours] = time.split(":").map(Number);
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return hours;
  };

  // When today is selected, only show slots that start at least 2 hours from now
  const getAvailableSlots = () => {
    if (!bookingDate) return timeSlots;
    const today = new Date().toISOString().split("T")[0];
    if (bookingDate !== today) return timeSlots; // future dates — all slots available
    const now = new Date();
    const nowHour = now.getHours() + now.getMinutes() / 60;
    return timeSlots.filter((slot) => getSlotStartHour(slot) >= nowHour + 2);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocation is not supported by your browser" });
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude, isProvided: true });
        setLocationLoading(false);
        setMessage({ type: "success", text: "Location added for better accuracy" });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      },
      (error) => {
        setLocationLoading(false);
        let errorMsg = "Failed to get location";
        if (error.code === 1) errorMsg = "Location permission denied";
        setMessage({ type: "error", text: errorMsg });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Derive the address that will actually be used for the booking
  const hasSavedAddress = userProfile?.address?.fullAddress?.trim();
  const effectiveAddress = useSavedAddress && hasSavedAddress
    ? userProfile.address
    : { fullAddress: fullAddress.trim(), area: area.trim(), landmark: landmark.trim() };

  const isAddressReady = () => {
    if (useSavedAddress && hasSavedAddress) return true;
    return fullAddress.trim() && area.trim();
  };

  const handleBooking = async () => {
    if (!bookingDate || !bookingSlot) {
      setMessage({ type: "error", text: t("home.select_date") + " & " + t("home.select_time") });
      return;
    }
    if (!isAddressReady()) {
      setMessage({ type: "error", text: "Full Address and Area are required" });
      return;
    }

    setBookingLoading(true);
    try {
      await API.post("/bookings", {
        serviceId: service._id,
        date: bookingDate,
        timeSlot: bookingSlot,
        address: effectiveAddress,
        location: userLocation,
        notes: bookingNotes,
      });

      // Optionally save the new address to the user profile
      const isEnteringNewAddress = !hasSavedAddress || !useSavedAddress;
      if (isEnteringNewAddress && saveToProfile && fullAddress.trim() && area.trim()) {
        try {
          await API.put("/auth/me", {
            address: { fullAddress: fullAddress.trim(), area: area.trim(), landmark: landmark.trim() },
          });
        } catch (_) { /* silently fail — booking succeeded, profile save is optional */ }
      }

      setMessage({ type: "success", text: t("home.booking_success") });
      setTimeout(() => navigate("/my-bookings"), 2500);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || t("home.booking_failed"),
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const getCtaText = () => {
    if (!bookingDate) return t("serviceDetails.cta.fillDetails");
    if (!bookingSlot) return t("serviceDetails.cta.selectSlot");
    if (!isAddressReady()) return t("serviceDetails.cta.enterAddress");
    return t("serviceDetails.cta.confirmBooking");
  };

  const handleCtaClick = () => {
    if (!bookingDate) {
      const el = document.getElementById("booking-date");
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 150;
        window.scrollTo({ top: y, behavior: "smooth" });
        setTimeout(() => el.focus(), 300);
      }
      return;
    }
    if (!bookingSlot) {
      const el = document.getElementById("booking-slot");
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 150;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
      return;
    }
    if (!isAddressReady()) {
      const el = document.getElementById("booking-address-section");
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 150;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
      // Focus first new-address input if in manual mode
      if (!useSavedAddress) {
        setTimeout(() => document.getElementById("booking-address")?.focus(), 300);
      }
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate(`/login?redirect=/services/${service.slug || service._id}`);
      return;
    }
    handleBooking();
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
          <div style={{ fontSize: "4rem", marginBottom: 16 }}>😕</div>
          <h2 style={{ color: "var(--text-primary)", marginBottom: 8 }}>
            {error || "Service not found"}
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            The service you're looking for doesn't exist or has been removed.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/home")}>
            <span>← {t("home.back")}</span>
          </button>
        </div>
      </div>
    );
  }

  const customSeoTitle = service.seoTitle ? getLocalizedText(service.seoTitle, lang) : "";
  const customSeoDesc = service.seoDescription ? getLocalizedText(service.seoDescription, lang) : "";

  return (
    <div className="page-wrapper">
      <SEO 
        title={customSeoTitle || `${getLocalizedText(service.title, lang)} in Chirala`} 
        description={customSeoDesc || `Professional ${getLocalizedText(service.title, lang)} services in Chirala. Reliable, safe, and affordable. Book today for expert same-day service!`}
        canonical={`/services/${service.slug || service._id}`}
      />
      <Navbar />
      <div className="service-details-container">
        {/* ── LEFT: Service Info ── */}
        <div className="service-details-info">
          <button
            className="service-details-back"
            onClick={() => navigate("/home")}
          >
            ← {t("home.back")}
          </button>

          {/* Hero Image Gallery */}
          {service.images && service.images.length > 0 && (
            <div className="sd-gallery">
              <div className="sd-gallery-main">
                <img
                  src={service.images[activeImage] || service.images[0]}
                  alt={getLocalizedText(service.title, lang)}
                  className="sd-gallery-img"
                />
              </div>
              {service.images.length > 1 && (
                <div className="sd-gallery-thumbs">
                  {service.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${idx + 1}`}
                      className={`sd-gallery-thumb ${activeImage === idx ? "active" : ""}`}
                      onClick={() => setActiveImage(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Icon fallback when no images */}
          {(!service.images || service.images.length === 0) && (
            <div className="service-details-icon">
              {categoryIconMap[service.category] || "🔧"}
            </div>
          )}

          <h1 className="service-details-title">
            {getLocalizedText(service.title, lang)}
          </h1>

          {/* Trust Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--text-secondary)", background: "rgba(245, 158, 11, 0.1)", padding: "4px 10px", borderRadius: "6px", fontWeight: "600" }}>
              <span style={{ color: "#f59e0b" }}>⭐</span> 4.8 {t("serviceDetails.rating_badge")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--text-secondary)", background: "rgba(59, 130, 246, 0.1)", padding: "4px 10px", borderRadius: "6px", fontWeight: "600" }}>
              <span style={{ color: "#3b82f6" }}>👥</span> 500+ {t("serviceDetails.bookings_badge")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--text-secondary)", background: "rgba(16, 185, 129, 0.1)", padding: "4px 10px", borderRadius: "6px", fontWeight: "600" }}>
              <span style={{ color: "#10b981" }}>⏱️</span> {t("serviceDetails.same_day_badge")}
            </div>
          </div>

          <div className="service-details-category">
            <span className="service-badge">{service.category}</span>
          </div>

          <div className="service-details-price">
            <span className="service-details-price-amount">₹{service.price}</span>
            <span className="service-details-price-label">{t("home.per_service")}</span>
          </div>

          <div className="service-details-desc">
            {getLocalizedText(service.description, lang) ||
              "Professional service delivered by verified experts."}
          </div>

          {/* Detailed Description */}
          {getLocalizedText(service.details, lang) && (
            <div className="sd-section">
              <h2 className="sd-section-title">📋 {t("serviceDetails.about")}</h2>
              <div className="sd-details-text">
                {getLocalizedText(service.details, lang).split("\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {service.videos && service.videos.length > 0 && (
            <div className="sd-section">
              <h2 className="sd-section-title">🎬 {t("serviceDetails.videos")}</h2>
              <div className="sd-videos">
                {service.videos.map((url, idx) => (
                  <div key={idx} className="sd-video-wrapper">
                    <iframe
                      src={url}
                      title={`Video ${idx + 1}`}
                      allowFullScreen
                      className="sd-video-iframe"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {service.faq && service.faq.length > 0 && (
            <div className="sd-section">
              <h2 className="sd-section-title">❓ {t("serviceDetails.faq")}</h2>
              <div className="sd-faq-list">
                {service.faq.map((item, idx) => (
                  <details key={idx} className="sd-faq-item">
                    <summary className="sd-faq-question">{lang === 'te' ? (item.question_te || item.question_en) : (item.question_en || item.question_te || item.question)}</summary>
                    <p className="sd-faq-answer">{lang === 'te' ? (item.answer_te || item.answer_en) : (item.answer_en || item.answer_te || item.answer)}</p>
                  </details>
                ))}
              </div>
            </div>
          )}



          {/* Why Choose Us */}
          <div className="sd-section" style={{ marginTop: "32px" }}>
            <h2 className="sd-section-title">{t("serviceDetails.why_choose_us")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "16px" }}>
              {[
                { icon: "🛡️", text: t("serviceDetails.verified_pros") },
                { icon: "🌟", text: t("serviceDetails.safe_materials") },
                { icon: "💰", text: t("serviceDetails.affordable") },
                { icon: "⚡", text: t("serviceDetails.quick_service") }
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-card)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", boxShadow: "var(--glass-shadow)" }}>
                  <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-secondary)" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="sd-section" style={{ marginTop: "32px", padding: "32px 24px", background: "rgba(0,0,0,0.015)", borderRadius: "20px", border: "1px solid rgba(0,0,0,0.03)" }}>
            <h2 className="sd-section-title" style={{ textAlign: "center", marginBottom: "32px" }}>{t("serviceDetails.how_it_works")}</h2>
            <div className="sd-flow-container">
              {[
                { num: "1", icon: "📅", title: t("serviceDetails.step_1") },
                { num: "2", icon: "👨‍🔧", title: t("serviceDetails.step_2") },
                { num: "3", icon: "✅", title: t("serviceDetails.step_3") }
              ].map((step, idx) => (
                <div key={idx} className="sd-flow-card">
                  <div className="sd-flow-icon-wrapper">
                    <span>{step.icon}</span>
                    <div className="sd-flow-step-badge">{step.num}</div>
                  </div>
                  <span style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)", display: "block", lineHeight: "1.5" }}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Local SEO Content Block */}
          <div className="sd-section" style={{ marginTop: "32px", padding: "24px", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "12px", color: "var(--text-primary)" }}>
              {getLocalizedText(service.title, lang)} {t("serviceDetails.services_in_chirala")}
            </h2>
            <p style={{ color: "var(--text-muted)", lineHeight: "1.6", fontSize: "0.95rem" }}>
              {t("serviceDetails.seo_desc_1")} {getLocalizedText(service.title, lang).toLowerCase()} {t("serviceDetails.seo_desc_2")}
            </p>
          </div>

          {/* Customer Reviews */}
          <div className="sd-section" style={{ marginTop: "32px" }}>
            <h2 className="sd-section-title">
              ⭐ {t("serviceDetails.reviews")}
              {totalRatings > 0 && (
                <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
                  ({avgRating} / 5 — {totalRatings} {t("serviceDetails.reviews_count")})
                </span>
              )}
            </h2>

            {/* Average Rating Bar */}
            {totalRatings > 0 && (
              <div className="sd-avg-rating">
                <div className="sd-avg-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} style={{ fontSize: "1.3rem", filter: s <= Math.round(avgRating) ? "none" : "grayscale(1) opacity(0.3)" }}>⭐</span>
                  ))}
                </div>
                <span className="sd-avg-number">{avgRating}</span>
                <span className="sd-avg-count">{t("serviceDetails.based_on")} {totalRatings} {t("serviceDetails.reviews_count")}</span>
              </div>
            )}

            {ratings.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", fontStyle: "italic" }}>
                {t("serviceDetails.no_reviews")}
              </p>
            ) : (
              <div className="sd-reviews-list">
                {ratings.map((r) => (
                  <div key={r._id} className="sd-review-card">
                    <div className="sd-review-header">
                      <div className="sd-review-user">
                        <div className="sd-review-avatar">
                          {(r.customer?.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="sd-review-name">{r.customer?.name || "Customer"}</div>
                          <div className="sd-review-date">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="sd-review-stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} style={{ fontSize: "0.85rem", filter: s <= r.rating ? "none" : "grayscale(1) opacity(0.3)" }}>⭐</span>
                        ))}
                      </div>
                    </div>
                    {r.review && (
                      <p className="sd-review-text">{r.review}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT: Booking Form ── */}
        <div className="service-details-booking" id="booking-section">
          <div className="service-details-booking-card">
            <h2 className="service-details-booking-title">
              {t("home.book_now")}
            </h2>

            {message.text && (
              <div className={`message message-${message.type}`} style={{ marginBottom: 16 }}>
                {message.text}
              </div>
            )}

            <div style={{ maxHeight: "calc(100vh - 360px)", minHeight: "250px", overflowY: "auto", paddingRight: "4px" }}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">{t("home.select_date")} *</label>
                <input
                  id="booking-date"
                  type="date"
                  className="form-input"
                  min={getMinDate()}
                  value={bookingDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setBookingDate(newDate);
                    // Clear slot if it's no longer available for the new date
                    if (bookingSlot) {
                      const today = new Date().toISOString().split("T")[0];
                      if (newDate === today) {
                        const now = new Date();
                        const nowHour = now.getHours() + now.getMinutes() / 60;
                        if (getSlotStartHour(bookingSlot) < nowHour + 2) {
                          setBookingSlot("");
                        }
                      }
                    }
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">{t("home.select_time")} *</label>
                <div className="time-slots" id="booking-slot">
                  {getAvailableSlots().length > 0 ? (
                    getAvailableSlots().map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={`time-slot ${bookingSlot === slot ? "active" : ""}`}
                        onClick={() => setBookingSlot(slot)}
                      >
                        {slot}
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: "12px 16px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "10px", color: "#f59e0b", fontSize: "0.85rem", fontWeight: "600" }}>
                      ⏰ No slots available for today — all time slots require at least 2 hours notice. Please select tomorrow or a later date.
                    </div>
                  )}
                </div>
              </div>

              {/* ── ADDRESS SELECTION SECTION ── */}
              <div id="booking-address-section" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ marginBottom: 10, display: "block" }}>
                  📍 Service Address *
                </label>

                {hasSavedAddress ? (
                  /* User HAS a saved address — show selection options */
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                    {/* Option 1: Use Saved Address */}
                    <label
                      htmlFor="addr-saved"
                      onClick={() => setUseSavedAddress(true)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "14px 16px",
                        borderRadius: "12px",
                        border: useSavedAddress
                          ? "2px solid var(--accent-primary)"
                          : "1px solid var(--glass-border)",
                        background: useSavedAddress
                          ? "rgba(99,102,241,0.07)"
                          : "var(--bg-card)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <input
                        id="addr-saved"
                        type="radio"
                        name="address-choice"
                        checked={useSavedAddress}
                        onChange={() => setUseSavedAddress(true)}
                        style={{ marginTop: 3, accentColor: "var(--accent-primary)" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--text-primary)" }}>
                            Use Saved Address
                          </span>
                          <span style={{
                            fontSize: "0.68rem", fontWeight: "700", color: "var(--accent-primary)",
                            background: "rgba(99,102,241,0.12)", padding: "2px 8px", borderRadius: "20px"
                          }}>
                            DEFAULT
                          </span>
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                          {userProfile.address.fullAddress},&nbsp;
                          {userProfile.address.area}
                          {userProfile.address.landmark && `, ${userProfile.address.landmark}`}
                          , Chirala
                        </p>
                      </div>
                    </label>

                    {/* Option 2: Use Different Address */}
                    <label
                      htmlFor="addr-new"
                      onClick={() => setUseSavedAddress(false)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: !useSavedAddress
                          ? "2px solid var(--accent-primary)"
                          : "1px solid var(--glass-border)",
                        background: !useSavedAddress
                          ? "rgba(99,102,241,0.07)"
                          : "var(--bg-card)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <input
                        id="addr-new"
                        type="radio"
                        name="address-choice"
                        checked={!useSavedAddress}
                        onChange={() => setUseSavedAddress(false)}
                        style={{ accentColor: "var(--accent-primary)" }}
                      />
                      <span style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                        Use a Different Address
                      </span>
                    </label>

                    {/* New address inputs — only shown when option 2 is selected */}
                    {!useSavedAddress && (
                      <div style={{ paddingLeft: 4, paddingTop: 4 }}>
                        <div className="form-group" style={{ marginBottom: 10 }}>
                          <textarea
                            id="booking-address"
                            className="form-input"
                            placeholder={t("home.full_address_ph")}
                            value={fullAddress}
                            onChange={(e) => setFullAddress(e.target.value)}
                            rows={2}
                            style={{ resize: "vertical" }}
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                          <input
                            id="booking-area"
                            type="text"
                            className="form-input"
                            placeholder={t("home.area_ph") + " *"}
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                          />
                          <input
                            type="text"
                            className="form-input"
                            placeholder={t("home.landmark_placeholder")}
                            value={landmark}
                            onChange={(e) => setLandmark(e.target.value)}
                          />
                        </div>
                        {/* Save to profile checkbox */}
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.8rem", color: "var(--text-muted)", userSelect: "none" }}>
                          <input
                            type="checkbox"
                            checked={saveToProfile}
                            onChange={(e) => setSaveToProfile(e.target.checked)}
                            style={{ accentColor: "var(--accent-primary)", width: 14, height: 14 }}
                          />
                          Save this address to my profile
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  /* User has NO saved address — show inputs directly */
                  <div>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <textarea
                        id="booking-address"
                        className="form-input"
                        placeholder={t("home.full_address_ph")}
                        value={fullAddress}
                        onChange={(e) => setFullAddress(e.target.value)}
                        rows={2}
                        style={{ resize: "vertical" }}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <input
                        id="booking-area"
                        type="text"
                        className="form-input"
                        placeholder={t("home.area_ph") + " *"}
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder={t("home.landmark_placeholder")}
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                      />
                    </div>
                    {/* Save to profile checkbox */}
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.8rem", color: "var(--text-muted)", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={saveToProfile}
                        onChange={(e) => setSaveToProfile(e.target.checked)}
                        style={{ accentColor: "var(--accent-primary)", width: 14, height: 14 }}
                      />
                      Save this address to my profile
                    </label>
                  </div>
                )}
              </div>

              {/* GPS Location Button */}
              <div style={{ marginBottom: 16 }}>
                {!userLocation.isProvided ? (
                  <button 
                    type="button" 
                    className={`location-btn ${locationLoading ? 'loading' : ''}`}
                    onClick={detectLocation}
                    disabled={locationLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--accent-primary)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      width: '100%',
                      justifyContent: 'center',
                      transition: 'all 0.3s'
                    }}
                  >
                    <span>📍 {locationLoading ? t("home.detecting") : t("home.use_location")}</span>
                  </button>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '12px',
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>
                      ✅ {t("home.location_captured")}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setUserLocation({ lat: null, lng: null, isProvided: false })}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {t("home.remove")}
                    </button>
                  </div>
                )}
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
                  {t("home.location_hint")}
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">{t("home.notes")}</label>
                <textarea
                  className="form-input"
                  placeholder={t("home.notes_placeholder")}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={2}
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "600", background: "rgba(239, 68, 68, 0.1)", padding: "4px 10px", borderRadius: "12px" }}>
                {t("serviceDetails.slots_filling")}
              </span>
            </div>

            <button
              className={`btn btn-primary btn-full ${bookingLoading ? "btn-loading" : ""}`}
              onClick={handleCtaClick}
              disabled={bookingLoading}
              style={{ transition: "all 0.3s ease" }}
            >
              <span>
                {!localStorage.getItem("token") 
                  ? `${t("nav.login")} to Book`
                  : bookingLoading 
                    ? t("home.booking") 
                    : getCtaText()}
              </span>
            </button>
            
            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>
                {t("serviceDetails.guarantees")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Mobile CTA */}
      <div className="mobile-floating-cta">
        <button
          className="btn btn-primary btn-full"
          style={{ padding: "14px", fontSize: "1.05rem", boxShadow: "0 -4px 12px rgba(0,0,0,0.15)", borderRadius: "100px", transition: "all 0.3s ease" }}
          onClick={() => {
            if (!bookingDate || !bookingSlot || !fullAddress.trim() || !area.trim()) {
              handleCtaClick(); // Scroll to the missing field
            } else {
              const section = document.getElementById("booking-section");
              if (section) {
                const y = section.getBoundingClientRect().top + window.scrollY - 100;
                window.scrollTo({ top: y, behavior: "smooth" });
                setTimeout(() => handleCtaClick(), 400); // Trigger the final book action after scrolling
              }
            }
          }}
        >
          {!localStorage.getItem("token") 
            ? `${t("nav.login")} to Book`
            : getCtaText()}
        </button>
      </div>

      <Footer />
    </div>
  );
};

export default ServiceDetails;
