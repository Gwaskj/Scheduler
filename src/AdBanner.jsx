import { useEffect } from "react";

export default function AdBanner() {
  useEffect(() => {
    // Load the AdSense script once
    const script = document.createElement("script");
    script.async = true;
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1904838490296389";
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);

    // Trigger ad load
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", margin: "20px 0" }}
      data-ad-client="ca-pub-1904838490296389"
      data-ad-slot="9024022083"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  );
}
