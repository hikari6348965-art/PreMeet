
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const params = new URLSearchParams(
      window.location.hash.slice(1)
    );
    const token = params.get("token");

    // Remove the token from the visible URL immediately.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );

    if (!token) {
      toast.error("Google sign-in failed. Please try again.");
      setUser(null);
      navigate("/login", { replace: true });
      return;
    }

    localStorage.setItem("bc_token", token);

    api.get("/auth/me")
      .then(({ data }) => {
        setUser(data);
        navigate(
          data.onboarded ? "/app" : "/onboarding",
          { replace: true }
        );
      })
      .catch((e) => {
        localStorage.removeItem("bc_token");
        toast.error(
          formatApiErrorDetail(e.response?.data?.detail)
        );
        setUser(null);
        navigate("/login", { replace: true });
      });
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
