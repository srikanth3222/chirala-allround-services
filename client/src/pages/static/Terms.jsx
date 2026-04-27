import React from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SEO from "../../components/SEO";

const Terms = () => {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <SEO 
        title={t("terms.title")} 
        description={t("terms.desc")} 
      />
      <Navbar />
      <div className="page-content" style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "24px", color: "var(--text-primary)" }}>{t("terms.title")}</h1>
        
        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "var(--text-primary)" }}>{t("terms.s1_title")}</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
            {t("terms.s1_text")}
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "var(--text-primary)" }}>{t("terms.s2_title")}</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
            {t("terms.s2_text")}
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "var(--text-primary)" }}>{t("terms.s3_title")}</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
            {t("terms.s3_text")}
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "var(--text-primary)" }}>{t("terms.s4_title")}</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
            {t("terms.s4_text")}
          </p>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;
