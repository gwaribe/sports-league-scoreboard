import { HttpLeagueService } from "./http-league-service";
import { MockLeagueService } from "./mock-league-service";
import type { LeagueService } from "./types";

let instance: LeagueService = new HttpLeagueService();

/** Single access point for backend calls. Swap implementations here. */
export function getLeagueService(): LeagueService {
  return instance;
}

/** Used by tests to swap the implementation (e.g. back to `MockLeagueService`). */
export function setLeagueService(service: LeagueService): void {
  instance = service;
}

export * from "./types";
export { computeStandings } from "./standings";
export { HttpLeagueService, DEFAULT_API_BASE_URL, resolveApiBaseUrl } from "./http-league-service";
export { MockLeagueService };
