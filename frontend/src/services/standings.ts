import type { Match, StandingRow, Team } from "./types";

/**
 * FR-3: derive standings from completed matches only.
 * Win = 1 pt, loss = 0 pts. Sorted by PTS, then DIFF, then PF.
 */
export function computeStandings(teams: Team[], matches: Match[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  for (const team of teams) {
    rows.set(team.id, {
      team_id: team.id,
      team_name: team.name,
      played: 0,
      won: 0,
      lost: 0,
      points_for: 0,
      points_against: 0,
      point_diff: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (match.status !== "completed") continue;
    const home = rows.get(match.home_team_id);
    const away = rows.get(match.away_team_id);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.points_for += match.home_score;
    home.points_against += match.away_score;
    away.points_for += match.away_score;
    away.points_against += match.home_score;

    if (match.home_score > match.away_score) {
      home.won += 1;
      away.lost += 1;
    } else if (match.away_score > match.home_score) {
      away.won += 1;
      home.lost += 1;
    }
  }

  for (const row of rows.values()) {
    row.point_diff = row.points_for - row.points_against;
    row.points = row.won;
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.point_diff - a.point_diff ||
      b.points_for - a.points_for ||
      a.team_name.localeCompare(b.team_name),
  );
}
