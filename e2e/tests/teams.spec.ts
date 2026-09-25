import { expect, test } from "@playwright/test";

import { createTeam, uniqueName } from "./helpers";

test.describe("Team registration", () => {
  test("registers a new team and lists it", async ({ page }) => {
    const name = uniqueName("E2E Harbour Hawks");

    await page.goto("/teams");
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();

    await page.getByLabel("Team name").fill(name);
    await page
      .getByLabel("Logo URL (optional)")
      .fill("https://example.com/e2e-logo.png");
    await page.getByRole("button", { name: "Add team" }).click();

    await expect(page.getByText(`${name} registered`)).toBeVisible();
    // Scoped to the registered list; sonner toasts are <li> inside a separate <ol>.
    const registered = page.locator("main ul li", { hasText: name });
    await expect(registered).toBeVisible();

    // The form resets after a successful submission.
    await expect(page.getByLabel("Team name")).toHaveValue("");
  });

  test("shows a friendly error for a duplicate team name", async ({
    page,
    request,
  }) => {
    const name = uniqueName("E2E Duplicate FC");
    await createTeam(request, name);

    await page.goto("/teams");
    await page.getByLabel("Team name").fill(name);
    await page.getByRole("button", { name: "Add team" }).click();

    await expect(
      page.getByText("A team with that name already exists."),
    ).toBeVisible();
  });

  test("blocks submitting an empty team name", async ({ page }) => {
    await page.goto("/teams");
    await page.getByRole("button", { name: "Add team" }).click();

    // The required input keeps the browser from submitting the form.
    await expect(page.getByLabel("Team name")).toBeFocused();
  });
});
