# Software Specification Document: Sports League Scoreboard (MVP)

---

## 1. Project Overview & Objectives

* **Project Name:** Sports League Scoreboard
* **Summary:** A lightweight web application designed for rec leagues, campus tournaments, and casual sports competitions. It enables coordinators to register teams, schedule matches, track scores live, and provide spectators with an auto-updating leaderboard.
* **Core Objective:** Deliver a frictionless, minimal viable product (MVP) that automates score tracking and standings calculations without login barriers or operational overhead.

---

## 2. Scope & Boundaries

### In-Scope
* **Team Registration:** Pre-registration of participating teams with a name and optional logo URL or icon.
* **Match Management:** Creation, status progression (`Scheduled` → `Live` → `Completed`), and real-time score adjustment.
* **Dynamic Standings Calculation:** Automated computation of matches played, wins, losses, total points, and point differential.
* **Live Refresh:** Client-side periodic auto-polling (5–10s intervals) to deliver near-real-time score and table updates.

### Out-of-Scope (Deferred Post-MVP)
* User accounts, authentication, or role-based permission checks (open access model for MVP).
* Draw/tie handling (matches must produce a winner).
* Individual player rosters, fouls, substitutions, or player-level stats.
* Tournament bracket trees, playoffs, or multi-stage tournament engines.
* Push-based web sockets or server-sent events (SSE).

---

## 3. User Roles & Key Workflows

### User Roles
1. **League Coordinator / Operator:** Creates teams, schedules matchups, and enters scores mid-game and post-game.
2. **Spectator / Viewer:** Consults the match board and standings table from any web browser.

### Key Workflows

#### Workflow 1: League Setup & Scheduling
```
[Register Teams] ──> [Schedule Match (Home vs. Away + Scheduled Time)] ──> Match set to "Scheduled"
```

#### Workflow 2: Match Progression & Live Scoring
```
[Start Game] ──> Status: "Live" ──> [Increment/Update Scores] ──> [End Game] ──> Status: "Completed"
                                                                                        │
                                                                                        ▼
                                                                             Auto-Update Standings
```

#### Spectator Flow
A viewer navigates to the homepage, views live match cards and current standings, and receives auto-refreshed updates every 5–10 seconds without manual page reloads.

---

## 4. Functional Requirements

### 4.1 Team Management
* **FR-1.1 (Create Team):** The system shall allow creation of a team with a required unique `name` and an optional `logo_url`.
* **FR-1.2 (List Teams):** The system shall return a list of all registered teams for match assignment.

### 4.2 Match Management & Lifecycle
* **FR-2.1 (Schedule Match):** The system shall allow creating a match by selecting a `home_team`, an `away_team`, and an optional `scheduled_time`. The default status shall be `Scheduled` with scores initialized to `0 - 0`.
* **FR-2.2 (Status Transitions):** The system shall enforce valid status transitions:
  * `Scheduled` → `Live`
  * `Live` → `Completed`
* **FR-2.3 (Score Entry):** When a match is `Live` or `Completed`, operators shall be able to update `home_score` and `away_score`.
* **FR-2.4 (Winner Determination):** When marked `Completed`, the team with the higher score is assigned the win, and the other team is assigned the loss. Draws are disallowed.

### 4.3 Standings Calculation Engine
* **FR-3.1 (Points Allocation):**
  * Win: `1 point`
  * Loss: `0 points`
* **FR-3.2 (Computed Metrics):** Standings shall dynamically aggregate only `Completed` matches and calculate:
  * Matches Played (`MP`)
  * Wins (`W`)
  * Losses (`L`)
  * Points Scored For (`PF`), Points Against (`PA`), Point Differential (`DIFF = PF - PA`)
  * Total Points (`PTS`)
* **FR-3.3 (Rank Ordering):** Standings shall sort descending by:
  1. Total Points (`PTS`)
  2. Point Differential (`DIFF`)
  3. Points For (`PF`)

---

## 5. Non-Functional Requirements

* **Performance & Polling:** The system shall support client polling intervals of 5–10 seconds with query execution times under 100ms for active matches and standings.
* **Accessibility & Simplicity:** Zero login screens or authentication barriers; direct access to read and write actions in the MVP.
* **Responsive Layout:** The UI must display legibly on standard mobile screens (for pitch-side score entry) and desktop displays.
* **Data Integrity:** Foreign key constraints between matches and teams to prevent orphan records.

---

## 6. Data Model / Architecture Overview

### Conceptual Entities & Attributes

#### 1. `Team`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer / UUID | Primary Key | Unique team identifier |
| `name` | String(100) | Required, Unique | Name of the team |
| `logo_url` | String(255) | Optional | Link to team logo/avatar image |
| `created_at` | Timestamp | Default: Current Time | Record creation timestamp |

#### 2. `Match`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer / UUID | Primary Key | Unique match identifier |
| `home_team_id` | Integer / UUID | Foreign Key (`Team.id`) | Reference to home team |
| `away_team_id` | Integer / UUID | Foreign Key (`Team.id`) | Reference to away team |
| `home_score` | Integer | Default: 0, Min: 0 | Current or final home points |
| `away_score` | Integer | Default: 0, Min: 0 | Current or final away points |
| `status` | Enum | `scheduled`, `live`, `completed` | Current game state |
| `scheduled_at` | Timestamp | Optional | Scheduled kickoff/tip-off time |
| `created_at` | Timestamp | Default: Current Time | Record creation timestamp |
| `updated_at` | Timestamp | Auto-update | Last modification timestamp |

#### 3. `Standings` (Computed View / Query)
Standings are derived dynamically from the `Match` table where `status = 'completed'`, aggregated per `Team`:
* `team_id`: Team reference
* `played`: Count of completed matches
* `won`: Count where team score was strictly greater
* `lost`: Count where team score was strictly lower
* `points_for`: Sum of points scored by the team
* `points_against`: Sum of points conceded by the team
* `point_diff`: `points_for - points_against`
* `points`: Equal to `won` (1 pt per win)
