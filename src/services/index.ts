import { MockLeagueService } from "./mock-league-service";
import type { LeagueService } from "./types";

let instance: LeagueService = new MockLeagueService();

/** Single access point for backend calls. Swap implementations here. */
export function getLeagueService(): LeagueService {
  return instance;
}

/** Used by tests (and future real backend wiring) to swap the implementation. */
export function setLeagueService(service: LeagueService): void {
  instance = service;
}

export * from "./types";
export { computeStandings } from "./standings";
export { MockLeagueService };
