import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadDotEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_MODE: z.enum(["oauth", "dev_bypass"]).default("dev_bypass"),
  PERSISTENCE_BACKEND: z.enum(["postgres", "memory"]).default("postgres"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_PORT: z.coerce.number().int().positive().default(3000),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  DB_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  DATA_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  ALLOWED_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_MUTATIONS: z.coerce.number().int().positive().default(120),
});

export const env = envSchema.parse(process.env);

export function validatePortConflicts(): void {
  const ports = [env.API_PORT, env.WEB_PORT, env.DB_PORT, env.REDIS_PORT];
  const unique = new Set(ports);
  if (unique.size !== ports.length) {
    throw new Error("Port conflict detected in env configuration");
  }

  if (env.NODE_ENV !== "development" && env.AUTH_MODE === "dev_bypass") {
    throw new Error("AUTH_MODE=dev_bypass is only allowed in development");
  }
}

export function getDatabaseUrl(): string {
  return env.DB_URL ?? `postgres://app:app@127.0.0.1:${env.DB_PORT}/tw_portfolio`;
}

export function getRedisUrl(): string {
  return env.REDIS_URL ?? `redis://127.0.0.1:${env.REDIS_PORT}`;
}

export function getAllowedOrigins(): string[] {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadDotEnv(): void {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const dotenvPath = path.resolve(currentDir, "../../../../.env");
  if (!fs.existsSync(dotenvPath)) return;

  const raw = fs.readFileSync(dotenvPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
