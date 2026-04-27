import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";
import API from "../utils/api";
import { getLocalizedText } from "../utils/i18nHelpers";
import { SOCKET_URL } from "../utils/socket";
import Navbar from "../components/Navbar";
import SEO from "../components/SEO";

const timeSlots = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

const CustomerDashboard = () => {
  const { t, i18n } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filterTab, setFilterTab] = useState("all");
  const socketRef = useRef(null);

  // Reschedule modal
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Completion OTP display
  const [completionOTP, setCompletionOTP] = useState(null);

  // Rating modal
  const [ratingModal, setRatingModal] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
    fetchNotifications();

    // Socket connection for real-time updates
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    const customerId = localStorage.getItem("userId");

    if (customerId) {
      socket.on("connect", () => {
        socket.emit("registerCustomer", customerId);
      });
    }

    socket.on("bookingConfirmed", () => {
      showToast("Your booking has been confirmed! ✅");
      fetchBookings();
      fetchNotifications();
    });

    socket.on("bookingCompleted", () => {
      showToast("Your service has been completed! 🎉");
      setCompletionOTP(null); // clear OTP display
      fetchBookings();
      fetchNotifications();
    });

    socket.on("rescheduleProposed", (data) => {
      showToast("Admin has proposed rescheduling your booking 📅");
      fetchBookings();
      fetchNotifications();
    });

    socket.on("rescheduleDecided", (data) => {
      showToast(
        data.accepted
          ? "Your reschedule request was accepted! ✅"
          : "Your reschedule request was rejected ❌"
      );
      fetchBookings();
    });

    socket.on("completionOtpGenerated", (data) => {
      showToast("Service provider needs your OTP to complete the booking! 🔑");
      setCompletionOTP({ otp: data.otp, bookingId: data.bookingId });
    });

    socket.on("serviceStatusUpdated", (data) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === data.bookingId
            ? { ...b, serviceStatus: data.serviceStatus }
            : b
        )
      );

      const statusObj = {
        provider_assigned: "Provider assigned to your job",
        on_the_way: "Provider is on the way! 🚗",
        arrived: "Provider has arrived! 📍",
        in_progress: "Service is in progress 🔧"
      };
      const msg = statusObj[data.serviceStatus] || "Service status updated";
      showToast(msg);
      fetchNotifications();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const showToast = (message, type = "success") => {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 5000);
  };

  const fetchBookings = async () => {
    try {
      const res = await API.get("/bookings/my");
      setBookings(res.data.bookings);
    } catch (err) {
      console.error("Failed to load bookings:", err);
      showToast("Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications/my");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) { }
  };

  const markAllNotificationsRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) { }
  };

  // --- Cancel ---
  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?"))
      return;
    try {
      await API.put(`/bookings/${bookingId}/cancel`);
      showToast("Booking cancelled");
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.message || "Cancel failed", "error");
    }
  };

  // --- Submit Rating ---
  const handleSubmitRating = async () => {
    if (!ratingModal || ratingValue === 0) return;
    setRatingLoading(true);
    try {
      await API.post("/ratings", {
        bookingId: ratingModal._id,
        rating: ratingValue,
        review: reviewText,
      });
      showToast(t("ratings.success"));
      setRatingModal(null);
      fetchBookings(); // Reload to show new rating
    } catch (err) {
      showToast(err.response?.data?.message || "Rating failed", "error");
    } finally {
      setRatingLoading(false);
    }
  };

  // --- Reschedule Request ---
  const openRescheduleModal = (booking) => {
    setRescheduleModal(booking);
    setRescheduleDate("");
    setRescheduleSlot("");
    setRescheduleReason("");
  };

  const handleRescheduleRequest = async () => {
    if (!rescheduleDate || !rescheduleSlot) {
      showToast("Please select date and time", "error");
      return;
    }
    setRescheduleLoading(true);
    try {
      await API.put(`/bookings/${rescheduleModal._id}/reschedule-request`, {
        newDate: rescheduleDate,
        newTimeSlot: rescheduleSlot,
        reason: rescheduleReason,
      });
      showToast("Reschedule request submitted! ⏳");
      setRescheduleModal(null);
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.message || "Request failed", "error");
    } finally {
      setRescheduleLoading(false);
    }
  };

  // --- Respond to admin reschedule ---
  const handleRescheduleResponse = async (bookingId, accept) => {
    try {
      await API.put(`/bookings/${bookingId}/reschedule-response`, { accept });
      showToast(
        accept
          ? "Reschedule accepted! Booking updated ✅"
          : "Reschedule rejected. Original booking kept."
      );
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.message || "Response failed", "error");
    }
  };

  // --- Save Profile ---
  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileMsg({ type: "", text: "" });
    try {
      await API.put("/auth/me", {
        name: profileForm.name,
        email: profileForm.email,
        address: {
          fullAddress: profileForm.fullAddress,
          area: profileForm.area,
          landmark: profileForm.landmark,
        },
      });
      setProfileMsg({ type: "success", text: "Profile saved successfully! ✅" });
      fetchProfile();
      setTimeout(() => setProfileMsg({ type: "", text: "" }), 4000);
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.message || "Save failed" });
    } finally {
      setProfileLoading(false);
    }
  };

  const statusCounts = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending" || b.status === "provider_requested").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  const formatDate = (date) => {
    const locale = i18n.language === "te" ? "te-IN" : "en-IN";
    return new Date(date).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getMinDate = () => {
    // Allow rescheduling from today
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    const statusOrder = {
      pending: 1,
      provider_requested: 1,
      confirmed: 2,
      completed: 3,
      cancelled: 4
    };
    const orderA = statusOrder[a.status] || 5;
    const orderB = statusOrder[b.status] || 5;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const filteredBookings = filterTab === "all"
    ? sortedBookings
    : sortedBookings.filter((b) => filterTab === "pending" ? (b.status === "pending" || b.status === "provider_requested") : b.status === filterTab);

  return (
    <div className="page-container">
      <SEO title="My Bookings" description="View and manage all your home service bookings with Chirala Allround Services. Track live status, reschedule or cancel easily." canonical="/my-bookings" />
      <Navbar />

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type} animate-fade-in`}>
            <span className="toast-icon">🔔</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="page-content">
        <div className="page-header animate-fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="page-title">
              {t("bookings.my_bookings")} <span className="gradient-text">{t("bookings.bookings_highlight")}</span>
            </h1>
            <p className="page-subtitle">{t("bookings.track_bookings")}</p>
          </div>
          <button
            className="btn btn-outline notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ position: "relative" }}
          >
            <span className="notification-icon">🔔</span>
            <span className="notification-text" style={{ marginLeft: "6px" }}>Notifications</span>
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span style={{ position: "absolute", top: -5, right: -5, background: "var(--danger)", color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: "0.7rem", fontWeight: "bold" }}>
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <div className="notifications-panel animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", marginBottom: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Recent Updates</h3>
              {notifications.some(n => !n.isRead) && (
                <button onClick={markAllNotificationsRead} style={{ background: "none", border: "none", color: "var(--accent-primary)", fontSize: "0.85rem", cursor: "pointer", fontWeight: "600" }}>
                  Mark all as read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", padding: "12px 0" }}>No notifications yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
                {notifications.map(n => (
                  <div
                    key={n._id}
                    onClick={() => { if (!n.isRead) markNotificationRead(n._id); }}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      background: n.isRead ? "transparent" : "rgba(108, 92, 231, 0.05)",
                      border: "1px solid",
                      borderColor: n.isRead ? "var(--border)" : "var(--accent-primary)",
                      cursor: n.isRead ? "default" : "pointer"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "0.9rem", color: n.isRead ? "var(--text-main)" : "var(--accent-primary)" }}>{n.title}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Compact Stats Row */}
        <div className="mobile-compact-stats animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className={`compact-stat-item ${filterTab === "pending" ? "active" : ""}`} onClick={() => setFilterTab("pending")}>
            <div className="compact-stat-top">
              <span className="compact-stat-icon">🟡</span>
              <span className="compact-stat-num">{statusCounts.pending}</span>
            </div>
            <span className="compact-stat-label">{t("bookings.pending")}</span>
          </div>
          <div className={`compact-stat-item ${filterTab === "confirmed" ? "active" : ""}`} onClick={() => setFilterTab("confirmed")}>
            <div className="compact-stat-top">
              <span className="compact-stat-icon">🔵</span>
              <span className="compact-stat-num">{statusCounts.confirmed}</span>
            </div>
            <span className="compact-stat-label">{t("bookings.confirmed")}</span>
          </div>
          <div className={`compact-stat-item ${filterTab === "completed" ? "active" : ""}`} onClick={() => setFilterTab("completed")}>
            <div className="compact-stat-top">
              <span className="compact-stat-icon">🟢</span>
              <span className="compact-stat-num">{statusCounts.completed}</span>
            </div>
            <span className="compact-stat-label">{t("bookings.completed")}</span>
          </div>
          <div className={`compact-stat-item ${filterTab === "all" ? "active" : ""}`} onClick={() => setFilterTab("all")}>
            <div className="compact-stat-top">
              <span className="compact-stat-icon">📦</span>
              <span className="compact-stat-num">{statusCounts.total}</span>
            </div>
            <span className="compact-stat-label">{t("bookings.total")}</span>
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="loading-container animate-fade-in">
            <div className="loading-spinner" />
            <p className="loading-text">{t("bookings.loading")}</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="empty-state-icon">📋</div>
            <h3 className="empty-state-title">{t("bookings.no_bookings")}</h3>
            <p className="empty-state-description">{t("bookings.no_bookings_desc")}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredBookings.map((booking, index) => {
              const statusColors = { pending: "#f59e0b", confirmed: "#3b82f6", completed: "#10b981", cancelled: "#ef4444" };
              const sc = statusColors[booking.status] || "#6b7280";

              return (
                <div key={booking._id}>
                  {/* ═══ MOBILE LAYOUT (Current) ═══ */}
                  <div
                    className="booking-card-mobile mobile-only-card animate-fade-in"
                    style={{ animationDelay: `${0.2 + index * 0.05}s` }}
                  >
                    <div className="booking-card-mobile-header">
                      <h3 className="booking-mobile-title">
                        {getLocalizedText(booking.service?.title, i18n.language) || "Service"}
                      </h3>
                      <span className={`badge-pill badge-pill-${booking.status}`}>
                        {booking.status === "pending" || booking.status === "provider_requested" ? "🟡 " : ""}
                        {booking.status === "confirmed" ? "🔵 " : ""}
                        {booking.status === "completed" ? "🟢 " : ""}
                        {t(`status.${booking.status}`)}
                      </span>
                    </div>

                    <div className="booking-mobile-inline-details">
                      <span className="inline-detail">📅 {formatDate(booking.date)} • 🕘 {booking.timeSlot}</span>
                      <span className="inline-detail-price">💰 ₹{booking.service?.price || "N/A"}</span>
                    </div>

                    {booking.provider && (
                      <div className="booking-mobile-provider">
                        <span className="provider-icon">👤</span> {booking.provider.name} • <a href={`tel:${booking.provider.mobile}`}>{booking.provider.mobile} 📞</a>
                      </div>
                    )}

                    {/* Completion OTP Banner */}
                    {completionOTP && completionOTP.bookingId === booking._id && booking.status === "confirmed" && (
                      <div className="otp-banner-box animate-pulse">
                        <p className="otp-label">{t("bookings.share_otp")}</p>
                        <p className="otp-value">{completionOTP.otp}</p>
                      </div>
                    )}

                    {/* Admin Reschedule Proposal */}
                    {booking.rescheduleRequest?.status === "pending" && booking.rescheduleRequest.requestedBy === "admin" && (
                      <div className="reschedule-proposal-box">
                        <p className="proposal-title">{t("bookings.admin_proposes")}</p>
                        <p className="proposal-details">
                          {t("bookings.new_date")}: <strong>{formatDate(booking.rescheduleRequest.newDate)}</strong> • {booking.rescheduleRequest.newTimeSlot}
                        </p>
                        {booking.rescheduleRequest.reason && (
                          <p className="proposal-reason">{t("bookings.reason")}: {booking.rescheduleRequest.reason}</p>
                        )}
                        <div className="proposal-actions">
                          <button className="btn btn-success btn-sm" onClick={() => handleRescheduleResponse(booking._id, true)}>{t("bookings.accept")}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleRescheduleResponse(booking._id, false)}>{t("bookings.reject")}</button>
                        </div>
                      </div>
                    )}

                    {/* Live Service Status Tracker (Simplified) */}
                    {booking.status === "confirmed" && booking.serviceStatus && booking.serviceStatus !== "confirmed" && (
                      <div className="status-tracker-box-mobile">
                        <span className="tracker-label-mobile">Status:</span> <strong>{t(`serviceStatus.${booking.serviceStatus}`)}</strong>
                      </div>
                    )}

                    <div className="booking-mobile-actions">
                      {booking.status === "completed" && !booking.rating && (
                        <button className="btn btn-primary btn-sm btn-rate" onClick={() => { setRatingModal(booking); setRatingValue(0); setReviewText(""); }}>
                          ⭐ {t("ratings.rate_service")}
                        </button>
                      )}

                      {booking.rating && (
                        <div className="booking-rating-display">
                          <span style={{ color: "#f59e0b" }}>{"★".repeat(booking.rating.rating)}</span>
                        </div>
                      )}

                      {["pending", "confirmed"].includes(booking.status) && (
                        <div className="active-actions-mobile">
                          {booking.status === "confirmed" && !booking.rescheduleRequest?.status && (
                            <button className="btn btn-warning btn-sm" onClick={() => openRescheduleModal(booking)}>{t("bookings.reschedule")}</button>
                          )}
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(booking._id)}>{t("bookings.cancel_btn")}</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ═══ DESKTOP LAYOUT (Provider-style 2-column) ═══ */}
                  <div className="desktop-only-card animate-fade-in" style={{ animationDelay: `${0.1 + index * 0.05}s`, background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)", overflow: "hidden", marginBottom: "20px" }}>
                    {/* Card Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--glass-border)", background: `${sc}0d` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: "1.3rem" }}>🔧</span>
                        <span style={{ fontWeight: "800", fontSize: "1rem", color: "var(--text-primary)" }}>{getLocalizedText(booking.service?.title, i18n.language) || "Service"}</span>
                      </div>
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", color: sc, background: `${sc}20`, border: `1px solid ${sc}40`, borderRadius: "20px", padding: "3px 12px", textTransform: "capitalize" }}>
                        {t(`status.${booking.status}`)}
                      </span>
                    </div>

                    {/* Card Body — 2 column */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                      {/* Left Column */}
                      <div style={{ padding: "16px 20px", borderRight: "1px solid var(--glass-border)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span>📅</span>
                            <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600" }}>DATE</div><div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)" }}>{formatDate(booking.date)}</div></div>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span>⏰</span>
                            <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600" }}>TIME</div><div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)" }}>{booking.timeSlot}</div></div>
                          </div>
                          {booking.address && (
                            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span>📍</span>
                              <div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600" }}>LOCATION</div>
                                <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                                  {typeof booking.address === "string" ? booking.address : (<><strong>{booking.address.area}</strong><br />{booking.address.fullAddress}{booking.address.landmark && <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>📌 {booking.address.landmark}</span>}</>)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column */}
                      <div style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {booking.provider && (
                            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span>👤</span>
                              <div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>PROVIDER</div>
                                <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)" }}>{booking.provider.name}</div>
                                <a href={`tel:${booking.provider.mobile}`} style={{ fontSize: "0.8rem", color: "var(--accent-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>📞 {booking.provider.mobile}</a>
                              </div>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span>💰</span>
                            <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>PRICE</div><div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--accent-primary)" }}>₹{booking.service?.price || "N/A"}</div></div>
                          </div>
                          {booking.rating && (
                            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span>⭐</span>
                              <div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>RATING</div>
                                <div style={{ fontSize: "1rem", color: "#f59e0b", letterSpacing: "2px" }}>{"★".repeat(booking.rating.rating)}</div>
                                {booking.rating.review && <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--text-secondary)", marginTop: 2 }}>"{booking.rating.review}"</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer for Customer Actions/Banners */}
                    {(completionOTP?.bookingId === booking._id || booking.rescheduleRequest?.status === "pending" || booking.serviceStatus || ["pending", "confirmed", "completed"].includes(booking.status)) && (
                      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: "10px" }}>

                        {/* Live Tracker Desktop */}
                        {booking.status === "confirmed" && booking.serviceStatus && booking.serviceStatus !== "confirmed" && (
                          <div style={{ padding: "8px 12px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Live Status:</span>
                            <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#3b82f6" }}>{t(`serviceStatus.${booking.serviceStatus}`)}</span>
                          </div>
                        )}

                        {/* OTP Banner Desktop */}
                        {completionOTP && completionOTP.bookingId === booking._id && booking.status === "confirmed" && (
                          <div className="otp-banner-box animate-pulse" style={{ margin: 0 }}>
                            <p className="otp-label">{t("bookings.share_otp")}</p>
                            <p className="otp-value">{completionOTP.otp}</p>
                          </div>
                        )}

                        {/* Reschedule Proposal Desktop */}
                        {booking.rescheduleRequest?.status === "pending" && booking.rescheduleRequest.requestedBy === "admin" && (
                          <div className="reschedule-proposal-box" style={{ margin: 0 }}>
                            <p className="proposal-title">{t("bookings.admin_proposes")}</p>
                            <p className="proposal-details">
                              {t("bookings.new_date")}: <strong>{formatDate(booking.rescheduleRequest.newDate)}</strong> • {booking.rescheduleRequest.newTimeSlot}
                            </p>
                            {booking.rescheduleRequest.reason && (
                              <p className="proposal-reason">{t("bookings.reason")}: {booking.rescheduleRequest.reason}</p>
                            )}
                            <div className="proposal-actions">
                              <button className="btn btn-success btn-sm" onClick={() => handleRescheduleResponse(booking._id, true)}>{t("bookings.accept")}</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleRescheduleResponse(booking._id, false)}>{t("bookings.reject")}</button>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons Desktop */}
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                          {booking.status === "completed" && !booking.rating && (
                            <button className="btn btn-primary btn-sm" onClick={() => { setRatingModal(booking); setRatingValue(0); setReviewText(""); }}>
                              ⭐ {t("ratings.rate_service")}
                            </button>
                          )}
                          {["pending", "confirmed"].includes(booking.status) && (
                            <>
                              {booking.status === "confirmed" && !booking.rescheduleRequest?.status && (
                                <button className="btn btn-warning btn-sm" onClick={() => openRescheduleModal(booking)}>{t("bookings.reschedule")}</button>
                              )}
                              <button className="btn btn-danger btn-sm" onClick={() => handleCancel(booking._id)}>{t("bookings.cancel_btn")}</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="modal-overlay" onClick={() => setRescheduleModal(null)}>
          <div className="modal-content glass-modal animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setRescheduleModal(null)}>✕</button>
            <h2 className="modal-title">{t("bookings.request_reschedule")}</h2>
            <p className="modal-subtitle">
              {getLocalizedText(rescheduleModal.service?.title, i18n.language)} • Current: {formatDate(rescheduleModal.date)}, {rescheduleModal.timeSlot}
            </p>

            <div className="form-group">
              <label className="form-label">{t("bookings.new_date_label")}</label>
              <input type="date" className="form-input" min={getMinDate()} value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">{t("bookings.new_time_slot")}</label>
              <div className="time-slots-grid">
                {timeSlots.map((slot) => (
                  <button key={slot} type="button" className={`time-slot-btn ${rescheduleSlot === slot ? "active" : ""}`} onClick={() => setRescheduleSlot(slot)}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t("bookings.reason_optional")}</label>
              <input type="text" className="form-input" placeholder={t("bookings.why_reschedule")} value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} />
            </div>

            <div className="modal-actions-row">
              <button className="btn btn-secondary" onClick={() => setRescheduleModal(null)}>{t("common.cancel")}</button>
              <button className={`btn btn-primary ${rescheduleLoading ? "btn-loading" : ""}`} onClick={handleRescheduleRequest} disabled={rescheduleLoading}>
                <span>{rescheduleLoading ? t("bookings.submitting") : t("auth.submit_request")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="modal-overlay" onClick={() => setRatingModal(null)}>
          <div className="modal-content glass-modal animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setRatingModal(null)}>✕</button>
            <div className="modal-header-icon">⭐</div>
            <h2 className="modal-title">{t("ratings.rate_service")}</h2>
            <p className="modal-subtitle">{getLocalizedText(ratingModal.service?.title, i18n.language)}</p>

            <div className="star-rating-selector">
              <p className="rating-label">{t("ratings.your_rating")}</p>
              <div className="stars-row">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-btn ${(ratingHover || ratingValue) >= star ? "active" : ""}`}
                    onClick={() => setRatingValue(star)}
                    onMouseEnter={() => setRatingHover(star)}
                    onMouseLeave={() => setRatingHover(0)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t("ratings.write_review")}</label>
              <textarea
                className="form-input"
                rows="4"
                placeholder={t("ratings.review_placeholder")}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
            </div>

            <div className="modal-actions-row">
              <button className="btn btn-secondary" onClick={() => setRatingModal(null)}>{t("common.cancel")}</button>
              <button className={`btn btn-primary ${ratingLoading ? "btn-loading" : ""}`} onClick={handleSubmitRating} disabled={ratingLoading || ratingValue === 0}>
                <span>{ratingLoading ? t("ratings.submitting") : t("ratings.submit")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
