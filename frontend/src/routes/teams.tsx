import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLeagueService, type CreateTeamInput } from "@/services";
import { teamsQuery } from "@/services/queries";

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "Teams | Sports League Scoreboard" },
      {
        name: "description",
        content: "Register teams and review every club taking part in the league.",
      },
      { property: "og:title", content: "Teams | Sports League Scoreboard" },
      {
        property: "og:description",
        content: "Register teams and review every club taking part in the league.",
      },
    ],
  }),
  component: TeamsPage,
});

function TeamsPage() {
  const queryClient = useQueryClient();
  const teams = useQuery(teamsQuery);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const createTeam = useMutation({
    mutationFn: (input: CreateTeamInput) => getLeagueService().createTeam(input),
    onSuccess: (team) => {
      toast.success(`${team.name} registered`);
      setName("");
      setLogoUrl("");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["standings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl">Teams</h1>
      <p className="mt-2 text-muted-foreground">Register the clubs taking part in this league.</p>

      <form
        className="scoreboard-panel mt-8 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          createTeam.mutate({ name, logo_url: logoUrl });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="team-name">Team name</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Harbour Hawks"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="team-logo">Logo URL (optional)</Label>
          <Input
            id="team-logo"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <Button type="submit" disabled={createTeam.isPending}>
          {createTeam.isPending ? "Adding…" : "Add team"}
        </Button>
      </form>

      <section className="mt-10">
        <h2 className="mb-4 text-2xl">Registered ({teams.data?.length ?? 0})</h2>
        {teams.data && teams.data.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.data.map((team) => (
              <li key={team.id} className="scoreboard-panel flex items-center gap-3 p-4">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={`${team.name} logo`}
                    className="h-10 w-10 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-display text-lg">
                    {team.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="font-medium">{team.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No teams yet — add the first one above.
          </p>
        )}
      </section>
    </main>
  );
}
