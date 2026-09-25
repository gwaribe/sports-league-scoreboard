import { expect, type APIRequestContext } from "@playwright/test";

export interface Team {
  id: string;
  name: string;
  logo_url?: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: "scheduled" | "live" | "completed";
  scheduled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StandingRow {
  team_id: string;
  team_name: string;
  played: number;
  won: number;
  lost: number;
  points_for: number;
  points_against: number;
  point_diff: number;
  points: number;
}

let sequence = 0;

/** Build a name that is unique per run so repeated runs never collide. */
export function uniqueName(prefix: string): string {
  sequence += 1;
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix} ${stamp}-${sequence}-${random}`;
}

export async function createTeam(
  request: APIRequestContext,
  name: string,
  logoUrl: string | null = null,
): Promise<Team> {
  const response = await request.post("/api/teams", {
    data: { name, logo_url: logoUrl },
  });
  expect(response.status(), `POST /api/teams (${name})`).toBe(201);
  return (await response.json()) as Team;
}

export async function createMatch(
  request: APIRequestContext,
  homeTeamId: string,
  awayTeamId: string,
  scheduledAt: string | null = null,
): Promise<Match> {
  const response = await request.post("/api/matches", {
    data: {
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      scheduled_at: scheduledAt,
    },
  });
  expect(response.status(), "POST /api/matches").toBe(201);
  return (await response.json()) as Match;
}

export async function startMatch(
  request: APIRequestContext,
  matchId: string,
): Promise<Match> {
  const response = await request.post(`/api/matches/${matchId}/start`);
  expect(response.status(), "POST /api/matches/:id/start").toBe(200);
  return (await response.json()) as Match;
}

export async function updateScore(
  request: APIRequestContext,
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<Match> {
  const response = await request.patch(`/api/matches/${matchId}/score`, {
    data: { home_score: homeScore, away_score: awayScore },
  });
  expect(response.status(), "PATCH /api/matches/:id/score").toBe(200);
  return (await response.json()) as Match;
}

export async function completeMatch(
  request: APIRequestContext,
  matchId: string,
): Promise<Match> {
  const response = await request.post(`/api/matches/${matchId}/complete`);
  expect(response.status(), "POST /api/matches/:id/complete").toBe(200);
  return (await response.json()) as Match;
}

/**
 * Create two teams, schedule a match between them and drive it to a final
 * home win with the supplied score. Returns the teams and the completed match.
 */
export async function playCompletedMatch(
  request: APIRequestContext,
  homeName: string,
  awayName: string,
  homeScore = 2,
  awayScore = 1,
) {
  const home = await createTeam(request, homeName);
  const away = await createTeam(request, awayName);
  const match = await createMatch(request, home.id, away.id);
  await startMatch(request, match.id);
  await updateScore(request, match.id, homeScore, awayScore);
  const completed = await completeMatch(request, match.id);
  return { home, away, match: completed };
}
