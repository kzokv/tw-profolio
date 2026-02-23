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
