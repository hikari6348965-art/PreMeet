import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { Card, StatusBadge, PageHeader, formatDateTime } from "../components/ui-helpers";
import { toast } from "sonner";
import { Loader2, CalendarClock, Database, StickyNote, Mail, Plug, RefreshCw } from "lucide-react";

const icons = { calendar: CalendarClock, crm: Database, notes: StickyNote, email: Mail };
const GOOGLE = ["google_calendar", "gmail"];
const RESULT = {
  connected: ["success", "Google account connected"], denied: ["error", "Google access was not granted"],
  expired: ["error", "That connection attempt expired. Please try again."], error: ["error", "Couldn't connect Google. Please try again."],
};

function IntegrationCard({ r, busy, onConnect, onDisconnect, onSync }) {
  const status = r.status === "connected" ? "connected" : "not_connected";
  const btn = "h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60";
  return (
    <Card className="p-5 bc-lift" data-testid={`integration-${r.provider}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-bold">{r.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {r.account ? r.account : r.requires_oauth ? "Google sign-in · read-only" : "Available now"}
          </p>
          {r.last_synced_at && <p className="text-xs text-muted-foreground mt-0.5" data-testid={`last-synced-${r.provider}`}>Synced {formatDateTime(r.last_synced_at)}</p>}
          {r.error && <p className="text-xs text-destructive mt-1">{r.error}</p>}
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {r.status === "connected" ? (
          <>
            {r.provider === "google_calendar" && (
              <button onClick={onSync} disabled={busy} data-testid="sync-google-calendar" className={`${btn} bg-ink text-white hover:bg-ink/85`}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Import meetings
              </button>
            )}
            <button onClick={onDisconnect} disabled={busy} data-testid={`disconnect-${r.provider}`} className={`${btn} border border-border hover:border-destructive/50`}>
              Disconnect
            </button>
          </>
        ) : (
          <button onClick={onConnect} disabled={busy} data-testid={`connect-${r.provider}`} className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Connect
          </button>
        )}
      </div>
    </Card>
  );
}

export default function Integrations() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState("");
  const [params, setParams] = useSearchParams();

  const load = () => api.get("/integrations").then(({ data }) => setRows(data));
  useEffect(() => { load().catch(() => toast.error("Couldn't load integrations")); }, []);
  const shown = useRef("");
  useEffect(() => {
    const g = params.get("google");
    if (g && RESULT[g] && shown.current !== g) { shown.current = g; toast[RESULT[g][0]](RESULT[g][1]); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const run = async (provider, fn) => {
    setBusy(provider);
    try { await fn(); } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
    finally { setBusy(""); }
  };
  const connect = (p) => run(p, async () => {
    const { data } = await api.post(`/integrations/${p}/connect`);
    if (data.status == "rejected") {
      // reroute to the billing page
      window.location.href = "https://www.premeet.ink/app/billing";
      return;
    }
    else {
      if (data.authorization_url) { window.location.assign(data.authorization_url); return; }
      toast.success("Connected"); await load();
    }
  });
  const disconnect = (p) => run(p, async () => {
    await api.post(`/integrations/${p}/disconnect`); await load();
    toast.success(GOOGLE.includes(p) ? "Google disconnected (Calendar and Gmail)" : "Disconnected");
  });
  const sync = () => run("google_calendar", async () => {
    const { data } = await api.post("/integrations/google/sync");
    toast.success(`Imported ${data.created} new and updated ${data.updated} meetings`); await load();
  });

  if (!rows) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  const grouped = rows.reduce((acc, r) => { (acc[r.category] = acc[r.category] || []).push(r); return acc; }, {});
  const labels = { calendar: "Calendar", crm: "CRM", notes: "Notes & documents", email: "Email" };

  return (
    <div data-testid="integrations-page" style={{ padding: "25px" }}>
      <PageHeader title="Integrations" subtitle="Connect your tools with read-only access. One Google sign-in covers Calendar and Gmail." />
      <div className="space-y-8">
        {["calendar", "email", "notes", "crm"].filter((c) => grouped[c]).map((cat) => {
          const Icon = icons[cat] || Plug;
          return (
            <div key={cat}>
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                <Icon className="h-4 w-4 text-primary" />
                {labels[cat]}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {grouped[cat].map((r) => (
                  <IntegrationCard key={r.id} r={r} busy={busy === r.provider}
                    onConnect={() => connect(r.provider)} onDisconnect={() => disconnect(r.provider)} onSync={sync} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
