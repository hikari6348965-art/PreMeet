import { createPortal } from "react-dom";
import { useEffect, useState, useMemo } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Card, PageHeader } from "../components/ui-helpers";
import { toast } from "sonner";
import {
  Search, Plus, Users, Loader2, X, StickyNote, Building2, Mail, AlertTriangle, Upload,
} from "lucide-react";

export default function ClientMemory() {
  const [contacts, setContacts] = useState(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", title: "", company: "", notes: "", preferences: "" });
  const [noteForm, setNoteForm] = useState({ title: "", content: "" });

  const load = () => api.get("/contacts").then(({ data }) => setContacts(data));
  useEffect(() => { load(); }, []);

  const openContact = async (c) => {
    setSelected(c); setDetail(null);
    const { data } = await api.get(`/contacts/${c.id}`);
    setDetail(data);
  };

  const filtered = useMemo(() => {
    if (!contacts) return [];
    const q = query.toLowerCase();
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q));
  }, [contacts, query]);

  const addContact = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/contacts", { ...form, preferences: form.preferences.split(",").map((s) => s.trim()).filter(Boolean) });
      toast.success("Contact added");
      setShowAdd(false);
      setForm({ name: "", email: "", title: "", company: "", notes: "", preferences: "" });
      load();
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const addNote = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/notes", { ...noteForm, contact_id: selected.id, source_type: "manual" });
      toast.success("Note added");
      setShowNote(false); setNoteForm({ title: "", content: "" });
      openContact(selected);
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const uploadNote = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/notes/upload?contact_id=${selected.id}`, fd);
      toast.success("Document imported");
      openContact(selected);
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
  };

  if (!contacts) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div data-testid="client-memory-page" style={{ padding: "25px" }}>
      <PageHeader title="Client Memory" subtitle="A unified profile per client — notes, commitments and meeting history with their sources."
        action={
          <button onClick={() => setShowAdd(true)} data-testid="add-contact-button"
            className="h-11 px-5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Add contact
          </button>
        } />

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} data-testid="client-search-input"
              placeholder="Search contacts or companies…"
              className="w-full h-11 pl-10 pr-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition" />
          </div>
          {filtered.length === 0 ? (
            <Card className="p-10 text-center"><Users className="h-8 w-8 text-muted-foreground mx-auto" /><p className="mt-3 text-sm text-muted-foreground">No contacts found.</p></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <button key={c.id} onClick={() => openContact(c)} data-testid={`contact-item-${c.id}`}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === c.id ? "border-primary ring-1 ring-primary bg-accent/30" : "border-border bg-card hover:border-primary/40"}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">{c.name.charAt(0)}</div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.title} · {c.company}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          {!selected ? (
            <Card className="p-12 text-center h-full flex flex-col items-center justify-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 font-medium">Select a contact</p>
              <p className="text-sm text-muted-foreground mt-1">View their full memory profile.</p>
            </Card>
          ) : !detail ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Card className="p-6" data-testid="contact-detail">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">{detail.contact.name.charAt(0)}</div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold tracking-tight">{detail.contact.name}</h2>
                  <p className="text-muted-foreground text-sm">{detail.contact.title}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {detail.contact.company && <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" />{detail.contact.company}</span>}
                    {detail.contact.email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{detail.contact.email}</span>}
                  </div>
                </div>
              </div>

              {detail.contact.preferences?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {detail.contact.preferences.map((p, i) => <span key={i} className="px-2.5 py-1 rounded-md bg-accent text-accent-foreground text-xs">{p}</span>)}
                </div>
              )}

              <div className="mt-6 grid sm:grid-cols-3 gap-3">
                <Stat label="Notes" value={detail.notes.length} />
                <Stat label="Commitments" value={detail.commitments.length} />
                <Stat label="Meetings" value={detail.meetings.length} />
              </div>

              <div className="mt-6 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><StickyNote className="h-4 w-4 text-primary" /> Notes</h3>
                <div className="flex items-center gap-2">
                  <label className="h-9 px-3 rounded-lg border border-border text-sm font-medium flex items-center gap-1.5 cursor-pointer hover:border-primary/40 transition" data-testid="import-note-label">
                    <Upload className="h-3.5 w-3.5" /> Import
                    <input type="file" accept=".txt,.md,.csv" className="hidden" onChange={uploadNote} data-testid="import-note-input" />
                  </label>
                  <button onClick={() => setShowNote(true)} data-testid="add-note-button" className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:bg-primary/90 transition">
                    <Plus className="h-3.5 w-3.5" /> Note
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {detail.notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> :
                  detail.notes.map((n) => (
                    <div key={n.id} className="p-3 rounded-lg border border-border bg-secondary/30">
                      <div className="flex items-center justify-between"><p className="font-medium text-sm">{n.title}</p><span className="font-mono-label text-[10px] text-muted-foreground">{n.source_type}</span></div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.content}</p>
                    </div>
                  ))}
              </div>

              {detail.commitments.length > 0 && (
                <>
                  <h3 className="mt-6 font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Commitments</h3>
                  <div className="mt-3 space-y-2">
                    {detail.commitments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2 text-sm p-2.5 rounded-lg bg-secondary/30">
                        <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${c.status === "overdue" ? "bg-destructive" : "bg-primary"}`} />
                        <div><p>{c.description}</p><span className="font-mono-label text-[10px] text-muted-foreground">{c.source_label}</span></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>

      {showAdd && (
        <Modal title="Add contact" onClose={() => setShowAdd(false)}>
          <form onSubmit={addContact} className="space-y-4">
            <Inp label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="contact-name-input" />
            <div className="grid grid-cols-2 gap-4">
              <Inp label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              <Inp label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
            </div>
            <Inp label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Inp label="Preferences (comma separated)" value={form.preferences} onChange={(v) => setForm({ ...form, preferences: v })} />
            <Inp label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <SubmitBtn saving={saving} label="Save contact" testid="save-contact-button" />
          </form>
        </Modal>
      )}

      {showNote && (
        <Modal title="Add note" onClose={() => setShowNote(false)}>
          <form onSubmit={addNote} className="space-y-4">
            <Inp label="Title" value={noteForm.title} onChange={(v) => setNoteForm({ ...noteForm, title: v })} required testid="note-title-input" />
            <div>
              <label className="text-sm font-medium">Content</label>
              <textarea required rows={5} value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} data-testid="note-content-input"
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition" />
            </div>
            <SubmitBtn saving={saving} label="Save note" testid="save-note-button" />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="p-3 rounded-lg bg-secondary/40 text-center"><p className="text-2xl font-extrabold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}
function Modal({ title, onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="client-memory-modal">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-lg">{title}</h2><button onClick={onClose} data-testid="client-memory-modal-close" className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button></div>
        {children}
      </Card>
    </div>,
    document.body,
  );
}
function Inp({ label, value, onChange, required, testid }) {
  return (
    <div><label className="text-sm font-medium">{label}</label>
      <input value={value} required={required} data-testid={testid || `contact-${label.toLowerCase().replace(/[^a-z]+/g, "-")}-input`} onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full h-11 px-3.5 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition" />
    </div>
  );
}
function SubmitBtn({ saving, label, testid }) {
  return (
    <button type="submit" disabled={saving} data-testid={testid}
      className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition active:scale-[0.98] disabled:opacity-60">
      {saving && <Loader2 className="h-4 w-4 animate-spin" />} {label}
    </button>
  );
}
