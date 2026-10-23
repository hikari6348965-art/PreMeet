import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { Logo } from "../components/Logo";
import { PRIVACY_SECTIONS, PRIVACY_LAST_UPDATED, PRIVACY_CONTACT_EMAIL } from "../content/privacyPolicy";

function Block({ b }) {
  if (typeof b === "string") return <p className="text-[15px] leading-relaxed text-foreground/80">{b}</p>;
  if (b.h) return <h3 className="pt-3 text-base font-bold">{b.h}</h3>;
  return (
    <ul className="space-y-1.5 pl-5 list-disc marker:text-foreground/40 text-[15px] leading-relaxed text-foreground/80">
      {b.list.map((li) => <li key={li}>{li}</li>)}
    </ul>
  );
}

function ContactCard() {
  return (
    <section id="contact" className="scroll-mt-24 space-y-4" data-testid="privacy-section-contact">
      <h2 className="text-2xl font-bold">17. Contact Us</h2>
      <p className="text-[15px] leading-relaxed text-foreground/80">
        For privacy questions, requests to access or delete your information, or concerns about how PreMeet processes your data, get in touch.
      </p>
      <a href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=${encodeURIComponent("PreMeet privacy request")}`} data-testid="privacy-contact-me-btn"
        className="inline-flex h-11 px-5 rounded-lg bg-ink text-white font-semibold text-sm items-center gap-2 hover:bg-ink/85 transition-colors active:scale-[0.98]">
        <Mail className="h-4 w-4" /> Contact me
      </a>
      <p className="text-sm text-muted-foreground">Please don't include passwords, access tokens or other sensitive credentials in privacy-related messages.</p>
    </section>
  );
}

export default function PrivacyPolicy() {
  useEffect(() => { document.title = "Privacy Policy · PreMeet"; window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-background" data-testid="privacy-page">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" data-testid="privacy-home-link"><Logo tone="ink" className="h-7" /></Link>
          <Link to="/" className="text-sm font-medium flex items-center gap-1.5 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-5 py-14 grid lg:grid-cols-[220px_1fr] gap-12">
        <nav className="hidden lg:block" aria-label="Sections">
          <div className="sticky top-24 space-y-1 text-sm">
            {PRIVACY_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block py-1 text-muted-foreground hover:text-foreground transition-colors">{s.title}</a>
            ))}
            <a href="#contact" className="block py-1 text-muted-foreground hover:text-foreground transition-colors">17. Contact Us</a>
          </div>
        </nav>
        <article className="max-w-3xl space-y-12">
          <div>
            <p className="font-mono-label text-xs text-muted-foreground">Legal</p>
            <h1 className="mt-2 text-4xl sm:text-5xl font-bold">Privacy Policy</h1>
            <p className="mt-3 text-sm text-muted-foreground" data-testid="privacy-last-updated">Last updated: {PRIVACY_LAST_UPDATED}</p>
          </div>
          {PRIVACY_SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 space-y-4" data-testid={`privacy-section-${s.id}`}>
              <h2 className="text-2xl font-bold">{s.title}</h2>
              {s.body.map((b, i) => <Block key={i} b={b} />)}
            </section>
          ))}
          <ContactCard />
        </article>
      </div>
    </div>
  );
}
