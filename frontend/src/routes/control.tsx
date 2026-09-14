import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MatchCard } from "@/components/league/MatchCard";
import { getLeagueService, type Match } from "@/services";
import { matchesQuery, teamsQuery } from "@/services/queries";

export const Route = createFileRoute("/control")({
  head: () => ({
    meta: [
      { title: "Match Control | Sports League Scoreboard" },
      {
        name: "description",
        content: "Schedule fixtures, start matches and update scores from the sideline.",
      },
      { property: "og:title", content: "Match Control | Sports League Scoreboard" },
      {
        property: "og:description",
        content: "Schedule fixtures, start matches and update scores from the sideline.",
      },
    ],
  }),
  component: ControlPage,
});

function ControlPage() {
  const queryClient = useQueryClient();
  const teams = useQuery(teamsQuery);
  const matches = useQuery(matchesQuery);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
  };

  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [kickoff, setKickoff] = useState("");

  const scheduleMatch = useMutation({
    mutationFn: () =>
      getLeagueService().createMatch({
        home_team_id: home,
        away_team_id: away,
        scheduled_at: kickoff ? new Date(kickoff).toISOString() : null,
      }),
    onSuccess: () => {
      toast.success("Match scheduled");
      setHome("");
      setAway("");
      setKickoff("");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const teamOptions = teams.data ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl">Match Control</h1>
      <p className="mt-2 text-muted-foreground">
        Schedule fixtures, start play and keep the score up to date.
      </p>

      <form
        className="scoreboard-panel mt-8 grid gap-4 p-5 md:grid-cols-4 md:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          scheduleMatch.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="home">Home team</Label>
          <select
            id="home"
            value={home}
            onChange={(e) => setHome(e.target.value)}
            required
            className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="">Select…</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="away">Away team</Label>
          <select
            id="away"
            value={away}
            onChange={(e) => setAway(e.target.value)}
            required
            className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="">Select…</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="kickoff">Kick-off (optional)</Label>
          <Input
            id="kickoff"
            type="datetime-local"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={scheduleMatch.isPending}>
          Schedule match
        </Button>
      </form>

      <section className="mt-10">
        <h2 className="mb-4 text-2xl">Fixtures</h2>
        {matches.data && matches.data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.data.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                teams={teamOptions}
                actions={<MatchControls match={match} onChanged={refresh} />}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing scheduled yet.
          </p>
        )}
      </section>
    </main>
  );
}

function MatchControls({ match, onChanged }: { match: Match; onChanged: () => void }) {
  const run = useMutation({
    mutationFn: (action: () => Promise<Match>) => action(),
    onSuccess: onChanged,
    onError: (error: Error) => toast.error(error.message),
  });

  const service = getLeagueService();
  const adjust = (homeDelta: number, awayDelta: number) =>
    run.mutate(() =>
      service.updateScore(match.id, {
        home_score: Math.max(0, match.home_score + homeDelta),
        away_score: Math.max(0, match.away_score + awayDelta),
      }),
    );

  if (match.status === "scheduled") {
    return (
      <Button className="w-full" onClick={() => run.mutate(() => service.startMatch(match.id))}>
        Start match
      </Button>
    );
  }

  if (match.status === "completed") {
    return <p className="text-center text-xs text-muted-foreground">Result locked in.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <ScoreStepper label="Home" onAdd={() => adjust(1, 0)} onSub={() => adjust(-1, 0)} />
        <ScoreStepper label="Away" onAdd={() => adjust(0, 1)} onSub={() => adjust(0, -1)} />
      </div>
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => run.mutate(() => service.completeMatch(match.id))}
      >
        End game
      </Button>
    </div>
  );
}

function ScoreStepper({
  label,
  onAdd,
  onSub,
}: {
  label: string;
  onAdd: () => void;
  onSub: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" aria-label={`${label} minus one`} onClick={onSub}>
        −
      </Button>
      <span className="flex-1 text-center text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Button variant="outline" size="sm" aria-label={`${label} plus one`} onClick={onAdd}>
        +
      </Button>
    </div>
  );
}
