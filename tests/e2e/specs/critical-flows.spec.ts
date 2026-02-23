import { expect, test } from "@playwright/test";

test("critical flow: add transaction and verify holdings", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("hero-title")).toContainText("Taiwan Portfolio Control Room");

  await page.getByTestId("tx-quantity-input").fill("10");
  await page.getByTestId("tx-price-input").fill("120");
  await page.getByTestId("tx-submit-button").click();

  await expect(page.getByTestId("holdings-table")).toBeVisible();
  await expect(page.getByText("2330")).toBeVisible();
});

test("critical flow: recompute history with fallback confirmation", async ({ page }) => {
  await page.goto("/");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("recompute-button").click();

  await expect(page.getByTestId("recompute-status")).toContainText("Recompute CONFIRMED");
});

test("critical flow: update settings locale and translate full UI", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("avatar-button").click();
  await expect(page.getByTestId("settings-drawer")).toBeVisible();
  await expect(page).toHaveURL(/drawer=settings/);

  await page.getByTestId("settings-locale-select").selectOption("zh-TW");
  await page.getByTestId("settings-cost-basis-select").selectOption("LIFO");
  await page.getByTestId("settings-quote-poll-input").fill("12");
  await page.getByTestId("settings-save-button").click();

  await expect(page.getByTestId("hero-title")).toContainText("台灣投資組合控制台");
  await expect(page.getByTestId("topbar-title")).toContainText("市場帳本");
  await expect(page.getByTestId("settings-quote-poll-value")).toContainText("12 秒");
  await expect(page.getByTestId("settings-cost-basis-value")).toContainText("LIFO");

  await page.reload();
  await expect(page.getByTestId("hero-title")).toContainText("台灣投資組合控制台");
  await expect(page.getByTestId("topbar-title")).toContainText("市場帳本");
});

test("critical flow: discard changes and warn on drawer close", async ({ page }) => {
  await page.goto("/?drawer=settings");

  await expect(page.getByTestId("settings-drawer")).toBeVisible();

  await page.getByTestId("settings-locale-select").selectOption("en");
  await page.getByTestId("settings-quote-poll-input").fill("30");

  await page.getByRole("button", { name: "取消" }).click();
  await expect(page.getByText("現在關閉會捨棄這些內容", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "繼續編輯" }).click();
  await page.getByTestId("settings-discard-button").click();
  await expect(page.getByTestId("settings-discard-notice")).toContainText("捨棄");
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
