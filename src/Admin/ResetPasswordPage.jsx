import { useState } from "react";

export default function ResetPasswordPage() {
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState("");

  // -----------------------------
  // ACTION: Trigger password reset
  // -----------------------------
  async function handlePasswordReset(e) {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetStatus("Working...");

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });

      if (!res.ok) {
        const text = await res.text();
        setResetStatus(`Error: ${text || res.status}`);
      } else {
        const json = await res.json();
        setResetStatus(`New password: ${json.newPassword}`);
      }
    } catch (err) {
      setResetStatus("Error calling reset endpoint.");
    }
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="p-4">
      <h1 className="mb-6 text-2xl font-bold">Reset Password</h1>

      <section className="rounded border bg-white p-4 shadow-sm max-w-md">
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium">
              User Email
            </label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm"
              placeholder="user@example.com"
            />
          </div>

          <button
            type="submit"
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white"
          >
            Trigger Reset
          </button>

          {resetStatus && (
            <p className="text-xs text-gray-600">{resetStatus}</p>
          )}
        </form>
      </section>
    </div>
  );
}
