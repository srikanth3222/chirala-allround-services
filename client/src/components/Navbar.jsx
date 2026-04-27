import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const name = localStorage.getItem("userName");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Sticky shadow on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleLogout = () => {
    localStorage.clear();
    localStorage.setItem("servex_lang", i18n.language);
    navigate("/login");
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;
  const changeLang = (lng) => { i18n.changeLanguage(lng); };
  const closeMenu = () => setMenuOpen(false);

  const homeLink = token
    ? role === "customer" ? "/home" : role === "provider" ? "/provider" : "/admin"
    : "/login";

  return (
    <>
    <nav className={`navbar${scrolled ? " navbar--scrolled" : ""}`} role="navigation" aria-label="Main navigation">

      {/* ─── TOP BAR ─── */}
      <div className="navbar-top">

        {/* LEFT: Logo + brand (brand text hidden on mobile) */}
        <Link to={homeLink} className="navbar-logo" onClick={closeMenu} aria-label="Chirala Allround Services home">
          <img src="/assets/logo.png" alt="Chirala Allround Services logo" className="navbar-logo-img" />
          <span className="navbar-logo-text">
            <span className="brand-chirala">Chirala</span>{" "}
            <span className="brand-allround">Allround Services</span>
          </span>
        </Link>

        {/* CENTER: Welcome — desktop only */}
        {token && name && (
          <div className="navbar-welcome navbar-welcome--desktop">
            <span className="navbar-welcome-label">{t("nav.welcome")}</span>
            <span className="navbar-welcome-name">{name}</span>
          </div>
        )}

        {/* RIGHT: Desktop links + lang + hamburger */}
        <div className="navbar-top-actions">

          {/* Desktop nav links */}
          <div className="navbar-desktop-links">
            {(!token || role === "customer") && (
              <Link to="/home" className={`navbar-link ${isActive("/home") ? "active" : ""}`}>
                {t("nav.services")}
              </Link>
            )}
            {!token ? (
              <>
                <Link to="/login" className={`navbar-link ${isActive("/login") ? "active" : ""}`}>{t("nav.login")}</Link>
                <Link to="/register" className={`navbar-link ${isActive("/register") ? "active" : ""}`}>{t("nav.register")}</Link>
              </>
            ) : (
              <>
                {role === "customer" && (
                  <>
                    <Link to="/my-bookings" className={`navbar-link ${isActive("/my-bookings") ? "active" : ""}`}>{t("nav.my_bookings")}</Link>
                    <Link to="/my-profile" className={`navbar-link ${isActive("/my-profile") ? "active" : ""}`}>{t("nav.my_profile")}</Link>
                    <Link to="/my-wallet" className={`navbar-link ${isActive("/my-wallet") ? "active" : ""}`}>💰 {t("nav.wallet")}</Link>
                  </>
                )}
                {role === "provider" && (
                  <Link to="/provider" className={`navbar-link ${isActive("/provider") ? "active" : ""}`}>{t("nav.dashboard")}</Link>
                )}
                {role === "admin" && (
                  <Link to="/admin" className={`navbar-link ${isActive("/admin") ? "active" : ""}`}>{t("nav.dashboard")}</Link>
                )}
                <button onClick={handleLogout} className="btn-logout">{t("nav.logout")}</button>
              </>
            )}
          </div>

          {/* Language Toggle — compact globe style on mobile */}
          <div className="lang-switcher" role="group" aria-label="Language selection">
            <button
              className={`lang-btn ${i18n.language === "en" ? "active" : ""}`}
              onClick={() => changeLang("en")}
              aria-label="Switch to English"
              aria-pressed={i18n.language === "en"}
            >
              <span className="lang-globe" aria-hidden="true">🌐</span>
              <span className="lang-label">EN</span>
            </button>
            <button
              className={`lang-btn ${i18n.language === "te" ? "active" : ""}`}
              onClick={() => changeLang("te")}
              aria-label="Switch to Telugu"
              aria-pressed={i18n.language === "te"}
            >
              <span className="lang-label">తె</span>
            </button>
          </div>

          {/* Hamburger — mobile only */}
          <button
            className={`navbar-hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>

    {/* ─── MOBILE DRAWER — rendered OUTSIDE <nav> to escape backdrop-filter stacking context ─── */}
    <div
      id="mobile-menu"
      className={`navbar-drawer ${menuOpen ? "open" : ""}`}
      aria-hidden={!menuOpen}
    >
      {/* Greeting inside drawer */}
      {token && name && (
        <div className="drawer-greeting">
          <span className="drawer-greeting-icon">🙏</span>
          <div>
            <div className="drawer-greeting-label">{t("nav.welcome")}</div>
            <div className="drawer-greeting-name">{name}</div>
          </div>
          {role && (
            <span className="drawer-role-badge">{t(`roles.${role}`)}</span>
          )}
        </div>
      )}

      {/* Menu links */}
      <nav className="drawer-links" aria-label="Mobile navigation">
        {(!token || role === "customer") && (
          <Link to="/home" className={`drawer-link ${isActive("/home") ? "active" : ""}`} onClick={closeMenu}>
            <span className="drawer-link-icon">🛠️</span> {t("nav.services")}
          </Link>
        )}
        {!token ? (
          <>
            <Link to="/login" className={`drawer-link ${isActive("/login") ? "active" : ""}`} onClick={closeMenu}>
              <span className="drawer-link-icon">🔑</span> {t("nav.login")}
            </Link>
            <Link to="/register" className={`drawer-link ${isActive("/register") ? "active" : ""}`} onClick={closeMenu}>
              <span className="drawer-link-icon">📝</span> {t("nav.register")}
            </Link>
          </>
        ) : (
          <>
            {role === "customer" && (
              <>
                <Link to="/my-bookings" className={`drawer-link ${isActive("/my-bookings") ? "active" : ""}`} onClick={closeMenu}>
                  <span className="drawer-link-icon">📋</span> {t("nav.my_bookings")}
                </Link>
                <Link to="/my-profile" className={`drawer-link ${isActive("/my-profile") ? "active" : ""}`} onClick={closeMenu}>
                  <span className="drawer-link-icon">👤</span> {t("nav.my_profile")}
                </Link>
                <Link to="/my-wallet" className={`drawer-link ${isActive("/my-wallet") ? "active" : ""}`} onClick={closeMenu}>
                  <span className="drawer-link-icon">💰</span> {t("nav.wallet")}
                </Link>
              </>
            )}
            {role === "provider" && (
              <Link to="/provider" className={`drawer-link ${isActive("/provider") ? "active" : ""}`} onClick={closeMenu}>
                <span className="drawer-link-icon">📊</span> {t("nav.dashboard")}
              </Link>
            )}
            {role === "admin" && (
              <Link to="/admin" className={`drawer-link ${isActive("/admin") ? "active" : ""}`} onClick={closeMenu}>
                <span className="drawer-link-icon">⚙️</span> {t("nav.dashboard")}
              </Link>
            )}
            <button onClick={handleLogout} className="drawer-logout">
              <span className="drawer-link-icon">🚪</span> {t("nav.logout")}
            </button>
          </>
        )}
      </nav>
    </div>

    {/* Overlay backdrop */}
    {menuOpen && (
      <div className="navbar-overlay" onClick={closeMenu} aria-hidden="true" />
    )}
  </>
  );
};

export default Navbar;

