import React from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SEO from "../../components/SEO";

const Contact = () => {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <SEO 
        title={t("contact.title")} 
        description={t("contact.desc")} 
      />
      <Navbar />
      <div className="page-content" style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ marginBottom: "16px", color: "var(--text-primary)", fontSize: "2.5rem" }}>{t("contact.title")}</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", marginBottom: "40px" }}>{t("contact.desc")}</p>
        
        {/* WhatsApp Primary CTA */}
        <div style={{ background: "rgba(37, 211, 102, 0.1)", padding: "40px 20px", borderRadius: "16px", border: "1px solid #25D366", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "var(--text-primary)" }}>{t("contact.get_in_touch")}</h2>
          <a 
            href="https://wa.me/918187870369?text=Hi%20I%20need%20a%20service%20in%20Chirala"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              background: "#25D366",
              color: "#fff",
              padding: "16px 32px",
              borderRadius: "50px",
              textDecoration: "none",
              fontSize: "1.2rem",
              fontWeight: "600",
              boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)"
            }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
            {t("contact.whatsapp_btn")}
          </a>
        </div>

        {/* Other Contact Options */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px", marginBottom: "40px" }}>
          
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "24px", borderRadius: "12px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "16px" }}>📞</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", color: "var(--text-primary)" }}>{t("contact.call_us")}</h3>
            <a href="tel:+918187870369" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "1.1rem" }}>
              +91 81878 70369
            </a>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", padding: "24px", borderRadius: "12px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "16px" }}>✉️</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", color: "var(--text-primary)" }}>{t("contact.email_us")}</h3>
            <a href="mailto:info@chiralaallroundservices.in" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "1.1rem", wordBreak: "break-all" }}>
              info@chiralaallroundservices.in
            </a>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", padding: "24px", borderRadius: "12px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "16px" }}>📍</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", color: "var(--text-primary)" }}>{t("contact.location_title")}</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", margin: 0 }}>
              {t("contact.loc_text")}
            </p>
          </div>

        </div>

        {/* Contact Form */}
        <div style={{ background: "rgba(255,255,255,0.02)", padding: "32px", borderRadius: "16px", border: "1px solid var(--glass-border)", textAlign: "left" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "var(--text-primary)" }}>{t("contact.or_send_message")}</h2>
          <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <input type="text" placeholder={t("contact.name_ph")} className="form-input" />
            <input type="email" placeholder={t("contact.email_ph")} className="form-input" />
            <textarea placeholder={t("contact.msg_ph")} className="form-input" rows="5" style={{ resize: "vertical" }}></textarea>
            <button type="button" className="btn-primary" style={{ alignSelf: "flex-start", padding: "12px 32px", fontSize: "1.1rem" }}>
              {t("contact.submit")}
            </button>
          </form>
        </div>
        
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
