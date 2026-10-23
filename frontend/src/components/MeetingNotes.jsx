import { useEffect, useRef, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";
import {
  Sparkles, Loader2, Upload, FileDown, CheckCircle2, ListTodo, Lightbulb, HelpCircle, Save, AlertTriangle, ArrowRight,
} from "lucide-react";

const BUSY = ["waiting", "transcribing", "extracting"];
const STEP_LABEL = {
  waiting: "Waiting for the call recording…", transcribing: "Transcribing the conversation…",
  extracting: "Pulling out decisions and action items…",
};

function Section({ icon: Icon, title, items, testid, render }) {
  if (!items?.length) return null;
  return (
    <div data-testid={testid}>
      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
        <Icon className="h-3.5 w-3.5 text-primary" /> {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm leading-relaxed pl-3 border-l-2 border-primary/30">{render ? render(it) : it}</li>
        ))}
      </ul>
    </div>
  );
}

function AiNotes({ ai }) {
  return (
    <div className="space-y-5" data-testid="ai-notes">
      {ai.summary && <p className="text-sm leading-relaxed" data-testid="ai-notes-summary">{ai.summary}</p>}
      <Section icon={CheckCircle2} title="Decisions" items={ai.decisions} testid="ai-notes-decisions" />
      <Section icon={ListTodo} title="Action items" items={ai.action_items} testid="ai-notes-actions"
        render={(a) => (<span><span className="font-medium">{a.task}</span>
          {(a.owner || a.due) && <span className="text-muted-foreground"> · {[a.owner, a.due].filter(Boolean).join(" · ")}</span>}</span>)} />
      <Section icon={Lightbulb} title="Key details" items={ai.key_details} testid="ai-notes-details" />
      <Section icon={HelpCircle} title="Open questions" items={ai.open_questions} testid="ai-notes-questions" />
      {ai.follow_up && (
        <p className="text-sm flex items-start gap-2 p-3 rounded-lg bg-accent text-accent-foreground">
          <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> {ai.follow_up}
        </p>
      )}
    </div>
  );
}

function ProcessState({ notes, canProcess, onProcess, onUpload, uploading }) {
  const fileRef = useRef(null);
  if (BUSY.includes(notes.status)) {
    return (
      <div className="p-4 rounded-lg border border-dashed border-primary/40 bg-accent/40 flex items-center gap-3" data-testid="notes-processing">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">{STEP_LABEL[notes.status]}</span>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {notes.status === "failed" && (
        <p className="text-sm text-destructive flex items-start gap-2" data-testid="notes-error">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {notes.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {canProcess && (
          <button onClick={onProcess} data-testid="notes-process-btn"
            className="h-9 px-3.5 rounded-lg bg-ink text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-ink/85 transition-colors active:scale-[0.98]">
            <Sparkles className="h-4 w-4 text-signal" /> Extract from call recording
          </button>
        )}
        <button onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="notes-upload-btn"
          className="h-9 px-3.5 rounded-lg border border-border bg-card text-sm font-medium flex items-center gap-1.5 hover:border-ink transition-colors disabled:opacity-60">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload a recording
        </button>
        <input ref={fileRef} type="file" accept="audio/*,video/*" className="hidden" data-testid="notes-upload-input"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onUpload(f); }} />
      </div>
    </div>
  );
}

export function MeetingNotes({ meetingId, canProcess, autoProcessKey }) {
  const [notes, setNotes] = useState(null);
  const [manual, setManual] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => api.get(`/meetings/${meetingId}/notes`).then(({ data }) => {
    setNotes(data);
    return data;
  }), [meetingId]);

  useEffect(() => { load().then((d) => setManual(d.manual || "")).catch(() => toast.error("Couldn't load notes")); }, [load]);

  useEffect(() => {
    if (!notes || !BUSY.includes(notes.status)) return;
    const t = setInterval(() => load().then((d) => {
      if (d.status === "ready") toast.success("Meeting notes are ready");
    }), 5000);
    return () => clearInterval(t);
  }, [notes, load]);

  const process = useCallback(async () => {
    try { const { data } = await api.post(`/meetings/${meetingId}/notes/process`); setNotes(data); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  }, [meetingId]);

  useEffect(() => { if (autoProcessKey && canProcess) process(); }, [autoProcessKey, canProcess, process]);

  const upload = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post(`/meetings/${meetingId}/notes/upload`, fd);
      setNotes(data);
      toast.success("Recording uploaded. Extracting notes…");
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
    finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try { const { data } = await api.put(`/meetings/${meetingId}/notes`, { manual }); setNotes(data); toast.success("Notes saved"); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      if (manual !== (notes.manual || "")) await api.put(`/meetings/${meetingId}/notes`, { manual });
      const res = await api.get(`/meetings/${meetingId}/notes/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = "meeting-notes.pdf"; a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch { toast.error("Couldn't export the PDF"); }
    finally { setExporting(false); }
  };

  if (!notes) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  const dirty = manual !== (notes.manual || "");

  return (
    <div className="space-y-6" data-testid="meeting-notes">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold">Meeting notes</h3>
        <button onClick={exportPdf} disabled={exporting} data-testid="notes-export-pdf-btn"
          className="h-9 px-3.5 rounded-lg border-2 border-ink text-sm font-semibold flex items-center gap-1.5 hover:bg-ink hover:text-white transition-colors disabled:opacity-60">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Export PDF
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Auto-extracted</p>
        {notes.ai ? <AiNotes ai={notes.ai} /> : !BUSY.includes(notes.status) && (
          <p className="text-sm text-muted-foreground">After the call, PreMeet transcribes it and pulls out the decisions, action items and key details.</p>
        )}
        <ProcessState notes={notes} canProcess={canProcess} onProcess={process} onUpload={upload} uploading={uploading} />
      </div>

      <div className="space-y-2">
        <label htmlFor="manual-notes" className="text-xs font-bold uppercase tracking-[0.14em] text-primary">My notes</label>
        <textarea id="manual-notes" value={manual} onChange={(e) => setManual(e.target.value)} rows={8}
          placeholder="Type anything worth remembering from this meeting…" data-testid="notes-manual-textarea"
          className="w-full rounded-lg border border-border bg-card p-3 text-sm leading-relaxed focus:outline-none focus:border-ink focus:ring-2 focus:ring-primary/20 resize-y" />
        <button onClick={save} disabled={saving || !dirty} data-testid="notes-save-btn"
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {dirty ? "Save notes" : "Saved"}
        </button>
      </div>
    </div>
  );
}
