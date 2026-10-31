import { createHash, randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";
import type { Env } from "./env.js";

export const SESSION_COOKIE = "hl_session";
const SESSION_DAYS = 30;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export function setSessionCookie(
  reply: FastifyReply,
  env: Env,
  token: string,
  expiresAt: Date,
) {
  reply.setCookie(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply, env: Env) {
  reply.clearCookie(SESSION_COOKIE, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
  });
}

export async function getSessionUser(request: FastifyRequest) {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: { accounts: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return session.user;
}

export function publicUser(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  accounts: { provider: string }[];
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    hasPassword: Boolean(user.passwordHash),
    providers: user.accounts.map((a) => a.provider),
  };
}
