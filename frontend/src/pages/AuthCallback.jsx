import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sessionId = new URLSearchParams(location.hash.slice(1)).get("session_id");
    api.post("/auth/google-session", { session_id: sessionId })
      .then(({ data }) => {
        localStorage.setItem("bc_token", data.token);
        setUser(data);
        navigate(data.onboarded ? "/app" : "/onboarding", { replace: true });
      })
      .catch((e) => {
        toast.error(formatApiErrorDetail(e.response?.data?.detail));
        setUser(null);
        navigate("/login", { replace: true });
      });
  }, [location.hash, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" data-testid="auth-callback">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
