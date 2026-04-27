import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SEO from "../../components/SEO";

const Help = () => {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <SEO 
        title={t("help.title")} 
        description={t("help.desc")} 
      />
      <Navbar />
      <div className="page-content" style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "24px", color: "var(--text-primary)" }}>{t("help.title")}</h1>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
          
          <details style={{ background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
            <summary style={{ cursor: "pointer", fontWeight: "600", color: "var(--text-primary)" }}>{t("help.q1")}</summary>
            <p style={{ marginTop: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              {t("help.a1")}
            </p>
          </details>

          <details style={{ background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
            <summary style={{ cursor: "pointer", fontWeight: "600", color: "var(--text-primary)" }}>{t("help.q2")}</summary>
            <p style={{ marginTop: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              {t("help.a2")}
            </p>
          </details>

          <details style={{ background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
            <summary style={{ cursor: "pointer", fontWeight: "600", color: "var(--text-primary)" }}>{t("help.q3")}</summary>
            <p style={{ marginTop: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              {t("help.a3")}
            </p>
          </details>

          <details style={{ background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
            <summary style={{ cursor: "pointer", fontWeight: "600", color: "var(--text-primary)" }}>{t("help.q4")}</summary>
            <p style={{ marginTop: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              {t("help.a4")}
            </p>
          </details>

        </div>

        <div style={{ padding: "24px", background: "rgba(29, 78, 216, 0.05)", borderRadius: "12px", border: "1px solid var(--primary)" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "8px", color: "var(--text-primary)" }}>{t("help.still_need")}</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>{t("help.support_text")}</p>
          <Link to="/contact" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>{t("help.contact_btn")}</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Help;
