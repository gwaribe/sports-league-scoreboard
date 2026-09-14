import { queryOptions } from "@tanstack/react-query";
import { getLeagueService } from "./index";

/** Poll every 6s (spec: 5-10s client polling). */
export const POLL_INTERVAL_MS = 6000;

export const teamsQuery = queryOptions({
  queryKey: ["teams"],
  queryFn: () => getLeagueService().listTeams(),
});

export const matchesQuery = queryOptions({
  queryKey: ["matches"],
  queryFn: () => getLeagueService().listMatches(),
  refetchInterval: POLL_INTERVAL_MS,
});

export const standingsQuery = queryOptions({
  queryKey: ["standings"],
  queryFn: () => getLeagueService().getStandings(),
  refetchInterval: POLL_INTERVAL_MS,
});
