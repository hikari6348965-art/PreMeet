import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
  FileText, Briefcase, Target, Users, UserRound, ArrowRight, ArrowLeft,
  Check, Loader2, Sparkles,
} from "lucide-react";

const roles = [
  { id: "consultant", icon: Briefcase, title: "Consultant", desc: "Manage multiple client projects, deliverables and decisions." },
  { id: "account_executive", icon: Target, title: "Account Executive", desc: "Run discovery, demos and renewals across your pipeline." },
  { id: "freelancer", icon: UserRound, title: "Freelancer / Agency", desc: "Juggle scope, deadlines, feedback and approvals." },
  { id: "recruiter", icon: Users, title: "Recruiter", desc: "Prep candidate interviews and track role requirements." },
];

const tones = [
  { id: "professional", label: "Professional" },
  { id: "concise", label: "Concise & punchy" },
  { id: "warm", label: "Warm & personable" },
];
const details = [
  { id: "brief", label: "Brief" },
  { id: "balanced", label: "Balanced" },
  { id: "detailed", label: "Detailed" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [profession, setProfession] = useState("consultant");
  const [tone, setTone] = useState("professional");
  const [detail, setDetail] = useState("balanced");
  const [objective, setObjective] = useState("");
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    setLoading(true);
    try {
      await api.post("/onboarding", {
        profession, tone, detail_level: detail, default_objective: objective, load_demo_data: true,
      });
      await refreshUser();
      toast.success("You're all set! We loaded demo data so you can explore.");
      navigate("/app");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">BriefCraft AI</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-5 py-10">
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>

          {step === 1 && (
            <div data-testid="onboarding-step-role">
              <span className="font-mono-label text-xs text-primary">Step 1 of 3</span>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">What best describes your work?</h1>
              <p className="mt-2 text-muted-foreground">We'll tailor your default brief template to your role.</p>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {roles.map((r) => (
                  <button key={r.id} onClick={() => setProfession(r.id)} data-testid={`role-option-${r.id}`}
                    className={`text-left p-5 rounded-xl border transition-all duration-200 ${profession === r.id ? "border-primary ring-1 ring-primary bg-accent/40" : "border-border bg-card hover:border-primary/40"}`}>
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                        <r.icon className="h-5 w-5 text-primary" />
                      </div>
                      {profession === r.id && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <h3 className="mt-3 font-semibold">{r.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div data-testid="onboarding-step-style">
              <span className="font-mono-label text-xs text-primary">Step 2 of 3</span>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Set your briefing style</h1>
              <p className="mt-2 text-muted-foreground">You can change this anytime in settings.</p>
              <div className="mt-8 space-y-6">
                <div>
                  <label className="text-sm font-medium">Writing tone</label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tones.map((t) => (
                      <button key={t.id} onClick={() => setTone(t.id)} data-testid={`tone-${t.id}`}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${tone === t.id ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card hover:border-primary/40"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Level of detail</label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {details.map((d) => (
                      <button key={d.id} onClick={() => setDetail(d.id)} data-testid={`detail-${d.id}`}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${detail === d.id ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card hover:border-primary/40"}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Default meeting objective <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input value={objective} onChange={(e) => setObjective(e.target.value)} data-testid="default-objective-input"
                    placeholder="e.g. Move the relationship forward and uncover next steps"
                    className="mt-2 w-full h-11 px-3.5 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div data-testid="onboarding-step-finish">
              <span className="font-mono-label text-xs text-primary">Step 3 of 3</span>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Ready to generate your first brief</h1>
              <p className="mt-2 text-muted-foreground">We'll load a demo workspace with sample meetings, notes and commitments so you can see a real brief immediately.</p>
              <div className="mt-8 rounded-xl border border-border bg-card p-6 space-y-4">
                {[
                  "Connect Google Calendar & your CRM from the Integrations page",
                  "Open an upcoming meeting and click Generate Brief",
                  "Inspect sources, edit sections, and export to PDF",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center shrink-0">{i + 1}</div>
                    <span className="text-sm">{t}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> Powered by Claude · every claim links to its source
              </div>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between">
            <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} data-testid="onboarding-back-button"
              className="h-11 px-5 rounded-lg border border-border font-medium text-sm flex items-center gap-2 disabled:opacity-40 hover:border-primary/40 transition">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} data-testid="onboarding-next-button"
                className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98]">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={finish} disabled={loading} data-testid="onboarding-finish-button"
                className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Enter BriefCraft <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
