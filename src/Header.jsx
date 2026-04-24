import { Link } from "react-router-dom";
import "./Header.css";
import { supabase } from "./supabaseClient";

export default function Header() {
  async function handleUpgrade() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in to upgrade.");
      return;
    }

    const token = (await supabase.auth.getSession()).data.session?.access_token;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      }
    );

    const data = await response.json();
    if (data.url) window.location.href = data.url;
  }

  return (
    <header className="header">
      <div className="header-logo-block">
        <img src="/images/Logo.png" alt="Route Scheduler Logo" />
      </div>

      <nav className="header-right">
        <Link to="/" className="header-link">Home</Link>
        <Link to="/learn" className="header-link">Learn More</Link>
        <Link to="/feedback" className="header-link">Feedback</Link>

        {/* ⭐ NEW Login/Register button */}
        <Link to="/auth" className="header-login-btn">
          Login / Register
        </Link>

        {/* ⭐ Upgrade button */}
        <button className="header-upgrade-btn" onClick={handleUpgrade}>
          Upgrade to Pro
        </button>

        {/* ⭐ Existing free scheduler access */}
        <Link to="/app" className="header-button">Get Started</Link>
      </nav>
    </header>
  );
}
