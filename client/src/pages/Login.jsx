import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import API from "../utils/api";
import SEO from "../components/SEO";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectParams = new URLSearchParams(location.search);
  const redirectTo = redirectParams.get("redirect") || null;
  const { t, i18n } = useTranslation();

  // Login mode: "password" | "otp"
  const [loginMode, setLoginMode] = useState("password");

  // State
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // OTP login
  const [otpStep, setOtpStep] = useState(1);
  const [otpMobile, setOtpMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // Forgot password
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotMobile, setForgotMobile] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotTimer, setForgotTimer] = useState(0);

  // Redirect if logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token) {
      if (redirectTo) navigate(redirectTo);
      else if (role === "customer") navigate("/home");
      else if (role === "provider") navigate("/provider");
      else if (role === "admin") navigate("/admin");
    }
  }, [navigate, redirectTo]);

  // Timers
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  useEffect(() => {
    if (forgotTimer > 0) {
      const timer = setTimeout(() => setForgotTimer(forgotTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [forgotTimer]);

  const handleAuthSuccess = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user.id);
    localStorage.setItem("role", data.user.role);
    localStorage.setItem("userName", data.user.name);
    
    if (redirectTo) {
      navigate(redirectTo);
      return;
    }
    
    const role = data.user.role;
    if (role === "customer") navigate("/home");
    else if (role === "provider") navigate("/provider");
    else if (role === "admin") navigate("/admin");
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/login", {
        mobile: `+91${mobile}`,
        password,
      });
      handleAuthSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendLoginOTP = async (e) => {
    e.preventDefault();
    if (otpMobile.length !== 10) {
      setError("Enter a valid 10-digit number");
      return;
    }
    setError("");
    setOtpLoading(true);
    try {
      const res = await API.post("/auth/send-login-otp", {
        mobile: `+91${otpMobile}`,
      });
      setOtpStep(2);
      setOtpTimer(60);
      setSuccess(`OTP sent! (Dev: ${res.data.devOTP})`);
      setTimeout(() => setSuccess(""), 8000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyLoginOTP = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setError("");
    setOtpLoading(true);
    try {
      const res = await API.post("/auth/verify-login-otp", {
        mobile: `+91${otpMobile}`,
        otp: otpCode,
      });
      handleAuthSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleForgotSendOTP = async (e) => {
    e.preventDefault();
    if (forgotMobile.length !== 10) {
      setError("Enter a valid 10-digit number");
      return;
    }
    setError("");
    setForgotLoading(true);
    try {
      const res = await API.post("/auth/send-otp", {
        mobile: `+91${forgotMobile}`,
      });
      setForgotStep(2);
      setForgotTimer(60);
      setSuccess(`OTP sent! (Dev: ${res.data.devOTP})`);
      setTimeout(() => setSuccess(""), 8000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyOTP = (e) => {
    e.preventDefault();
    if (forgotOtp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setError("");
    setForgotStep(3);
  };

  const handleForgotResetPassword = async (e) => {
    e.preventDefault();
    if (forgotPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (forgotPassword !== forgotConfirm) {
      setError("Passwords don't match");
      return;
    }
    setError("");
    setForgotLoading(true);
    try {
      await API.post("/auth/verify-otp-reset", {
        mobile: `+91${forgotMobile}`,
        otp: forgotOtp,
        newPassword: forgotPassword,
      });
      setSuccess("Password reset successful! You can now login.");
      setShowForgot(false);
      setForgotStep(1);
      setLoginMode("password");
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed");
    } finally {
      setForgotLoading(false);
    }
  };

  const resetAll = () => {
    setError("");
    setSuccess("");
    setOtpStep(1);
    setOtpCode("");
    setOtpMobile("");
    setForgotStep(1);
    setShowForgot(false);
  };

  return (
    <div className="premium-auth-container">
      <SEO title="Login" description="Sign in to your Chirala Allround Services account to book home services, track bookings and manage your profile." canonical="/login" />
      <div className="auth-mesh-bg" />

      <div className="auth-content-wrapper">
        {/* Language & Logo Bar */}
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

        <div className="auth-glass-card animate-scale-in">
          <div className="auth-card-header">
            <h1 className="auth-title">
              {showForgot
                ? t("auth.reset_password")
                : loginMode === "password"
                ? t("auth.sign_in")
                : t("auth.sign_in_otp")}
            </h1>
            <p className="auth-subtitle">
              {showForgot ? "Securely reset your access" : "Welcome back! Please enter your details."}
            </p>
          </div>

          {error && <div className="auth-alert alert-error animate-shake">{error}</div>}
          {success && <div className="auth-alert alert-success animate-fade-in">{success}</div>}

          {/* FORGOT PASSWORD */}
          {showForgot ? (
            <div className="auth-flow-container">
              {forgotStep === 1 && (
                <form onSubmit={handleForgotSendOTP} className="auth-form-body">
                  <div className="premium-input-group">
                    <label className="input-label">{t("auth.mobile_number")}</label>
                    <div className="input-wrapper">
                      <span className="input-icon">📱</span>
                      <span className="country-code">+91</span>
                      <input
                        type="tel"
                        className="premium-input"
                        placeholder="00000 00000"
                        value={forgotMobile}
                        onChange={(e) => setForgotMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className={`premium-btn btn-primary ${forgotLoading ? "loading" : ""}`} disabled={forgotLoading}>
                    <span>{forgotLoading ? t("auth.sending") : t("auth.send_otp")}</span>
                  </button>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleForgotVerifyOTP} className="auth-form-body">
                  <div className="premium-input-group">
                    <label className="input-label">{t("auth.enter_otp")}</label>
                    <div className="otp-input-box">
                      <input
                        type="text"
                        className="premium-input otp-field"
                        placeholder="••••••"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="premium-btn btn-primary">
                    <span>{t("auth.verify_otp")}</span>
                  </button>
                  <div className="resend-container">
                    {forgotTimer > 0 ? (
                      <span className="resend-text">{t("auth.resend_in")} {forgotTimer}s</span>
                    ) : (
                      <button type="button" className="text-btn" onClick={handleForgotSendOTP}>{t("auth.resend_otp")}</button>
                    )}
                  </div>
                </form>
              )}

              {forgotStep === 3 && (
                <form onSubmit={handleForgotResetPassword} className="auth-form-body">
                  <div className="premium-input-group">
                    <label className="input-label">{t("auth.new_password")}</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔒</span>
                      <input
                        type="password"
                        className="premium-input"
                        placeholder={t("auth.min_6_chars")}
                        value={forgotPassword}
                        onChange={(e) => setForgotPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="premium-input-group">
                    <label className="input-label">{t("auth.confirm_password")}</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔄</span>
                      <input
                        type="password"
                        className="premium-input"
                        placeholder={t("auth.re_enter_password")}
                        value={forgotConfirm}
                        onChange={(e) => setForgotConfirm(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className={`premium-btn btn-primary ${forgotLoading ? "loading" : ""}`} disabled={forgotLoading}>
                    <span>{forgotLoading ? t("auth.resetting") : t("auth.reset_password_btn")}</span>
                  </button>
                </form>
              )}

              <button type="button" className="back-link-btn" onClick={resetAll}>
                ← {t("auth.back_to_login")}
              </button>
            </div>
          ) : (
            <div className="auth-flow-container">
              {/* PASSWORD LOGIN */}
              {loginMode === "password" && (
                <form onSubmit={handlePasswordLogin} className="auth-form-body">
                  <div className="premium-input-group">
                    <label className="input-label">{t("auth.mobile_number")}</label>
                    <div className="input-wrapper">
                      <span className="input-icon">📱</span>
                      <span className="country-code">+91</span>
                      <input
                        type="tel"
                        className="premium-input"
                        placeholder="00000 00000"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>

                  <div className="premium-input-group">
                    <div className="label-row">
                      <label className="input-label">{t("auth.password")}</label>
                      <button type="button" className="forgot-text-btn" onClick={() => setShowForgot(true)}>
                        {t("auth.forgot_password")}
                      </button>
                    </div>
                    <div className="input-wrapper">
                      <span className="input-icon">🔒</span>
                      <input
                        type="password"
                        className="premium-input"
                        placeholder={t("auth.enter_password")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className={`premium-btn btn-primary ${loading ? "loading" : ""}`} disabled={loading}>
                    <span>{loading ? t("auth.signing_in") : t("auth.sign_in_btn")}</span>
                  </button>
                </form>
              )}

              {/* OTP LOGIN */}
              {loginMode === "otp" && (
                <div className="auth-form-body">
                  {otpStep === 1 ? (
                    <form onSubmit={handleSendLoginOTP}>
                      <div className="premium-input-group">
                        <label className="input-label">{t("auth.mobile_number")}</label>
                        <div className="input-wrapper">
                          <span className="input-icon">📱</span>
                          <span className="country-code">+91</span>
                          <input
                            type="tel"
                            className="premium-input"
                            placeholder="00000 00000"
                            value={otpMobile}
                            onChange={(e) => setOtpMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            maxLength={10}
                            required
                          />
                        </div>
                      </div>
                      <button type="submit" className={`premium-btn btn-primary ${otpLoading ? "loading" : ""}`} disabled={otpLoading}>
                        <span>{otpLoading ? t("auth.sending") : t("auth.send_otp")}</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyLoginOTP}>
                      <div className="premium-input-group">
                        <label className="input-label">{t("auth.enter_otp")}</label>
                        <div className="otp-input-box">
                          <input
                            type="text"
                            className="premium-input otp-field"
                            placeholder="••••••"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            maxLength={6}
                            required
                          />
                        </div>
                      </div>
                      <button type="submit" className={`premium-btn btn-primary ${otpLoading ? "loading" : ""}`} disabled={otpLoading}>
                        <span>{otpLoading ? t("auth.verifying") : t("auth.verify_login")}</span>
                      </button>
                      <div className="resend-container">
                        {otpTimer > 0 ? (
                          <span className="resend-text">{t("auth.resend_in")} {otpTimer}s</span>
                        ) : (
                          <button type="button" className="text-btn" onClick={handleSendLoginOTP}>{t("auth.resend_otp")}</button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Mode Toggle */}
              <div className="auth-mode-toggle">
                <div className="divider"><span>OR</span></div>
                <button type="button" className="mode-toggle-btn" onClick={() => { resetAll(); setLoginMode(loginMode === "password" ? "otp" : "password"); }}>
                  {loginMode === "password" ? t("auth.login_otp_toggle") : t("auth.login_pass_toggle")}
                </button>
              </div>

              <div className="auth-card-footer">
                <p>{t("auth.no_account")} <Link to="/register" className="highlight-link">{t("auth.create_one")}</Link></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;