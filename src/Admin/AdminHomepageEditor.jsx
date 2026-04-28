"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // adjust path if needed
import { useUser } from "../context/UserContext";
import "./AdminEditor.css"; // optional styling file

export default function AdminHomepageEditor() {
  const { user } = useUser();
  const [json, setJson] = useState("");
  const [status, setStatus] = useState("");

  // 🔐 Replace with YOUR Supabase user ID
  const ADMIN_ID = "71f02d67-3a82-4db6-abd6-7fb58c2317a1";

  // Block access if not admin
  if (!user || user.id !== ADMIN_ID) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Not authorised</h2>
        <p>You do not have permission to edit homepage content.</p>
      </div>
    );
  }

  // Load JSON from Supabase
  useEffect(() => {
    async function loadContent() {
      const { data, error } = await supabase
        .from("homepage_content")
        .select("content")
        .eq("id", 1)
        .single();

      if (!error && data?.content) {
        setJson(JSON.stringify(data.content, null, 2));
      }
    }

    loadContent();
  }, []);

  // Save JSON back to Supabase
  const save = async () => {
    try {
      const parsed = JSON.parse(json);

      const { error } = await supabase
        .from("homepage_content")
        .update({ content: parsed })
        .eq("id", 1);

      if (error) throw error;

      setStatus("saved");
      setTimeout(() => setStatus(""), 2000);
    } catch (e) {
      setStatus("error");
      setTimeout(() => setStatus(""), 2000);
    }
  };

  return (
    <div className="admin-editor-container">
      <h1 className="admin-title">Homepage JSON Editor</h1>

      <p className="admin-subtitle">
        Edit your homepage content below. Changes apply instantly to the live site.
      </p>

      <textarea
        className="admin-json-box"
        value={json}
        onChange={(e) => setJson(e.target.value)}
      />

      <button className="admin-save-btn" onClick={save}>
        Save Changes
      </button>

      {status === "saved" && (
        <p className="admin-status success">Saved successfully!</p>
      )}
      {status === "error" && (
        <p className="admin-status error">Invalid JSON — fix and try again.</p>
      )}
    </div>
  );
}
