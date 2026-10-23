import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  FileText, ArrowRight, CalendarClock, Database, ListChecks, ShieldCheck,
  Sparkles, Quote, Check, ChevronDown, Link2, AlertTriangle, Target,
} from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1649119162006-304b172c12d8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjBkZXNrJTIwbGFwdG9wJTIwbWluaW1hbGlzdCUyMHdvcmtzcGFjZXxlbnwwfHx8fDE3OTI3NjEyOTh8MA&ixlib=rb-4.1.0&q=85";

const features = [
  { icon: Database, title: "Unified Client Memory", desc: "Consolidate notes, CRM records, past meetings and open tasks into one living profile per client." },
  { icon: ShieldCheck, title: "Source-Verified Intelligence", desc: "Every factual claim links to its source. Facts, inferences and missing info are clearly separated." },
  { icon: ListChecks, title: "Forgotten-Commitment Detector", desc: "Surfaces promises you made, overdue tasks and decisions still waiting — with their origin." },
  { icon: Target, title: "Adaptive Talking Points", desc: "Three prioritised talking points and three questions, grounded in real context — never filler." },
  { icon: CalendarClock, title: "Automatic Preparation", desc: "Briefs generated before eligible meetings, with clear Ready / Preparing / Needs-attention status." },
  { icon: Sparkles, title: "Profession Templates", desc: "Tuned layouts for consultants, account executives, freelancers and recruiters." },
];

const tabs = ["Background", "Commitments", "Talking Points", "Questions", "Sources"];
const tabContent = {
  Background: ["Dana sponsors the fulfilment optimisation project at Northwind Retail.", "Warehouse throughput drops 20% during peak season.", "She prefers concise, data-driven updates."],
  Commitments: ["⚠ Overdue: Send phased rollout plan + reference customer intro.", "Open: Confirm ERP integration timeline."],
  "Talking Points": ["Acknowledge the overdue rollout plan and present it first.", "Quantify peak-season throughput impact with numbers.", "Propose a phased timeline tied to their ERP."],
  Questions: ["What does a successful rollout look like by Q2?", "Which ERP constraints matter most to your team?", "Who else needs to sign off on the timeline?"],
  Sources: ["Note — 'Discovery call - Northwind' (Oct 11)", "Commitment — rollout plan (overdue)", "Calendar — Fulfilment Project Review"],
};

const faqs = [
  { q: "How does BriefCraft avoid making things up?", a: "Every factual claim must reference a real source — a note, CRM field, calendar event or recorded commitment. When information isn't available, the brief says so explicitly instead of inventing it." },
  { q: "Do I have to replace my CRM or calendar?", a: "No. BriefCraft brings context together from the tools you already use. Calendar and CRM connections use the official OAuth flow and request only read permissions." },
  { q: "Is my client data private?", a: "Your data is isolated per account. We never use your meeting notes or CRM records to train models, and you control retention and deletion." },
  { q: "What happens when I hit my monthly brief limit?", a: "We stop and show a clear upgrade prompt. You're never silently charged or pushed over your plan's allowance." },
];

function FaqItem({ q, a, i }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden" data-testid={`faq-item-${i}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 p-5 text-left">
        <span className="font-semibold">{q}</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed -mt-1">{a}</p>}
    </div>
  );
}

