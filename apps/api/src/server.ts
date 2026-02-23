import { buildApp } from "./app.js";
import { env, validatePortConflicts } from "./config/env.js";

async function start() {
  validatePortConflicts();
  const app = await buildApp();
  await app.listen({ host: "0.0.0.0", port: env.API_PORT });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
