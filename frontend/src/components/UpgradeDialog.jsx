import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Sparkles } from "lucide-react";

export function UpgradeDialog({ open, onOpenChange, message }) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="upgrade-dialog">
        <DialogHeader>
          <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>You're out of briefs this month</DialogTitle>
          <DialogDescription data-testid="upgrade-dialog-message">
            {message || "You've used every brief on your plan."} Upgrade to keep preparing for meetings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <button onClick={() => onOpenChange(false)} data-testid="upgrade-dialog-later"
            className="h-10 px-4 rounded-lg border border-border text-sm font-medium hover:border-primary/40 transition-colors">Maybe later</button>
          <button onClick={() => navigate("/app/billing")} data-testid="upgrade-dialog-see-plans"
            className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[hsl(200_98%_32%)] transition-colors">See plans</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
