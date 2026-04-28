import { Link } from "react-router-dom";
import "./Header.css";
import { supabase } from "./supabaseClient";
import { useUser } from "./context/UserContext";
import { useEffect, useState } from "react";

export default function Header() {
  const { user } = useUser();
  const isPro = !!user;

  const [headerConfig, setHeaderConfig] = useState(null);

  // -----------------------------
  // Load dynamic header config
  // -----------------------------
  useEffect(() => {
    async function loadHeader() {
      const { data } = await supabase
        .from("site_header")
        .select("*")
        .single();

      setHeaderConfig(data);
    }

    loadHeader();
  }, []);

  // -----------------------------
  // Stripe Upgrade
  // -----------------------------
  async function handleUpgrade() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert("Please log in to upgrade.");
      return;
    }

    const token = session.access_token;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: session.user.id }),
      }
    );

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error("Checkout error:", data);
      alert("Something went wrong starting checkout.");
    }
  }

  // -----------------------------
  // Logout
  // -----------------------------
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // -----------------------------
  // Render
  // -----------------------------
  const logoUrl = headerConfig?.logo_url || "/images/Logo.png";
  const navLinks = headerConfig?.nav_links || [];

  return (
    <header className="header">
      {/* LOGO */}
      <div className="header-logo-block">
        <Link to="/">
          <img src={logoUrl} alt="Route Scheduler Logo" />
        </Link>
      </div>

      {/* NAVIGATION */}
      <nav className="header-right">
        {/* Dynamic nav links from Supabase */}
        {navLinks.map((link) => (
          <Link key={link.href} to={link.href} className="header-link">
            {link.label}
          </Link>
        ))}

        {/* Not logged in */}
        {!user && (
          <Link to="/auth" className="header-login-btn">
            Login / Register
          </Link>
        )}

        {/* Logged in but NOT Pro */}
        {user && !isPro && (
          <button className="header-upgrade-btn" onClick={handleUpgrade}>
            Upgrade to Pro
          </button>
        )}

        {/* Logged in AND Pro */}
        {user && isPro && (
          <span className="header-pro-badge">PRO</span>
        )}

        {/* Logout */}
        {user && (
          <button className="header-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        )}
        {user?.id === "71f02d67-3a82-4db6-abd6-7fb58c2317a1" && (
  <Link to="/admin" className="header-link admin-link">
    Admin
  </Link>
)}


        {/* Always show Get Started */}
        <Link to="/app" className="header-button">
          Get Started
        </Link>
      </nav>
    </header>
  );
}
