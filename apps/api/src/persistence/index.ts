import { env, getDatabaseUrl, getRedisUrl } from "../config/env.js";
import { MemoryPersistence } from "./memory.js";
import { PostgresPersistence } from "./postgres.js";
import type { Persistence } from "./types.js";

export function createPersistence(backend: "postgres" | "memory" = env.PERSISTENCE_BACKEND): Persistence {
  if (backend === "memory") {
    return new MemoryPersistence();
  }

  return new PostgresPersistence({
    databaseUrl: getDatabaseUrl(),
    redisUrl: getRedisUrl(),
  });
}
