import { Link } from "react-router-dom";
import "./Header.css";

export default function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="header-logo">Route Scheduler</Link>
      </div>

      <div className="header-right">
        <Link to="/" className="header-link">Home</Link>
        <Link to="/learn" className="header-link">Learn More</Link>
        <Link to="/app" className="header-button">Get Started</Link>
      </div>
    </header>
  );
}
