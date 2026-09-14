import type { MatchStatus } from "@/services";
import { cn } from "@/lib/utils";

const LABEL: Record<MatchStatus, string> = {
  scheduled: "Scheduled",
  live: "Live",
  completed: "Final",
};

export function StatusBadge({ status, className }: { status: MatchStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        status === "live" && "bg-live/15 text-live",
        status === "scheduled" && "bg-secondary text-muted-foreground",
        status === "completed" && "bg-completed/15 text-completed",
        className,
      )}
    >
      {status === "live" && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
        </span>
      )}
      {LABEL[status]}
    </span>
  );
}
