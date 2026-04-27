import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import API from "../utils/api";
import { getLocalizedText } from "../utils/i18nHelpers";
import Navbar from "../components/Navbar";
import ReviewCarousel from "../components/ReviewCarousel";
import Footer from "../components/Footer";
import ServiceCard from "../components/ServiceCard";
import CategoryPill from "../components/CategoryPill";
import SEO from "../components/SEO";

const mainCategories = [
  { key: "home", label: "Home", icon: "🏠" },
  { key: "personal", label: "Personal", icon: "👤" },
  { key: "events", label: "Events", icon: "🎉" },
  { key: "catering", label: "Catering", icon: "🍽️" },
  { key: "more", label: "More...", icon: "➕" },
];

const DEFAULT_LOGO = "/assets/logo.png";
const SERVER_URL = import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "http://localhost:5001";

const getServiceImage = (service) => {
  if (service.backgroundImage && service.backgroundImage.trim() !== "") {
    return `${SERVER_URL}${service.backgroundImage}`;
  }
  return DEFAULT_LOGO;
};

const timeSlots = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

const Home = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Booking modal
  const [bookingModal, setBookingModal] = useState(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingSlot, setBookingSlot] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [userLocation, setUserLocation] = useState({ lat: null, lng: null, isProvided: false });
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await API.get("/services");
      setServices(res.data.services);
    } catch (err) {
      console.error("Failed to load services:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get("/categories");
      setCategories(res.data.categories);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  // Auto-scrolling for horizontal service rows
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      const rows = document.querySelectorAll(".services-horizontal-row");
      rows.forEach(row => {
        // Pause scrolling if the user is hovering over the row
        if (row.matches(':hover')) return;

        const scrollAmount = 280; // Approximate width of one card + gap

        // If reached the end, scroll back to the start smoothly
        if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 10) {
          row.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      });
    }, 4000); // 4 seconds hold time

    return () => clearInterval(interval);
  }, [loading, services, activeCategory]);

  // Search dropdown logic
  const handleSearch = () => {
    if (!search.trim()) {
      setShowSearchDropdown(false);
      return;
    }
    // Cancel any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchSearchResults(search.trim());
  };

  // Live search — triggers as user types with debounce
  const handleSearchInputChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim() || value.trim().length < 2) {
      setShowSearchDropdown(false);
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchSearchResults(value.trim());
    }, 300);
  };

  const fetchSearchResults = async (keyword) => {
    setSearchLoading(true);
    setShowSearchDropdown(true);
    try {
      // Use smart search endpoint with fuzzy matching + keyword expansion
      const res = await API.get("/services/search", { params: { q: keyword } });
      setSearchResults(res.data.data || []);
    } catch (err) {
      console.error("Smart search failed, falling back to basic:", err);
      // Fallback: basic regex search on existing endpoint
      try {
        const fallback = await API.get("/services", { params: { keyword } });
        setSearchResults(fallback.data.services || []);
      } catch {
        // Local fallback
        const q = keyword.toLowerCase();
        const local = services.filter((s) => {
          const titleEn = (s.title?.en || s.title || "").toLowerCase();
          const titleTe = (s.title?.te || "").toLowerCase();
          return titleEn.includes(q) || titleTe.includes(q);
        });
        setSearchResults(local);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  // Highlight matched text in search results
  const highlightText = (text, query) => {
    if (!text || !query) return text;
    const words = query.trim().split(/\s+/).filter(w => w.length >= 2);
    if (words.length === 0) return text;
    const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
    );
  };

  const clearSearch = () => {
    setSearch("");
    setShowSearchDropdown(false);
    setSearchResults([]);
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Voice Search using Web Speech API
  const speechSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const toggleVoiceSearch = () => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang === "te" ? "te-IN" : "en-IN";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setSearch(transcript);

      // If it's a final result, trigger search
      if (event.results[event.results.length - 1].isFinal) {
        if (transcript.trim().length >= 2) {
          fetchSearchResults(transcript.trim());
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Image helper for search results
  const SERVER_URL = import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "http://localhost:5001";
  const getServiceImg = (svc) => {
    if (svc.backgroundImage && svc.backgroundImage.trim() !== "") {
      return svc.backgroundImage.startsWith("http")
        ? svc.backgroundImage
        : `${SERVER_URL}${svc.backgroundImage}`;
    }
    return "/assets/logo.png";
  };

  // Build category icon lookup
  const categoryIconMap = {};
  categories.forEach((c) => {
    const catName = getLocalizedText(c.name, "en");
    categoryIconMap[catName] = c.icon;
  });

  // Build main category → subcategory names map
  const mainCatSubNames = {};
  mainCategories.forEach((mc) => {
    mainCatSubNames[mc.key] = categories
      .filter((c) => c.mainCategory === mc.key)
      .map((c) => getLocalizedText(c.name, "en"));
  });

  // Filter services by selected main category, then also by local search term
  let filteredServices =
    activeCategory === "all"
      ? services
      : services.filter((s) =>
        (mainCatSubNames[activeCategory] || []).includes(s.category)
      );

  // Also apply local text filter on search term for instant feedback
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filteredServices = filteredServices.filter((s) => {
      const titleEn = (s.title?.en || s.title || "").toLowerCase();
      const titleTe = (s.title?.te || "").toLowerCase();
      const descEn = (s.description?.en || s.description || "").toLowerCase();
      const descTe = (s.description?.te || "").toLowerCase();
      const cat = (s.category || "").toLowerCase();
      return (
        titleEn.includes(q) ||
        titleTe.includes(q) ||
        descEn.includes(q) ||
        descTe.includes(q) ||
        cat.includes(q)
      );
    });
  }

  // Derive the 3 lists for homepage rows
  const featuredServices = filteredServices.filter((s) => s.isFeatured).slice(0, 10);
  const trendingServices = [...filteredServices]
    .filter((s) => !s.isFeatured)
    .sort((a, b) => (b.totalRatings || 0) - (a.totalRatings || 0)) // Fallback trending logic
    .slice(0, 10);
  const allServicesList = filteredServices; // Could limit here if needed

  const openBookingModal = (service) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate(`/login?redirect=/home`);
      return;
    }
    setBookingModal(service);
    setBookingDate("");
    setBookingSlot("");
    setFullAddress("");
    setArea("");
    setLandmark("");
    setUserLocation({ lat: null, lng: null, isProvided: false });
    setBookingNotes("");
    setBookingStep(1);
    setMessage({ type: "", text: "" });
  };

  const handleNextStep = () => {
    if (!bookingDate || !bookingSlot) {
      setMessage({ type: "error", text: t("home.select_date") + " & " + t("home.select_time") });
      return;
    }
    setMessage({ type: "", text: "" });
    setBookingStep(2);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocation is not supported by your browser" });
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude, isProvided: true });
        setLocationLoading(false);
        setMessage({ type: "success", text: "Location added for better accuracy" });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      },
      (error) => {
        setLocationLoading(false);
        let errorMsg = "Failed to get location";
        if (error.code === 1) errorMsg = "Location permission denied";
        setMessage({ type: "error", text: errorMsg });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleBooking = async () => {
    if (!fullAddress.trim() || !area.trim()) {
      setMessage({ type: "error", text: "Full Address and Area are required" });
      return;
    }

    setBookingLoading(true);
    try {
      await API.post("/bookings", {
        serviceId: bookingModal._id,
        date: bookingDate,
        timeSlot: bookingSlot,
        address: {
          fullAddress: fullAddress.trim(),
          area: area.trim(),
          landmark: landmark.trim(),
        },
        location: userLocation,
        notes: bookingNotes,
      });
      setMessage({
        type: "success",
        text: t("home.booking_success"),
      });
      setTimeout(() => setBookingModal(null), 2500);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || t("home.booking_failed"),
      });
    } finally {
      setBookingLoading(false);
    }
  };

  // Get tomorrow's date as minimum
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  return (
    <div className="page-container">
      <SEO
        title="Home"
        description="Book trusted experts for cleaning, plumbing, beauty, repairs and more – anytime, anywhere in Chirala."
      />
      <Navbar />

      <div className="page-content" style={{ margin: "0 auto", padding: "0px 0px" }}>
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content-left">

            {/* Mobile-only: Brand title + greeting (hidden on desktop, navbar shows them there) */}
            <div className="mobile-hero-brand" >
              <span className="mobile-hero-brand-name">
                <span style={{ color: "#00358f", fontWeight: 800 }}>Chirala</span>{" "}
                <span style={{ color: "#E65100", fontWeight: 700 }}>Allround Services</span>
              </span>
              {localStorage.getItem("token") && localStorage.getItem("userName") && (
                <p className="mobile-hero-greeting">
                  🙏 {t("nav.welcome")}, <strong>{localStorage.getItem("userName")}</strong>
                </p>
              )}
            </div>

            <h1 className="hero-title">
              {t("home.hero_title_1")} <br />
              {t("home.hero_title_2")} <br />
              <span className="accent-text">{t("home.hero_title_3")}</span>
            </h1>
            <p className="hero-subtitle">
              {t("home.hero_subtitle")}
            </p>
            <div className="search-card" ref={searchRef}>
              <div className="search-input-row">
                <input
                  type="text"
                  className="search-input"
                  placeholder={t("home.search_placeholder")}
                  value={search}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                    if (e.key === "Escape") setShowSearchDropdown(false);
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchDropdown(true);
                  }}
                />
                {search && (
                  <button className="search-clear-btn" onClick={clearSearch} title="Clear">
                    ✕
                  </button>
                )}
              </div>

              {/* Action buttons row */}
              <div className="search-buttons-row">
                {speechSupported && (
                  <button
                    className={`search-mic-btn ${isListening ? "listening" : ""}`}
                    onClick={toggleVoiceSearch}
                    title={isListening ? "Stop listening" : "Voice search"}
                  >
                    {isListening ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    )}
                    <span>{isListening ? "Listening..." : t("home.voice_btn") || "Voice"}</span>
                  </button>
                )}
                <button className="search-btn" onClick={handleSearch}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>{t("home.search_btn")}</span>
                </button>
              </div>

              {/* Search Results Dropdown */}
              {showSearchDropdown && (
                <div className="search-dropdown">
                  {searchLoading ? (
                    <div className="search-dropdown-loading">
                      <div className="loading-spinner" style={{ width: 24, height: 24 }} />
                      <span>Searching...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="search-dropdown-empty">
                      <span className="search-dropdown-empty-icon">🔍</span>
                      <p>{t("home.no_services_found")}</p>
                      <span className="search-dropdown-empty-hint">{t("home.no_services_desc")}</span>
                    </div>
                  ) : (
                    <>
                      <div className="search-dropdown-header">
                        <span>{searchResults.length} result{searchResults.length > 1 ? 's' : ''} found</span>
                      </div>
                      <div className="search-dropdown-list">
                        {searchResults.map((svc) => (
                          <div
                            key={svc._id}
                            className="search-result-item"
                            onClick={() => {
                              navigate(`/services/${svc.slug || svc._id}`);
                              setShowSearchDropdown(false);
                            }}
                          >
                            <img
                              src={getServiceImg(svc)}
                              alt={getLocalizedText(svc.title, lang)}
                              className="search-result-img"
                            />
                            <div className="search-result-info">
                              <h4 className="search-result-title">
                                {highlightText(getLocalizedText(svc.title, lang), search)}
                              </h4>
                              <span className="search-result-category">
                                {highlightText(svc.category, search)}
                              </span>
                              {svc._searchScore && (
                                <span className="search-result-score">{svc._searchScore}% match</span>
                              )}
                            </div>
                            <div className="search-result-price">
                              ₹{svc.price}
                            </div>
                            <button
                              className="search-result-book"
                              onClick={(e) => {
                                e.stopPropagation();
                                openBookingModal(svc);
                                setShowSearchDropdown(false);
                              }}
                            >
                              {t("home.book_now")}
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="hero-image-right">
            {/* The user provided a composite image in the design, using logo temporarily or empty space */}
            <div className="hero-image-placeholder">
              <img src="/assets/hero.png" alt="Chirala Allround Services" className="hero-logo-large" />
            </div>
          </div>
        </div>

        {/* Category Filters — Main Categories */}
        <div className="category-filters">
          <CategoryPill
            icon="🔠"
            label={t("home.all_services")}
            isActive={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
          />
          {mainCategories.map((mc) => {
            const count = mainCatSubNames[mc.key]?.length || 0;
            if (count === 0) return null;
            return (
              <CategoryPill
                key={mc.key}
                icon={mc.icon}
                label={t(`categories.${mc.key}`)}
                isActive={activeCategory === mc.key}
                onClick={() => setActiveCategory(mc.key)}
              />
            );
          })}
        </div>

        {/* Services Rows */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p className="loading-text">{t("home.loading_services")}</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3 className="empty-state-title">{t("home.no_services_found")}</h3>
            <p className="empty-state-description">
              {t("home.no_services_desc")}
            </p>
          </div>
        ) : (
          <div className="services-rows-container">
            {/* 1. Featured Services */}
            {featuredServices.length > 0 && (
              <div className="service-row-section">
                <div className="section-header">
                  <h2 className="section-title">Featured Services ✨</h2>
                  <a href="#" className="view-all-link">View all →</a>
                </div>
                <div className="services-horizontal-row">
                  {featuredServices.map((service) => (
                    <div key={service._id} className="service-card-wrapper">
                      <ServiceCard
                        service={service}
                        categoryIcon={categoryIconMap[service.category]}
                        onBook={openBookingModal}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Trending Services */}
            {trendingServices.length > 0 && (
              <div className="service-row-section">
                <div className="section-header">
                  <h2 className="section-title">Trending Now 🔥</h2>
                  <a href="#" className="view-all-link">View all →</a>
                </div>
                <div className="services-horizontal-row">
                  {trendingServices.map((service) => (
                    <div key={service._id} className="service-card-wrapper">
                      <ServiceCard
                        service={service}
                        categoryIcon={categoryIconMap[service.category]}
                        onBook={openBookingModal}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. All Services */}
            {allServicesList.length > 0 && (
              <div className="service-row-section">
                <div className="section-header">
                  <h2 className="section-title">All Services</h2>
                  <a href="#" className="view-all-link">View all →</a>
                </div>
                <div className="services-horizontal-row">
                  {allServicesList.map((service) => (
                    <div key={service._id} className="service-card-wrapper">
                      <ServiceCard
                        service={service}
                        categoryIcon={categoryIconMap[service.category]}
                        onBook={openBookingModal}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trust Section */}
        <div className="trust-section">
          <div className="trust-item">
            <div className="trust-icon">👥</div>
            <div className="trust-text">
              <strong>10,000+</strong>
              <span>Happy Customers</span>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon">✅</div>
            <div className="trust-text">
              <strong>Verified</strong>
              <span>Professionals</span>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon">⭐</div>
            <div className="trust-text">
              <strong>4.8★</strong>
              <span>Average Rating</span>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon">🎧</div>
            <div className="trust-text">
              <strong>24/7</strong>
              <span>Customer Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Carousel */}
      <ReviewCarousel />

      {/* Become a Professional CTA */}
      <div style={{ background: "rgba(29, 78, 216, 0.05)", padding: "40px 20px", textAlign: "center", borderTop: "1px solid var(--glass-border)", borderBottom: "1px solid var(--glass-border)", margin: "40px 0" }}>
        <h2 style={{ fontSize: "1.8rem", color: "var(--text-primary)", marginBottom: "16px" }}>{t("home.cta_title")}</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px", maxWidth: "600px", margin: "0 auto 24px" }}>
          {t("home.cta_desc")}
        </p>
        <Link to="/become-a-professional" className="btn-primary" style={{ display: "inline-block", textDecoration: "none", padding: "12px 32px" }}>
          {t("home.cta_btn")}
        </Link>
      </div>

      {/* Footer */}
      <Footer />

      {/* Booking Modal — 2-Step Wizard */}
      {
        bookingModal && (
          <div className="modal-overlay" onClick={() => setBookingModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close"
                onClick={() => setBookingModal(null)}
              >
                ✕
              </button>

              <h2 className="modal-title">{getLocalizedText(bookingModal.title, lang)}</h2>
              <p className="modal-subtitle">
                {categoryIconMap[bookingModal.category] || "🔧"}{" "}
                {bookingModal.category}
              </p>

              <div className="modal-price-info">
                <span className="modal-price-label">{t("home.service_price")}</span>
                <span className="modal-price-value">₹{bookingModal.price}</span>
              </div>

              {message.text && (
                <div className={`message message-${message.type}`} style={{ marginBottom: 16 }}>
                  {message.text}
                </div>
              )}

              <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "4px" }}>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label">{t("home.select_date")} *</label>
                  <input
                    type="date"
                    className="form-input"
                    min={getMinDate()}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">{t("home.select_time")} *</label>
                  <div className="time-slots">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={`time-slot ${bookingSlot === slot ? "active" : ""}`}
                        onClick={() => setBookingSlot(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">{t("home.full_address")} *</label>
                  <textarea
                    className="form-input"
                    placeholder={t("home.full_address_ph")}
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    rows={2}
                    style={{ resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">{t("home.area_locality")} *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={t("home.area_ph")}
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t("home.landmark")}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={t("home.landmark_placeholder")}
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                    />
                  </div>
                </div>

                {/* GPS Location Button */}
                <div style={{ marginBottom: 16 }}>
                  {!userLocation.isProvided ? (
                    <button
                      type="button"
                      className={`location-btn ${locationLoading ? 'loading' : ''}`}
                      onClick={detectLocation}
                      disabled={locationLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--accent-primary)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        width: '100%',
                        justifyContent: 'center',
                        transition: 'all 0.3s'
                      }}
                    >
                      <span>📍 {locationLoading ? t("home.detecting") : t("home.use_location")}</span>
                    </button>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '12px',
                    }}>
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>
                        ✅ {t("home.location_captured")}
                      </span>
                      <button
                        type="button"
                        onClick={() => setUserLocation({ lat: null, lng: null, isProvided: false })}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {t("home.remove")}
                      </button>
                    </div>
                  )}
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
                    {t("home.location_hint")}
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">{t("home.notes")}</label>
                  <textarea
                    className="form-input"
                    placeholder={t("home.notes_placeholder")}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    rows={2}
                    style={{ resize: "vertical" }}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setBookingModal(null)}
                  style={{ flex: 1 }}
                >
                  {t("home.cancel")}
                </button>
                <button
                  className={`btn btn-primary ${bookingLoading ? "btn-loading" : ""}`}
                  onClick={handleBooking}
                  disabled={bookingLoading}
                  style={{ flex: 2 }}
                >
                  <span>
                    {bookingLoading ? t("home.booking") : t("home.confirm_booking")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Home;
