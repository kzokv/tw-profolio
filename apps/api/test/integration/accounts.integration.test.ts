import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { feeProfilePayload } from "../helpers/fixtures.js";

let app: Awaited<ReturnType<typeof buildApp>>;

describe("accounts", () => {
  beforeEach(async () => {
    app = await buildApp({ persistenceBackend: "memory" });
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("lists seeded accounts and allows PATCH for name and feeProfileId", async () => {
    const listResponse = await app.inject({ method: "GET", url: "/accounts" });
    expect(listResponse.statusCode).toBe(200);
    const accounts = listResponse.json();
    expect(Array.isArray(accounts)).toBe(true);
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    const acc = accounts[0];
    expect(acc.id).toBe("acc-1");
    expect(acc.name).toBe("Main");
    expect(acc.feeProfileId).toBe("fp-default");

    const createdProfileResponse = await app.inject({
      method: "POST",
      url: "/fee-profiles",
      payload: feeProfilePayload({ name: "Alt" }),
    });
    const newProfile = createdProfileResponse.json();

    const patchResponse = await app.inject({
      method: "PATCH",
      url: "/accounts/acc-1",
      payload: { name: "Primary", feeProfileId: newProfile.id },
    });
    expect(patchResponse.statusCode).toBe(200);
    const updated = patchResponse.json();
    expect(updated.name).toBe("Primary");
    expect(updated.feeProfileId).toBe(newProfile.id);

    const afterGet = await app.inject({ method: "GET", url: "/settings/fee-config" });
    expect(afterGet.statusCode).toBe(200);
    const feeConfig = afterGet.json();
    const accountInConfig = feeConfig.accounts.find((a: { id: string }) => a.id === "acc-1");
    expect(accountInConfig.feeProfileId).toBe(newProfile.id);
  });
});
