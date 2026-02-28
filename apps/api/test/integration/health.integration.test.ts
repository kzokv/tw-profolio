import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";

let app: Awaited<ReturnType<typeof buildApp>>;

describe("health", () => {
  beforeEach(async () => {
    app = await buildApp({ persistenceBackend: "memory" });
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("exposes liveness and readiness with expected shape", async () => {
    const live = await app.inject({ method: "GET", url: "/health/live" });
    expect(live.statusCode).toBe(200);
    expect(live.json()).toEqual({ status: "ok" });

    const ready = await app.inject({ method: "GET", url: "/health/ready" });
    expect(ready.statusCode).toBe(200);
    const readyBody = ready.json();
    expect(readyBody.status).toBe("ready");
    expect(readyBody.dependencies).toBeDefined();
    expect(readyBody.dependencies.postgres).toBe(true);
    expect(readyBody.dependencies.redis).toBe(true);
  });
});
