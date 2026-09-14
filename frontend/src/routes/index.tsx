import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { MatchCard } from "@/components/league/MatchCard";
import { StandingsTable } from "@/components/league/StandingsTable";
import { matchesQuery, standingsQuery, teamsQuery } from "@/services/queries";
import type { Match } from "@/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Scoreboard | Sports League Scoreboard" },
      {
        name: "description",
        content:
          "Follow live match scores and an auto-updating league table for your rec league or campus tournament.",
      },
      { property: "og:title", content: "Live Scoreboard | Sports League Scoreboard" },
      {
        property: "og:description",
        content: "Live match scores and an auto-updating league table, refreshed every few seconds.",
      },
    ],
  }),
  component: ScoreboardPage,
});

const ORDER: Record<Match["status"], number> = { live: 0, scheduled: 1, completed: 2 };

function ScoreboardPage() {
  const teams = useQuery(teamsQuery);
  const matches = useQuery(matchesQuery);
  const standings = useQuery(standingsQuery);

  const sorted = [...(matches.data ?? [])].sort(
    (a, b) =>
      ORDER[a.status] - ORDER[b.status] ||
      (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Auto-refreshing every 6 seconds
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Match Day Board</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Live scores, upcoming fixtures and the current league table — no sign-in required.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl">Matches</h2>
        {matches.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading matches…</p>
        ) : sorted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No matches scheduled yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((match) => (
              <MatchCard key={match.id} match={match} teams={teams.data ?? []} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-2xl">Standings</h2>
        <StandingsTable rows={standings.data ?? []} />
        <p className="mt-3 text-xs text-muted-foreground">
          Completed matches only. 1 point per win; ties broken by point differential, then points
          for.
        </p>
      </section>
    </main>
  );
}
