import { expect, type Page } from "@playwright/test";

/** Navigate to app root and wait for hero to be visible. */
export async function gotoApp(page: Page, path = "/"): Promise<void> {
  await page.goto(path);
  await page.getByTestId("hero-title").waitFor({ state: "visible" });
}

/** Open settings drawer via avatar and assert it is visible and URL updated. */
export async function openSettingsDrawer(page: Page): Promise<void> {
  await page.getByTestId("avatar-button").click();
  await expect(page.getByTestId("settings-drawer")).toBeVisible();
  await expect(page).toHaveURL(/drawer=settings/);
}
