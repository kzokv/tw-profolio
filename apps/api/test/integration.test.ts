import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

let app: Awaited<ReturnType<typeof buildApp>>;

describe("api integration", () => {
  beforeEach(async () => {
    app = await buildApp({ persistenceBackend: "memory" });
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("creates transaction and returns holdings", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k1" },
      payload: {
        accountId: "acc-1",
        symbol: "2330",
        quantity: 10,
        priceNtd: 100,
        tradeDate: "2026-01-01",
        type: "BUY",
        isDayTrade: false,
      },
    });

    expect(createResponse.statusCode).toBe(200);

    const holdingsResponse = await app.inject({ method: "GET", url: "/portfolio/holdings" });
    const holdings = holdingsResponse.json();
    expect(Array.isArray(holdings)).toBe(true);
    expect(holdings[0].quantity).toBe(10);
  });

  it("previews and confirms recompute", async () => {
    await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k2" },
      payload: {
        accountId: "acc-1",
        symbol: "2330",
        quantity: 10,
        priceNtd: 200,
        tradeDate: "2026-01-01",
        type: "BUY",
        isDayTrade: false,
      },
    });

    const preview = await app.inject({
      method: "POST",
      url: "/portfolio/recompute/preview",
      payload: {
        profileId: "fp-default",
      },
    });

    expect(preview.statusCode).toBe(200);
    const previewBody = preview.json();

    const confirm = await app.inject({
      method: "POST",
      url: "/portfolio/recompute/confirm",
      payload: { jobId: previewBody.id },
    });

    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().status).toBe("CONFIRMED");
  });

  it("does not consume idempotency key for invalid payload", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k-invalid" },
      payload: {
        accountId: "acc-1",
      },
    });

    expect(first.statusCode).toBeGreaterThanOrEqual(400);

    const second = await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k-invalid" },
      payload: {
        accountId: "acc-1",
        symbol: "2330",
        quantity: 1,
        priceNtd: 100,
        tradeDate: "2026-01-01",
        type: "BUY",
        isDayTrade: false,
      },
    });

    expect(second.statusCode).toBe(200);
  });

  it("does not consume idempotency key for domain validation failure", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k-domain-invalid" },
      payload: {
        accountId: "acc-1",
        symbol: "UNKNOWN",
        quantity: 1,
        priceNtd: 100,
        tradeDate: "2026-01-01",
        type: "BUY",
        isDayTrade: false,
      },
    });

    expect(first.statusCode).toBe(400);

    const second = await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k-domain-invalid" },
      payload: {
        accountId: "acc-1",
        symbol: "2330",
        quantity: 1,
        priceNtd: 100,
        tradeDate: "2026-01-01",
        type: "BUY",
        isDayTrade: false,
      },
    });

    expect(second.statusCode).toBe(200);
  });

  it("rejects corporate actions for unknown account ids", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/corporate-actions",
      payload: {
        accountId: "acc-missing",
        symbol: "2330",
        actionType: "DIVIDEND",
        numerator: 1,
        denominator: 1,
        actionDate: "2026-01-01",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe("account_not_found");

    const actions = await app.inject({ method: "GET", url: "/corporate-actions" });
    expect(actions.statusCode).toBe(200);
    expect(actions.json()).toEqual([]);
  });

  it("keeps transaction fee snapshots immutable after profile edits", async () => {
    const feeProfilesBefore = await app.inject({ method: "GET", url: "/fee-profiles" });
    const profile = feeProfilesBefore.json()[0];

    const createResponse = await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k-snapshot-immutable" },
      payload: {
        accountId: "acc-1",
        symbol: "2330",
        quantity: 1,
        priceNtd: 100,
        tradeDate: "2026-01-01",
        type: "BUY",
        isDayTrade: false,
      },
    });
    expect(createResponse.statusCode).toBe(200);

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/fee-profiles/${profile.id}`,
      payload: {
        ...profile,
        name: "Updated Broker Name",
      },
    });
    expect(patchResponse.statusCode).toBe(200);

    const transactions = await app.inject({ method: "GET", url: "/portfolio/transactions" });
    expect(transactions.statusCode).toBe(200);
    expect(transactions.json()[0].feeSnapshot.name).toBe(profile.name);
  });

  it("isolates seeded default fee profiles between memory users", async () => {
    const userAProfiles = await app.inject({
      method: "GET",
      url: "/fee-profiles",
      headers: { "x-user-id": "user-a" },
    });
    const userAProfile = userAProfiles.json()[0];

    const patchA = await app.inject({
      method: "PATCH",
      url: `/fee-profiles/${userAProfile.id}`,
      headers: { "x-user-id": "user-a" },
      payload: {
        ...userAProfile,
        name: "User A Broker",
      },
    });
    expect(patchA.statusCode).toBe(200);

    const userBProfiles = await app.inject({
      method: "GET",
      url: "/fee-profiles",
      headers: { "x-user-id": "user-b" },
    });
    expect(userBProfiles.statusCode).toBe(200);
    expect(userBProfiles.json()[0].name).toBe("Default Broker");
  });

  it("does not partially apply settings/full when bindings are invalid", async () => {
    const settingsBefore = await app.inject({ method: "GET", url: "/settings" });
    const settingsBody = settingsBefore.json();
    const feeConfig = await app.inject({ method: "GET", url: "/settings/fee-config" });
    const feeConfigBody = feeConfig.json();

    const failedSave = await app.inject({
      method: "PUT",
      url: "/settings/full",
      payload: {
        settings: {
          locale: settingsBody.locale === "en" ? "zh-TW" : "en",
          costBasisMethod: settingsBody.costBasisMethod,
          quotePollIntervalSeconds: settingsBody.quotePollIntervalSeconds,
        },
        feeProfiles: feeConfigBody.feeProfiles.map((profile: { id: string } & Record<string, unknown>) => ({
          id: profile.id,
          ...profile,
        })),
        accounts: feeConfigBody.accounts.map((account: { id: string; feeProfileId: string }) => ({
          id: account.id,
          feeProfileRef: account.feeProfileId,
        })),
        feeProfileBindings: [
          {
            accountId: "acc-missing",
            symbol: "2330",
            feeProfileRef: feeConfigBody.feeProfiles[0].id,
          },
        ],
      },
    });

    expect(failedSave.statusCode).toBe(400);
    expect(failedSave.json().error).toBe("invalid_account");

    const settingsAfter = await app.inject({ method: "GET", url: "/settings" });
    expect(settingsAfter.statusCode).toBe(200);
    expect(settingsAfter.json()).toEqual(settingsBody);
  });

  it("does not partially apply ai confirm when one proposal fails", async () => {
    const confirm = await app.inject({
      method: "POST",
      url: "/ai/transactions/confirm",
      payload: {
        accountId: "acc-1",
        proposals: [
          {
            type: "BUY",
            symbol: "2330",
            quantity: 1,
            priceNtd: 100,
            tradeDate: "2026-01-01",
            isDayTrade: false,
          },
          {
            type: "BUY",
            symbol: "UNKNOWN",
            quantity: 1,
            priceNtd: 100,
            tradeDate: "2026-01-01",
            isDayTrade: false,
          },
        ],
      },
    });

    expect(confirm.statusCode).toBe(400);

    const transactions = await app.inject({ method: "GET", url: "/portfolio/transactions" });
    expect(transactions.statusCode).toBe(200);
    expect(transactions.json()).toEqual([]);
  });

  it("does not partially apply settings/fee-config when bindings are invalid", async () => {
    const before = await app.inject({ method: "GET", url: "/settings/fee-config" });
    const beforeBody = before.json();
    const account = beforeBody.accounts[0];

    const createdProfileResponse = await app.inject({
      method: "POST",
      url: "/fee-profiles",
      payload: {
        name: "Alt Profile",
        commissionRateBps: 1,
        commissionDiscountBps: 10000,
        minCommissionNtd: 0,
        commissionRoundingMode: "FLOOR",
        taxRoundingMode: "FLOOR",
        stockSellTaxRateBps: 30,
        stockDayTradeTaxRateBps: 15,
        etfSellTaxRateBps: 10,
        bondEtfSellTaxRateBps: 0,
      },
    });
    expect(createdProfileResponse.statusCode).toBe(200);
    const createdProfile = createdProfileResponse.json();

    const failedUpdate = await app.inject({
      method: "PUT",
      url: "/settings/fee-config",
      payload: {
        accounts: [
          {
            id: account.id,
            feeProfileId: createdProfile.id,
          },
        ],
        feeProfileBindings: [
          {
            accountId: "acc-missing",
            symbol: "2330",
            feeProfileId: createdProfile.id,
          },
        ],
      },
    });

    expect(failedUpdate.statusCode).toBe(400);
    expect(failedUpdate.json().error).toBe("invalid_account");

    const after = await app.inject({ method: "GET", url: "/settings/fee-config" });
    expect(after.statusCode).toBe(200);
    expect(after.json().accounts[0].feeProfileId).toBe(account.feeProfileId);
  });

  it("prevents deleting fee profiles referenced by historical transactions", async () => {
    const createdProfileResponse = await app.inject({
      method: "POST",
      url: "/fee-profiles",
      payload: {
        name: "Tx Profile",
        commissionRateBps: 2,
        commissionDiscountBps: 10000,
        minCommissionNtd: 0,
        commissionRoundingMode: "FLOOR",
        taxRoundingMode: "FLOOR",
        stockSellTaxRateBps: 30,
        stockDayTradeTaxRateBps: 15,
        etfSellTaxRateBps: 10,
        bondEtfSellTaxRateBps: 0,
      },
    });
    const profile = createdProfileResponse.json();

    const updateFeeConfig = await app.inject({
      method: "PUT",
      url: "/settings/fee-config",
      payload: {
        accounts: [{ id: "acc-1", feeProfileId: profile.id }],
        feeProfileBindings: [],
      },
    });
    expect(updateFeeConfig.statusCode).toBe(200);

    const txResponse = await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k-delete-in-use-profile" },
      payload: {
        accountId: "acc-1",
        symbol: "2330",
        quantity: 1,
        priceNtd: 100,
        tradeDate: "2026-01-01",
        type: "BUY",
        isDayTrade: false,
      },
    });
    expect(txResponse.statusCode).toBe(200);

    const restoreDefault = await app.inject({
      method: "PUT",
      url: "/settings/fee-config",
      payload: {
        accounts: [{ id: "acc-1", feeProfileId: "fp-default" }],
        feeProfileBindings: [],
      },
    });
    expect(restoreDefault.statusCode).toBe(200);

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/fee-profiles/${profile.id}`,
    });
    expect(deleteResponse.statusCode).toBe(409);
    expect(deleteResponse.json().error).toBe("fee_profile_in_use");
  });

  it("releases idempotency key when persistence fails", async () => {
    const originalSaveStore = app.persistence.saveStore.bind(app.persistence);
    let failOnce = true;
    app.persistence.saveStore = async (...args) => {
      if (failOnce) {
        failOnce = false;
        throw new Error("forced save failure");
      }
      return originalSaveStore(...args);
    };

    const first = await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k-save-fail" },
      payload: {
        accountId: "acc-1",
        symbol: "2330",
        quantity: 1,
        priceNtd: 100,
        tradeDate: "2026-01-01",
        type: "BUY",
        isDayTrade: false,
      },
    });
    expect(first.statusCode).toBe(500);

    const second = await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k-save-fail" },
      payload: {
        accountId: "acc-1",
        symbol: "2330",
        quantity: 1,
        priceNtd: 100,
        tradeDate: "2026-01-01",
        type: "BUY",
        isDayTrade: false,
      },
    });

    expect(second.statusCode).toBe(200);
  });

  it("recompute updates realized pnl on sell transactions", async () => {
    await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k-sell-1" },
      payload: {
        accountId: "acc-1",
        symbol: "2330",
        quantity: 10,
        priceNtd: 100,
        tradeDate: "2026-01-01",
        type: "BUY",
        isDayTrade: false,
      },
    });

    await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k-sell-2" },
      payload: {
        accountId: "acc-1",
        symbol: "2330",
        quantity: 5,
        priceNtd: 120,
        tradeDate: "2026-01-02",
        type: "SELL",
        isDayTrade: false,
      },
    });

    const createdProfileResponse = await app.inject({
      method: "POST",
      url: "/fee-profiles",
      payload: {
        name: "Zero Fee",
        commissionRateBps: 0,
        commissionDiscountBps: 10000,
        minCommissionNtd: 0,
        commissionRoundingMode: "FLOOR",
        taxRoundingMode: "FLOOR",
        stockSellTaxRateBps: 0,
        stockDayTradeTaxRateBps: 0,
        etfSellTaxRateBps: 0,
        bondEtfSellTaxRateBps: 0,
      },
    });
    expect(createdProfileResponse.statusCode).toBe(200);
    const createdProfile = createdProfileResponse.json();

    const before = await app.inject({ method: "GET", url: "/portfolio/transactions" });
    const beforeSell = before
      .json()
      .find((tx: { type: string; realizedPnlNtd?: number }) => tx.type === "SELL");

    expect(beforeSell).toBeDefined();

    const preview = await app.inject({
      method: "POST",
      url: "/portfolio/recompute/preview",
      payload: {
        profileId: createdProfile.id,
      },
    });

    const previewBody = preview.json();

    await app.inject({
      method: "POST",
      url: "/portfolio/recompute/confirm",
      payload: { jobId: previewBody.id },
    });

    const after = await app.inject({ method: "GET", url: "/portfolio/transactions" });
    const afterSell = after
      .json()
      .find((tx: { type: string; realizedPnlNtd?: number }) => tx.type === "SELL");

    expect(afterSell).toBeDefined();
    expect(afterSell.realizedPnlNtd).not.toBe(beforeSell.realizedPnlNtd);
  });

  it("applies per-symbol fee profile override before account fallback", async () => {
    const settings = await app.inject({ method: "GET", url: "/settings" });
    const settingsBody = settings.json();
    const feeConfig = await app.inject({ method: "GET", url: "/settings/fee-config" });
    const feeConfigBody = feeConfig.json();

    const createdProfileResponse = await app.inject({
      method: "POST",
      url: "/fee-profiles",
      payload: {
        name: "Zero Fee Override",
        commissionRateBps: 0,
        commissionDiscountBps: 10000,
        minCommissionNtd: 0,
        commissionRoundingMode: "FLOOR",
        taxRoundingMode: "FLOOR",
        stockSellTaxRateBps: 0,
        stockDayTradeTaxRateBps: 0,
        etfSellTaxRateBps: 0,
        bondEtfSellTaxRateBps: 0,
      },
    });
    const createdProfile = createdProfileResponse.json();

    const saveFull = await app.inject({
      method: "PUT",
      url: "/settings/full",
      payload: {
        settings: {
          locale: settingsBody.locale,
          costBasisMethod: settingsBody.costBasisMethod,
          quotePollIntervalSeconds: settingsBody.quotePollIntervalSeconds,
        },
        feeProfiles: [
          ...feeConfigBody.feeProfiles.map((profile: { id: string } & Record<string, unknown>) => ({
            id: profile.id,
            ...profile,
          })),
          { id: createdProfile.id, ...createdProfile },
        ],
        accounts: feeConfigBody.accounts.map((account: { id: string; feeProfileId: string }) => ({
          id: account.id,
          feeProfileRef: account.feeProfileId,
        })),
        feeProfileBindings: [
          {
            accountId: feeConfigBody.accounts[0].id,
            symbol: "2330",
            feeProfileRef: createdProfile.id,
          },
        ],
      },
    });
    expect(saveFull.statusCode).toBe(200);

    const createResponse = await app.inject({
      method: "POST",
      url: "/portfolio/transactions",
      headers: { "idempotency-key": "k-override-fee" },
      payload: {
        accountId: feeConfigBody.accounts[0].id,
        symbol: "2330",
        quantity: 1,
        priceNtd: 100,
        tradeDate: "2026-01-01",
        type: "BUY",
        isDayTrade: false,
      },
    });

    expect(createResponse.statusCode).toBe(200);
    const tx = createResponse.json();
    expect(tx.commissionNtd).toBe(0);
    expect(tx.feeSnapshot.id).toBe(createdProfile.id);
  });

  it("generates profile UUIDs from temp IDs in settings full-save flow", async () => {
    const settings = await app.inject({ method: "GET", url: "/settings" });
    const settingsBody = settings.json();
    const feeConfig = await app.inject({ method: "GET", url: "/settings/fee-config" });
    const feeConfigBody = feeConfig.json();

    const saveFull = await app.inject({
      method: "PUT",
      url: "/settings/full",
      payload: {
        settings: {
          locale: settingsBody.locale,
          costBasisMethod: settingsBody.costBasisMethod,
          quotePollIntervalSeconds: settingsBody.quotePollIntervalSeconds,
        },
        feeProfiles: [
          ...feeConfigBody.feeProfiles.map((profile: { id: string } & Record<string, unknown>) => ({
            id: profile.id,
            ...profile,
          })),
          {
            tempId: "tmp-new-profile",
            name: "Temp Profile",
            commissionRateBps: 14,
            commissionDiscountBps: 10000,
            minCommissionNtd: 20,
            commissionRoundingMode: "FLOOR",
            taxRoundingMode: "FLOOR",
            stockSellTaxRateBps: 30,
            stockDayTradeTaxRateBps: 15,
            etfSellTaxRateBps: 10,
            bondEtfSellTaxRateBps: 0,
          },
        ],
        accounts: feeConfigBody.accounts.map((account: { id: string }, index: number) => ({
          id: account.id,
          feeProfileRef: index === 0 ? "tmp-new-profile" : feeConfigBody.accounts[index].feeProfileId,
        })),
        feeProfileBindings: [],
      },
    });

    expect(saveFull.statusCode).toBe(200);
    const body = saveFull.json();
    const firstAccount = body.accounts[0];
    expect(firstAccount.feeProfileId).not.toBe("tmp-new-profile");

    const linkedProfile = body.feeProfiles.find((profile: { id: string }) => profile.id === firstAccount.feeProfileId);
    expect(linkedProfile).toBeDefined();
    expect(firstAccount.feeProfileId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
