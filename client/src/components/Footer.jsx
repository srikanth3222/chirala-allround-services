import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const Footer = () => {
  const { t } = useTranslation();

  const linkStyle = {
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontSize: "0.95rem",
    lineHeight: "1.8",
    transition: "color 0.2s",
  };

  const headingStyle = {
    fontSize: "0.8rem",
    fontWeight: "700",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--text-primary)",
    marginBottom: "16px",
    marginTop: 0,
  };

  return (
    <>
      <style>{`
        .footer-link:hover { color: var(--primary) !important; }
        .social-icon-fb, .social-icon-ig, .social-icon-yt {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 0.95rem;
          transition: color 0.2s, transform 0.2s;
        }
        .social-icon-fb:hover { color: #1877F2 !important; transform: translateX(4px); }
        .social-icon-ig:hover { color: #E1306C !important; transform: translateX(4px); }
        .social-icon-yt:hover { color: #FF0000 !important; transform: translateX(4px); }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .footer-container {
            padding-top: 32px !important;
          }
          .footer-brand-section {
            padding-bottom: 20px !important;
            margin-bottom: 20px !important;
          }
          .footer-brand-logo {
            width: 40px !important;
            height: 40px !important;
          }
          .footer-brand-title {
            font-size: 1.2rem !important;
          }
          .footer-grid {
            gap: 20px !important;
            margin-bottom: 24px !important;
          }
          .social-icons-container {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .social-icon-text {
            display: inline-block !important;
            font-size: 0.9rem;
          }
          .social-icon-fb:hover, .social-icon-ig:hover, .social-icon-yt:hover {
            transform: translateY(-2px) !important;
          }
        }
      `}</style>

      <footer className="footer-container" style={{
        backgroundColor: "var(--surface)",
        borderTop: "1px solid var(--glass-border)",
        paddingTop: "56px",
        paddingBottom: "0",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>

          {/* ── Row 1: Brand Centered ── */}
          <div className="footer-brand-section" style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            paddingBottom: "40px",
            borderBottom: "1px solid var(--glass-border)",
            marginBottom: "40px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
              <img
                src="/assets/logo.png"
                alt="Chirala Allround Services Logo"
                className="footer-brand-logo"
                style={{ width: "52px", height: "52px", borderRadius: "10px" }}
              />
              <h2 className="footer-brand-title" style={{ fontSize: "1.5rem", color: "var(--text-primary)", margin: 0 }}>
                Chirala Allround Services
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: "540px", margin: 0, lineHeight: "1.6" }}>
              {t("footer.tagline")}
            </p>
          </div>

          {/* ── Row 2: Four Columns ── */}
          <div className="footer-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "40px",
            marginBottom: "48px",
          }}>

            {/* Column 1 — Company */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <h4 style={headingStyle}>{t("footer.company")}</h4>
              <Link to="/about" className="footer-link" style={linkStyle}>{t("about.title")}</Link>
              <Link to="/privacy-policy" className="footer-link" style={linkStyle}>{t("privacy.title")}</Link>
              <Link to="/terms" className="footer-link" style={linkStyle}>{t("terms.title")}</Link>
              <Link to="/contact" className="footer-link" style={linkStyle}>{t("contact.title")}</Link>
            </div>

            {/* Column 2 — For Customers */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <h4 style={headingStyle}>{t("footer.for_customers")}</h4>
              <Link to="/home" className="footer-link" style={linkStyle}>{t("footer.home")}</Link>
              <Link to="/my-bookings" className="footer-link" style={linkStyle}>{t("footer.my_bookings")}</Link>
              <Link to="/help" className="footer-link" style={linkStyle}>{t("help.title")}</Link>
            </div>

            {/* Column 3 — For Professionals */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <h4 style={headingStyle}>{t("footer.for_professionals")}</h4>
              <Link to="/become-a-professional" className="footer-link" style={linkStyle}>
                {t("provider.title")}
              </Link>
            </div>

            {/* Column 4 — Follow Us */}
            <div className="social-icons-container" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <h4 style={headingStyle}>{t("footer.social_links")}</h4>

              {/* Facebook – placeholder href, replace with real URL */}
              <a href="https://www.facebook.com/chiralaallroundservices/" className="social-icon-fb" aria-label="Facebook" target="_blank">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M22.675 0h-21.35C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12V24h6.116C23.407 24 24 23.407 24 22.675V1.325C24 .593 23.407 0 22.675 0z" />
                </svg>
                <span className="social-icon-text">Facebook</span>
              </a>

              {/* Instagram – placeholder href, replace with real URL */}
              <a href="https://www.instagram.com/chiralaallroundservices/" className="social-icon-ig" aria-label="Instagram" target="_blank">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                <span className="social-icon-text">Instagram</span>
              </a>

              {/* YouTube – placeholder href, replace with real URL */}
              <a href="https://www.youtube.com/@ChiralaAllroundServices" className="social-icon-yt" aria-label="YouTube" target="_blank">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span className="social-icon-text">YouTube</span>
              </a>
            </div>

          </div>

          {/* ── Bottom Bar ── */}
          <div style={{
            borderTop: "1px solid var(--glass-border)",
            padding: "20px 0",
            textAlign: "center",
          }}>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem" }}>
              © {new Date().getFullYear()} Chirala Allround Services. {t("footer.all_rights")}
            </p>
          </div>

        </div>
      </footer>
    </>
  );
};

export default Footer;
