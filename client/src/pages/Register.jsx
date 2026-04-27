import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import API from "../utils/api";
import { getLocalizedText } from "../utils/i18nHelpers";

const mainCategories = [
  { key: "home", label: "Home", icon: "🏠" },
  { key: "personal", label: "Personal", icon: "👤" },
  { key: "events", label: "Events", icon: "🎉" },
  { key: "catering", label: "Catering", icon: "🍽️" },
  { key: "more", label: "More...", icon: "➕" },
];

const Register = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    password: "",
    role: "customer",
    category: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await API.get("/categories");
        setCategories(res.data.categories);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        mobile: `+91${form.mobile}`,
        password: form.password,
        role: form.role,
      };

      if (form.role === "provider") {
        payload.category = form.category;
      }

      const res = await API.post("/auth/register", payload);

      // Store auth data
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.user.id);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("userName", res.data.user.name);

      // Redirect based on role
      if (res.data.user.role === "customer") navigate("/home");
      else if (res.data.user.role === "provider") navigate("/provider");
      else navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-auth-container">
      <div className="auth-mesh-bg" />

      <div className="auth-content-wrapper">
        {/* Top Nav */}
        <div className="auth-top-nav animate-fade-in">
          <div className="auth-brand">
            <img src="/assets/logo.png" alt="Logo" className="brand-icon-img" />
            <span className="brand-name">Chirala Allround Services</span>
          </div>
          <div className="auth-lang-switcher">
            <button className={`lang-pill ${i18n.language === "en" ? "active" : ""}`} onClick={() => i18n.changeLanguage("en")}>EN</button>
            <button className={`lang-pill ${i18n.language === "te" ? "active" : ""}`} onClick={() => i18n.changeLanguage("te")}>తెలుగు</button>
          </div>
        </div>

        <div className="auth-glass-card animate-scale-in" style={{ maxWidth: "480px" }}>
          <div className="auth-card-header">
            <h1 className="auth-title">{t("auth.create_account")}</h1>
            <p className="auth-subtitle">Join our community today and start exploring services.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form-body">
            {error && <div className="auth-alert alert-error animate-shake">{error}</div>}

            <div className="premium-input-group">
              <label className="input-label">{t("auth.full_name")}</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  name="name"
                  className="premium-input"
                  placeholder={t("auth.enter_full_name")}
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="premium-input-group">
              <label className="input-label">{t("auth.mobile_number")}</label>
              <div className="input-wrapper">
                <span className="input-icon">📱</span>
                <span className="country-code">+91</span>
                <input
                  type="tel"
                  name="mobile"
                  className="premium-input"
                  placeholder="00000 00000"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div className="premium-input-group">
              <label className="input-label">{t("auth.password")}</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  name="password"
                  className="premium-input"
                  placeholder={t("auth.min_6_chars")}
                  value={form.password}
                  onChange={handleChange}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="premium-input-group">
              <label className="input-label">{t("auth.i_am_a")}</label>
              <div className="input-wrapper">
                <span className="input-icon">💼</span>
                <select name="role" className="premium-select" value={form.role} onChange={handleChange}>
                  <option value="customer">{t("auth.customer")}</option>
                  <option value="provider">{t("auth.service_provider")}</option>
                </select>
              </div>
            </div>

            {form.role === "provider" && (
              <div className="premium-input-group animate-slide-down">
                <label className="input-label">{t("auth.service_category")}</label>
                <div className="input-wrapper">
                  <span className="input-icon">🛠️</span>
                  <select name="category" className="premium-select" value={form.category} onChange={handleChange} required>
                    <option value="">{t("auth.select_category")}</option>
                    {mainCategories.map((mc) => {
                      const subs = categories.filter((c) => c.mainCategory === mc.key);
                      if (subs.length === 0) return null;
                      return (
                        <optgroup key={mc.key} label={`${mc.icon} ${mc.label}`}>
                          {subs.map((cat) => (
                            <option key={cat._id} value={getLocalizedText(cat.name, "en")}>
                              {cat.icon} {getLocalizedText(cat.name, lang)}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            <button type="submit" className={`premium-btn btn-primary ${loading ? "loading" : ""}`} disabled={loading}>
              <span>{loading ? t("auth.creating_account") : t("auth.create_account_btn")}</span>
            </button>
          </form>

          <div className="auth-card-footer">
            <p>{t("auth.already_have_account")} <Link to="/login" className="highlight-link">{t("auth.sign_in_link")}</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