export default function Landing() {
  const [activeTab, setActiveTab] = useState("Background");
  const [plans, setPlans] = useState([]);
  const { user } = useAuth();

  useEffect(() => { api.get("/plans").then(({ data }) => setPlans(data)).catch(() => {}); }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">BriefCraft AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#demo" className="hover:text-foreground transition">Example brief</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" data-testid="nav-login-link" className="text-sm font-medium hover:text-primary transition">Sign in</Link>
            <Link to="/register" data-testid="nav-register-link" className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center hover:bg-[hsl(200_98%_32%)] transition-all active:scale-[0.98]">
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bc-grid-bg absolute inset-0 opacity-40" />
        <div className="relative max-w-6xl mx-auto px-5 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-mono-label">
              <Sparkles className="h-3.5 w-3.5" /> AI meeting brief generator
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Walk into every meeting <span className="text-primary">fully prepared.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl">
              BriefCraft turns scattered client context — notes, CRM records, calendars and commitments — into a trustworthy, source-linked one-page brief before every important conversation.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/register" data-testid="hero-cta-button" className="h-12 px-6 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-[hsl(200_98%_32%)] transition-all active:scale-[0.98]">
                Generate your first brief <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#demo" className="h-12 px-6 rounded-lg border border-border bg-card font-semibold flex items-center justify-center hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                See an example
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Free starter plan · No credit card required</p>
          </div>

          <div className="mt-14 rounded-2xl border border-border overflow-hidden shadow-xl shadow-slate-200/60">
            <img src={HERO_IMG} alt="Minimal workspace" className="w-full h-[280px] sm:h-[420px] object-cover" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-20">
        <div className="max-w-2xl">
          <span className="font-mono-label text-xs text-primary">What you get</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Preparation that's actually trustworthy</h2>
          <p className="mt-4 text-muted-foreground text-lg">Not just another summary. Context-aware, source-linked, and built for client-facing work.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} data-testid={`feature-card-${f.title.replace(/\s+/g, "-").toLowerCase()}`}
              className="p-6 rounded-xl border border-border bg-card hover:-translate-y-1 hover:shadow-md hover:border-primary/30 transition-all duration-200">
              <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive example brief */}
      <section id="demo" className="bg-[#0F172A] text-white py-20">
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="font-mono-label text-xs text-primary">The one-page brief</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Everything you need, nothing you don't</h2>
            <p className="mt-4 text-slate-300 text-lg leading-relaxed">
              Scannable sections, prioritised talking points, and a citation footer so you can inspect the source of every claim.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} data-testid={`demo-tab-${t.replace(/\s+/g, "-").toLowerCase()}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t ? "bg-primary text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white text-foreground p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="font-mono-label text-[10px] text-muted-foreground">Project review · Today 2:00 PM</p>
                <h3 className="font-bold text-lg mt-1">Northwind — Fulfilment Review</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#047857] text-xs font-semibold">Ready</span>
            </div>
            <div className="mt-4 space-y-3 min-h-[180px]">
              {tabContent[activeTab].map((line, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  {activeTab === "Sources" ? <Link2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    : activeTab === "Commitments" && line.startsWith("⚠") ? <AlertTriangle className="h-4 w-4 text-[#D97706] mt-0.5 shrink-0" />
                    : <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                  <span className="leading-relaxed text-slate-700">{line.replace("⚠ ", "")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="max-w-6xl mx-auto px-5 py-20 text-center">
        <span className="font-mono-label text-xs text-primary">Brings your stack together</span>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">Works with the tools you already use</h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Connect calendars and CRMs through official, read-only authorization. No need to replace anything.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {["Google Calendar", "Outlook", "HubSpot", "Salesforce", "Gmail", "Manual Notes & Uploads"].map((n) => (
            <span key={n} className="px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium">{n}</span>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-secondary/40 py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-2xl mx-auto">
            <span className="font-mono-label text-xs text-primary">Transparent pricing</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Predictable monthly plans</h2>
            <p className="mt-4 text-muted-foreground text-lg">Clear brief allowances. No surprise charges. Upgrade when you need more.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {plans.map((p) => (
              <div key={p.id} data-testid={`pricing-card-${p.id}`}
                className={`p-6 rounded-2xl border bg-card flex flex-col ${p.id === "entry" ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary" : "border-border"}`}>
                <div className="flex items-center justify-between min-h-6">
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  {p.id === "entry" && <span className="px-2.5 py-1 rounded-full bg-primary text-white text-xs font-semibold">Most popular</span>}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">${p.price_monthly}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground" data-testid={`pricing-inr-${p.id}`}>
                  {p.price_inr ? `Charged as ₹${p.price_inr.toLocaleString("en-IN")} via Razorpay` : "No card needed"}
                </p>
                <ul className="mt-6 space-y-2.5 flex-1">
                  {p.features?.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={user ? "/app/billing" : "/register"} data-testid={`pricing-cta-${p.id}`} className={`mt-6 h-11 rounded-lg font-semibold text-sm flex items-center justify-center transition-all active:scale-[0.98] ${p.id === "entry" ? "bg-primary text-white hover:bg-[hsl(200_98%_32%)]" : "border border-border hover:border-primary/40"}`}>
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 flex flex-col md:flex-row gap-8 items-start">
          <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Security &amp; privacy by default</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
              Your data is isolated per account. Integrations use official OAuth with minimum read-only scopes — we never store third-party passwords. We don't train models on your data, and you control retention and deletion.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {["Tenant isolation", "OAuth read-only", "No model training on your data", "Configurable retention"].map((t) => (
                <span key={t} className="px-3 py-1.5 rounded-full bg-secondary text-xs font-medium">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-5 py-20">
        <h2 className="text-3xl font-bold tracking-tight text-center">Frequently asked questions</h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => <FaqItem key={i} {...f} i={i} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 pb-24">
        <div className="rounded-2xl bg-[#0F172A] text-white p-10 sm:p-16 text-center relative overflow-hidden">
          <div className="bc-grid-bg absolute inset-0 opacity-[0.06]" />
          <Quote className="h-8 w-8 text-primary mx-auto" />
          <h2 className="relative mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">Never walk in unprepared again.</h2>
          <p className="relative mt-4 text-slate-300 max-w-xl mx-auto">Start free and generate your first source-verified brief in minutes.</p>
          <Link to="/register" data-testid="footer-cta-button" className="relative mt-8 inline-flex h-12 px-8 rounded-lg bg-primary text-white font-semibold items-center gap-2 hover:bg-[hsl(200_98%_45%)] transition-all active:scale-[0.98]">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <FileText className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-foreground">BriefCraft AI</span>
          </div>
          <p>© {new Date().getFullYear()} BriefCraft AI. Walk into every meeting prepared.</p>
        </div>
      </footer>
    </div>
  );
}
