import { Link } from "react-router-dom";
import "./Header.css";

export default function Header() {
  return (
    <header className="header">
      <div className="header-logo-block">
        <img
          src="/images/Logo.jpg"
          alt="Route Scheduler Logo"
        />
      </div>

      <nav className="header-right">
        <Link to="/" className="header-link">Home</Link>
        <Link to="/learn" className="header-link">Learn More</Link>
        <Link to="/app" className="header-button">Get Started</Link>
      </nav>
    </header>
  );
}
