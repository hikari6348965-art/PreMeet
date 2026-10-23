export function StatusBadge({ status }) {
  const map = {
    scheduled: { label: "Scheduled", cls: "bg-secondary text-secondary-foreground" },
    preparing: { label: "Preparing", cls: "bg-[#FFFBEB] text-[#B45309]" },
    ready: { label: "Ready", cls: "bg-[#ECFDF5] text-[#047857]" },
    needs_attention: { label: "Needs attention", cls: "bg-[#FFFBEB] text-[#B45309]" },
    failed: { label: "Failed", cls: "bg-[#FEF2F2] text-[#B91C1C]" },
    connected: { label: "Connected", cls: "bg-[#ECFDF5] text-[#047857]" },
    not_connected: { label: "Not connected", cls: "bg-secondary text-muted-foreground" },
    setup_required: { label: "Setup required", cls: "bg-[#FFFBEB] text-[#B45309]" },
    open: { label: "Open", cls: "bg-[#EFF6FF] text-[#1D4ED8]" },
    overdue: { label: "Overdue", cls: "bg-[#FEF2F2] text-[#B91C1C]" },
    done: { label: "Done", cls: "bg-[#ECFDF5] text-[#047857]" },
    active: { label: "Active", cls: "bg-[#ECFDF5] text-[#047857]" },
    test_mode: { label: "Test mode", cls: "bg-[#FFFBEB] text-[#B45309]" },
  };
  const s = map[status] || { label: status, cls: "bg-secondary text-muted-foreground" };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`} data-testid={`status-${status}`}>{s.label}</span>;
}

export function Card({ children, className = "", ...rest }) {
  return <div className={`rounded-xl border border-border bg-card ${className}`} {...rest}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const typeLabels = {
  discovery: "Discovery call", sales_demo: "Sales demo", project_review: "Project review",
  consultation: "Consultation", renewal_review: "Renewal / account review",
  recruiting: "Recruiting interview", follow_up: "Follow-up", other: "Meeting",
};
export function meetingTypeLabel(t) { return typeLabels[t] || t; }
export const MEETING_TYPES = Object.entries(typeLabels).map(([id, label]) => ({ id, label }));

export function formatDateTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return iso; }
}
