import { computeStandings } from "./standings";
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

const LATENCY_MS = 60;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function iso(offsetMinutes = 0): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

function seed(): { teams: Team[]; matches: Match[] } {
  const names = ["Northside Nomads", "Harbour Hawks", "Vale Vipers", "Union Ospreys"];
  const teams: Team[] = names.map((name, i) => ({
    id: `team-${i + 1}`,
    name,
    logo_url: null,
    created_at: iso(-1000 + i),
  }));

  const mk = (
    id: string,
    h: number,
    a: number,
    hs: number,
    as: number,
    status: Match["status"],
    at: number,
  ): Match => ({
    id,
    home_team_id: teams[h]!.id,
    away_team_id: teams[a]!.id,
    home_score: hs,
    away_score: as,
    status,
    scheduled_at: iso(at),
    created_at: iso(-900),
    updated_at: iso(-900),
  });

  const matches: Match[] = [
    mk("match-1", 0, 1, 82, 74, "completed", -300),
    mk("match-2", 2, 3, 61, 68, "completed", -240),
    mk("match-3", 0, 2, 45, 41, "live", -30),
    mk("match-4", 1, 3, 0, 0, "scheduled", 120),
  ];

  return { teams, matches };
}

/**
 * In-memory implementation of LeagueService.
 * Lets the entire app run with no real backend.
 */
export class MockLeagueService implements LeagueService {
  private teams: Team[];
  private matches: Match[];

  constructor(initial?: { teams?: Team[]; matches?: Match[] }) {
    const base = seed();
    this.teams = initial?.teams ?? base.teams;
    this.matches = initial?.matches ?? base.matches;
  }

  static empty(): MockLeagueService {
    return new MockLeagueService({ teams: [], matches: [] });
  }

  async listTeams(): Promise<Team[]> {
    return delay(this.teams.map((t) => ({ ...t })));
  }

  async createTeam(input: CreateTeamInput): Promise<Team> {
    const name = input.name.trim();
    if (!name) throw new LeagueError("Team name is required.");
    if (this.teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      throw new LeagueError("A team with that name already exists.");
    }
    const team: Team = {
      id: uid(),
      name,
      logo_url: input.logo_url?.trim() || null,
      created_at: iso(),
    };
    this.teams.push(team);
    return delay({ ...team });
  }

  async listMatches(): Promise<Match[]> {
    return delay(this.matches.map((m) => ({ ...m })));
  }

  async createMatch(input: CreateMatchInput): Promise<Match> {
    if (input.home_team_id === input.away_team_id) {
      throw new LeagueError("A team cannot play itself.");
    }
    for (const id of [input.home_team_id, input.away_team_id]) {
      if (!this.teams.some((t) => t.id === id)) {
        throw new LeagueError("Unknown team selected.");
      }
    }
    const match: Match = {
      id: uid(),
      home_team_id: input.home_team_id,
      away_team_id: input.away_team_id,
      home_score: 0,
      away_score: 0,
      status: "scheduled",
      scheduled_at: input.scheduled_at ?? null,
      created_at: iso(),
      updated_at: iso(),
    };
    this.matches.push(match);
    return delay({ ...match });
  }

  private find(matchId: string): Match {
    const match = this.matches.find((m) => m.id === matchId);
    if (!match) throw new LeagueError("Match not found.");
    return match;
  }

  async updateScore(matchId: string, input: UpdateScoreInput): Promise<Match> {
    const match = this.find(matchId);
    if (match.status === "scheduled") {
      throw new LeagueError("Start the match before entering scores.");
    }
    if (
      !Number.isInteger(input.home_score) ||
      !Number.isInteger(input.away_score) ||
      input.home_score < 0 ||
      input.away_score < 0
    ) {
      throw new LeagueError("Scores must be whole numbers of zero or more.");
    }
    match.home_score = input.home_score;
    match.away_score = input.away_score;
    match.updated_at = iso();
    return delay({ ...match });
  }

  async startMatch(matchId: string): Promise<Match> {
    const match = this.find(matchId);
    if (match.status !== "scheduled") {
      throw new LeagueError("Only a scheduled match can be started.");
    }
    match.status = "live";
    match.updated_at = iso();
    return delay({ ...match });
  }

  async completeMatch(matchId: string): Promise<Match> {
    const match = this.find(matchId);
    if (match.status !== "live") {
      throw new LeagueError("Only a live match can be completed.");
    }
    if (match.home_score === match.away_score) {
      throw new LeagueError("Matches cannot end in a draw. Adjust the score first.");
    }
    match.status = "completed";
    match.updated_at = iso();
    return delay({ ...match });
  }

  async getStandings(): Promise<StandingRow[]> {
    return delay(computeStandings(this.teams, this.matches));
  }
}
