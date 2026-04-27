import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import API from "../utils/api";
import { getLocalizedText } from "../utils/i18nHelpers";
import TestimonialCard from "./TestimonialCard";

const ReviewCarousel = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await API.get("/ratings/latest");
        if (res.data.ratings && res.data.ratings.length > 0) {
          setReviews(res.data.ratings);
        }
      } catch (_) {}
    };
    fetchReviews();
  }, []);

  if (reviews.length === 0) return null;

  return (
    <div className="review-carousel-section" style={{ overflow: "hidden", position: "relative", padding: "40px 0" }}>
      <h2 className="review-carousel-title" style={{ textAlign: "center", marginBottom: "8px", fontSize: "2rem", color: "var(--text-primary)" }}>
        ⭐ {t("reviews.title")}
      </h2>
      <p className="review-carousel-subtitle" style={{ textAlign: "center", marginBottom: "40px", color: "var(--text-secondary)", fontSize: "1.1rem" }}>
        {t("reviews.subtitle")}
      </p>

      <div 
        className="review-carousel-viewport" 
        style={{ 
          display: "flex", 
          overflow: "hidden", 
          width: "100%", 
          WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)"
        }}
      >
        <div 
          className="review-carousel-track" 
          style={{ 
            display: "flex", 
            gap: "20px",
            animation: "scrollReviews 30s linear infinite",
            width: "max-content",
            paddingLeft: "20px"
          }}
          onMouseEnter={(e) => e.currentTarget.style.animationPlayState = "paused"}
          onMouseLeave={(e) => e.currentTarget.style.animationPlayState = "running"}
        >
          {/* First Set */}
          <div style={{ display: 'flex', gap: '20px' }}>
            {reviews.map((r, idx) => (
              <div key={`set1-${r._id}-${idx}`} style={{ minWidth: "320px", maxWidth: "350px", flexShrink: 0 }}>
                <TestimonialCard
                  name={r.customer?.name || "Customer"}
                  location={r.service?.title ? getLocalizedText(r.service.title, lang) : ""}
                  rating={r.rating || 5}
                  text={r.review}
                />
              </div>
            ))}
          </div>
          {/* Second Set (Duplicate for seamless loop) */}
          <div style={{ display: 'flex', gap: '20px' }}>
            {reviews.map((r, idx) => (
              <div key={`set2-${r._id}-${idx}`} style={{ minWidth: "320px", maxWidth: "350px", flexShrink: 0 }}>
                <TestimonialCard
                  name={r.customer?.name || "Customer"}
                  location={r.service?.title ? getLocalizedText(r.service.title, lang) : ""}
                  rating={r.rating || 5}
                  text={r.review}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>
        {`
          @keyframes scrollReviews {
            0% { transform: translateX(0); }
            100% { transform: translateX(calc(-50% - 10px)); }
          }
        `}
      </style>
    </div>
  );
};

export default ReviewCarousel;
