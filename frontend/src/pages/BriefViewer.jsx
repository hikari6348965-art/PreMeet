import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { Card, StatusBadge, formatDateTime, meetingTypeLabel } from "../components/ui-helpers";
import BriefContent from "../components/BriefContent";
import { UpgradeDialog } from "../components/UpgradeDialog";
import { EmailChip } from "../components/EmailChip";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, Loader2, Printer, Copy, Users, Building2, FileText,
  AlertTriangle, RefreshCw, Trash2, StickyNote,
} from "lucide-react";

export default function BriefViewer() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [quotaMsg, setQuotaMsg] = useState("");

  const load = useCallback(() => api.get(`/meetings/${id}`).then(({ data }) => setData(data)), [id]);
  useEffect(() => { load().catch(() => toast.error("Meeting not found")); }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      await api.post("/briefs/generate", { meeting_id: id });
      await load();
      toast.success("Brief generated");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 402) {
        setQuotaMsg(detail?.message || "You've reached your monthly brief limit.");
      } else {
        toast.error(formatApiErrorDetail(detail) || "Brief generation failed.");
      }
      await load();
    } finally { setGenerating(false); }
  };

  const copyBrief = () => {
    const c = data.brief?.content;
    if (!c) return;
    const text = [
      `${data.meeting.title}`, `Objective: ${c.objective}`, "",
      "Talking points:", ...(c.talking_points || []).map((t, i) => `${i + 1}. ${t.point}`), "",
      "Suggested questions:", ...(c.suggested_questions || []).map((q) => `- ${q}`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Brief copied to clipboard");
  };

  const deleteBrief = async () => {
    await api.delete(`/briefs/${data.brief.id}`);
    await load();
    toast.success("Brief deleted");
  };

  if (!data) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const { meeting, contact, notes, commitments, brief } = data;

  return (
    <div data-testid="brief-viewer-page">
      <UpgradeDialog open={!!quotaMsg} onOpenChange={(o) => !o && setQuotaMsg("")} message={quotaMsg} />
      <Link to="/app/meetings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 print:hidden">
        <ArrowLeft className="h-4 w-4" /> Back to meetings
      </Link>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
              <div>
                <span className="font-mono-label text-[11px] text-muted-foreground">{meetingTypeLabel(meeting.meeting_type)} · {formatDateTime(meeting.start_time)}</span>
                <h1 className="mt-1.5 text-2xl font-bold tracking-tight">{meeting.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {meeting.company && <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {meeting.company}</span>}
                  {meeting.attendees?.length > 0 && <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {meeting.attendees.join(", ")}</span>}
                </div>
              </div>
              <StatusBadge status={meeting.status} />
            </div>

            {!brief ? (
              <div className="py-12 text-center" data-testid="no-brief-state">
                <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center mx-auto">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold text-lg">No brief yet</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  Generate a source-verified brief from this meeting's linked notes, commitments and client record.
                </p>
                {meeting.status === "failed" && (
                  <p className="mt-3 text-sm text-destructive flex items-center justify-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Last generation failed. Please retry.
                  </p>
                )}
                <button onClick={generate} disabled={generating} data-testid="generate-brief-button"
                  className="mt-6 h-11 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center gap-2 hover:bg-[hsl(200_98%_32%)] transition active:scale-[0.98] disabled:opacity-60">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? "Preparing brief…" : "Generate brief"}
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 py-4 print:hidden">
                  <button onClick={generate} disabled={generating} data-testid="regenerate-brief-button" className="h-9 px-3 rounded-lg border border-border text-sm font-medium flex items-center gap-1.5 hover:border-primary/40 transition disabled:opacity-60">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Regenerate all
                  </button>
                  <button onClick={copyBrief} data-testid="copy-brief-button" className="h-9 px-3 rounded-lg border border-border text-sm font-medium flex items-center gap-1.5 hover:border-primary/40 transition">
                    <Copy className="h-4 w-4" /> Copy
                  </button>
                  <button onClick={() => window.print()} data-testid="print-brief-button" className="h-9 px-3 rounded-lg border border-border text-sm font-medium flex items-center gap-1.5 hover:border-primary/40 transition">
                    <Printer className="h-4 w-4" /> Print / PDF
                  </button>
                  <button onClick={deleteBrief} data-testid="delete-brief-button" className="h-9 px-3 rounded-lg border border-border text-sm font-medium flex items-center gap-1.5 text-destructive hover:border-destructive/40 transition">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                  <EmailChip brief={brief} onSent={load} />
                </div>
                <BriefContent brief={brief} onUpdate={(b) => setData({ ...data, brief: b })} />
              </>
            )}
          </Card>
        </div>

        {/* Sidebar: context */}
        <div className="lg:col-span-4 space-y-5 print:hidden">
          {contact && contact.name && (
            <Card className="p-5" data-testid="brief-contact-card">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Client</h3>
              <p className="font-medium">{contact.name}</p>
              <p className="text-sm text-muted-foreground">{contact.title} · {contact.company}</p>
              {contact.preferences?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {contact.preferences.map((p, i) => <span key={i} className="px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-xs">{p}</span>)}
                </div>
              )}
            </Card>
          )}
          <Card className="p-5" data-testid="brief-notes-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><StickyNote className="h-4 w-4 text-primary" /> Linked notes ({notes.length})</h3>
            {notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes linked to this client.</p> : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="text-sm">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.content}</p>
                    <span className="font-mono-label text-[10px] text-muted-foreground">{n.source_type}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Commitments ({commitments.length})</h3>
            {commitments.length === 0 ? <p className="text-sm text-muted-foreground">None recorded.</p> : (
              <div className="space-y-2.5">
                {commitments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-sm">
                    <StatusBadge status={c.status} />
                    <span className="leading-snug">{c.description}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
