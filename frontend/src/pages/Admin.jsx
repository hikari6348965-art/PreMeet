import { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Card, PageHeader, formatDateTime } from "../components/ui-helpers";
import { toast } from "sonner";
import { Loader2, Users, FileText, CreditCard, AlertTriangle } from "lucide-react";

function Stat({ icon: Icon, label, value, testid }) {
  return (
    <Card className="p-5" data-testid={testid}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 text-primary" /> {label}</div>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
    </Card>
  );
}

function PlanRow({ plan, onSaved }) {
  const [p, setP] = useState(plan);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (p.price_monthly === "" || p.brief_allowance === "" || Number(p.price_monthly) < 0 || Number(p.brief_allowance) < 0) {
      toast.error("Price and allowance must be zero or more"); return;
    }
    setBusy(true);
    try {
      const { data } = await api.put(`/admin/plans/${plan.id}`, {
        price_monthly: Number(p.price_monthly), brief_allowance: Number(p.brief_allowance),
      });
      onSaved(data); toast.success(`${data.name} updated`);
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };
  const inp = "h-9 w-24 rounded-lg border border-border bg-background px-2 text-sm";
  return (
    <tr className="border-t border-border" data-testid={`admin-plan-${plan.id}`}>
      <td className="py-3 font-medium">{plan.name}</td>
      <td><input type="number" className={inp} value={p.price_monthly} onChange={(e) => setP({ ...p, price_monthly: e.target.value })} data-testid={`admin-plan-price-${plan.id}`} /></td>
      <td><input type="number" className={inp} value={p.brief_allowance} onChange={(e) => setP({ ...p, brief_allowance: e.target.value })} data-testid={`admin-plan-allowance-${plan.id}`} /></td>
      <td className="text-right">
        <button onClick={save} disabled={busy} data-testid={`admin-plan-save-${plan.id}`}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
      </td>
    </tr>
  );
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [audit, setAudit] = useState([]);

  const [error, setError] = useState(false);

  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => setError(true));
    api.get("/admin/users").then(({ data }) => setUsers(data)).catch(() => {});
    api.get("/admin/plans").then(({ data }) => setPlans(data)).catch(() => {});
    api.get("/admin/audit").then(({ data }) => setAudit(data)).catch(() => {});
  }, []);

  const planName = (id) => plans.find((p) => p.id === id)?.name || id || "Free";

  if (error) return <p className="py-20 text-center text-muted-foreground" data-testid="admin-error">Couldn't load admin data. Please refresh.</p>;

  if (!stats) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div data-testid="admin-page" className="space-y-8">
      <PageHeader title="Admin" subtitle="Workspace-wide users, plans and activity." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Users" value={stats.total_users} testid="admin-stat-users" />
        <Stat icon={FileText} label="Briefs generated" value={stats.total_briefs} testid="admin-stat-briefs" />
        <Stat icon={CreditCard} label="Active subscriptions" value={stats.active_subscriptions} testid="admin-stat-subs" />
        <Stat icon={AlertTriangle} label="Failed generations" value={stats.failed_generations} testid="admin-stat-failed" />
      </div>

      <Card className="p-6 overflow-x-auto">
        <h2 className="font-semibold mb-3">Users</h2>
        <table className="w-full text-sm" data-testid="admin-users-table">
          <thead><tr className="text-left text-muted-foreground"><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Plan</th><th>Briefs (month)</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border" data-testid={`admin-user-${u.id}`}>
                <td className="py-3 font-medium">{u.name}</td><td>{u.email}</td><td className="capitalize">{u.role}</td>
                <td>{planName(u.plan_id || "free")}</td><td>{u.briefs_this_month}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-6 overflow-x-auto">
        <h2 className="font-semibold mb-3">Plans</h2>
        <table className="w-full text-sm" data-testid="admin-plans-table">
          <thead><tr className="text-left text-muted-foreground"><th className="py-2">Plan</th><th>Price / month (USD)</th><th>Briefs / month</th><th /></tr></thead>
          <tbody>{plans.map((p) => <PlanRow key={p.id} plan={p} onSaved={(d) => setPlans((ps) => ps.map((x) => (x.id === d.id ? d : x)))} />)}</tbody>
        </table>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Recent activity</h2>
        <ul className="divide-y divide-border text-sm" data-testid="admin-audit-list">
          {audit.length === 0 && <li className="py-3 text-muted-foreground">No activity yet.</li>}
          {audit.slice(0, 20).map((e) => (
            <li key={e.id} className="py-2.5 flex justify-between gap-4">
              <span><span className="font-medium">{e.action}</span> <span className="text-muted-foreground">{e.detail}</span></span>
              <span className="text-muted-foreground shrink-0">{formatDateTime(e.created_at)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
