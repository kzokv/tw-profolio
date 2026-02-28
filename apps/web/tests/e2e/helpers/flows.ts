import { expect, type Page } from "@playwright/test";

const webPort = Number(process.env.WEB_PORT ?? 3333);
const e2eBaseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${webPort}`;

/** Full URL for an app path (use when fixture baseURL is not applied). */
export function appUrl(path = "/"): string {
  return path.startsWith("http") ? path : new URL(path, e2eBaseURL).href;
}

/** Navigate to app root and wait for hero to be visible. */
export async function gotoApp(page: Page, path = "/"): Promise<void> {
  await page.goto(appUrl(path));
  await page.getByTestId("hero-title").waitFor({ state: "visible" });
}

/** Open settings drawer via avatar and assert it is visible and URL updated. */
export async function openSettingsDrawer(page: Page): Promise<void> {
  await page.getByTestId("avatar-button").click();
  await expect(page.getByTestId("settings-drawer")).toBeVisible();
  await expect(page).toHaveURL(/drawer=settings/);
}
