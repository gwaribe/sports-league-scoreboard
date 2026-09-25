import { expect, test } from "@playwright/test";

import { createMatch, createTeam, startMatch, uniqueName } from "./helpers";

test.describe("API and static serving", () => {
  test("serves the SPA shell, client routes and JSON 404s", async ({ request }) => {
    const home = await request.get("/");
    expect(home.status()).toBe(200);
    expect(home.headers()["content-type"]).toContain("text/html");

    // Direct navigation / refresh on a client-side route must return the SPA.
    const teamsRoute = await request.get("/teams");
    expect(teamsRoute.status()).toBe(200);
    expect(teamsRoute.headers()["content-type"]).toContain("text/html");

    const controlRoute = await request.get("/control");
    expect(controlRoute.status()).toBe(200);
    expect(controlRoute.headers()["content-type"]).toContain("text/html");

    const unknown = await request.get("/api/does-not-exist");
    expect(unknown.status()).toBe(404);
  });

  test("exposes teams and standings as JSON", async ({ request }) => {
    const teams = await request.get("/api/teams");
    expect(teams.status()).toBe(200);
    const teamsBody = (await teams.json()) as unknown;
    expect(Array.isArray(teamsBody)).toBeTruthy();
    expect(teamsBody as unknown[]).not.toHaveLength(0);

    const standings = await request.get("/api/standings");
    expect(standings.status()).toBe(200);
    const rows = (await standings.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(rows)).toBeTruthy();
    expect(rows[0]).toMatchObject({
      team_name: expect.any(String),
      played: expect.any(Number),
      points: expect.any(Number),
    });
  });

  test("rejects duplicate team names", async ({ request }) => {
    const name = uniqueName("Duplicate FC");
    await createTeam(request, name);

    const duplicate = await request.post("/api/teams", {
      data: { name, logo_url: null },
    });
    expect(duplicate.status()).toBe(409);
    expect(((await duplicate.json()) as { detail: string }).detail).toContain(
      "already exists",
    );
  });

  test("enforces match lifecycle rules", async ({ request }) => {
    const home = await createTeam(request, uniqueName("Rule Home"));
    const away = await createTeam(request, uniqueName("Rule Away"));

    const selfMatch = await request.post("/api/matches", {
      data: { home_team_id: home.id, away_team_id: home.id },
    });
    expect(selfMatch.status()).toBe(400);

    const match = await createMatch(request, home.id, away.id);
    expect(match.status).toBe("scheduled");

    // Scores cannot be entered before kick-off.
    const earlyScore = await request.patch(`/api/matches/${match.id}/score`, {
      data: { home_score: 1, away_score: 0 },
    });
    expect(earlyScore.status()).toBe(400);

    // A scheduled match cannot be completed.
    const earlyComplete = await request.post(`/api/matches/${match.id}/complete`);
    expect(earlyComplete.status()).toBe(400);
  });

  test("rejects negative scores and draws", async ({ request }) => {
    const home = await createTeam(request, uniqueName("Draw Home"));
    const away = await createTeam(request, uniqueName("Draw Away"));
    const match = await createMatch(request, home.id, away.id);
    await startMatch(request, match.id);

    const negative = await request.patch(`/api/matches/${match.id}/score`, {
      data: { home_score: -1, away_score: 0 },
    });
    expect(negative.status()).toBe(400);

    const draw = await request.post(`/api/matches/${match.id}/complete`);
    expect(draw.status()).toBe(400);
    expect(((await draw.json()) as { detail: string }).detail).toContain("draw");
  });
});
