import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_API_BASE_URL,
  HttpLeagueService,
  resolveApiBaseUrl,
  type FetchLike,
} from "./http-league-service";
import { LeagueError, type Match, type StandingRow, type Team } from "./types";

const BASE = "http://api.test/api";

const team: Team = {
  id: "team-1",
  name: "Northside Nomads",
  logo_url: null,
  created_at: "2026-09-14T06:40:00Z",
};

const match: Match = {
  id: "match-3",
  home_team_id: "team-1",
  away_team_id: "team-2",
  home_score: 45,
  away_score: 41,
  status: "live",
  scheduled_at: null,
  created_at: "2026-09-14T06:00:00Z",
  updated_at: "2026-09-14T06:30:00Z",
};

const standing: StandingRow = {
  team_id: "team-1",
  team_name: "Northside Nomads",
  played: 1,
  won: 1,
  lost: 0,
  points_for: 82,
  points_against: 74,
  point_diff: 8,
  points: 1,
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function setup() {
  const fetchMock = vi.fn<FetchLike>();
  const service = new HttpLeagueService({ baseUrl: BASE, fetchImpl: fetchMock });
  return { fetchMock, service };
}

function lastCall(fetchMock: ReturnType<typeof vi.fn<FetchLike>>) {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  const body = init?.body ? JSON.parse(init.body as string) : undefined;
  return { url, init, body };
}

describe("resolveApiBaseUrl", () => {
  it("falls back to the documented local backend default", () => {
    expect(resolveApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
    expect(DEFAULT_API_BASE_URL).toBe("http://localhost:8000/api");
  });
});

describe("HttpLeagueService request shapes", () => {
  it("listTeams GETs /teams", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse([team]));

    await expect(service.listTeams()).resolves.toEqual([team]);
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(`${BASE}/teams`);
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
  });

  it("createTeam POSTs /teams with the input as JSON", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(team, 201));

    await expect(service.createTeam({ name: "Northside Nomads", logo_url: null })).resolves.toEqual(
      team,
    );
    const { url, init, body } = lastCall(fetchMock);
    expect(url).toBe(`${BASE}/teams`);
    expect(init?.method).toBe("POST");
    expect(body).toEqual({ name: "Northside Nomads", logo_url: null });
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("listMatches GETs /matches", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse([match]));

    await expect(service.listMatches()).resolves.toEqual([match]);
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(`${BASE}/matches`);
    expect(init?.method).toBe("GET");
  });

  it("createMatch POSTs /matches with the input as JSON", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(match, 201));

    const input = { home_team_id: "team-1", away_team_id: "team-2", scheduled_at: null };
    await expect(service.createMatch(input)).resolves.toEqual(match);
    const { url, init, body } = lastCall(fetchMock);
    expect(url).toBe(`${BASE}/matches`);
    expect(init?.method).toBe("POST");
    expect(body).toEqual(input);
  });

  it("updateScore PATCHes /matches/{id}/score", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(match));

    await expect(
      service.updateScore("match-3", { home_score: 45, away_score: 41 }),
    ).resolves.toEqual(match);
    const { url, init, body } = lastCall(fetchMock);
    expect(url).toBe(`${BASE}/matches/match-3/score`);
    expect(init?.method).toBe("PATCH");
    expect(body).toEqual({ home_score: 45, away_score: 41 });
  });

  it("startMatch POSTs /matches/{id}/start with no body", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(match));

    await service.startMatch("match-3");
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(`${BASE}/matches/match-3/start`);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
  });

  it("completeMatch POSTs /matches/{id}/complete with no body", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(match));

    await service.completeMatch("match-3");
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(`${BASE}/matches/match-3/complete`);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
  });

  it("getStandings GETs /standings", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse([standing]));

    await expect(service.getStandings()).resolves.toEqual([standing]);
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(`${BASE}/standings`);
    expect(init?.method).toBe("GET");
  });

  it("escapes the match id when building the URL", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(match));

    await service.startMatch("match 3/4");
    expect(lastCall(fetchMock).url).toBe(`${BASE}/matches/match%203%2F4/start`);
  });
});

const errorCases: Array<{
  name: string;
  invoke: (service: HttpLeagueService) => Promise<unknown>;
  method: string;
  url: string;
}> = [
  { name: "listTeams", invoke: (s) => s.listTeams(), method: "GET", url: `${BASE}/teams` },
  {
    name: "createTeam",
    invoke: (s) => s.createTeam({ name: "Alpha" }),
    method: "POST",
    url: `${BASE}/teams`,
  },
  { name: "listMatches", invoke: (s) => s.listMatches(), method: "GET", url: `${BASE}/matches` },
  {
    name: "createMatch",
    invoke: (s) => s.createMatch({ home_team_id: "team-1", away_team_id: "team-2" }),
    method: "POST",
    url: `${BASE}/matches`,
  },
  {
    name: "updateScore",
    invoke: (s) => s.updateScore("match-3", { home_score: 1, away_score: 0 }),
    method: "PATCH",
    url: `${BASE}/matches/match-3/score`,
  },
  {
    name: "startMatch",
    invoke: (s) => s.startMatch("match-3"),
    method: "POST",
    url: `${BASE}/matches/match-3/start`,
  },
  {
    name: "completeMatch",
    invoke: (s) => s.completeMatch("match-3"),
    method: "POST",
    url: `${BASE}/matches/match-3/complete`,
  },
  {
    name: "getStandings",
    invoke: (s) => s.getStandings(),
    method: "GET",
    url: `${BASE}/standings`,
  },
];

describe("HttpLeagueService error mapping", () => {
  it.each(errorCases)("$name surfaces the backend detail as LeagueError", async (testCase) => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Start the match first." }, 400));

    const error = await testCase.invoke(service).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(LeagueError);
    expect((error as LeagueError).message).toBe("Start the match first.");
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(testCase.url);
    expect(init?.method).toBe(testCase.method);
  });

  it("maps a non-JSON error body to a LeagueError", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(new Response("<html>boom</html>", { status: 500 }));

    const error = await service.listTeams().catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(LeagueError);
    expect((error as LeagueError).message).toBe("Request failed with status 500.");
  });

  it("maps a JSON error without a detail string to a LeagueError", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "nope" }, 503));

    const error = await service.getStandings().catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(LeagueError);
    expect((error as LeagueError).message).toBe("Request failed with status 503.");
  });

  it("maps an unreachable server to a LeagueError", async () => {
    const { fetchMock, service } = setup();
    fetchMock.mockRejectedValueOnce(new Error("Network down"));

    const error = await service.listMatches().catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(LeagueError);
    expect((error as LeagueError).message).toBe("Network down");
  });
});
