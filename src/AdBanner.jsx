import { useEffect } from "react";
import { useUser } from "../context/UserContext";

export default function AdBanner() {
  const { user } = useUser();
  const isPro = !!user; // treat logged-in users as paid for now

  // ⭐ Do NOT render ads for Pro users
  if (isPro) return null;

  useEffect(() => {
    // Prevent duplicate script injection
    if (!document.querySelector('script[data-adsbygoogle-loaded]')) {
      const script = document.createElement("script");
      script.async = true;
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-p";
      script.crossOrigin = "anonymous";
      script.setAttribute("data-adsbygoogle-loaded", "true");
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="ad-container">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-p"
        data-ad-slot="1234567890"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}
