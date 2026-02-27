import { expect, test } from "@playwright/test";
import { gotoApp, openSettingsDrawer } from "../helpers/flows";

const getNextQuotePoll = (current: string): string =>
  current === "12" ? "10" : "12";

test.describe("transaction flow", () => {
  test("add transaction and verify holdings", async ({ page }) => {
    await gotoApp(page);

    await expect(page.getByTestId("hero-title")).toContainText(/Taiwan Portfolio Control Room|台灣投資組合控制台/);
    const accountSelect = page.getByTestId("tx-account-select");
    const firstAccountId = await accountSelect.locator("option").first().getAttribute("value");
    expect(firstAccountId).toBeTruthy();
    await accountSelect.selectOption(firstAccountId!);
    await expect(page.getByTestId("tx-submit-button")).toBeEnabled();

    const transactionPosted = page.waitForResponse((response) => {
      return (
        response.request().method() === "POST" &&
        response.url().includes("/portfolio/transactions") &&
        response.ok()
      );
    });
    const holdingsRefreshed = page.waitForResponse((response) => {
      return (
        response.request().method() === "GET" &&
        response.url().includes("/portfolio/holdings") &&
        response.ok()
      );
    });

    await page.getByTestId("tx-submit-button").click();
    await transactionPosted;
    await holdingsRefreshed;
    await expect(page.getByTestId("holdings-table")).toBeVisible();
    await expect(page.getByTestId("holdings-table").getByText("2330")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("recompute flow", () => {
  test("recompute history with fallback confirmation", async ({ page }) => {
    await gotoApp(page);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("recompute-button").click();

    await expect(page.getByTestId("recompute-button")).toBeEnabled({ timeout: 20_000 });
    await expect(page.getByTestId("recompute-status")).toContainText(/Recompute CONFIRMED|重算已確認/, { timeout: 5_000 });
  });
});

test.describe("settings", () => {
  test("update locale and translate full UI", async ({ page }) => {
    await gotoApp(page);
    await openSettingsDrawer(page);

    await page.getByTestId("settings-locale-select").selectOption("zh-TW");
    await page.getByTestId("settings-cost-basis-select").selectOption("LIFO");
    const currentQuotePoll = await page.getByTestId("settings-quote-poll-input").inputValue();
    const nextQuotePoll = getNextQuotePoll(currentQuotePoll);
    await page.getByTestId("settings-quote-poll-input").fill(nextQuotePoll);
    await page.getByTestId("settings-save-button").click();

    await expect(page).not.toHaveURL(/drawer=settings/, { timeout: 15_000 });
    await expect(page.getByTestId("hero-title")).toContainText("台灣投資組合控制台", { timeout: 5_000 });
    await expect(page.getByTestId("topbar-title")).toContainText("市場帳本");
    await expect(page.getByTestId("settings-quote-poll-value")).toContainText(`${nextQuotePoll} 秒`);
    await expect(page.getByTestId("settings-cost-basis-value")).toContainText("LIFO");

    await page.reload();
    await expect(page.getByTestId("hero-title")).toContainText("台灣投資組合控制台", { timeout: 10_000 });
    await expect(page.getByTestId("topbar-title")).toContainText("市場帳本");
  });
});

test.describe("tooltips", () => {
  test("settings and domain term tooltips are visible", async ({ page }) => {
    await gotoApp(page, "/?drawer=settings");

    await expect(page.getByTestId("settings-drawer")).toBeVisible();
    await page.getByTestId("tooltip-settings-locale-trigger").hover();
    await expect(page.getByTestId("tooltip-settings-locale-content")).toBeVisible();

    await page.getByTestId("tooltip-settings-cost-basis-trigger").focus();
    await expect(page.getByTestId("tooltip-settings-cost-basis-content")).toBeVisible();

    const currentQuotePoll = await page.getByTestId("settings-quote-poll-input").inputValue();
    await page.getByTestId("settings-quote-poll-input").fill(getNextQuotePoll(currentQuotePoll));

    await page.getByRole("button", { name: /Cancel|取消/ }).click();
    await expect(page.getByTestId("settings-close-warning")).toBeVisible();

    await page.getByRole("button", { name: /Keep Editing|繼續編輯/ }).click();
    await page.getByTestId("settings-discard-button").click();
    await expect(page.getByTestId("settings-discard-notice")).toContainText(/discarded|捨棄/);
  });

  test("critical flow: settings and term tooltips are visible", async ({ page }) => {
    await page.goto("/?drawer=settings");

    await expect(page.getByTestId("settings-drawer")).toBeVisible();

    await page.getByTestId("tooltip-settings-locale-trigger").hover();
    await expect(page.getByTestId("tooltip-settings-locale-content")).toBeVisible();

    await page.getByTestId("tooltip-settings-cost-basis-trigger").focus();
    await expect(page.getByTestId("tooltip-settings-cost-basis-content")).toBeVisible();

    await page.getByTestId("tooltip-fifo-trigger").hover();
    await expect(page.getByTestId("tooltip-fifo-content")).toBeVisible();

    await page.goto("/");
    await page.getByTestId("tooltip-tx-account-trigger").hover();
    await expect(page.getByTestId("tooltip-tx-account-content")).toBeVisible();
  });
});

test("responsive: key UI visible at 375px with English locale", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  await expect(page.getByTestId("topbar-title")).toBeVisible();
  await expect(page.getByTestId("hero-title")).toContainText(/Taiwan Portfolio Control Room|台灣投資組合控制台/);
  await expect(page.getByTestId("recompute-button")).toBeVisible();
  await expect(page.getByTestId("avatar-button")).toBeVisible();

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
});
