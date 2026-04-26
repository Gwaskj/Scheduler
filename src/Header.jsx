import { Link } from "react-router-dom";
import "./Header.css";
import { supabase } from "./supabaseClient";
import { useUser } from "./context/UserContext"; // ⭐ NEW

export default function Header() {
  const { user } = useUser();
  const isPro = !!user; // treat logged-in users as Pro for now

  // ⭐ Upgrade handler (Stripe Checkout)
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

  // ⭐ Logout handler
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
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

        {/* ⭐ Not logged in */}
        {!user && (
          <Link to="/auth" className="header-login-btn">
            Login / Register
          </Link>
        )}

        {/* ⭐ Logged in but NOT Pro */}
        {user && !isPro && (
          <button className="header-upgrade-btn" onClick={handleUpgrade}>
            Upgrade to Pro
          </button>
        )}

        {/* ⭐ Logged in AND Pro */}
        {user && isPro && (
          <span className="header-pro-badge">PRO</span>
        )}

        {/* ⭐ Logout button when logged in */}
        {user && (
          <button className="header-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        )}

        {/* ⭐ Free scheduler */}
        <Link to="/app" className="header-button">Get Started</Link>
      </nav>
    </header>
  );
}
