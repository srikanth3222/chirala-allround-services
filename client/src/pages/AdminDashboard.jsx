import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";
import API from "../utils/api";
import { getLocalizedText } from "../utils/i18nHelpers";
import { SOCKET_URL } from "../utils/socket";
import Navbar from "../components/Navbar";

const timeSlots = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

const mainCategories = [
  { key: "home", label: "Home", icon: "🏠" },
  { key: "personal", label: "Personal", icon: "👤" },
  { key: "events", label: "Events", icon: "🎉" },
  { key: "catering", label: "Catering", icon: "🍽️" },
  { key: "more", label: "More...", icon: "➕" },
];

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [activeTab, setActiveTab] = useState("bookings");
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {}
  };

  const markAllNotificationsRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {}
  };

  // Ratings for completed bookings
  const [ratedBookings, setRatedBookings] = useState(new Map());

  // Service form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    titleEn: "",
    titleTe: "",
    descEn: "",
    descTe: "",
    price: "",
    category: "",
    images: "",
    videos: "",
    detailsEn: "",
    detailsTe: "",
    faq: [],
    isFeatured: false,
    manualKeywords: "",
    seoTitleEn: "",
    seoTitleTe: "",
    seoDescEn: "",
    seoDescTe: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    nameEn: "",
    nameTe: "",
    mainCategory: "home",
    icon: "🔧",
  });
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState({ type: "", text: "" });

  // Booking confirmation
  const [selectedProviders, setSelectedProviders] = useState({});
  const [confirmMessage, setConfirmMessage] = useState({ type: "", text: "" });

  // Reschedule modal
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchAll();
    fetchNotifications();

    // Socket connection for real-time admin updates
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    const adminId = localStorage.getItem("userId");

    socket.on("connect", () => {
      socket.emit("registerAdmin", adminId);
    });

    socket.on("serviceStatusUpdated", (data) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === data.bookingId
            ? { ...b, serviceStatus: data.serviceStatus }
            : b
        )
      );
    });

    // New booking created by customer → refresh immediately
    socket.on("newBooking", () => {
      fetchAll();
      fetchNotifications();
    });

    // Provider accepted the job → refresh all bookings to update status
    socket.on("bookingAccepted", () => {
      fetchAll();
      fetchNotifications();
    });

    // Provider declined the job → refresh all bookings (booking returns to pending)
    socket.on("bookingDeclined", () => {
      fetchAll();
      fetchNotifications();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [servicesRes, providersRes, usersRes, bookingsRes, categoriesRes] =
        await Promise.all([
          API.get("/services"),
          API.get("/auth/providers"),
          API.get("/auth/users"),
          API.get("/bookings"),
          API.get("/categories"),
        ]);
      setServices(servicesRes.data.services);
      setProviders(providersRes.data.providers);
      setUsers(usersRes.data.users);
      setBookings(bookingsRes.data.bookings);
      setCategories(categoriesRes.data.categories);

      // Fetch ratings for completed bookings
      const completed = bookingsRes.data.bookings.filter(b => b.status === "completed");
      const ratedMap = new Map();
      for (const b of completed) {
        try {
          const checkRes = await API.get(`/ratings/check/${b._id}`);
          if (checkRes.data.rated) ratedMap.set(b._id, checkRes.data.rating);
        } catch (_) {}
      }
      setRatedBookings(ratedMap);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Service handlers ---
  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const resetForm = () => {
    setForm({ titleEn: "", titleTe: "", descEn: "", descTe: "", price: "", category: "", images: "", videos: "", detailsEn: "", detailsTe: "", faq: [], isFeatured: false, manualKeywords: "", seoTitleEn: "", seoTitleTe: "", seoDescEn: "", seoDescTe: "" });
    setEditingId(null);
    setShowForm(false);
    setMessage({ type: "", text: "" });
    setImageFile(null);
    setImagePreview("");
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("title", JSON.stringify({ en: form.titleEn, te: form.titleTe }));
      formData.append("description", JSON.stringify({ en: form.descEn, te: form.descTe }));
      formData.append("price", form.price);
      formData.append("category", form.category);
      formData.append("images", JSON.stringify(form.images ? form.images.split("\n").map(u => u.trim()).filter(Boolean) : []));
      formData.append("videos", JSON.stringify(form.videos ? form.videos.split("\n").map(u => u.trim()).filter(Boolean) : []));
      formData.append("details", JSON.stringify({ en: form.detailsEn, te: form.detailsTe }));
      formData.append("faq", JSON.stringify(form.faq.filter(f => (f.question_en && f.question_en.trim()) || (f.question_te && f.question_te.trim()))));
      formData.append("isFeatured", form.isFeatured);
      formData.append("manualKeywords", form.manualKeywords);
      formData.append("seoTitle", JSON.stringify({ en: form.seoTitleEn, te: form.seoTitleTe }));
      formData.append("seoDescription", JSON.stringify({ en: form.seoDescEn, te: form.seoDescTe }));
      
      if (imageFile) {
        formData.append("backgroundImage", imageFile);
      }

      const config = { headers: { "Content-Type": "multipart/form-data" } };

      if (editingId) {
        await API.put(`/services/${editingId}`, formData, config);
        setMessage({ type: "success", text: "Service updated successfully!" });
      } else {
        await API.post("/services", formData, config);
        setMessage({ type: "success", text: "Service created successfully!" });
      }
      fetchAll();
      setTimeout(resetForm, 1000);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Operation failed",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (service) => {
    setForm({
      titleEn: getLocalizedText(service.title, "en"),
      titleTe: getLocalizedText(service.title, "te"),
      descEn: getLocalizedText(service.description, "en"),
      descTe: getLocalizedText(service.description, "te"),
      price: service.price.toString(),
      category: service.category,
      images: (service.images || []).join("\n"),
      videos: (service.videos || []).join("\n"),
      detailsEn: getLocalizedText(service.details, "en"),
      detailsTe: getLocalizedText(service.details, "te"),
      faq: service.faq || [],
      isFeatured: service.isFeatured || false,
      manualKeywords: (service.keywords || []).join(", "),
      seoTitleEn: getLocalizedText(service.seoTitle, "en"),
      seoTitleTe: getLocalizedText(service.seoTitle, "te"),
      seoDescEn: getLocalizedText(service.seoDescription, "en"),
      seoDescTe: getLocalizedText(service.seoDescription, "te"),
    });
    setEditingId(service._id);
    setShowForm(true);
    setMessage({ type: "", text: "" });
    setImageFile(null);
    // Show existing background image as preview
    if (service.backgroundImage) {
      const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5001';
      setImagePreview(`${baseUrl}${service.backgroundImage}`);
    } else {
      setImagePreview("");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await API.delete(`/services/${id}`);
      fetchAll();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // --- Category handlers ---
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.nameEn.trim()) return;
    setCategoryLoading(true);
    setCategoryMessage({ type: "", text: "" });

    try {
      await API.post("/categories", {
        name: { en: categoryForm.nameEn, te: categoryForm.nameTe },
        mainCategory: categoryForm.mainCategory,
        icon: categoryForm.icon,
      });
      setCategoryMessage({ type: "success", text: "Category created!" });
      setCategoryForm({
        nameEn: "",
        nameTe: "",
        mainCategory: categoryForm.mainCategory,
        icon: "🔧",
      });
      fetchAll();
      setTimeout(() => setCategoryMessage({ type: "", text: "" }), 2000);
    } catch (err) {
      const msg = err.response?.data?.message
        || err.message
        || "Failed to create category";
      setCategoryMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await API.delete(`/categories/${id}`);
      fetchAll();
    } catch (err) {
      console.error("Delete category failed:", err);
    }
  };

  // --- Provider handlers ---
  const handleProviderStatus = async (id, status) => {
    try {
      await API.put(`/auth/providers/${id}/status`, { status });
      fetchAll();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  // --- Booking handlers ---
  const handleConfirmBooking = async (bookingId) => {
    const providerId = selectedProviders[bookingId];
    if (!providerId) return;

    try {
      await API.put(`/bookings/${bookingId}/confirm`, { providerId });
      setSelectedProviders((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      setConfirmMessage({
        type: "success",
        text: "Job request sent to provider! ⏳ Waiting for provider acceptance.",
      });
      setTimeout(() => setConfirmMessage({ type: "", text: "" }), 4000);
      fetchAll();
    } catch (err) {
      setConfirmMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to confirm booking",
      });
      setTimeout(() => setConfirmMessage({ type: "", text: "" }), 4000);
    }
  };

  // --- Reschedule handlers ---
  const openRescheduleModal = (booking) => {
    setRescheduleModal(booking);
    setRescheduleDate("");
    setRescheduleSlot("");
    setRescheduleReason("");
  };

  const handleAdminReschedule = async () => {
    if (!rescheduleDate || !rescheduleSlot) return;
    setRescheduleLoading(true);
    try {
      await API.put(`/bookings/${rescheduleModal._id}/admin-reschedule`, {
        newDate: rescheduleDate,
        newTimeSlot: rescheduleSlot,
        reason: rescheduleReason,
      });
      setConfirmMessage({ type: "success", text: "Reschedule proposal sent to customer! 📅" });
      setTimeout(() => setConfirmMessage({ type: "", text: "" }), 3000);
      setRescheduleModal(null);
      fetchAll();
    } catch (err) {
      setConfirmMessage({ type: "error", text: err.response?.data?.message || "Failed" });
      setTimeout(() => setConfirmMessage({ type: "", text: "" }), 4000);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleAdminRescheduleDecision = async (bookingId, accept) => {
    try {
      await API.put(`/bookings/${bookingId}/admin-reschedule-decision`, { accept });
      setConfirmMessage({
        type: "success",
        text: accept ? "Reschedule approved! Booking updated ✅" : "Reschedule rejected",
      });
      setTimeout(() => setConfirmMessage({ type: "", text: "" }), 3000);
      fetchAll();
    } catch (err) {
      setConfirmMessage({ type: "error", text: err.response?.data?.message || "Failed" });
      setTimeout(() => setConfirmMessage({ type: "", text: "" }), 4000);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const rescheduleRequests = bookings.filter(
    (b) => b.rescheduleRequest?.requestedBy === "customer" && b.rescheduleRequest?.status === "pending"
  );

  // --- Helpers ---
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getCategoryDisplay = (catName) => {
    const cat = categories.find((c) => getLocalizedText(c.name, "en") === catName);
    return cat ? `${cat.icon} ${getLocalizedText(cat.name, lang)}` : catName || "—";
  };

  // Bookings waiting for admin action (pending) or awaiting provider response
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const awaitingProviderBookings = bookings.filter((b) => b.status === "provider_requested");

  // Group categories by mainCategory
  const groupedCategories = {};
  mainCategories.forEach((mc) => {
    groupedCategories[mc.key] = categories.filter(
      (c) => c.mainCategory === mc.key
    );
  });

  const tabs = [
    { key: "bookings", label: "Bookings", icon: "📋", count: bookings.length },
    { key: "services", label: "Services", icon: "🔧", count: services.length },
    {
      key: "categories",
      label: "Categories",
      icon: "📂",
      count: categories.length,
    },
    {
      key: "providers",
      label: "Providers",
      icon: "👷",
      count: providers.length,
    },
    { key: "users", label: "Users", icon: "👥", count: users.length },
  ];

  return (
    <div className="page-container">
      <Navbar />

      <div className="page-content">
        <div className="page-header" style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 className="page-title">
              Admin <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="page-subtitle">Manage your marketplace</p>
          </div>
          <button 
            className="btn btn-outline notification-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ position: "relative" }}
          >
            🔔 Notifications
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="notifications-dropdown glass-card animate-fade-in" style={{ position: "absolute", top: "100%", right: "0", zIndex: 50, width: "340px", padding: "16px", marginTop: "12px", boxShadow: "var(--glass-shadow)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Notifications</h3>
                {unreadCount > 0 && (
                  <button className="btn btn-sm" onClick={markAllNotificationsRead} style={{ fontSize: "0.75rem", padding: "4px 8px" }}>Mark all read</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>No notifications yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "350px", overflowY: "auto", paddingRight: "4px" }}>
                  {notifications.map(n => (
                    <div 
                      key={n._id} 
                      onClick={() => { if(!n.isRead) markNotificationRead(n._id); }}
                      style={{ 
                        padding: "12px", 
                        borderRadius: "8px", 
                        background: n.isRead ? "transparent" : "rgba(99, 102, 241, 0.08)",
                        border: "1px solid",
                        borderColor: n.isRead ? "var(--glass-border)" : "var(--accent-primary)",
                        cursor: n.isRead ? "default" : "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", fontWeight: n.isRead ? "600" : "800", color: "var(--text-primary)" }}>{n.title}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>{n.message}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "6px" }}>{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`stat-card ${activeTab === tab.key ? 'active-stat-card' : ''}`}
              style={{ 
                cursor: "pointer", 
                transform: activeTab === tab.key ? "scale(1.02)" : "scale(1)",
                borderBottom: activeTab === tab.key ? "4px solid var(--accent-primary)" : "none",
                boxShadow: activeTab === tab.key ? "0 10px 30px rgba(99,102,241,0.15)" : "var(--glass-shadow)"
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              <div className="stat-value gradient-text">{tab.count}</div>
              <div className="stat-label">
                {tab.icon} {tab.label}
              </div>
            </div>
          ))}
        </div>



        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p className="loading-text">Loading data...</p>
          </div>
        ) : (
          <>
            {/* ====== SERVICES TAB ====== */}
            {activeTab === "services" && (
              <div className="animate-fade-in">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">
                    Manage Services ({services.length})
                  </h2>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      resetForm();
                      setShowForm(!showForm);
                    }}
                  >
                    <span>{showForm ? "Cancel" : "+ Add Service"}</span>
                  </button>
                </div>

                {showForm && (
                  <form className="admin-form" onSubmit={handleServiceSubmit}>
                    <h3 className="admin-form-title">
                      {editingId ? "✏️ Edit Service" : "➕ New Service"}
                    </h3>

                    {message.text && (
                      <div className={`message message-${message.type}`}>
                        {message.text}
                      </div>
                    )}

                    <div className="admin-form-grid">
                      <div className="form-group">
                        <label className="form-label">Title (English) *</label>
                        <input
                          type="text"
                          name="titleEn"
                          className="form-input"
                          placeholder="Service title in English"
                          value={form.titleEn}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Title (Telugu)</label>
                        <input
                          type="text"
                          name="titleTe"
                          className="form-input"
                          placeholder="సేవ శీర్షిక (తెలుగులో)"
                          value={form.titleTe}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Price (₹)</label>
                        <input
                          type="number"
                          name="price"
                          className="form-input"
                          placeholder="Enter price"
                          value={form.price}
                          onChange={handleChange}
                          required
                          min="1"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Category</label>
                        <select
                          name="category"
                          className="form-select"
                          value={form.category}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select category...</option>
                          {mainCategories.map((mc) => {
                            const subs = groupedCategories[mc.key] || [];
                            if (subs.length === 0) return null;
                            return (
                              <optgroup
                                key={mc.key}
                                label={`${mc.icon} ${mc.label}`}
                              >
                                {subs.map((cat) => (
                                  <option key={cat._id} value={getLocalizedText(cat.name, "en")}>
                                    {cat.icon} {getLocalizedText(cat.name, "en")}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description (English)</label>
                        <input
                          type="text"
                          name="descEn"
                          className="form-input"
                          placeholder="Brief description in English (optional)"
                          value={form.descEn}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description (Telugu)</label>
                        <input
                          type="text"
                          name="descTe"
                          className="form-input"
                          placeholder="వివరణ (తెలుగులో)"
                          value={form.descTe}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Rich Content Section */}
                      <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--glass-border)", paddingTop: 16, marginTop: 8 }}>
                        <h4 style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: 12 }}>📸 Rich Content (Optional)</h4>
                      </div>

                      {/* Service Background Image Upload */}
                      <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                        <label className="form-label">🖼️ Service Background Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          className="form-input"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setImageFile(file);
                              setImagePreview(URL.createObjectURL(file));
                            }
                          }}
                          style={{ padding: "10px" }}
                        />
                        {imagePreview && (
                          <div style={{ marginTop: 10, position: "relative", display: "inline-block" }}>
                            <img
                              src={imagePreview}
                              alt="Preview"
                              style={{
                                maxWidth: "100%",
                                maxHeight: 180,
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--glass-border)",
                                objectFit: "cover",
                              }}
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                            <button
                              type="button"
                              onClick={() => { setImageFile(null); setImagePreview(""); }}
                              style={{
                                position: "absolute",
                                top: 4,
                                right: 4,
                                background: "rgba(0,0,0,0.7)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "50%",
                                width: 24,
                                height: 24,
                                cursor: "pointer",
                                fontSize: "0.75rem",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        )}</div>
                      <div className="form-group">
                        <label className="form-label">Image URLs (one per line)</label>
                        <textarea
                          name="images"
                          className="form-input"
                          placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"}
                          value={form.images}
                          onChange={handleChange}
                          rows={3}
                          style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.8rem" }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Video URLs (one per line)</label>
                        <textarea
                          name="videos"
                          className="form-input"
                          placeholder={"https://youtube.com/embed/...\nhttps://youtube.com/embed/..."}
                          value={form.videos}
                          onChange={handleChange}
                          rows={2}
                          style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.8rem" }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Detailed Description (English)</label>
                        <textarea
                          name="detailsEn"
                          className="form-input"
                          placeholder="Detailed service description in English..."
                          value={form.detailsEn}
                          onChange={handleChange}
                          rows={3}
                          style={{ resize: "vertical" }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Detailed Description (Telugu)</label>
                        <textarea
                          name="detailsTe"
                          className="form-input"
                          placeholder="వివరణాత్మక వివరణ తెలుగులో..."
                          value={form.detailsTe}
                          onChange={handleChange}
                          rows={3}
                          style={{ resize: "vertical" }}
                        />
                      </div>

                      {/* Featured & Keywords */}
                      <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "600", marginBottom: "8px" }}>
                          <input
                            type="checkbox"
                            checked={form.isFeatured}
                            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                            style={{ width: "16px", height: "16px" }}
                          />
                          Mark as Featured Service ✨
                        </label>
                      </div>
                      
                      <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                        <label>Keywords (comma separated)</label>
                        <input
                          type="text"
                          className="form-input"
                          name="manualKeywords"
                          placeholder="e.g., pipe, leak, bathroom, tap"
                          value={form.manualKeywords}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Custom SEO Section */}
                      <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--glass-border)", paddingTop: 16, marginTop: 8 }}>
                        <h4 style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: 12 }}>🚀 Custom SEO Overrides (Optional)</h4>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12 }}>Leave blank to use the automatic SEO template.</p>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                          <div className="form-group">
                            <label className="form-label">SEO Title (English)</label>
                            <input
                              type="text"
                              className="form-input"
                              name="seoTitleEn"
                              placeholder="e.g., Best AC Repair in Chirala"
                              value={form.seoTitleEn}
                              onChange={handleChange}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">SEO Title (Telugu)</label>
                            <input
                              type="text"
                              className="form-input"
                              name="seoTitleTe"
                              placeholder="e.g., చీరాలలో ఉత్తమ ఏసీ రిపేర్"
                              value={form.seoTitleTe}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          <div className="form-group">
                            <label className="form-label">SEO Meta Description (English)</label>
                            <textarea
                              className="form-input"
                              name="seoDescEn"
                              placeholder="Brief description for Google search results..."
                              value={form.seoDescEn}
                              onChange={handleChange}
                              rows="2"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">SEO Meta Description (Telugu)</label>
                            <textarea
                              className="form-input"
                              name="seoDescTe"
                              placeholder="Google శోధన ఫలితాల కోసం వివరణ..."
                              value={form.seoDescTe}
                              onChange={handleChange}
                              rows="2"
                            />
                          </div>
                        </div>
                      </div>

                      {/* FAQ Section */}
                      <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--glass-border)", paddingTop: 16, marginTop: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <h4 style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>❓ FAQ (Bilingual)</h4>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setForm({ ...form, faq: [...form.faq, { question_en: "", answer_en: "", question_te: "", answer_te: "" }] })}
                            style={{ fontSize: "0.75rem" }}
                          >
                            + Add FAQ
                          </button>
                        </div>
                        {form.faq.map((item, idx) => (
                          <div key={idx} style={{ marginBottom: 12, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>FAQ #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setForm({ ...form, faq: form.faq.filter((_, i) => i !== idx) })}
                                style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.8rem" }}
                              >
                                ✕ Remove
                              </button>
                            </div>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "8px" }}>
                              <div>
                                <h5 style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>English</h5>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Question (EN)"
                                  value={item.question_en}
                                  onChange={(e) => {
                                    const updatedFaq = [...form.faq];
                                    updatedFaq[idx] = { ...updatedFaq[idx], question_en: e.target.value };
                                    setForm({ ...form, faq: updatedFaq });
                                  }}
                                  style={{ marginBottom: 6 }}
                                />
                                <textarea
                                  className="form-input"
                                  placeholder="Answer (EN)"
                                  value={item.answer_en}
                                  onChange={(e) => {
                                    const updatedFaq = [...form.faq];
                                    updatedFaq[idx] = { ...updatedFaq[idx], answer_en: e.target.value };
                                    setForm({ ...form, faq: updatedFaq });
                                  }}
                                  rows={2}
                                  style={{ resize: "vertical" }}
                                />
                              </div>
                              
                              <div>
                                <h5 style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Telugu</h5>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Question (TE)"
                                  value={item.question_te}
                                  onChange={(e) => {
                                    const updatedFaq = [...form.faq];
                                    updatedFaq[idx] = { ...updatedFaq[idx], question_te: e.target.value };
                                    setForm({ ...form, faq: updatedFaq });
                                  }}
                                  style={{ marginBottom: 6 }}
                                />
                                <textarea
                                  className="form-input"
                                  placeholder="Answer (TE)"
                                  value={item.answer_te}
                                  onChange={(e) => {
                                    const updatedFaq = [...form.faq];
                                    updatedFaq[idx] = { ...updatedFaq[idx], answer_te: e.target.value };
                                    setForm({ ...form, faq: updatedFaq });
                                  }}
                                  rows={2}
                                  style={{ resize: "vertical" }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>                    <div className="admin-form-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={resetForm}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`btn btn-primary btn-sm ${
                          formLoading ? "btn-loading" : ""
                        }`}
                        disabled={formLoading}
                      >
                        <span>
                          {formLoading
                            ? "Saving..."
                            : editingId
                            ? "Update Service"
                            : "Create Service"}
                        </span>
                      </button>
                    </div>
                  </form>
                )}

                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Provider</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((service) => (
                        <tr key={service._id}>
                          <td>
                            <div>{getLocalizedText(service.title, "en")}</div>
                            {getLocalizedText(service.title, "te") && (
                              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                                {getLocalizedText(service.title, "te")}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="service-badge">
                              {getCategoryDisplay(service.category)}
                            </span>
                          </td>
                          <td
                            style={{
                              fontWeight: 700,
                              color: "var(--accent-primary)",
                            }}
                          >
                            ₹{service.price}
                          </td>
                          <td>{service.provider?.name || "—"}</td>
                          <td>
                            <div className="admin-actions">
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleEdit(service)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(service._id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ====== CATEGORIES TAB ====== */}
            {activeTab === "categories" && (
              <div className="animate-fade-in">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">
                    Manage Categories ({categories.length})
                  </h2>
                </div>

                {/* Add Category Form */}
                <form className="admin-form" onSubmit={handleCreateCategory}>
                  <h3 className="admin-form-title">➕ Add Subcategory</h3>

                  {categoryMessage.text && (
                    <div
                      className={`message message-${categoryMessage.type}`}
                    >
                      {categoryMessage.text}
                    </div>
                  )}

                    <div className="admin-form-grid">
                    <div className="form-group">
                      <label className="form-label">Subcategory Name (English) *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. AC Repair, Hair Styling"
                        value={categoryForm.nameEn}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            nameEn: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subcategory Name (Telugu)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="ఉప వర్గం పేరు (తెలుగులో)"
                        value={categoryForm.nameTe}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            nameTe: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Main Category</label>
                      <select
                        className="form-select"
                        value={categoryForm.mainCategory}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            mainCategory: e.target.value,
                          })
                        }
                      >
                        {mainCategories.map((mc) => (
                          <option key={mc.key} value={mc.key}>
                            {mc.icon} {mc.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Icon (emoji)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="🔧"
                        value={categoryForm.icon}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            icon: e.target.value,
                          })
                        }
                        style={{ maxWidth: 80 }}
                      />
                    </div>
                  </div>

                  <div className="admin-form-actions">
                    <button
                      type="submit"
                      className={`btn btn-primary btn-sm ${
                        categoryLoading ? "btn-loading" : ""
                      }`}
                      disabled={categoryLoading}
                    >
                      <span>
                        {categoryLoading ? "Adding..." : "Add Category"}
                      </span>
                    </button>
                  </div>
                </form>

                {/* Category Cards Grid */}
                <div className="categories-grid">
                  {mainCategories.map((mc) => {
                    const subs = groupedCategories[mc.key] || [];
                    return (
                      <div key={mc.key} className="category-card">
                        <div className="category-card-header">
                          <span className="category-card-icon">{mc.icon}</span>
                          <span className="category-card-title">
                            {mc.label}
                          </span>
                          <span className="category-card-count">
                            {subs.length} items
                          </span>
                        </div>
                        <div className="subcategory-list">
                          {subs.length === 0 ? (
                            <p className="subcategory-empty">
                              No subcategories yet
                            </p>
                          ) : (
                              subs.map((cat) => (
                              <div key={cat._id} className="subcategory-item">
                                <span className="subcategory-name">
                                  <span>{cat.icon}</span>
                                  {getLocalizedText(cat.name, "en")}
                                  {getLocalizedText(cat.name, "te") && (
                                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginLeft: 6 }}>
                                      ({getLocalizedText(cat.name, "te")})
                                    </span>
                                  )}
                                </span>
                                <button
                                  className="subcategory-delete"
                                  onClick={() => handleDeleteCategory(cat._id)}
                                  title="Delete"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ====== PROVIDERS TAB ====== */}
            {activeTab === "providers" && (
              <div className="animate-fade-in">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">
                    Manage Providers ({providers.length})
                  </h2>
                </div>

                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.map((provider) => (
                        <tr key={provider._id}>
                          <td>{provider.name}</td>
                          <td>{provider.mobile}</td>
                          <td>
                            <span className="service-badge">
                              {getCategoryDisplay(provider.category)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge badge-${provider.status}`}
                            >
                              {provider.status}
                            </span>
                          </td>
                          <td>
                            {provider.status === "active" ? (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() =>
                                  handleProviderStatus(
                                    provider._id,
                                    "suspended"
                                  )
                                }
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() =>
                                  handleProviderStatus(provider._id, "active")
                                }
                              >
                                Activate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ====== USERS TAB ====== */}
            {activeTab === "users" && (
              <div className="animate-fade-in">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">
                    Customers ({users.length})
                  </h2>
                </div>

                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Status</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td>{user.name}</td>
                          <td>{user.mobile}</td>
                          <td>
                            <span className={`badge badge-${user.status}`}>
                              {user.status}
                            </span>
                          </td>
                          <td>{formatDate(user.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ====== BOOKINGS TAB ====== */}
            {activeTab === "bookings" && (
              <div className="animate-fade-in">
                {confirmMessage.text && (
                  <div className={`message message-${confirmMessage.type}`}>
                    {confirmMessage.text}
                  </div>
                )}

                {/* Pending Bookings */}
                {pendingBookings.length > 0 && (
                  <>
                    <div className="admin-section-header">
                      <h2 className="admin-section-title">
                        ⏳ Pending Bookings — Assign Provider (
                        {pendingBookings.length})
                      </h2>
                    </div>

                    <div
                      className="admin-table-wrapper"
                      style={{ marginBottom: 36 }}
                    >
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Service</th>
                            <th>Customer</th>
                            <th>Date & Time</th>
                            <th>Assign Provider</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingBookings.map((booking) => {
                            const availableProviders = providers.filter(
                              (p) =>
                                p.category === booking.service?.category &&
                                p.status === "active"
                            );
                            return (
                              <tr key={booking._id}>
                                <td>
                                  {getLocalizedText(booking.service?.title, lang) || "—"}
                                  <br />
                                  <small
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    {getCategoryDisplay(
                                      booking.service?.category
                                    )}
                                  </small>
                                </td>
                                <td>
                                  {booking.customer?.name || "—"}
                                  <br />
                                  <small
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    {booking.customer?.mobile}
                                  </small>
                                  {booking.address && (
                                    <>
                                      <br />
                                      <small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                                        📍 {typeof booking.address === "string" ? (
                                          booking.address
                                        ) : (
                                          <>
                                            <strong>{booking.address.area}</strong> - {booking.address.fullAddress}
                                            {booking.address.landmark && ` (Near: ${booking.address.landmark})`}
                                          </>
                                        )}
                                      </small>
                                      {booking.location?.isProvided && (
                                        <div style={{ marginTop: 4 }}>
                                          <a 
                                            href={`https://www.google.com/maps?q=${booking.location.lat},${booking.location.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: "var(--accent-primary)", fontSize: "0.7rem", fontWeight: "700", textDecoration: "none" }}
                                          >
                                            🗺️ View Map
                                          </a>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </td>
                                <td>
                                  {formatDate(booking.date)}
                                  <br />
                                  <small
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    {booking.timeSlot}
                                  </small>
                                </td>
                                <td>
                                  <select
                                    className="form-select"
                                    value={
                                      selectedProviders[booking._id] || ""
                                    }
                                    onChange={(e) =>
                                      setSelectedProviders({
                                        ...selectedProviders,
                                        [booking._id]: e.target.value,
                                      })
                                    }
                                    style={{ minWidth: 180 }}
                                  >
                                    <option value="">
                                      Select provider...
                                    </option>
                                    {availableProviders.map((p) => (
                                      <option key={p._id} value={p._id}>
                                        {p.name} ({p.mobile})
                                      </option>
                                    ))}
                                    {availableProviders.length === 0 && (
                                      <option disabled>
                                        No providers in this category
                                      </option>
                                    )}
                                  </select>
                                </td>
                                <td>
                                  <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                                    <button
                                      className="btn btn-success btn-sm"
                                      onClick={() =>
                                        handleConfirmBooking(booking._id)
                                      }
                                      disabled={
                                        !selectedProviders[booking._id]
                                      }
                                    >
                                      ✓ Confirm
                                    </button>
                                    <button
                                      className="btn btn-warning btn-sm"
                                      onClick={() => openRescheduleModal(booking)}
                                    >
                                      🔁 Reschedule
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Awaiting Provider Acceptance */}
                {awaitingProviderBookings.length > 0 && (
                  <>
                    <div className="admin-section-header">
                      <h2 className="admin-section-title" style={{ color:"#f59e0b" }}>
                        ⏳ Awaiting Provider Acceptance ({awaitingProviderBookings.length})
                      </h2>
                      <p style={{ fontSize:"0.82rem", color:"var(--text-muted)", margin:"4px 0 0" }}>These bookings have been sent to a provider and are waiting for their acceptance.</p>
                    </div>
                    <div className="admin-table-wrapper" style={{ marginBottom: 36 }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Service</th>
                            <th>Customer</th>
                            <th>Date & Time</th>
                            <th>Assigned Provider</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {awaitingProviderBookings.map((booking) => (
                            <tr key={booking._id} style={{ borderLeft:"3px solid #f59e0b" }}>
                              <td>{getLocalizedText(booking.service?.title, lang) || "—"}</td>
                              <td>
                                {booking.customer?.name || "—"}<br/>
                                <small style={{ color:"var(--text-muted)" }}>{booking.customer?.mobile}</small>
                              </td>
                              <td>
                                {formatDate(booking.date)}<br/>
                                <small style={{ color:"var(--text-muted)" }}>{booking.timeSlot}</small>
                              </td>
                              <td>
                                <strong>{booking.provider?.name || "—"}</strong><br/>
                                <small style={{ color:"var(--text-muted)" }}>{booking.provider?.mobile}</small>
                              </td>
                              <td>
                                <span style={{ fontSize:"0.75rem", fontWeight:"700", color:"#f59e0b", background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:"20px", padding:"3px 10px" }}>
                                  ⏳ Awaiting Provider
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-warning btn-sm"
                                  onClick={() => openRescheduleModal(booking)}
                                >
                                  🔁 Reschedule
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Customer Reschedule Requests */}
                {rescheduleRequests.length > 0 && (
                  <>
                    <div className="admin-section-header">
                      <h2 className="admin-section-title">
                        🔁 Reschedule Requests ({rescheduleRequests.length})
                      </h2>
                    </div>
                    <div className="admin-table-wrapper" style={{ marginBottom: 36 }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Service</th>
                            <th>Customer</th>
                            <th>Current Date</th>
                            <th>Requested Date</th>
                            <th>Reason</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rescheduleRequests.map((booking) => (
                            <tr key={booking._id}>
                              <td>{getLocalizedText(booking.service?.title, lang) || "—"}</td>
                              <td>
                                {booking.customer?.name || "—"}
                                <br />
                                <small style={{ color: "var(--text-muted)" }}>
                                  {booking.customer?.mobile}
                                </small>
                              </td>
                              <td>
                                {formatDate(booking.date)}
                                <br />
                                <small style={{ color: "var(--text-muted)" }}>
                                  {booking.timeSlot}
                                </small>
                              </td>
                              <td>
                                <strong style={{ color: "var(--warning)" }}>
                                  {formatDate(booking.rescheduleRequest.newDate)}
                                </strong>
                                <br />
                                <small style={{ color: "var(--warning)" }}>
                                  {booking.rescheduleRequest.newTimeSlot}
                                </small>
                              </td>
                              <td>
                                <small style={{ color: "var(--text-muted)" }}>
                                  {booking.rescheduleRequest.reason || "—"}
                                </small>
                              </td>
                              <td>
                                <div className="admin-actions">
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => handleAdminRescheduleDecision(booking._id, true)}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleAdminRescheduleDecision(booking._id, false)}
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* All Bookings */}
                <div className="admin-section-header">
                  <h2 className="admin-section-title">
                    All Bookings ({bookings.length})
                  </h2>
                </div>

                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Customer</th>
                        <th>Provider</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Rating</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking._id}>
                          <td>{getLocalizedText(booking.service?.title, lang) || "—"}</td>
                          <td>
                            {booking.customer?.name || "—"}
                            <br />
                            <small style={{ color: "var(--text-muted)" }}>
                              {booking.customer?.mobile}
                            </small>
                          </td>
                          <td>
                            {booking.provider?.name || (
                              <span
                                style={{
                                  color: "var(--warning)",
                                  fontWeight: 600,
                                  fontSize: "0.82rem",
                                }}
                              >
                                ⏳ Awaiting assignment
                              </span>
                            )}
                            {booking.provider && (
                              <>
                                <br />
                                <small style={{ color: "var(--text-muted)" }}>
                                  {booking.provider?.mobile}
                                </small>
                              </>
                            )}
                          </td>
                          <td>
                            {formatDate(booking.date)}
                            <br />
                            <small style={{ color: "var(--text-muted)" }}>
                              {booking.timeSlot}
                            </small>
                          </td>
                          <td>
                            <span
                              className={`badge badge-${booking.status}`}
                            >
                              {booking.status}
                            </span>
                            {booking.status === "confirmed" && booking.serviceStatus && booking.serviceStatus !== "confirmed" && (
                              <>
                                <br />
                                <span
                                  style={{
                                    display: "inline-block",
                                    marginTop: 4,
                                    padding: "2px 8px",
                                    fontSize: "0.7rem",
                                    fontWeight: 600,
                                    borderRadius: 12,
                                    background: booking.serviceStatus === "in_progress" ? "rgba(99, 102, 241, 0.15)" : booking.serviceStatus === "arrived" ? "rgba(59, 130, 246, 0.15)" : booking.serviceStatus === "on_the_way" ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                                    color: booking.serviceStatus === "in_progress" ? "var(--accent-primary)" : booking.serviceStatus === "arrived" ? "var(--info)" : booking.serviceStatus === "on_the_way" ? "var(--warning)" : "var(--success)",
                                  }}
                                >
                                  {{
                                    provider_assigned: "✅ Assigned",
                                    on_the_way: "🚗 On the way",
                                    arrived: "📍 Arrived",
                                    in_progress: "🔧 In progress",
                                  }[booking.serviceStatus] || booking.serviceStatus}
                                </span>
                              </>
                            )}
                            {booking.rescheduleRequest?.status === "pending" && (
                              <br />
                            )}
                            {booking.rescheduleRequest?.status === "pending" && (
                              <small style={{ color: "var(--warning)", fontSize: "0.72rem" }}>
                                🔁 Reschedule {booking.rescheduleRequest.requestedBy === "customer" ? "requested" : "proposed"}
                              </small>
                            )}
                          </td>
                          <td>
                            {ratedBookings.has(booking._id) ? (
                              <div>
                                <div style={{ display: "flex", gap: 1, marginBottom: 2 }}>
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <span key={s} style={{ fontSize: "0.7rem", filter: s <= (ratedBookings.get(booking._id)?.rating || 0) ? "none" : "grayscale(1) opacity(0.3)" }}>⭐</span>
                                  ))}
                                </div>
                                {ratedBookings.get(booking._id)?.review && (
                                  <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontStyle: "italic", margin: 0, maxWidth: 120 }}>
                                    "{ratedBookings.get(booking._id).review}"
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>—</span>
                            )}
                          </td>
                          <td>
                            {["pending", "confirmed"].includes(booking.status) && !booking.rescheduleRequest?.status && (
                              <button
                                className="btn btn-warning btn-sm"
                                onClick={() => openRescheduleModal(booking)}
                              >
                                🔁 Reschedule
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="modal-overlay" onClick={() => setRescheduleModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setRescheduleModal(null)}>✕</button>
            <h2 className="modal-title">🔁 Propose Reschedule</h2>
            <p className="modal-subtitle">
              {getLocalizedText(rescheduleModal.service?.title, lang)} • {rescheduleModal.customer?.name}
              <br />
              Current: {formatDate(rescheduleModal.date)}, {rescheduleModal.timeSlot}
            </p>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">New Date</label>
              <input
                type="date"
                className="form-input"
                min={getMinDate()}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">New Time Slot</label>
              <div className="time-slots">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`time-slot ${rescheduleSlot === slot ? "active" : ""}`}
                    onClick={() => setRescheduleSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Reason (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Provider unavailable on original date"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setRescheduleModal(null)} style={{ flex: 1 }}>Cancel</button>
              <button
                className={`btn btn-primary ${rescheduleLoading ? "btn-loading" : ""}`}
                onClick={handleAdminReschedule}
                disabled={rescheduleLoading}
                style={{ flex: 2 }}
              >
                <span>{rescheduleLoading ? "Sending..." : "Send Proposal"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
