import { defineConfig } from "@playwright/test";

const webPort = Number(process.env.WEB_PORT ?? 3333);
const apiPort = Number(process.env.API_PORT ?? 4000);

export default defineConfig({
  testDir: "./specs",
  timeout: 45_000,
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
  },
  webServer: [
    {
      command: "npm run dev -w apps/api",
      cwd: "../..",
      url: `http://127.0.0.1:${apiPort}/health/live`,
      timeout: 60_000,
      reuseExistingServer: true,
      env: {
        API_PORT: String(apiPort),
        WEB_PORT: String(webPort),
        AUTH_MODE: "dev_bypass",
        NODE_ENV: "development",
        PERSISTENCE_BACKEND: "memory",
      },
    },
    {
      command: "npm run dev -w apps/web",
      cwd: "../..",
      url: `http://127.0.0.1:${webPort}`,
      timeout: 90_000,
      reuseExistingServer: true,
      env: {
        API_PORT: String(apiPort),
        WEB_PORT: String(webPort),
        NEXT_PUBLIC_API_BASE_URL: `http://127.0.0.1:${apiPort}`,
      },
    },
  ],
});
