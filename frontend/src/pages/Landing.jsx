import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";
import {
  FileText, ArrowRight, CalendarClock, Database, ListChecks, ShieldCheck,
  Sparkles, Quote, Check, ChevronDown, Link2, AlertTriangle, Target, Video,
} from "lucide-react";


const features = [
  { icon: Database, title: "Unified Client Memory", desc: "Consolidate notes, emails, past calls and open tasks into one living profile per client." },
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
  { q: "How does PreMeet avoid making things up?", a: "Every factual claim must reference a real source — a note, email, calendar event or recorded commitment. When information isn't available, the brief says so explicitly instead of inventing it." },
  { q: "Do I have to replace my calendar or inbox?", a: "No. PreMeet brings context together from the tools you already use. Google Calendar and Gmail connect through Google's official sign-in and request only read permissions." },
  { q: "Is my client data private?", a: "Your data is isolated per account. We never use your meeting notes or emails to train models, and you control retention and deletion." },
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
            <Logo tone="ink" className="h-7" />
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#demo" className="hover:text-foreground transition">Example brief</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" data-testid="nav-login-link" className="text-sm font-medium hover:text-primary transition">Sign in</Link>
            <Link to="/register" data-testid="nav-register-link" className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center hover:bg-primary/90 transition-all active:scale-[0.98]">
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="bc-grid-bg absolute inset-0 opacity-50" />
        <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-32 sm:pt-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <span className="bc-rise inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ink text-white text-xs font-mono-label">
              <span className="h-1.5 w-1.5 rounded-full bg-signal bc-blink" /> Prep · Call · Notes
            </span>
            <h1 className="bc-rise bc-d1 mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.98]">
              Know the room<br />before you <span className="relative inline-block"><span className="relative z-10">walk in.</span><span className="absolute left-0 right-0 bottom-1 h-1.5 bg-ink -z-0" /></span>
            </h1>
            <p className="bc-rise bc-d2 mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
              PreMeet reads your calendar, inbox and notes, hands you a one-page brief with sources, runs the call, and writes up what was decided.
            </p>
            <div className="bc-rise bc-d3 mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/register" data-testid="hero-cta-button" className="h-12 px-6 rounded-lg bg-ink text-white font-semibold flex items-center justify-center gap-2 shadow-[4px_4px_0_0_#0B0F1A] hover:shadow-[6px_6px_0_0_#0B0F1A] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-[transform,box-shadow] active:translate-x-0 active:translate-y-0 active:shadow-none">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#demo" className="h-12 px-6 rounded-lg border-2 border-ink font-semibold flex items-center justify-center hover:bg-ink hover:text-white transition-colors">
                See a real brief
              </a>
            </div>
            <p className="bc-rise bc-d4 mt-4 text-sm text-muted-foreground">3 free briefs a month · No card needed</p>
          </div>

          <div className="relative bc-rise bc-d3" data-testid="hero-live-preview">
            <div className="rounded-2xl border-2 border-ink bg-card p-6 shadow-[8px_8px_0_0_#0B0F1A]">
              <div className="flex items-center justify-between">
                <p className="font-mono-label text-[10px] text-muted-foreground">Today · 2:00 PM · Renewal review</p>
                <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] text-[11px] font-bold">Ready</span>
              </div>
              <h3 className="mt-2 text-xl font-bold">Northwind Retail</h3>
              <div className="mt-4 space-y-2.5">
                {["Lead with the overdue rollout plan", "Peak season cut throughput 20%", "Ask who signs off on the ERP timeline"].map((t, i) => (
                  <div key={t} className={`bc-rise bc-d${i + 4} flex items-start gap-2.5 text-sm`}>
                    <span className="mt-0.5 h-5 w-5 rounded bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="bc-type">{t}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-1.5">
                {["Gmail · Oct 18", "Calendar", "Call notes · Oct 11"].map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-md bg-secondary text-[11px] font-medium">{s}</span>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-24 right-4 sm:-right-6 w-60 rounded-xl bg-ink text-white p-4 shadow-xl bc-rise bc-d6 bc-grain overflow-hidden">
              <div className="flex items-center gap-2 text-xs font-bold"><span className="h-2 w-2 rounded-full bg-signal bc-blink" /> REC · 24:13</div>
              <p className="mt-2 text-sm leading-snug">Decision: phased rollout starts in March.</p>
              <p className="mt-1 text-xs text-white/60">Action · Dana to share ERP specs by Friday</p>
            </div>
          </div>
        </div>
        <div className="relative border-t border-border bg-card overflow-hidden py-3">
          <div className="flex w-max bc-marquee gap-10 text-sm font-semibold text-muted-foreground">
            {[...Array(2)].flatMap((_, k) => ["Google Calendar", "Gmail", "Built-in video calls", "Recording upload", "Auto-extracted notes", "PDF export", "Source citations", "Commitment tracking"].map((n) => (
              <span key={`${k}-${n}`} className="flex items-center gap-2 whitespace-nowrap"><span className="h-1.5 w-1.5 rotate-45 bg-primary" />{n}</span>
            )))}
          </div>
        </div>
      </section>

      {/* Call to notes */}
      <section className="max-w-6xl mx-auto px-5 pt-24 pb-4">
        <div className="grid md:grid-cols-3 gap-0 border-2 border-ink rounded-2xl overflow-hidden">
          {[
            { n: "01", t: "Before", d: "A one-page brief built from your calendar, Gmail threads and past call notes. Every fact shows where it came from.", icon: FileText },
            { n: "02", t: "During", d: "Run the call in a built-in video room. Share one link with your attendees. Nothing to install.", icon: Video },
            { n: "03", t: "After", d: "Upload the call recording. It is transcribed, and decisions, action items and key details land in your notes. Export a PDF.", icon: ListChecks },
          ].map((s, i) => (
            <div key={s.n} className={`p-7 bg-card ${i < 2 ? "md:border-r-2 border-b-2 md:border-b-0 border-ink" : ""} hover:bg-accent/50 transition-colors`} data-testid={`flow-step-${s.n}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-primary">{s.n}</span>
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-2xl font-bold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
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
              className="p-6 rounded-xl border border-border bg-card bc-lift">
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
      <section id="demo" className="relative bg-ink text-white py-24 bc-grain overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="font-mono-label text-xs text-signal">The one-page brief</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Everything you need, nothing you don't</h2>
            <p className="mt-4 text-white/70 text-lg leading-relaxed">
              Scannable sections, prioritised talking points, and a citation footer so you can inspect the source of every claim.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} data-testid={`demo-tab-${t.replace(/\s+/g, "-").toLowerCase()}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t ? "bg-signal text-ink" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="relative rounded-2xl bg-white text-foreground p-6 shadow-[8px_8px_0_0_#0B0F1A]">
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
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Connect Google Calendar and Gmail through official, read-only authorization. No need to replace anything.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {["Google Calendar", "Gmail", "Built-in video calls", "Manual notes & uploads"].map((n) => (
            <span key={n} className="px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium bc-lift">{n}</span>
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
                className={`p-6 rounded-2xl border-2 bg-card flex flex-col ${p.id === "entry" ? "border-ink shadow-[6px_6px_0_0_#0B0F1A]" : "border-border bc-lift"}`}>
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
                <Link to={user ? "/app/billing" : "/register"} data-testid={`pricing-cta-${p.id}`} className={`mt-6 h-11 rounded-lg font-semibold text-sm flex items-center justify-center transition-all active:scale-[0.98] ${p.id === "entry" ? "bg-primary text-white hover:bg-primary/90" : "border border-border hover:border-primary/40"}`}>
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
        <div className="rounded-2xl bg-ink text-white p-10 sm:p-16 text-center relative overflow-hidden bc-grain">
          <div className="bc-grid-bg absolute inset-0 opacity-[0.06]" />
          <Quote className="h-8 w-8 text-signal mx-auto" />
          <h2 className="relative mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">Never walk in unprepared again.</h2>
          <p className="relative mt-4 text-white/70 max-w-xl mx-auto">Start free and generate your first source-verified brief in minutes.</p>
          <Link to="/register" data-testid="footer-cta-button" className="relative mt-8 inline-flex h-12 px-8 rounded-lg bg-signal text-ink font-bold items-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98]">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Logo tone="ink" className="h-6" testid="footer-logo" />
          <p>© {new Date().getFullYear()} PreMeet. Walk into every meeting prepared.</p>
        </div>
      </footer>
    </div>
  );
}
