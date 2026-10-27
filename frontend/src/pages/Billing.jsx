import { useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { startCheckout } from "../lib/checkout";
import { Card, PageHeader, StatusBadge, formatDateTime } from "../components/ui-helpers";
import { PlanCard } from "../components/PlanCard";
import { toast } from "sonner";
import { Loader2, Receipt, ShieldCheck } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "../components/ui/alert-dialog";

function CurrentPlan({ sub, usage }) {
  const used = usage?.usage?.briefs_generated ?? 0;
  const allowance = sub.plan.brief_allowance;
  const paid = sub.plan.price_monthly > 0;
  return (
    <Card className="p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4" data-testid="billing-current-plan">
      <div>
        <p className="text-sm text-muted-foreground">Current plan</p>
        <p className="text-2xl font-bold tracking-tight mt-0.5" data-testid="billing-current-plan-name">{sub.plan.name}</p>
        <p className="text-sm text-muted-foreground mt-1" data-testid="billing-usage">{used} of {allowance} briefs used this month</p>
      </div>
      {paid && (
        <p className="text-sm text-muted-foreground" data-testid="billing-period-end">
          Active until <span className="font-medium text-foreground">{formatDateTime(sub.subscription.current_period_end)}</span>. Renew anytime — no auto-charge.
        </p>
      )}
    </Card>
  );
}

function PaymentHistory({ rows }) {
  return (
    <Card className="p-6 mt-8">
      <h2 className="font-semibold flex items-center gap-2 mb-3"><Receipt className="h-4 w-4 text-primary" /> Payment history</h2>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground" data-testid="billing-no-payments">No payments yet.</p> : (
        <ul className="divide-y divide-border text-sm" data-testid="billing-payments-list">
          {rows.map((r) => (
            <li key={r.id} className="py-3 flex items-center justify-between gap-4">
              <span><span className="font-medium">{r.plan_name}</span> <span className="text-muted-foreground">· ₹{r.amount_inr.toLocaleString("en-IN")}</span></span>
              <span className="flex items-center gap-3 text-muted-foreground">{formatDateTime(r.paid_at || r.created_at)} <StatusBadge status={r.status === "paid" ? "done" : "failed"} /></span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [usage, setUsage] = useState(null);
  const [payments, setPayments] = useState([]);
  const [busy, setBusy] = useState("");
  const [confirmFree, setConfirmFree] = useState(null);

  const load = useCallback(() => Promise.all([
    api.get("/plans").then(({ data }) => setPlans(data)),
    api.get("/subscription").then(({ data }) => setSub(data)),
    api.get("/usage").then(({ data }) => setUsage(data)),
    api.get("/billing/payments").then(({ data }) => setPayments(data)),
  ]).catch(() => toast.error("Couldn't load billing details")), []);
  useEffect(() => { load(); }, [load]);

  const select = async (plan, confirmed = false) => {
    if (plan.price_monthly === 0 && sub.plan.price_monthly > 0 && !confirmed) { setConfirmFree(plan); return; }
    setConfirmFree(null);
    setBusy(plan.id);
    try {
      const res = await startCheckout(plan.id);
      if (res.status === "paid") toast.success(`You're on ${plan.name}. Enjoy!`);
      else if (res.status === "free") toast.success(`Switched to ${plan.name}`);
      await load();
    } catch (e) { toast.error(e.message || formatApiErrorDetail(e.response?.data?.detail)); }
    finally { setBusy(""); }
  };

  if (!sub) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const currentOrder = plans.find((p) => p.id === sub.plan.id)?.order ?? 0;
  const ctaLabel = (p) => p.price_monthly === 0 ? "Switch to free" : p.order > currentOrder ? `Upgrade to ${p.name}` : `Switch to ${p.name}`;

  return (
    <div data-testid="billing-page" style={{padding: "25px"}}>
      <PageHeader title="Billing" subtitle="Pick the plan that fits how many meetings you prep for." />
      <CurrentPlan sub={sub} usage={usage} />
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} current={p.id === sub.plan.id} busy={busy === p.id} onSelect={select} ctaLabel={ctaLabel} />
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> Prices in USD; payments are processed securely by Razorpay in INR. Each payment covers 30 days.
      </p>
      <PaymentHistory rows={payments} />
      <AlertDialog open={!!confirmFree} onOpenChange={(o) => !o && setConfirmFree(null)}>
        <AlertDialogContent data-testid="downgrade-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to the free plan?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll lose the rest of your paid {sub.plan.name} period right away, and your brief allowance drops to {confirmFree?.brief_allowance} a month. This can't be refunded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="downgrade-cancel-btn">Keep {sub.plan.name}</AlertDialogCancel>
            <AlertDialogAction data-testid="downgrade-confirm-btn" onClick={() => select(confirmFree, true)}>Switch to free</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
