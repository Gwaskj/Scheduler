import React, { useEffect, useState } from "react";
import "./HomePage.css";
import { useNavigate } from "react-router-dom";
import AdBanner from "./AdBanner";
import { useUser } from "./context/UserContext";
import { supabase } from "./supabaseClient"; // adjust path if needed

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const isPaidUser = !!user;

  const [content, setContent] = useState(null);

  // Load homepage JSON content
  useEffect(() => {
    async function loadContent() {
      const { data, error } = await supabase
        .from("homepage_content")
        .select("content")
        .eq("id", 1)
        .single();

      if (!error && data?.content) {
        setContent(data.content);
      }
    }

    loadContent();
  }, []);

  if (!content) return null; // or a loader if you prefer

  return (
    <div className="hero-wrapper">
      {/* Dynamic hero image */}
      <img
        src={content.hero.image}
        alt="Route Scheduler Hero"
        className="hero-image"
      />

      <div className="hero-overlay">
        {/* Dynamic title */}
        <h1 className="hero-title">{content.hero.title}</h1>

        {/* Dynamic subtitle */}
        <p className="hero-subtitle">{content.hero.subtitle}</p>

        {/* Dynamic buttons */}
        <div className="button-row">
          {content.hero.buttons.map((btn, index) => (
            <button
              key={index}
              onClick={() => navigate(btn.link)}
              className={btn.style || "btn-start"}
            >
              {btn.text}
            </button>
          ))}
        </div>

        {/* Ad stays exactly where it was */}
        <div className="home-ad-wrapper">
          {!isPaidUser && <AdBanner />}
        </div>
      </div>
    </div>
  );
}
