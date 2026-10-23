import { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";
import { Mail, MailCheck, MailWarning, Loader2 } from "lucide-react";

export function EmailChip({ brief, onSent }) {
  const [busy, setBusy] = useState(false);
  const status = brief.email_status;

  useEffect(() => {
    if (status !== "sending") return;
    let n = 0;
    const t = setInterval(() => { n += 1; if (n > 12) clearInterval(t); else onSent(); }, 2500);
    return () => clearInterval(t);
  }, [status, onSent]);

  const send = async () => {
    setBusy(true);
    try {
      await api.post(`/briefs/${brief.id}/email`);
      toast.success("Brief emailed to you");
      await onSent();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const label = status === "sent" ? "Emailed" : status === "failed" ? "Email failed" : status === "sending" ? "Sending…" : null;
  const Icon = status === "sent" ? MailCheck : status === "failed" ? MailWarning : Mail;

  return (
    <div className="ml-auto flex items-center gap-2">
      {label && (
        <span data-testid="brief-email-status" data-status={status}
          className={`text-xs font-medium flex items-center gap-1 ${status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
      )}
      <button onClick={send} disabled={busy || status === "sending"} data-testid="email-brief-button"
        className="h-9 px-3 rounded-lg border border-border text-sm font-medium flex items-center gap-1.5 hover:border-primary/40 transition-colors disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {status === "sent" ? "Email again" : "Email me"}
      </button>
    </div>
  );
}
