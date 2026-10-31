import type { FastifyInstance, FastifyRequest } from "fastify";
import { getSessionUser } from "../lib/session.js";

declare module "fastify" {
  interface FastifyRequest {
    user: Awaited<ReturnType<typeof getSessionUser>>;
  }
}

export async function registerAuthPlugin(app: FastifyInstance) {
  app.decorateRequest("user", null);

  app.addHook("preHandler", async (request: FastifyRequest) => {
    request.user = await getSessionUser(request);
  });
}

export async function requireUser(request: FastifyRequest) {
  if (!request.user) {
    const err = new Error("Нужна авторизация") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }
  return request.user;
}
