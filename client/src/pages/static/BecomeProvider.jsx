import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SEO from "../../components/SEO";

const BecomeProvider = () => {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <SEO 
        title={t("provider.title")} 
        description={t("provider.desc")} 
      />
      <Navbar />
      <div className="page-content" style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ marginBottom: "16px", color: "var(--text-primary)", fontSize: "2.5rem" }}>{t("provider.hero_title")}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.2rem", maxWidth: "600px", margin: "0 auto" }}>
            {t("provider.hero_sub")}
          </p>
        </div>
        
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "var(--text-primary)", textAlign: "center" }}>{t("provider.why_join")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "24px", borderRadius: "12px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>💸</div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", color: "var(--text-primary)" }}>{t("provider.f1_title")}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{t("provider.f1_text")}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "24px", borderRadius: "12px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏰</div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", color: "var(--text-primary)" }}>{t("provider.f2_title")}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{t("provider.f2_text")}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "24px", borderRadius: "12px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🛡️</div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", color: "var(--text-primary)" }}>{t("provider.f3_title")}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{t("provider.f3_text")}</p>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "var(--text-primary)" }}>{t("provider.who_title")}</h2>
          <ul style={{ color: "var(--text-secondary)", lineHeight: "1.8", paddingLeft: "20px" }}>
            <li>{t("provider.li1")}</li>
            <li>{t("provider.li2")}</li>
            <li>{t("provider.li3")}</li>
            <li>{t("provider.li4")}</li>
            <li>{t("provider.li5")}</li>
          </ul>
        </section>

        <section style={{ marginBottom: "40px", background: "rgba(29, 78, 216, 0.05)", padding: "32px", borderRadius: "12px", border: "1px solid var(--primary)", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "var(--text-primary)" }}>{t("provider.ready_title")}</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>{t("provider.ready_sub")}</p>
          <Link to="/register" className="btn-primary" style={{ display: "inline-block", textDecoration: "none", fontSize: "1.1rem", padding: "12px 32px" }}>{t("provider.register_btn")}</Link>
        </section>

      </div>
      <Footer />
    </div>
  );
};

export default BecomeProvider;
