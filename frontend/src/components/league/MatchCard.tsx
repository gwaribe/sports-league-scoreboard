import type { Match, Team } from "@/services";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

function teamName(teams: Team[], id: string) {
  return teams.find((t) => t.id === id)?.name ?? "Unknown team";
}

function kickoff(value?: string | null) {
  if (!value) return "Time TBD";
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchCard({
  match,
  teams,
  actions,
}: {
  match: Match;
  teams: Team[];
  actions?: React.ReactNode;
}) {
  const homeWon = match.status === "completed" && match.home_score > match.away_score;
  const awayWon = match.status === "completed" && match.away_score > match.home_score;

  return (
    <article className="scoreboard-panel p-5">
      <header className="flex items-center justify-between gap-3">
        <StatusBadge status={match.status} />
        <span className="text-xs text-muted-foreground">{kickoff(match.scheduled_at)}</span>
      </header>

      <div className="mt-4 space-y-3">
        <Row
          name={teamName(teams, match.home_team_id)}
          score={match.home_score}
          dim={match.status === "scheduled"}
          winner={homeWon}
        />
        <Row
          name={teamName(teams, match.away_team_id)}
          score={match.away_score}
          dim={match.status === "scheduled"}
          winner={awayWon}
        />
      </div>

      {actions ? <div className="mt-5 border-t border-border pt-4">{actions}</div> : null}
    </article>
  );
}

function Row({
  name,
  score,
  dim,
  winner,
}: {
  name: string;
  score: number;
  dim: boolean;
  winner: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={cn(
          "truncate text-base font-medium",
          winner ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {name}
      </span>
      <span
        className={cn(
          "tabular font-display text-3xl leading-none",
          dim ? "text-muted-foreground" : winner ? "text-primary" : "text-foreground",
        )}
      >
        {score}
      </span>
    </div>
  );
}
