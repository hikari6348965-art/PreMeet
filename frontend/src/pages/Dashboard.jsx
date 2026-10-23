import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Card, StatusBadge, PageHeader, formatDateTime, meetingTypeLabel } from "../components/ui-helpers";
import {
  CalendarClock, ListChecks, FileText, Plug, ArrowRight, AlertTriangle,
  Loader2, TrendingUp, Sparkles,
} from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/dashboard").then(({ data }) => setData(data)).catch(() => {}); }, []);

  if (!data) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const { usage, plan, upcoming_meetings, commitments, integrations, recent_briefs, stats } = data;
  const connectedCount = integrations.filter((i) => i.status === "connected").length;
  const pct = plan.brief_allowance ? Math.min(100, Math.round((usage.briefs_generated / plan.brief_allowance) * 100)) : 0;

  const statCards = [
    { label: "Upcoming meetings", value: stats.upcoming_count, icon: CalendarClock },
    { label: "Open commitments", value: stats.open_commitments, icon: ListChecks },
    { label: "Briefs this month", value: usage.briefs_generated, icon: FileText },
    { label: "Connected integrations", value: connectedCount, icon: Plug },
  ];

  return (
    <div data-testid="dashboard-page">
      <PageHeader title={`Good to see you`} subtitle="Here's what's ahead and what needs your attention." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {statCards.map((s) => (
          <Card key={s.label} className="p-5" data-testid={`stat-${s.label.replace(/\s+/g, "-").toLowerCase()}`}>
            <div className="flex items-center justify-between">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight">{s.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6" data-testid="upcoming-meetings-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Upcoming meetings</h2>
              <Link to="/app/meetings" className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {upcoming_meetings.length === 0 ? (
              <EmptyRow text="No upcoming meetings. Add one from the Meetings page." />
            ) : (
              <div className="divide-y divide-border">
                {upcoming_meetings.map((m) => (
                  <Link key={m.id} to={`/app/meetings/${m.id}`} data-testid={`dashboard-meeting-${m.id}`}
                    className="flex items-center justify-between gap-4 py-3.5 group">
                    <div className="min-w-0">
                      <p className="font-medium truncate group-hover:text-primary transition">{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono-label">
                        {meetingTypeLabel(m.meeting_type)} · {formatDateTime(m.start_time)}
                      </p>
                    </div>
                    <StatusBadge status={m.status} />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6" data-testid="recent-briefs-card">
            <h2 className="font-semibold text-lg mb-4">Recent briefs</h2>
            {recent_briefs.length === 0 ? (
              <EmptyRow text="No briefs generated yet. Open a meeting to create your first one." />
            ) : (
              <div className="divide-y divide-border">
                {recent_briefs.map((b) => (
                  <Link key={b.id} to={`/app/meetings/${b.meeting_id}`} className="flex items-center justify-between py-3 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate group-hover:text-primary transition">{b.meeting_title}</p>
                        <p className="text-xs text-muted-foreground font-mono-label">{formatDateTime(b.generated_at)}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6" data-testid="usage-card">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold">Monthly usage</h2>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">{plan.name} plan</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight">{usage.briefs_generated}</span>
              <span className="text-muted-foreground">/ {plan.brief_allowance} briefs</span>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-secondary overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{Math.max(0, plan.brief_allowance - usage.briefs_generated)} remaining this month</p>
            <Link to="/app/billing" data-testid="dashboard-manage-plan" className="mt-4 w-full h-10 rounded-lg border border-border text-sm font-medium flex items-center justify-center gap-2 hover:border-primary/40 transition">
              <Sparkles className="h-4 w-4 text-primary" /> Manage plan
            </Link>
          </Card>

          <Card className="p-6" data-testid="commitments-card">
            <h2 className="font-semibold mb-4">Outstanding commitments</h2>
            {commitments.length === 0 ? (
              <EmptyRow text="Nothing overdue. Nice." />
            ) : (
              <div className="space-y-3">
                {commitments.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    {c.status === "overdue"
                      ? <AlertTriangle className="h-4 w-4 text-[#D97706] mt-0.5 shrink-0" />
                      : <ListChecks className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">{c.description}</p>
                      <p className="text-xs text-muted-foreground font-mono-label mt-0.5">{c.source_label}</p>
                    </div>
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

function EmptyRow({ text }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>;
}
