import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function AdminRoute({ children }) {
  const { user, loading } = useUser();

  // Still loading user from context
  if (loading) return null;

  // Not logged in → redirect
  if (!user) return <Navigate to="/" replace />;

  // ⭐ Admin check (replace with your real admin UUID)
  const ADMIN_ID = import.meta.env.VITE_ADMIN_USER_ID;

  const isAdmin = user.id === ADMIN_ID;

  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
}
