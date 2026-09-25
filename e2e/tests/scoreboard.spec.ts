import { expect, test } from "@playwright/test";

import {
  createMatch,
  createTeam,
  startMatch,
  uniqueName,
  updateScore,
} from "./helpers";

test.describe("Scoreboard", () => {
  test("renders matches, standings and the auto-refresh indicator", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Match Day Board" }),
    ).toBeVisible();
    await expect(
      page.getByText("Auto-refreshing every 6 seconds"),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Standings" })).toBeVisible();

    await expect(page.locator("article").first()).toBeVisible();
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });

  test("polls for live score changes made elsewhere", async ({
    page,
    request,
  }) => {
    const homeName = uniqueName("E2E Live Home");
    const awayName = uniqueName("E2E Live Away");
    const home = await createTeam(request, homeName);
    const away = await createTeam(request, awayName);
    const match = await createMatch(request, home.id, away.id);
    await startMatch(request, match.id);
    await updateScore(request, match.id, 1, 0);

    await page.goto("/");
    const card = page.locator("article", { hasText: homeName });
    await expect(card).toBeVisible();
    await expect(card.getByText("Live", { exact: true })).toBeVisible();

    const homeScore = card.locator("span.tabular").first();
    const awayScore = card.locator("span.tabular").nth(1);
    await expect(homeScore).toHaveText("1");

    // Simulate a scorekeeper updating the game from another device.
    await updateScore(request, match.id, 3, 2);

    // No reload: the 6s polling interval should pick the change up on its own.
    await expect(homeScore).toHaveText("3", { timeout: 15_000 });
    await expect(awayScore).toHaveText("2", { timeout: 15_000 });
  });

  test("navigates between the main pages", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Teams", exact: true }).click();
    await expect(page).toHaveURL(/\/teams$/);
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();

    await page.getByRole("link", { name: "Match Control", exact: true }).click();
    await expect(page).toHaveURL(/\/control$/);
    await expect(
      page.getByRole("heading", { name: "Match Control" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Scoreboard", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Match Day Board" }),
    ).toBeVisible();
  });
});
