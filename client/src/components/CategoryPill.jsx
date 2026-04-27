import React from "react";

const CategoryPill = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      className={`category-pill ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="category-pill-icon">{icon}</span>
      <span className="category-pill-label">{label}</span>
    </button>
  );
};

export default CategoryPill;
