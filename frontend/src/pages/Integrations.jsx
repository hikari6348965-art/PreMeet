import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, StatusBadge, PageHeader } from "../components/ui-helpers";
import { toast } from "sonner";
import { Loader2, CalendarClock, Database, StickyNote, Mail, Plug, Info } from "lucide-react";

const icons = { calendar: CalendarClock, crm: Database, notes: StickyNote, email: Mail };

export default function Integrations() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState("");

  const load = () => api.get("/integrations").then(({ data }) => setRows(data));
  useEffect(() => { load(); }, []);

  const connect = async (provider) => {
    setBusy(provider);
    try {
      const { data } = await api.post(`/integrations/${provider}/connect`);
      if (data.status === "setup_required") {
        toast.info(data.message, { duration: 6000 });
      } else {
        toast.success("Connected");
      }
      await load();
    } catch { toast.error("Failed to update integration"); }
    finally { setBusy(""); }
  };

  const disconnect = async (provider) => {
    setBusy(provider);
    try { await api.post(`/integrations/${provider}/disconnect`); await load(); toast.success("Disconnected"); }
    catch { toast.error("Failed"); }
    finally { setBusy(""); }
  };

  if (!rows) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const grouped = rows.reduce((acc, r) => { (acc[r.category] = acc[r.category] || []).push(r); return acc; }, {});
  const order = ["calendar", "crm", "notes", "email"];
  const labels = { calendar: "Calendar", crm: "CRM", notes: "Notes & documents", email: "Email" };

  return (
    <div data-testid="integrations-page">
      <PageHeader title="Integrations" subtitle="Connect your tools through official, read-only authorization." />

      <Card className="p-4 mb-6 flex items-start gap-3 bg-accent/30 border-primary/20">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Calendar, CRM and email connections use the official OAuth flow and are shown as <strong>Setup required</strong> until OAuth credentials are configured for this workspace. We never fabricate connection status or import data that wasn't really retrieved. Manual notes &amp; uploads are available now.
        </p>
      </Card>

      <div className="space-y-8">
        {order.filter((cat) => grouped[cat]).map((cat) => {
          const Icon = icons[cat] || Plug;
          return (
            <div key={cat}>
              <h2 className="flex items-center gap-2 font-semibold mb-3"><Icon className="h-4 w-4 text-primary" /> {labels[cat]}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {grouped[cat].map((r) => (
                  <Card key={r.id} className="p-5" data-testid={`integration-${r.provider}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{r.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.requires_oauth ? "OAuth · read-only" : "Available now"}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="mt-4">
                      {r.status === "connected" ? (
                        <button onClick={() => disconnect(r.provider)} disabled={busy === r.provider} data-testid={`disconnect-${r.provider}`}
                          className="h-9 px-4 rounded-lg border border-border text-sm font-medium flex items-center gap-2 hover:border-destructive/40 transition disabled:opacity-60">
                          {busy === r.provider && <Loader2 className="h-4 w-4 animate-spin" />} Disconnect
                        </button>
                      ) : (
                        <button onClick={() => connect(r.provider)} disabled={busy === r.provider} data-testid={`connect-${r.provider}`}
                          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-[hsl(200_98%_32%)] transition disabled:opacity-60">
                          {busy === r.provider && <Loader2 className="h-4 w-4 animate-spin" />} Connect
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
