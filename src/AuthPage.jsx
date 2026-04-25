import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import Header from "./Header";
import "./AuthPage.css";
import { useUserProfile } from "./hooks/useUserProfile";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");

  // ⭐ Load user + pro status for Header
  const { user, isPro } = useUserProfile();

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Signup successful! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Redirect to app after login
        window.location.href = "/app";
      }
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <>
      {/* ⭐ Pass user + isPro to Header */}
      <Header user={user} isPro={isPro} />

      <div className="auth-wrapper">
        <div className="auth-container">
          <h2>{mode === "login" ? "Login" : "Create Account"}</h2>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit">
              {mode === "login" ? "Login" : "Sign Up"}
            </button>
          </form>

          {message && <p className="auth-message">{message}</p>}

          <p className="auth-switch">
            {mode === "login" ? (
              <>
                Need an account?{" "}
                <span onClick={() => setMode("signup")}>Sign up</span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span onClick={() => setMode("login")}>Log in</span>
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
