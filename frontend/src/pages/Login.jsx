import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";

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
      <div className="hidden lg:flex flex-col justify-between bg-[#0F172A] text-white p-12 relative overflow-hidden">
        <div className="bc-grid-bg absolute inset-0 opacity-[0.06]" />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">BriefCraft AI</span>
        </Link>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Walk into every meeting prepared.
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            One-page briefs built from your notes, CRM and calendar — with every fact linked to its source.
          </p>
          <ul className="space-y-3 text-slate-300">
            {["Source-verified intelligence", "Forgotten-commitment detector", "Profession-specific templates"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500 font-mono-label">© BriefCraft AI</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">BriefCraft AI</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">Sign in to your workspace.</p>

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
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[hsl(200_98%_32%)] transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
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
          <div className="mt-6 p-3 rounded-lg bg-secondary text-xs text-muted-foreground">
            <span className="font-mono-label text-[10px]">Demo admin</span> — admin@briefcraft.ai / Admin@12345
          </div>
        </div>
      </div>
    </div>
  );
}
