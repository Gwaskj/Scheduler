import { supabase } from "./supabaseClient";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

const ADMIN_ID = "71f02d67-3a82-4db6-abd6-7fb58c2317a1";

export default function AdminRoute({ children }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setAllowed(false);

      setAllowed(session.user.id === ADMIN_ID);
    }
    check();
  }, []);

  if (allowed === null) return null; // loading
  if (!allowed) return <Navigate to="/" replace />;

  return children;
}
