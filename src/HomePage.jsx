import React from "react";
import "./HomePage.css";
import { useNavigate } from "react-router-dom";
import AdBanner from "./AdBanner";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="hero-wrapper">
      <img
        src="/images/route-hero.jpg"
        alt="Route Scheduler Hero"
        className="hero-image"
      />

      <div className="hero-overlay">
        <h1 className="hero-title">
          Route <span className="green-word">Scheduler</span>
        </h1>

        <p className="hero-subtitle">
          Plan. <span className="orange-word">Optimise</span>. Deliver.
        </p>

        <div className="button-row">
          <button onClick={() => navigate("/app")} className="btn-start">
            Get Started
          </button>

          <button onClick={() => navigate("/learn")} className="btn-learn">
            Learn More
          </button>
          <AdBanner />
        </div>
      </div>
    </div>
  );
}
