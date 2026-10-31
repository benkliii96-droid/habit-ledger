import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { loadEnv } from "./lib/env.js";

const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(rootDir, ".env") });
config({ path: resolve(rootDir, "apps/api/.env") });

const env = loadEnv();
const app = await buildApp(env);

try {
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
