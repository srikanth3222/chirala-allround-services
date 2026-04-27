import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";
import API from "../utils/api";
import { getLocalizedText } from "../utils/i18nHelpers";
import { SOCKET_URL } from "../utils/socket";
import Navbar from "../components/Navbar";

const ProviderDashboard = () => {
  const { t, i18n } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const socketRef = useRef(null);
  const [filterTab, setFilterTab] = useState("all");
  const [earningsOpen, setEarningsOpen] = useState(true);
  const providerName = localStorage.getItem("userName") || "Provider";
  const providerCategory = localStorage.getItem("category") || "Service Professional";

  // OTP completion modal
  const [otpModal, setOtpModal] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
    fetchNotifications();

    // Socket connection
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    const providerId = localStorage.getItem("userId");

    if (providerId) {
      socket.on("connect", () => {
        socket.emit("registerProvider", providerId);
      });
    }

    socket.on("newBooking", (data) => {
      showToast("New booking received! 🎉", "success");
      fetchBookings();
      fetchNotifications();
    });

    socket.on("bookingCancelled", (data) => {
      showToast("A booking was cancelled by the customer ❌", "error");
      fetchBookings();
      fetchNotifications();
    });

    socket.on("bookingCompleted", () => {
      fetchBookings();
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
      const res = await API.get("/bookings/provider");
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

  const handleRequestCompletion = async (booking) => {
    try {
      await API.post(`/bookings/${booking._id}/generate-completion-otp`);
      showToast("OTP sent to customer! Ask them for the code.", "success");
      setOtpModal(booking);
      setOtpCode("");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed", "error");
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      showToast("Enter the 6-digit OTP", "error");
      return;
    }
    setOtpLoading(true);
    try {
      await API.post(`/bookings/${otpModal._id}/verify-completion-otp`, { otp: otpCode });
      showToast("Booking completed successfully! ✅", "success");
      setOtpModal(null);
      setOtpCode("");
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.message || "Invalid OTP", "error");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleUpdateServiceStatus = async (bookingId, serviceStatus) => {
    try {
      await API.put(`/bookings/${bookingId}/update-status`, { serviceStatus });
      showToast(t(`serviceStatus.${serviceStatus}`), "success");
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status", "error");
    }
  };

  const handleAcceptJob = async (bookingId) => {
    try {
      await API.put(`/bookings/${bookingId}/accept`);
      showToast("Job accepted! ✅ Booking is now confirmed.", "success");
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to accept", "error");
    }
  };

  const handleDeclineJob = async (bookingId) => {
    try {
      await API.put(`/bookings/${bookingId}/decline`);
      showToast("Job declined. The booking will be reassigned.", "info");
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to decline", "error");
    }
  };

  const statusCounts = {
    total: bookings.length,
    requested: bookings.filter((b) => b.status === "provider_requested").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  const jobRequests = bookings.filter((b) => b.status === "provider_requested");
  const filteredBookings = filterTab === "all"
    ? bookings.filter((b) => b.status !== "provider_requested")
    : filterTab === "provider_requested"
      ? []
      : bookings.filter((b) => b.status === filterTab);

  const now = new Date();
  const todayStr = now.toDateString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const completedJobs = bookings.filter((b) => b.status === "completed");
  const earningsToday = completedJobs.filter((b) => new Date(b.date).toDateString() === todayStr).reduce((s, b) => s + (b.service?.price || 0), 0);
  const earningsMonth = completedJobs.filter((b) => new Date(b.date) >= startOfMonth).reduce((s, b) => s + (b.service?.price || 0), 0);
  const earningsWeek = completedJobs.filter((b) => new Date(b.date) >= startOfWeek).reduce((s, b) => s + (b.service?.price || 0), 0);
  const avgRating = completedJobs.filter((b) => b.rating).length > 0
    ? (completedJobs.filter((b) => b.rating).reduce((s, b) => s + b.rating.rating, 0) / completedJobs.filter((b) => b.rating).length).toFixed(1)
    : null;

  const formatDate = (date) => {
    const locale = i18n.language === "te" ? "te-IN" : "en-IN";
    return new Date(date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="page-container">
      <Navbar />

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type} animate-fade-in`}>
            <span className="toast-icon">{toast.type === "success" ? "✅" : "🔔"}</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="page-content">

        {/* ═══ PREMIUM PROVIDER HEADER ═══ */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28, padding: "20px 24px", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)", flexWrap: "wrap" }}>

          {/* Profile Avatar + Info */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 200 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: "800", color: "#fff", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
                {providerName.charAt(0).toUpperCase()}
              </div>
              <span style={{ position: "absolute", bottom: 1, right: 1, width: 13, height: 13, background: "#10b981", borderRadius: "50%", border: "2px solid var(--bg-card)" }} />
            </div>
            <div>
              <div style={{ fontWeight: "800", fontSize: "1.1rem", color: "var(--text-primary)" }}>{providerName}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{providerCategory}</div>
              {avgRating && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <span style={{ color: "#f59e0b", fontSize: "0.85rem" }}>★</span>
                  <span style={{ fontWeight: "700", fontSize: "0.82rem", color: "var(--text-primary)" }}>{avgRating}</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>({completedJobs.filter(b => b.rating).length} reviews)</span>
                </div>
              )}
            </div>
          </div>

          {/* Earnings Widget */}
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Today's Earnings</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#10b981" }}>₹{earningsToday}</div>
            </div>
            <div style={{ width: 1, height: 36, background: "var(--glass-border)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>This Month</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--accent-primary)" }}>₹{earningsMonth}</div>
            </div>
            <button onClick={() => setEarningsOpen(o => !o)} style={{ fontSize: "0.75rem", background: "rgba(99,102,241,0.1)", color: "var(--accent-primary)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "8px", padding: "5px 12px", cursor: "pointer", fontWeight: "600" }}>
              {earningsOpen ? "▲ Hide" : "▼ Details"}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ position: "relative", padding: "6px 12px", fontSize: "0.8rem", marginLeft: "10px" }}
            >
              🔔 Notifications
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span style={{ position: "absolute", top: -5, right: -5, background: "var(--danger)", color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: "0.7rem", fontWeight: "bold" }}>
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
            <a
              href="/downloads/CAS Provider.apk"
              download="CAS Providerp.apk"
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "0.8rem", marginLeft: "10px", textDecoration: "none" }}
              title="Download Provider App for Android"
            >
              📱 Get App
            </a>
          </div>
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
        {/* ═══ STATS ROW ═══ */}
        <div className="dashboard-stats animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {[
            { label: t("status.provider_requested"), value: statusCounts.requested, color: "#f59e0b", icon: "🔔", tabId: "provider_requested" },
            { label: t("status.confirmed"), value: statusCounts.confirmed, color: "#3b82f6", icon: "✅", tabId: "confirmed" },
            { label: t("status.completed"), value: statusCounts.completed, color: "#10b981", icon: "🏆", tabId: "completed" },
            { label: t("bookings.total"), value: statusCounts.total, color: "#6366f1", icon: "📋", tabId: "all" },
          ].map((s) => (
            <div
              key={s.label}
              className="stat-card"
              onClick={() => setFilterTab(s.tabId)}
              style={{
                borderLeft: `4px solid ${s.color}`,
                cursor: "pointer",
                transform: filterTab === s.tabId ? "scale(1.02)" : "scale(1)",
                boxShadow: filterTab === s.tabId ? `0 8px 24px ${s.color}33` : "var(--glass-shadow)",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                {s.value > 0 && <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ NEW JOB REQUESTS SECTION ═══ */}
        {jobRequests.length > 0 && (filterTab === "all" || filterTab === "provider_requested") && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: "1.2rem" }}>🔔</span>
              <h2 style={{ fontSize: "1rem", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>New Job Requests</h2>
              <span style={{ fontSize: "0.72rem", background: "#f59e0b", color: "#000", borderRadius: "20px", padding: "2px 10px", fontWeight: "800" }}>{jobRequests.length} New</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {jobRequests.map((booking) => (
                <div key={booking._id} style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "2px solid #f59e0b", boxShadow: "0 4px 16px rgba(245,158,11,0.15)", overflow: "hidden", animation: "pulse 2s infinite" }}>
                  {/* Request Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "rgba(245,158,11,0.08)", borderBottom: "1px solid rgba(245,158,11,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "1.2rem" }}>🔧</span>
                      <span style={{ fontWeight: "800", fontSize: "1rem", color: "var(--text-primary)" }}>{getLocalizedText(booking.service?.title, i18n.language) || "Service"}</span>
                    </div>
                    <span style={{ fontSize: "0.72rem", fontWeight: "800", color: "#f59e0b", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: "20px", padding: "3px 12px" }}>⏳ Awaiting Your Response</span>
                  </div>
                  {/* Request Details */}
                  <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8 }}><span>📅</span><div><div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "600" }}>DATE</div><div style={{ fontSize: "0.88rem", fontWeight: "600" }}>{formatDate(booking.date)}</div></div></div>
                      <div style={{ display: "flex", gap: 8 }}><span>⏰</span><div><div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "600" }}>TIME</div><div style={{ fontSize: "0.88rem", fontWeight: "600" }}>{booking.timeSlot}</div></div></div>
                      {booking.address && (
                        <div style={{ display: "flex", gap: 8 }}><span>📍</span><div><div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "600" }}>LOCATION</div><div style={{ fontSize: "0.84rem" }}><strong>{booking.address.area}</strong>{booking.address.landmark && <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", display: "block" }}>📌 {booking.address.landmark}</span>}</div></div></div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {booking.customer && (
                        <div style={{ display: "flex", gap: 8 }}><span>👤</span><div><div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "600" }}>CUSTOMER</div><div style={{ fontSize: "0.88rem", fontWeight: "600" }}>{booking.customer.name}</div></div></div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}><span>💰</span><div><div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "600" }}>EARNINGS</div><div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#10b981" }}>₹{booking.service?.price || "N/A"}</div></div></div>
                      {booking.notes && <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>📝 {booking.notes}</div>}
                    </div>
                  </div>
                  {/* Accept / Decline Buttons */}
                  <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(245,158,11,0.2)", display: "flex", gap: 10 }}>
                    <button
                      onClick={() => handleAcceptJob(booking._id)}
                      style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "0.9rem", cursor: "pointer", transition: "opacity 0.2s" }}
                      onMouseEnter={e => e.target.style.opacity = "0.85"}
                      onMouseLeave={e => e.target.style.opacity = "1"}
                    >✅ Accept Job</button>
                    <button
                      onClick={() => handleDeclineJob(booking._id)}
                      style={{ flex: 1, padding: "10px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", fontWeight: "700", fontSize: "0.9rem", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={e => { e.target.style.background = "rgba(239,68,68,0.2)"; }}
                      onMouseLeave={e => { e.target.style.background = "rgba(239,68,68,0.1)"; }}
                    >❌ Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* ═══ JOB CARDS ═══ */}
        {loading ? (
          <div className="loading-container animate-fade-in"><div className="loading-spinner" /><p className="loading-text">Loading bookings...</p></div>
        ) : filteredBookings.length === 0 && !(filterTab === "provider_requested" && jobRequests.length > 0) ? (
          <div className="empty-state animate-fade-in"><div className="empty-state-icon">📡</div><h3 className="empty-state-title">{t("provider.no_jobs")}</h3><p className="empty-state-description">{t("provider.no_jobs_desc")}</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filteredBookings.map((booking, index) => {
              const statusColors = { pending: "#f59e0b", confirmed: "#3b82f6", completed: "#10b981", cancelled: "#ef4444" };
              const sc = statusColors[booking.status] || "#6b7280";
              return (
                <div key={booking._id} className="animate-fade-in" style={{ animationDelay: `${0.1 + index * 0.05}s`, background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)", overflow: "hidden" }}>

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
                              {booking.location?.isProvided && (
                                <a href={`https://www.google.com/maps?q=${booking.location.lat},${booking.location.lng}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, padding: "4px 10px", background: "rgba(99,102,241,0.1)", color: "var(--accent-primary)", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "700", textDecoration: "none", border: "1px solid rgba(99,102,241,0.2)" }}>
                                  🗺️ View on Map
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                        {booking.notes && (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span>📝</span>
                            <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600" }}>NOTES</div><div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{booking.notes}</div></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {booking.customer && (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span>👤</span>
                            <div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600" }}>CUSTOMER</div>
                              <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)" }}>{booking.customer.name}</div>
                              <a href={`tel:${booking.customer.mobile}`} style={{ fontSize: "0.8rem", color: "var(--accent-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>📞 {booking.customer.mobile}</a>
                            </div>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <span>💰</span>
                          <div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600" }}>EARNINGS</div>
                            <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#10b981" }}>₹{booking.service?.price || "N/A"}</div>
                          </div>
                        </div>
                        {booking.rating && (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span>⭐</span>
                            <div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600" }}>RATING</div>
                              <div style={{ display: "flex", gap: 2 }}>{[1, 2, 3, 4, 5].map(s => <span key={s} style={{ color: s <= booking.rating.rating ? "#f59e0b" : "var(--text-muted)", fontSize: "0.9rem" }}>★</span>)}</div>
                              {booking.rating.review && <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 3, fontStyle: "italic" }}>"{booking.rating.review}"</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer — actions */}
                  <div style={{ padding: "12px 20px", borderTop: "1px solid var(--glass-border)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {booking.status === "completed" && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px" }}>
                          <span style={{ color: "#10b981", fontWeight: "700", fontSize: "0.85rem" }}>✓ {t("provider.done")}</span>
                        </div>
                        <button style={{ fontSize: "0.8rem", padding: "6px 14px", background: "rgba(99,102,241,0.08)", color: "var(--accent-primary)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
                          onClick={() => window.print()}>🧾 Download Receipt</button>
                      </>
                    )}
                    {booking.status === "confirmed" && (
                      <div className="workflow-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {(!booking.serviceStatus || booking.serviceStatus === "provider_assigned") && (
                          <button className="btn btn-warning btn-sm btn-status-update" onClick={() => handleUpdateServiceStatus(booking._id, "on_the_way")}><span className="btn-icon">🚗</span> {t("serviceStatus.on_the_way_btn")}</button>
                        )}
                        {booking.serviceStatus === "on_the_way" && (
                          <button className="btn btn-info btn-sm btn-status-update" onClick={() => handleUpdateServiceStatus(booking._id, "arrived")}><span className="btn-icon">📍</span> {t("serviceStatus.arrived_btn")}</button>
                        )}
                        {booking.serviceStatus === "arrived" && (
                          <button className="btn btn-primary btn-sm btn-status-update" onClick={() => handleUpdateServiceStatus(booking._id, "in_progress")}><span className="btn-icon">🔧</span> {t("serviceStatus.in_progress_btn")}</button>
                        )}
                        {booking.serviceStatus === "in_progress" && (
                          <button className="btn btn-success btn-sm btn-status-update pulse-button" onClick={() => handleRequestCompletion(booking)}><span className="btn-icon">✅</span> {t("provider.mark_complete")}</button>
                        )}
                        {booking.serviceStatus && booking.serviceStatus !== "provider_assigned" && (
                          <div className="current-status-label"><span className="status-dot pulse" />{t(`serviceStatus.${booking.serviceStatus}`)}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ EARNINGS SUMMARY ═══ */}
        {earningsOpen && !loading && bookings.length > 0 && (
          <div style={{ marginTop: 28, background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>💰 Earnings Summary</h2>
              <button onClick={() => setEarningsOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0 }}>
              {[
                { label: "Today", value: earningsToday, color: "#10b981" },
                { label: "This Week", value: earningsWeek, color: "#3b82f6" },
                { label: "This Month", value: earningsMonth, color: "#6366f1" },
              ].map((e, i) => (
                <div key={e.label} style={{ padding: "20px", textAlign: "center", borderRight: i < 2 ? "1px solid var(--glass-border)" : "none" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{e.label}</div>
                  <div style={{ fontSize: "1.7rem", fontWeight: "800", color: e.color }}>₹{e.value}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>{completedJobs.filter(b => e.label === "Today" ? new Date(b.date).toDateString() === todayStr : e.label === "This Week" ? new Date(b.date) >= startOfWeek : new Date(b.date) >= startOfMonth).length} jobs</div>
                </div>
              ))}
            </div>
            {/* Per-service breakdown */}
            {completedJobs.length > 0 && (() => {
              const byService = {};
              completedJobs.forEach(b => {
                const name = getLocalizedText(b.service?.title, i18n.language) || "Service";
                byService[name] = (byService[name] || 0) + (b.service?.price || 0);
              });
              const entries = Object.entries(byService);
              if (entries.length <= 1) return null;
              return (
                <div style={{ padding: "16px 20px", borderTop: "1px solid var(--glass-border)" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: 10 }}>BY SERVICE TYPE</div>
                  {entries.map(([name, total]) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--glass-border)" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{name}</span>
                      <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>₹{total}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

      </div>

      {/* OTP Completion Modal */}
      {otpModal && (
        <div className="modal-overlay" onClick={() => setOtpModal(null)}>
          <div className="modal-content glass-modal animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setOtpModal(null)}>✕</button>
            <div className="modal-header-icon">🔐</div>
            <h2 className="modal-title">{t("provider.enter_otp")}</h2>
            <p className="modal-subtitle">
              {t("provider.ask_customer_otp")}
            </p>

            <div className="otp-input-container">
              <input
                type="text"
                className="otp-field"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                autoFocus
              />
            </div>

            <div className="modal-actions-row">
              <button className="btn btn-secondary" onClick={() => setOtpModal(null)}>{t("common.cancel")}</button>
              <button
                className={`btn btn-primary ${otpLoading ? "btn-loading" : ""}`}
                onClick={handleVerifyOTP}
                disabled={otpLoading || otpCode.length !== 6}
              >
                <span>{otpLoading ? t("auth.verifying") : t("provider.verify_complete")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;