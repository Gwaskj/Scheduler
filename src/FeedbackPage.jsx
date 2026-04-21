export default function FeedbackPage() {
  return (
    <div style={{ 
      maxWidth: "800px", 
      margin: "0 auto", 
      padding: "32px",
      display: "flex",
      flexDirection: "column",
      gap: "24px"
    }}>
      
      <h1 style={{ marginBottom: "8px" }}>Feedback</h1>
      <p>Your comments help improve the system.</p>

      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid #e5e7eb"
        }}
      >
        <iframe
          src="https://docs.google.com/forms/d/e/1FAIpQLSevMqInlZTiesX-XYOujny8oq9iZvI67Qh6BfxRBg0YmeDTYQ/viewform?embedded=true"
          width="100%"
          height="700"
          style={{ border: "none" }}
        >
        </iframe>
      </div>

    </div>
  );
}
