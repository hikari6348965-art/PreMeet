import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";
import { GoogleButton, OrDivider } from "../components/GoogleButton";
import { Logo } from "../components/Logo";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const u = await login(email, password);
      navigate(u.onboarded ? "/app" : "/onboarding");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between bg-ink text-white p-12 relative overflow-hidden">
        <div className="bc-grid-bg absolute inset-0 opacity-[0.06]" />
        <Link to="/" className="relative flex items-center" data-testid="login-brand-link">
          <Logo tone="white" className="h-9" testid="login-panel-logo" />
        </Link>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Walk into every meeting prepared.
          </h2>
          <p className="text-white/70 text-lg leading-relaxed max-w-md">
            One-page briefs built from your notes, inbox and calendar — with every fact linked to its source.
          </p>
          <ul className="space-y-3 text-white/70">
            {["Source-verified intelligence", "Forgotten-commitment detector", "Profession-specific templates"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-white" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500 font-mono-label">© PreMeet</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <Logo tone="ink" className="h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">Sign in to your workspace.</p>

          <GoogleButton testid="google-login-btn" />
          <OrDivider />
          <form onSubmit={submit} className="space-y-4" data-testid="login-form">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                className="mt-1.5 w-full h-11 px-3.5 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                className="mt-1.5 w-full h-11 px-3.5 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm text-destructive" data-testid="login-error">{error}</p>}
            <button
              type="submit" disabled={loading} data-testid="login-submit-button"
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
            </button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            No account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline" data-testid="goto-register-link">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
