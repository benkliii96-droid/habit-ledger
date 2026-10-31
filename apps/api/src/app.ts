import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { ZodError } from "zod";
import type { Env } from "./lib/env.js";
import { authRoutes } from "./modules/auth/routes.js";
import { habitRoutes } from "./modules/habits/routes.js";
import { registerAuthPlugin } from "./plugins/auth.js";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: true,
  });

  await app.register(sensible);
  await app.register(cookie, {
    secret: env.SESSION_SECRET,
  });
  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  await registerAuthPlugin(app);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Некорректные данные",
        details: error.flatten(),
      });
    }
    const statusCode =
      "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    if (statusCode >= 500) app.log.error(error);
    return reply.code(statusCode).send({
      error: error.message || "Внутренняя ошибка",
    });
  });

  app.get("/health", async () => ({ ok: true, service: "habit-ledger-api" }));

  await authRoutes(app, env);
  await habitRoutes(app);

  return app;
}
