import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { Card, StatusBadge, PageHeader, formatDateTime, meetingTypeLabel, MEETING_TYPES } from "../components/ui-helpers";
import { toast } from "sonner";
import { Plus, Loader2, CalendarClock, X, ArrowRight } from "lucide-react";

export default function Meetings() {
  const [meetings, setMeetings] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", meeting_type: "discovery", start_time: "", objective: "", attendees: "", contact_id: "", company: "",
  });

  const load = () => api.get("/meetings").then(({ data }) => setMeetings(data));
  useEffect(() => { load(); api.get("/contacts").then(({ data }) => setContacts(data)); }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        attendees: form.attendees.split(",").map((s) => s.trim()).filter(Boolean),
        contact_id: form.contact_id || null,
      };
      await api.post("/meetings", payload);
      toast.success("Meeting added");
      setShowModal(false);
      setForm({ title: "", meeting_type: "discovery", start_time: "", objective: "", attendees: "", contact_id: "", company: "" });
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally { setSaving(false); }
  };

  if (!meetings) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div data-testid="meetings-page">
      <PageHeader
        title="Meetings"
        subtitle="Your upcoming and past meetings. Generate a brief for any of them."
        action={
          <button onClick={() => setShowModal(true)} data-testid="add-meeting-button"
            className="h-11 px-5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-[hsl(200_98%_32%)] transition-all active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Add meeting
          </button>
        }
      />

      {meetings.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="mt-4 font-medium">No meetings yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add a meeting to generate your first brief.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {meetings.map((m) => (
            <Link key={m.id} to={`/app/meetings/${m.id}`} data-testid={`meeting-card-${m.id}`}
              className="group rounded-xl border border-border bg-card p-5 hover:-translate-y-1 hover:shadow-md hover:border-primary/30 transition-all duration-200">
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono-label text-[10px] text-muted-foreground">{meetingTypeLabel(m.meeting_type)}</span>
                <StatusBadge status={m.status} />
              </div>
              <h3 className="mt-2 font-semibold text-lg leading-snug group-hover:text-primary transition">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.company || "—"}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono-label">{formatDateTime(m.start_time)}</span>
                <span className="text-sm text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  {m.brief_id ? "View brief" : "Prepare"} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="add-meeting-modal">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <Card className="relative w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Add a meeting</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={create} className="space-y-4">
              <Field label="Title">
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="meeting-title-input"
                  className="input" placeholder="Northwind — Quarterly Review" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                  <select value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value })} data-testid="meeting-type-select" className="input">
                    {MEETING_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Start time">
                  <input type="datetime-local" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} data-testid="meeting-time-input" className="input" />
                </Field>
              </div>
              <Field label="Link to client (optional)">
                <select value={form.contact_id} onChange={(e) => {
                  const c = contacts.find((x) => x.id === e.target.value);
                  setForm({ ...form, contact_id: e.target.value, company: c?.company || form.company, attendees: c?.name || form.attendees });
                }} data-testid="meeting-contact-select" className="input">
                  <option value="">No linked contact</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                </select>
              </Field>
              <Field label="Company (optional)">
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input" placeholder="Acme Inc." />
              </Field>
              <Field label="Attendees (comma separated)">
                <input value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} className="input" placeholder="Dana Whitfield, You" />
              </Field>
              <Field label="Objective (optional)">
                <input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} data-testid="meeting-objective-input" className="input" placeholder="What do you want to achieve?" />
              </Field>
              <button type="submit" disabled={saving} data-testid="save-meeting-button"
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[hsl(200_98%_32%)] transition active:scale-[0.98] disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save meeting
              </button>
            </form>
          </Card>
        </div>
      )}
      <style>{`.input{margin-top:.375rem;width:100%;height:2.75rem;padding:0 .875rem;border-radius:.5rem;border:1px solid hsl(var(--input));background:hsl(var(--card));font-size:.875rem}.input:focus{outline:none;border-color:hsl(var(--primary));box-shadow:0 0 0 2px hsl(var(--ring)/.3)}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="text-sm font-medium">{label}</label>{children}</div>;
}
