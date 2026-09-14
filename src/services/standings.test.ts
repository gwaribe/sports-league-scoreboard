import { describe, expect, it } from "vitest";

import { computeStandings } from "./standings";
import type { Match, Team } from "./types";

const team = (id: string, name: string): Team => ({
  id,
  name,
  logo_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
});

const match = (
  id: string,
  home: string,
  away: string,
  hs: number,
  as: number,
  status: Match["status"] = "completed",
): Match => ({
  id,
  home_team_id: home,
  away_team_id: away,
  home_score: hs,
  away_score: as,
  status,
  scheduled_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
});

const teams = [team("a", "Alpha"), team("b", "Bravo"), team("c", "Charlie")];

describe("computeStandings", () => {
  it("lists every team with zeroed stats when no matches exist", () => {
    const rows = computeStandings(teams, []);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ played: 0, won: 0, lost: 0, points: 0, point_diff: 0 });
  });

  it("ignores scheduled and live matches (FR-3.2)", () => {
    const rows = computeStandings(teams, [
      match("m1", "a", "b", 10, 2, "live"),
      match("m2", "a", "c", 5, 1, "scheduled"),
    ]);
    expect(rows.every((row) => row.played === 0)).toBe(true);
  });

  it("aggregates wins, losses and points for/against from completed matches", () => {
    const rows = computeStandings(teams, [
      match("m1", "a", "b", 20, 10),
      match("m2", "b", "c", 15, 12),
    ]);
    const byId = Object.fromEntries(rows.map((row) => [row.team_id, row]));

    expect(byId["a"]).toMatchObject({
      played: 1,
      won: 1,
      lost: 0,
      points_for: 20,
      points_against: 10,
      point_diff: 10,
      points: 1,
    });
    expect(byId["b"]).toMatchObject({ played: 2, won: 1, lost: 1, points_for: 25, points: 1 });
    expect(byId["c"]).toMatchObject({ played: 1, won: 0, lost: 1, point_diff: -3, points: 0 });
  });

  it("awards exactly 1 point per win (FR-3.1)", () => {
    const rows = computeStandings(teams, [match("m1", "a", "b", 3, 1), match("m2", "a", "c", 4, 2)]);
    expect(rows[0]?.points).toBe(2);
    expect(rows[0]?.team_id).toBe("a");
  });

  it("ranks by points, then differential, then points for (FR-3.3)", () => {
    const rows = computeStandings(teams, [
      match("m1", "a", "b", 10, 9), // a +1
      match("m2", "b", "c", 30, 10), // b +20
      match("m3", "c", "a", 1, 0), // c +1, a -1
    ]);
    // a: 1pt diff 0 ; b: 1pt diff +19 ; c: 1pt diff -19
    expect(rows.map((r) => r.team_id)).toEqual(["b", "a", "c"]);
  });

  it("breaks an equal points+diff tie with points for", () => {
    const rows = computeStandings(
      [team("a", "Alpha"), team("b", "Bravo"), team("c", "Charlie"), team("d", "Delta")],
      [match("m1", "a", "b", 30, 20), match("m2", "c", "d", 13, 3)],
    );
    expect(rows.slice(0, 2).map((r) => r.team_id)).toEqual(["a", "c"]);
  });

  it("skips matches referencing unknown teams", () => {
    const rows = computeStandings(teams, [match("m1", "a", "ghost", 5, 1)]);
    expect(rows.every((row) => row.played === 0)).toBe(true);
  });
});
