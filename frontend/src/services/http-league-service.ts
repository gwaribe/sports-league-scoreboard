import {
  LeagueError,
  type CreateMatchInput,
  type CreateTeamInput,
  type LeagueService,
  type Match,
  type StandingRow,
  type Team,
  type UpdateScoreInput,
} from "./types";

/**
 * Local default: the backend's dev server (see `openapi.yaml` `servers`).
 * Override with `VITE_API_BASE_URL`, e.g. `/api` for a same-origin deployment.
 */
export const DEFAULT_API_BASE_URL = "http://localhost:8000/api";

export function resolveApiBaseUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const configured = env["VITE_API_BASE_URL"]?.trim();
  return stripTrailingSlash(configured || DEFAULT_API_BASE_URL);
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface HttpLeagueServiceOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
}

/**
 * Talks to the FastAPI backend over HTTP using the `/api` contract in
 * `openapi.yaml`. Every non-2xx response (or unreachable server) is surfaced
 * as a `LeagueError` carrying the backend's `detail` message.
 */
export class HttpLeagueService implements LeagueService {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: HttpLeagueServiceOptions = {}) {
    this.baseUrl = stripTrailingSlash(options.baseUrl ?? resolveApiBaseUrl());
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "Unable to reach the server.";
      throw new LeagueError(message);
    }

    if (!response.ok) {
      throw new LeagueError(await readErrorDetail(response));
    }

    return (await response.json()) as T;
  }

  listTeams(): Promise<Team[]> {
    return this.request<Team[]>("GET", "/teams");
  }

  createTeam(input: CreateTeamInput): Promise<Team> {
    return this.request<Team>("POST", "/teams", input);
  }

  listMatches(): Promise<Match[]> {
    return this.request<Match[]>("GET", "/matches");
  }

  createMatch(input: CreateMatchInput): Promise<Match> {
    return this.request<Match>("POST", "/matches", input);
  }

  updateScore(matchId: string, input: UpdateScoreInput): Promise<Match> {
    return this.request<Match>("PATCH", `/matches/${encodeURIComponent(matchId)}/score`, input);
  }

  startMatch(matchId: string): Promise<Match> {
    return this.request<Match>("POST", `/matches/${encodeURIComponent(matchId)}/start`);
  }

  completeMatch(matchId: string): Promise<Match> {
    return this.request<Match>("POST", `/matches/${encodeURIComponent(matchId)}/complete`);
  }

  getStandings(): Promise<StandingRow[]> {
    return this.request<StandingRow[]>("GET", "/standings");
  }
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === "object") {
      const detail = (payload as { detail?: unknown }).detail;
      if (typeof detail === "string" && detail.trim()) return detail;
    }
  } catch {
    // Body was empty or not JSON; fall through to the status-based message.
  }
  return `Request failed with status ${response.status}.`;
}
