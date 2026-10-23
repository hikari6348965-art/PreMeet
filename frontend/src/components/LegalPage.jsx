import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";

export const CONTACT_EMAIL = "azuredark647@gmail.com";

function Block({ b }) {
  if (typeof b === "string") return <p className="text-[15px] leading-relaxed text-foreground/80">{b}</p>;
  if (b.h) return <h3 className="pt-3 text-base font-bold">{b.h}</h3>;
  return (
    <ul className="space-y-1.5 pl-5 list-disc marker:text-foreground/40 text-[15px] leading-relaxed text-foreground/80">
      {b.list.map((li) => <li key={li}>{li}</li>)}
    </ul>
  );
}

function ContactCard({ title, intro, subject, note }) {
  return (
    <section id="contact" className="scroll-mt-24 space-y-4" data-testid="legal-section-contact">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-[15px] leading-relaxed text-foreground/80">{intro}</p>
      <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`} data-testid="legal-contact-me-btn"
        className="inline-flex h-11 px-5 rounded-lg bg-ink text-white font-semibold text-sm items-center gap-2 hover:bg-ink/85 transition-colors active:scale-[0.98]">
        <Mail className="h-4 w-4" /> Contact me
      </a>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </section>
  );
}

export function LegalPage({ title, lastUpdated, sections, contact, testid, other }) {
  useEffect(() => { document.title = `${title} · PreMeet`; window.scrollTo(0, 0); }, [title]);
  return (
    <div className="min-h-screen bg-background" data-testid={testid}>
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" data-testid="legal-home-link"><Logo tone="ink" className="h-7" /></Link>
          <div className="flex items-center gap-5 text-sm font-medium">
            <Link to={other.to} className="hover:underline" data-testid="legal-other-link">{other.label}</Link>
            <Link to="/" className="flex items-center gap-1.5 hover:underline"><ArrowLeft className="h-4 w-4" /> Home</Link>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-5 py-14 grid lg:grid-cols-[220px_1fr] gap-12">
        <nav className="hidden lg:block" aria-label="Sections">
          <div className="sticky top-24 space-y-1 text-sm max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block py-1 text-muted-foreground hover:text-foreground transition-colors">{s.title}</a>
            ))}
            <a href="#contact" className="block py-1 text-muted-foreground hover:text-foreground transition-colors">{contact.title}</a>
          </div>
        </nav>
        <article className="max-w-3xl space-y-12 min-w-0">
          <div>
            <p className="font-mono-label text-xs text-muted-foreground">Legal</p>
            <h1 className="mt-2 text-4xl sm:text-5xl font-bold">{title}</h1>
            <p className="mt-3 text-sm text-muted-foreground" data-testid="legal-last-updated">Last updated: {lastUpdated}</p>
          </div>
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 space-y-4" data-testid={`legal-section-${s.id}`}>
              <h2 className="text-2xl font-bold">{s.title}</h2>
              {s.body.map((b, i) => <Block key={i} b={b} />)}
            </section>
          ))}
          <ContactCard {...contact} />
        </article>
      </div>
    </div>
  );
}
