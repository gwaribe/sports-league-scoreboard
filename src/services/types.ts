export type MatchStatus = "scheduled" | "live" | "completed";

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
  status: MatchStatus;
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

export interface CreateTeamInput {
  name: string;
  logo_url?: string | null;
}

export interface CreateMatchInput {
  home_team_id: string;
  away_team_id: string;
  scheduled_at?: string | null;
}

export interface UpdateScoreInput {
  home_score: number;
  away_score: number;
}

/**
 * Single boundary for every backend call in the app.
 * UI code never talks to a data source directly — only through this.
 */
export interface LeagueService {
  listTeams(): Promise<Team[]>;
  createTeam(input: CreateTeamInput): Promise<Team>;

  listMatches(): Promise<Match[]>;
  createMatch(input: CreateMatchInput): Promise<Match>;
  updateScore(matchId: string, input: UpdateScoreInput): Promise<Match>;
  startMatch(matchId: string): Promise<Match>;
  completeMatch(matchId: string): Promise<Match>;

  getStandings(): Promise<StandingRow[]>;
}

export class LeagueError extends Error {}
