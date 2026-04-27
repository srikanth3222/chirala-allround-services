import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";

const CustomerProfile = () => {
  const { t } = useTranslation();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "", email: "", fullAddress: "", area: "", landmark: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const fetchProfile = async () => {
    try {
      const res = await API.get("/auth/me");
      const u = res.data.user;
      setProfile(u);
      setForm({
        name: u.name || "",
        email: u.email || "",
        fullAddress: u.address?.fullAddress || "",
        area: u.address?.area || "",
        landmark: u.address?.landmark || "",
      });
    } catch (_) {
      setMsg({ type: "error", text: "Failed to load profile" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      await API.put("/auth/me", {
        name: form.name,
        email: form.email,
        address: {
          fullAddress: form.fullAddress,
          area: form.area,
          landmark: form.landmark,
        },
      });
      setMsg({ type: "success", text: t("profile.save_success") });
      fetchProfile();
      setTimeout(() => setMsg({ type: "", text: "" }), 4000);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || t("profile.save_failed") });
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="page-wrapper">
      <SEO title={t("profile.title")} description={t("profile.subtitle")} />
      <Navbar />

      <div className="page-content" style={{ maxWidth: 680, margin: "0 auto", padding: "80px 20px" }}>

        {/* Page Header */}
        <div className="page-header animate-fade-in" style={{ marginBottom: 32 }}>
          <h1 className="page-title">
            {t("profile.title").split(" ")[0]}{" "}
            <span className="gradient-text">{t("profile.title").split(" ").slice(1).join(" ")}</span>
          </h1>
          <p className="page-subtitle">{t("profile.subtitle")}</p>
        </div>

        {/* Avatar Card */}
        <div className="animate-fade-in" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: "24px", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.9rem", fontWeight: "800", color: "#fff", flexShrink: 0,
            boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
          }}>
            {(profile?.name || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: "700", fontSize: "1.2rem", color: "var(--text-primary)" }}>{profile?.name}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 3 }}>{profile?.mobile}</div>
            <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "20px", padding: "3px 12px" }}>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: "700" }}>✅ {t("profile.avatar_role")}</span>
            </div>
          </div>
        </div>

        {/* Message */}
        {msg.text && (
          <div className={`message message-${msg.type}`} style={{ marginBottom: 20 }}>{msg.text}</div>
        )}

        {/* Personal Information */}
        <div className="animate-fade-in" style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", padding: "24px", marginBottom: 20, boxShadow: "var(--glass-shadow)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            👤 {t("profile.personal_info")}
          </h2>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">{t("profile.full_name")}</label>
              <input
                type="text" className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("profile.full_name_ph")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("profile.mobile")}</label>
              <input
                type="text" className="form-input"
                value={profile?.mobile || ""}
                disabled
                style={{ opacity: 0.55, cursor: "not-allowed" }}
              />
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 5 }}>
                🔒 {t("profile.mobile_readonly")}
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">{t("profile.email")}</label>
              <input
                type="email" className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t("profile.email_ph")}
              />
            </div>
          </div>
        </div>

        {/* Saved Address */}
        <div className="animate-fade-in" style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", padding: "24px", marginBottom: 28, boxShadow: "var(--glass-shadow)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            📍 {t("profile.saved_address")}
          </h2>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 18 }}>{t("profile.saved_address_hint")}</p>
          <div style={{ display: "grid", gap: 14 }}>
            <div className="form-group">
              <label className="form-label">{t("profile.full_address")}</label>
              <textarea
                className="form-input" rows={2}
                value={form.fullAddress}
                onChange={(e) => setForm({ ...form, fullAddress: e.target.value })}
                placeholder={t("profile.full_address_ph")}
                style={{ resize: "vertical" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="form-group">
                <label className="form-label">{t("profile.area")} *</label>
                <input
                  type="text" className="form-input"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder={t("profile.area_ph")}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("profile.landmark")}</label>
                <input
                  type="text" className="form-input"
                  value={form.landmark}
                  onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  placeholder={t("profile.landmark_ph")}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          className={`btn btn-primary btn-full ${saving ? "btn-loading" : ""}`}
          onClick={handleSave}
          disabled={saving}
        >
          <span>{saving ? t("profile.saving") : `💾 ${t("profile.save_btn")}`}</span>
        </button>
      </div>

      <Footer />
    </div>
  );
};

export default CustomerProfile;
