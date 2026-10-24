
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
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

    async function finishLogin() {
      const params = new URLSearchParams(
        window.location.hash.slice(1)
      );
      const token = params.get("token");

      if (!token) {
        toast.error("Google sign-in failed. Please try again.");
        navigate("/login", { replace: true });
        return;
      }

      try {
        localStorage.setItem("bc_token", token);

        // Remove the token from the visible URL.
        window.history.replaceState(
          null,
          "",
          window.location.pathname
        );

        const { data } = await api.get("/auth/me");
        setUser(data);

        navigate(
          data.onboarded ? "/app" : "/onboarding",
          { replace: true }
        );
      } catch (error) {
        localStorage.removeItem("bc_token");
        setUser(null);
        toast.error("Unable to complete Google sign-in.");
        navigate("/login", { replace: true });
      }
    }

    finishLogin();
  }, [navigate, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-3">Signing you in...</span>
    </div>
  );
}
