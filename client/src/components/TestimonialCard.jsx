import React from "react";

const TestimonialCard = ({ name, location, rating, text }) => {
  return (
    <div className="testimonial-card">
      <div className="testimonial-quote-icon">“</div>
      <div className="testimonial-stars">
        {"★".repeat(rating)}
        {"☆".repeat(5 - rating)}
      </div>
      <p className="testimonial-text">{text}</p>
      <div className="testimonial-author">
        <div className="testimonial-avatar">
          {name.charAt(0)}
        </div>
        <div className="testimonial-author-info">
          <h4>{name}</h4>
          <span>{location}</span>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;
