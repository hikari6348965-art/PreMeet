import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

function FullLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" data-testid="auth-loading">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === undefined) return <FullLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user.onboarded && location.pathname !== "/onboarding")
    return <Navigate to="/onboarding" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/app" replace />;
  return children;
}

export function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <FullLoader />;
  if (user) return <Navigate to={user.onboarded ? "/app" : "/onboarding"} replace />;
  return children;
}
