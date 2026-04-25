import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function AdminRoute({ children }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Only allow if user exists AND is admin
      if (!user) {
        setAllowed(false);
        return;
      }

      // Example: allow all logged-in users
      // Replace with your real admin logic if needed
      setAllowed(true);
    }

    check();
  }, []);

  if (allowed === null) return null; // loading
  if (!allowed) return <Navigate to="/" replace />;

  return children;
}
