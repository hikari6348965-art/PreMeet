import { useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  Link2, AlertTriangle, Target, HelpCircle, TrendingUp, ListChecks,
  CircleHelp, RefreshCw, ThumbsUp, ThumbsDown, Loader2, Sparkles, BadgeInfo,
} from "lucide-react";

function SectionShell({ title, icon: Icon, children, onRegenerate, regenerating, sectionKey }) {
  return (
    <section className="py-5 border-b border-border last:border-0" data-testid={`brief-section-${sectionKey}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h3>
        {onRegenerate && (
          <button onClick={onRegenerate} disabled={regenerating} data-testid={`regenerate-${sectionKey}`}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition disabled:opacity-50">
            {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Regenerate
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Source({ label }) {
  if (!label) return null;
  return (
    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-[11px] font-mono-label">
      <Link2 className="h-3 w-3" /> {label}
    </span>
  );
}

function FactTag({ type }) {
  if (type === "inference") return <span className="px-1.5 py-0.5 rounded bg-[#EEF2FF] text-[#4338CA] text-[10px] font-semibold font-mono-label">Inference</span>;
  return <span className="px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#047857] text-[10px] font-semibold font-mono-label">Verified</span>;
}

export default function BriefContent({ brief, onUpdate }) {
  const c = brief.content || {};
  const [regen, setRegen] = useState("");

  const regenerate = async (section) => {
    setRegen(section);
    try {
      const { data } = await api.post(`/briefs/${brief.id}/regenerate-section`, { section });
      onUpdate(data);
      toast.success("Section regenerated");
    } catch {
      toast.error("Regeneration failed. Please retry.");
    } finally { setRegen(""); }
  };

  const feedback = async (type, section) => {
    try { await api.post("/briefs/feedback", { brief_id: brief.id, type, section }); toast.success("Thanks for the feedback"); }
    catch { /* ignore */ }
  };

  return (
    <div data-testid="brief-content">
      <SectionShell title="Objective" icon={Target} sectionKey="objective">
        <p className="text-sm leading-relaxed">{c.objective || "—"}</p>
      </SectionShell>

      {c.who_you_are_meeting && (
        <SectionShell title="Who you're meeting" icon={BadgeInfo} sectionKey="who">
          <p className="text-sm leading-relaxed">{c.who_you_are_meeting}</p>
        </SectionShell>
      )}

      <SectionShell title="Background" icon={ListChecks} sectionKey="background" onRegenerate={() => regenerate("background")} regenerating={regen === "background"}>
        {(c.background || []).length === 0 ? <Empty /> : (
          <ul className="space-y-3">
            {c.background.map((b, i) => (
              <li key={i} className="text-sm">
                <div className="flex items-start gap-2">
                  <span className="leading-relaxed flex-1">{b.text}</span>
                  <FactTag type={b.type} />
                </div>
                <Source label={b.source} />
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      {c.previous_interaction?.summary && (
        <SectionShell title="Last interaction" icon={RefreshCw} sectionKey="previous">
          <p className="text-sm leading-relaxed">{c.previous_interaction.summary}</p>
          <Source label={c.previous_interaction.source} />
        </SectionShell>
      )}

      <SectionShell title="Open commitments" icon={AlertTriangle} sectionKey="commitments">
        {(c.open_commitments || []).length === 0 ? <Empty text="No outstanding commitments found in your sources." /> : (
          <ul className="space-y-3">
            {c.open_commitments.map((cm, i) => (
              <li key={i} className={`p-3 rounded-lg border ${cm.status === "overdue" ? "border-[#FECACA] bg-[#FEF2F2]" : "border-border bg-secondary/40"}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium leading-snug">{cm.description}</span>
                  {cm.status === "overdue" && <span className="px-2 py-0.5 rounded-full bg-[#B91C1C] text-white text-[10px] font-semibold shrink-0">OVERDUE</span>}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {cm.owner && <span>Owner: {cm.owner}</span>}
                  {cm.due_date && <span>Due: {new Date(cm.due_date).toLocaleDateString()}</span>}
                </div>
                <Source label={cm.source} />
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      <SectionShell title="Recent developments" icon={TrendingUp} sectionKey="developments">
        {(c.recent_developments || []).length === 0 ? <Empty text="No sourced developments available." /> : (
          <ul className="space-y-3">
            {c.recent_developments.map((d, i) => (
              <li key={i} className="text-sm"><span className="leading-relaxed">{d.text}</span><Source label={d.source} /></li>
            ))}
          </ul>
        )}
      </SectionShell>

      <SectionShell title="Talking points" icon={Target} sectionKey="talking_points" onRegenerate={() => regenerate("talking_points")} regenerating={regen === "talking_points"}>
        {(c.talking_points || []).length === 0 ? <Empty /> : (
          <ol className="space-y-3">
            {c.talking_points.map((tp, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">{tp.priority || i + 1}</span>
                <div>
                  <p className="text-sm font-medium">{tp.point}</p>
                  {tp.rationale && <p className="text-xs text-muted-foreground mt-0.5">{tp.rationale}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionShell>

      <SectionShell title="Suggested questions" icon={HelpCircle} sectionKey="questions" onRegenerate={() => regenerate("suggested_questions")} regenerating={regen === "suggested_questions"}>
        {(c.suggested_questions || []).length === 0 ? <Empty /> : (
          <ul className="space-y-2.5">
            {c.suggested_questions.map((q, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm"><CircleHelp className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {q}</li>
            ))}
          </ul>
        )}
      </SectionShell>

      {(c.risks_and_opportunities || []).length > 0 && (
        <SectionShell title="Risks & opportunities" icon={TrendingUp} sectionKey="risks">
          <ul className="space-y-2.5">
            {c.risks_and_opportunities.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono-label shrink-0 ${r.kind === "risk" ? "bg-[#FEF2F2] text-[#B91C1C]" : "bg-[#ECFDF5] text-[#047857]"}`}>{r.kind}</span>
                {r.text}
              </li>
            ))}
          </ul>
        </SectionShell>
      )}

      {(c.recommended_next_actions || []).length > 0 && (
        <SectionShell title="Recommended next actions" icon={ListChecks} sectionKey="actions">
          <ul className="space-y-2">
            {c.recommended_next_actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm"><span className="text-primary">→</span> {a}</li>
            ))}
          </ul>
        </SectionShell>
      )}

      {(c.missing_information || []).length > 0 && (
        <SectionShell title="Missing information" icon={AlertTriangle} sectionKey="missing">
          <p className="text-xs text-muted-foreground mb-2">The following context wasn't available and was <strong>not</strong> fabricated:</p>
          <ul className="space-y-1.5">
            {c.missing_information.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><span>•</span> {m}</li>
            ))}
          </ul>
        </SectionShell>
      )}

      {(c.sources || []).length > 0 && (
        <SectionShell title="Sources" icon={Link2} sectionKey="sources">
          <div className="flex flex-wrap gap-2">
            {c.sources.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-secondary/40 text-xs">
                <Link2 className="h-3 w-3 text-primary" />
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground font-mono-label text-[10px]">{s.type}</span>
              </span>
            ))}
          </div>
        </SectionShell>
      )}

      <div className="mt-6 flex items-center justify-between pt-5 border-t border-border print:hidden">
        <p className="text-xs text-muted-foreground font-mono-label flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Generated {new Date(c.generated_at || brief.generated_at).toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => feedback("useful")} data-testid="brief-feedback-useful" className="h-9 px-3 rounded-lg border border-border text-sm flex items-center gap-1.5 hover:border-primary/40 transition">
            <ThumbsUp className="h-4 w-4" /> Useful
          </button>
          <button onClick={() => feedback("incorrect")} data-testid="brief-feedback-incorrect" className="h-9 px-3 rounded-lg border border-border text-sm flex items-center gap-1.5 hover:border-destructive/40 transition">
            <ThumbsDown className="h-4 w-4" /> Needs work
          </button>
        </div>
      </div>
    </div>
  );
}

function Empty({ text = "No content available." }) {
  return <p className="text-sm text-muted-foreground italic">{text}</p>;
}
