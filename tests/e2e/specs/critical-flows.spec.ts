import { expect, test } from "@playwright/test";
import { gotoApp, openSettingsDrawer } from "../helpers/flows";

test.describe("transaction flow", () => {
  test("add transaction and verify holdings", async ({ page }) => {
    await gotoApp(page);

    await expect(page.getByTestId("hero-title")).toContainText("Taiwan Portfolio Control Room");
    await page.getByTestId("tx-quantity-input").fill("10");
    await page.getByTestId("tx-price-input").fill("120");
    await page.getByTestId("tx-submit-button").click();

    await expect(page.getByTestId("holdings-table")).toBeVisible();
    await expect(page.getByText("2330")).toBeVisible();
  });
});

test.describe("recompute flow", () => {
  test("recompute history with fallback confirmation", async ({ page }) => {
    await gotoApp(page);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("recompute-button").click();

    await expect(page.getByTestId("recompute-status")).toContainText(/Recompute CONFIRMED|重算已確認/);
  });
});

test.describe("settings", () => {
  test("update locale and translate full UI", async ({ page }) => {
    await gotoApp(page);
    await openSettingsDrawer(page);

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

  test("discard changes and warn on drawer close", async ({ page }) => {
    await gotoApp(page, "/?drawer=settings");

    await expect(page.getByTestId("settings-drawer")).toBeVisible();
    await page.getByTestId("settings-locale-select").selectOption("en");
    await page.getByTestId("settings-quote-poll-input").fill("30");

    await page.getByRole("button", { name: "取消" }).click();
    await expect(page.getByText("現在關閉會捨棄這些內容", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "繼續編輯" }).click();
    await page.getByTestId("settings-discard-button").click();
    await expect(page.getByTestId("settings-discard-notice")).toContainText("捨棄");
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

    await page.getByTestId("tooltip-fifo-trigger").hover();
    await expect(page.getByTestId("tooltip-fifo-content")).toBeVisible();

    await page.goto("/");
    await page.getByTestId("tooltip-tx-account-trigger").hover();
    await expect(page.getByTestId("tooltip-tx-account-content")).toBeVisible();
  });
});
