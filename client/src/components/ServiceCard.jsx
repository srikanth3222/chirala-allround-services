import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getLocalizedText } from "../utils/i18nHelpers";

const ServiceCard = ({ service, categoryIcon, onBook }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // Same logic as before to get image
  const SERVER_URL = import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "http://localhost:5001";
  const DEFAULT_LOGO = "/assets/logo.png";
  const getServiceImage = (svc) => {
    if (svc.backgroundImage && svc.backgroundImage.trim() !== "") {
      return svc.backgroundImage.startsWith("http")
        ? svc.backgroundImage
        : `${SERVER_URL}${svc.backgroundImage}`;
    }
    return DEFAULT_LOGO;
  };

  return (
    <div className="service-card">
      <div
        className="service-card-bg"
        style={{ cursor: "pointer", backgroundImage: `url(${getServiceImage(service)})` }}
        onClick={() => navigate(`/services/${service.slug || service._id}`)}
      >
        <div className="service-card-overlay">
          <div className="service-price">
            ₹{service.price}
            <span>/ {t("home.per_service")}</span>
          </div>
        </div>
      </div>

      <div className="service-card-body">
        <div className="service-card-title-row">
          <div className="service-category-icon">{categoryIcon || "🔧"}</div>
          <h3
            className="service-title"
            style={{ cursor: "pointer", margin: 0 }}
            onClick={() => navigate(`/services/${service.slug || service._id}`)}
          >
            {getLocalizedText(service.title, lang)}
          </h3>
        </div>

        <p
          className="service-description"
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/services/${service.slug || service._id}`)}
        >
          {getLocalizedText(service.description, lang) ||
            "Professional service delivered by verified experts."}
        </p>

        <div className="service-card-footer">
          <button className="btn-book-now" onClick={() => onBook(service)}>
            {t("home.book_now")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
