import { beforeEach, describe, expect, it } from "vitest";

import { MockLeagueService } from "./mock-league-service";
import type { Team } from "./types";

let service: MockLeagueService;
let home: Team;
let away: Team;

beforeEach(async () => {
  service = MockLeagueService.empty();
  home = await service.createTeam({ name: "Alpha" });
  away = await service.createTeam({ name: "Bravo" });
});

describe("teams", () => {
  it("creates and lists teams (FR-1.1, FR-1.2)", async () => {
    const teams = await service.listTeams();
    expect(teams.map((t) => t.name)).toEqual(["Alpha", "Bravo"]);
    expect(teams[0]?.logo_url).toBeNull();
  });

  it("rejects duplicate names case-insensitively", async () => {
    await expect(service.createTeam({ name: "alpha" })).rejects.toThrow(/already exists/i);
  });

  it("rejects a blank name", async () => {
    await expect(service.createTeam({ name: "   " })).rejects.toThrow(/required/i);
  });
});

describe("match lifecycle", () => {
  it("schedules a match at 0-0 with status scheduled (FR-2.1)", async () => {
    const match = await service.createMatch({ home_team_id: home.id, away_team_id: away.id });
    expect(match).toMatchObject({ status: "scheduled", home_score: 0, away_score: 0 });
  });

  it("rejects a team playing itself and unknown teams", async () => {
    await expect(
      service.createMatch({ home_team_id: home.id, away_team_id: home.id }),
    ).rejects.toThrow(/cannot play itself/i);
    await expect(
      service.createMatch({ home_team_id: home.id, away_team_id: "nope" }),
    ).rejects.toThrow(/unknown team/i);
  });

  it("enforces scheduled -> live -> completed transitions (FR-2.2)", async () => {
    const match = await service.createMatch({ home_team_id: home.id, away_team_id: away.id });
    await expect(service.completeMatch(match.id)).rejects.toThrow(/only a live match/i);

    const live = await service.startMatch(match.id);
    expect(live.status).toBe("live");
    await expect(service.startMatch(match.id)).rejects.toThrow(/only a scheduled match/i);

    await service.updateScore(match.id, { home_score: 3, away_score: 1 });
    const done = await service.completeMatch(match.id);
    expect(done.status).toBe("completed");
  });

  it("blocks score entry before kick-off and rejects invalid scores (FR-2.3)", async () => {
    const match = await service.createMatch({ home_team_id: home.id, away_team_id: away.id });
    await expect(service.updateScore(match.id, { home_score: 1, away_score: 0 })).rejects.toThrow(
      /start the match/i,
    );

    await service.startMatch(match.id);
    await expect(service.updateScore(match.id, { home_score: -1, away_score: 0 })).rejects.toThrow(
      /whole numbers/i,
    );
    await expect(service.updateScore(match.id, { home_score: 1.5, away_score: 0 })).rejects.toThrow(
      /whole numbers/i,
    );
  });

  it("disallows draws when completing a match (FR-2.4)", async () => {
    const match = await service.createMatch({ home_team_id: home.id, away_team_id: away.id });
    await service.startMatch(match.id);
    await service.updateScore(match.id, { home_score: 2, away_score: 2 });
    await expect(service.completeMatch(match.id)).rejects.toThrow(/draw/i);
  });

  it("throws for an unknown match id", async () => {
    await expect(service.startMatch("missing")).rejects.toThrow(/not found/i);
  });
});

describe("standings integration", () => {
  it("updates standings once a match is completed", async () => {
    const match = await service.createMatch({ home_team_id: home.id, away_team_id: away.id });
    expect((await service.getStandings()).every((r) => r.played === 0)).toBe(true);

    await service.startMatch(match.id);
    await service.updateScore(match.id, { home_score: 21, away_score: 14 });
    expect((await service.getStandings()).every((r) => r.played === 0)).toBe(true);

    await service.completeMatch(match.id);
    const standings = await service.getStandings();
    expect(standings[0]).toMatchObject({ team_name: "Alpha", won: 1, points: 1, point_diff: 7 });
    expect(standings[1]).toMatchObject({ team_name: "Bravo", lost: 1, points: 0, point_diff: -7 });
  });
});

describe("seeded demo data", () => {
  it("boots with teams and a live match so the app runs with no backend", async () => {
    const seeded = new MockLeagueService();
    const [teams, matches] = await Promise.all([seeded.listTeams(), seeded.listMatches()]);
    expect(teams.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.status === "live")).toBe(true);
    expect(matches.some((m) => m.status === "completed")).toBe(true);
  });
});
