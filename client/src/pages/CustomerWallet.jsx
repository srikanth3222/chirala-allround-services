import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";

const CustomerWallet = () => {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/auth/me")
      .then((res) => setProfile(res.data.user))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (date) => {
    const locale = i18n.language === "te" ? "te-IN" : "en-IN";
    return new Date(date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  };

  const balance = profile?.wallet?.balance ?? 0;
  const transactions = profile?.wallet?.transactions || [];

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
      <SEO title={t("wallet.title")} description={t("wallet.subtitle")} />
      <Navbar />

      <div className="page-content" style={{ maxWidth: 680, margin: "0 auto", padding: "80px 20px" }}>

        {/* Page Header */}
        <div className="page-header animate-fade-in" style={{ marginBottom: 32 }}>
          <h1 className="page-title">
            💰 <span className="gradient-text">{t("wallet.title")}</span>
          </h1>
          <p className="page-subtitle">{t("wallet.subtitle")}</p>
        </div>

        {/* Balance Hero Card */}
        <div className="animate-fade-in" style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%)",
          borderRadius: "var(--radius-lg)", padding: "36px 32px", marginBottom: 24,
          color: "#fff", position: "relative", overflow: "hidden",
          boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -30, right: -30, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
          <div style={{ position: "absolute", bottom: -40, left: -20, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "absolute", top: "50%", right: 30, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.06)", transform: "translateY(-50%)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "0.8rem", opacity: 0.75, marginBottom: 10, fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {t("wallet.balance_label")}
            </div>
            <div style={{ fontSize: "3.2rem", fontWeight: "800", marginBottom: 6, lineHeight: 1 }}>
              ₹{balance.toFixed(2)}
            </div>
            <div style={{ fontSize: "0.82rem", opacity: 0.7 }}>{t("wallet.balance_sub")}</div>
          </div>
        </div>

        {/* Cashback Promo Banner */}
        <div className="animate-fade-in" style={{
          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "16px", padding: "18px 20px", marginBottom: 28,
          display: "flex", alignItems: "center", gap: 16,
          animationDelay: "0.1s",
        }}>
          <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #f59e0b, #ef4444)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
            🎁
          </div>
          <div>
            <div style={{ fontSize: "0.92rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: 4 }}>
              {t("wallet.earn_title")}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {t("wallet.earn_desc")}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
          {[
            {
              label: t("wallet.credit"),
              value: `₹${transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0).toFixed(2)}`,
              color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", icon: "⬆️",
            },
            {
              label: t("wallet.debit"),
              value: `₹${transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0).toFixed(2)}`,
              color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", icon: "⬇️",
            },
          ].map((stat) => (
            <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: "14px", padding: "18px 20px" }}>
              <div style={{ fontSize: "1.1rem", marginBottom: 6 }}>{stat.icon}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: "800", color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{t("wallet.history_title").split(" ")[0]} {stat.label}</div>
            </div>
          ))}
        </div>

        {/* Transaction History */}
        <div className="animate-fade-in" style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", padding: "24px", boxShadow: "var(--glass-shadow)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            🧾 {t("wallet.history_title")}
            {transactions.length > 0 && (
              <span style={{ fontSize: "0.72rem", background: "var(--accent-primary)", color: "#fff", borderRadius: "20px", padding: "2px 10px", fontWeight: "700" }}>
                {transactions.length}
              </span>
            )}
          </h2>

          {transactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <div style={{ fontSize: "3rem", marginBottom: 14 }}>📭</div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: "600", marginBottom: 6 }}>
                {t("wallet.no_tx")}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                {t("wallet.no_tx_desc")}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...transactions].reverse().map((tx, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 16px", borderRadius: "12px",
                    background: tx.type === "credit" ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                    border: `1px solid ${tx.type === "credit" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`,
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(4px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(0)"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: tx.type === "credit" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1rem",
                    }}>
                      {tx.type === "credit" ? "⬆️" : "⬇️"}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)" }}>
                        {tx.description || t(`wallet.${tx.type}`)}
                      </div>
                      <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: 2 }}>
                        {formatDate(tx.date)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: "800", fontSize: "1.08rem", color: tx.type === "credit" ? "#10b981" : "#ef4444" }}>
                    {tx.type === "credit" ? "+" : "−"}₹{tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CustomerWallet;
