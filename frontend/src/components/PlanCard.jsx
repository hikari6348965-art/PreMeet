import { Check, Loader2 } from "lucide-react";

export function PlanCard({ plan, current, busy, onSelect, ctaLabel }) {
  const featured = plan.id === "entry";
  const inr = plan.price_inr ? `Charged as ₹${plan.price_inr.toLocaleString("en-IN")} per 30 days` : "Free forever";
  return (
    <div data-testid={`plan-card-${plan.id}`}
      className={`p-6 rounded-2xl border bg-card flex flex-col transition-shadow duration-200 hover:shadow-md ${featured ? "border-primary ring-1 ring-primary shadow-lg shadow-primary/10" : "border-border"}`}>
      <div className="flex items-center justify-between min-h-6">
        <h3 className="font-bold text-lg">{plan.name}</h3>
        {current && <span className="px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold" data-testid={`plan-current-${plan.id}`}>Current plan</span>}
        {!current && featured && <span className="px-2.5 py-1 rounded-full bg-primary text-white text-xs font-semibold">Most popular</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold tracking-tight" data-testid={`plan-price-${plan.id}`}>${plan.price_monthly}</span>
        <span className="text-muted-foreground text-sm">/mo</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground" data-testid={`plan-inr-${plan.id}`}>{inr}</p>
      <ul className="mt-5 space-y-2.5 flex-1">
        {plan.features?.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}</li>
        ))}
      </ul>
      {onSelect && (
        <button onClick={() => onSelect(plan)} disabled={busy || current} data-testid={`plan-select-${plan.id}`}
          className={`mt-6 h-11 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-[background-color,transform] active:scale-[0.98] disabled:opacity-60 ${featured ? "bg-primary text-white hover:bg-[hsl(200_98%_32%)]" : "border border-border hover:border-primary/40"}`}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {current ? "Current plan" : ctaLabel(plan)}
        </button>
      )}
    </div>
  );
}
