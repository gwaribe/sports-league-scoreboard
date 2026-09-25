import { expect, test } from "@playwright/test";

import { createTeam, uniqueName } from "./helpers";

test.describe("Match control lifecycle", () => {
  test("schedules, starts, scores and completes a match that lands in the standings", async ({
    page,
    request,
  }) => {
    const homeName = uniqueName("E2E Home");
    const awayName = uniqueName("E2E Away");
    await createTeam(request, homeName);
    await createTeam(request, awayName);

    await page.goto("/control");
    await expect(
      page.getByRole("heading", { name: "Match Control" }),
    ).toBeVisible();

    // Schedule a fixture through the UI.
    await page.locator("#home").selectOption({ label: homeName });
    await page.locator("#away").selectOption({ label: awayName });
    await page.getByRole("button", { name: "Schedule match" }).click();
    await expect(page.getByText("Match scheduled")).toBeVisible();

    const card = page.locator("article", { hasText: homeName });
    await expect(card).toBeVisible();
    await expect(card.getByText("Scheduled", { exact: true })).toBeVisible();

    // Kick off.
    await card.getByRole("button", { name: "Start match" }).click();
    await expect(card.getByText("Live", { exact: true })).toBeVisible();

    const homeScore = card.locator("span.tabular").first();
    const awayScore = card.locator("span.tabular").nth(1);

    // Score updates are absolute, so wait for each round-trip before the next.
    await card.getByRole("button", { name: "Home plus one" }).click();
    await expect(homeScore).toHaveText("1");
    await card.getByRole("button", { name: "Home plus one" }).click();
    await expect(homeScore).toHaveText("2");
    await card.getByRole("button", { name: "Away plus one" }).click();
    await expect(awayScore).toHaveText("1");

    // Finish the game (2-1, no draw).
    await card.getByRole("button", { name: "End game" }).click();
    await expect(card.getByText("Final", { exact: true })).toBeVisible();
    await expect(card.getByText("Result locked in.")).toBeVisible();

    // The public scoreboard shows the final result and the updated table.
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Match Day Board" }),
    ).toBeVisible();

    const boardCard = page.locator("article", { hasText: homeName });
    await expect(boardCard.getByText("Final", { exact: true })).toBeVisible();
    await expect(boardCard.locator("span.tabular").first()).toHaveText("2");
    await expect(boardCard.locator("span.tabular").nth(1)).toHaveText("1");

    const standingsRows = page.locator("table tbody tr");
    const homeRow = standingsRows.filter({ hasText: homeName });
    await expect(homeRow.locator("td").nth(3)).toHaveText("1"); // W
    await expect(homeRow.locator("td").nth(4)).toHaveText("0"); // L
    await expect(homeRow.locator("td").nth(8)).toHaveText("1"); // Pts

    const awayRow = standingsRows.filter({ hasText: awayName });
    await expect(awayRow.locator("td").nth(3)).toHaveText("0"); // W
    await expect(awayRow.locator("td").nth(4)).toHaveText("1"); // L
    await expect(awayRow.locator("td").nth(8)).toHaveText("0"); // Pts
  });
});
