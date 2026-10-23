import { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Card, PageHeader, StatusBadge } from "../components/ui-helpers";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const field = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function Select({ label, value, onChange, options, testid }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select className={`${field} mt-1.5`} value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={testid}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange, testid }) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm font-medium">{label}</span>
      <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={!!checked}
        onChange={(e) => onChange(e.target.checked)} data-testid={testid} />
    </label>
  );
}

function PlanCard({ usage }) {
  if (!usage) return null;
  const used = usage.usage?.briefs_generated ?? 0;
  const allowance = usage.plan?.brief_allowance ?? 0;
  const pct = allowance ? Math.min(100, Math.round((used / allowance) * 100)) : 0;
  return (
    <Card className="p-6 self-start" data-testid="settings-plan-card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Plan &amp; usage</h2>
        {usage.subscription?.provider === "test_mode" ? <StatusBadge status="test_mode" /> : <StatusBadge status="active" />}
      </div>
      <p className="mt-3 text-2xl font-bold" data-testid="settings-plan-name">{usage.plan?.name || "Free"}</p>
      <p className="text-sm text-muted-foreground mt-1" data-testid="settings-usage-text">{used} of {allowance} briefs used this month</p>
      <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <Link to="/app/billing" data-testid="settings-manage-billing"
        className="mt-5 h-10 w-full rounded-lg border border-border text-sm font-medium flex items-center justify-center hover:border-primary/40 transition-colors">Manage plan</Link>
    </Card>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [pref, setPref] = useState(null);
  const [usage, setUsage] = useState(null);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState(false);

  useEffect(() => {
    api.get("/preferences").then(({ data }) => setPref(data)).catch(() => setError(true));
    api.get("/usage").then(({ data }) => setUsage(data)).catch(() => {});
  }, []);

  const set = (k) => (v) => setPref((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { id, user_id, updated_at, ...body } = pref;
      const { data } = await api.put("/preferences", { ...body, brief_lead_minutes: Number(body.brief_lead_minutes) || 60 });
      setPref(data);
      toast.success("Preferences saved");
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  if (error) return <p className="py-20 text-center text-muted-foreground" data-testid="settings-error">Couldn't load your settings. Please refresh.</p>;
  if (!pref) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div data-testid="settings-page">
      <PageHeader title="Settings" subtitle="Tune how your briefs are written and delivered." />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Account</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Name</p><p className="font-medium mt-0.5" data-testid="settings-user-name">{user?.name}</p></div>
              <div><p className="text-muted-foreground">Email</p><p className="font-medium mt-0.5" data-testid="settings-user-email">{user?.email}</p></div>
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Brief preferences</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Tone" value={pref.tone} onChange={set("tone")} testid="settings-tone-select"
                options={[["professional", "Professional"], ["concise", "Concise & punchy"], ["warm", "Warm & personable"]]} />
              <Select label="Detail level" value={pref.detail_level} onChange={set("detail_level")} testid="settings-detail-select"
                options={[["brief", "Brief"], ["balanced", "Balanced"], ["detailed", "Detailed"]]} />
              <label className="block">
                <span className="text-sm font-medium">Prepare brief (minutes before)</span>
                <input type="number" min={5} className={`${field} mt-1.5`} value={pref.brief_lead_minutes ?? 60}
                  onChange={(e) => set("brief_lead_minutes")(e.target.value)} data-testid="settings-lead-minutes-input" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Default objective</span>
                <input className={`${field} mt-1.5`} value={pref.default_objective || ""}
                  onChange={(e) => set("default_objective")(e.target.value)} data-testid="settings-objective-input" />
              </label>
            </div>
            <div className="divide-y divide-border border-t border-border pt-2">
              <Toggle label="Email me when a brief is ready" checked={pref.email_notifications} onChange={set("email_notifications")} testid="settings-email-toggle" />
              <Toggle label="Auto-generate briefs for upcoming meetings" checked={pref.auto_generate} onChange={set("auto_generate")} testid="settings-auto-toggle" />
            </div>
            <button onClick={save} disabled={saving} data-testid="settings-save-btn"
              className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save preferences
            </button>
          </Card>
        </div>
        <PlanCard usage={usage} />
      </div>
    </div>
  );
}
