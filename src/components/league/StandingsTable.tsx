import type { StandingRow } from "@/services";

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No teams registered yet.
      </p>
    );
  }

  return (
    <div className="scoreboard-panel overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 text-left font-semibold">#</th>
            <th className="px-4 py-3 text-left font-semibold">Team</th>
            <th className="px-3 py-3 text-right font-semibold">MP</th>
            <th className="px-3 py-3 text-right font-semibold">W</th>
            <th className="px-3 py-3 text-right font-semibold">L</th>
            <th className="px-3 py-3 text-right font-semibold">PF</th>
            <th className="px-3 py-3 text-right font-semibold">PA</th>
            <th className="px-3 py-3 text-right font-semibold">Diff</th>
            <th className="px-4 py-3 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team_id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3 tabular text-muted-foreground">{index + 1}</td>
              <td className="px-4 py-3 font-medium">{row.team_name}</td>
              <td className="px-3 py-3 text-right tabular">{row.played}</td>
              <td className="px-3 py-3 text-right tabular">{row.won}</td>
              <td className="px-3 py-3 text-right tabular">{row.lost}</td>
              <td className="px-3 py-3 text-right tabular">{row.points_for}</td>
              <td className="px-3 py-3 text-right tabular">{row.points_against}</td>
              <td className="px-3 py-3 text-right tabular">
                {row.point_diff > 0 ? `+${row.point_diff}` : row.point_diff}
              </td>
              <td className="px-4 py-3 text-right tabular font-display text-xl text-primary">
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
