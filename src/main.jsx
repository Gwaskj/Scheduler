import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Load global reset FIRST
import "./index.css";

// Load your themed UI LAST so it overrides index.css
import App from "./App.jsx";

// Import Vercel Analytics
import { Analytics } from "@vercel/analytics/react";

// ⭐ Import the UserProvider
import { UserProvider } from "./context/UserContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <UserProvider>
      <App />
      <Analytics />
    </UserProvider>
  </StrictMode>
);
