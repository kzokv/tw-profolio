import "fastify";
import type { Persistence } from "../persistence/types.js";

declare module "fastify" {
  interface FastifyInstance {
    persistence: Persistence;
  }
}
