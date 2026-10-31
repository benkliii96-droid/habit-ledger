import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { generateCodeVerifier, generateState } from "arctic";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Env } from "../../lib/env.js";
import { oauthConfigured } from "../../lib/env.js";
import { prisma } from "../../lib/prisma.js";
import {
  clearSessionCookie,
  createSession,
  publicUser,
  setSessionCookie,
} from "../../lib/session.js";
import { requireUser } from "../../plugins/auth.js";
import {
  createOAuthClients,
  fetchGoogleProfile,
  fetchYandexProfile,
  type OAuthProfile,
} from "./oauth.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const passwordSchema = z.object({
  password: z.string().min(8).max(128),
});

type OAuthCookieState = {
  state: string;
  codeVerifier?: string;
  mode: "login" | "link";
};

function encodeState(payload: OAuthCookieState) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeState(raw: string | undefined): OAuthCookieState | null {
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthCookieState;
  } catch {
    return null;
  }
}

async function upsertOAuthUser(profile: OAuthProfile) {
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      },
    },
    include: { user: { include: { accounts: true } } },
  });

  if (existingAccount) {
    return existingAccount.user;
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: profile.email },
    include: { accounts: true },
  });

  if (byEmail) {
    await prisma.oAuthAccount.create({
      data: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        userId: byEmail.id,
      },
    });
    return prisma.user.findUniqueOrThrow({
      where: { id: byEmail.id },
      include: { accounts: true },
    });
  }

  return prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      accounts: {
        create: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
    },
    include: { accounts: true },
  });
}

export async function authRoutes(app: FastifyInstance, env: Env) {
  const oauth = createOAuthClients(env);

  app.get("/auth/providers", async () => ({
    email: true,
    ...oauth.configured,
  }));

  app.get("/auth/me", async (request) => {
    if (!request.user) return { user: null };
    return { user: publicUser(request.user) };
  });

  app.post("/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const email = body.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return reply.code(409).send({ error: "Email уже зарегистрирован" });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: body.name ?? email.split("@")[0],
        passwordHash,
      },
      include: { accounts: true },
    });

    const session = await createSession(user.id);
    setSessionCookie(reply, env, session.token, session.expiresAt);
    return { user: publicUser(user) };
  });

  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { accounts: true },
    });

    if (!user?.passwordHash) {
      return reply.code(401).send({
        error: "Неверный email или пароль. Возможно, вход через Google/Yandex.",
      });
    }

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: "Неверный email или пароль" });
    }

    const session = await createSession(user.id);
    setSessionCookie(reply, env, session.token, session.expiresAt);
    return { user: publicUser(user) };
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = request.cookies.hl_session;
    if (token) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await prisma.session.deleteMany({ where: { tokenHash } });
    }
    clearSessionCookie(reply, env);
    return { ok: true };
  });

  app.post("/auth/password", async (request, reply) => {
    const user = await requireUser(request);
    const body = passwordSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
      include: { accounts: true },
    });
    return { user: publicUser(updated) };
  });

  async function startOAuth(
    provider: "google" | "yandex",
    mode: "login" | "link",
    reply: Parameters<FastifyInstance["get"]>[0] extends never ? never : import("fastify").FastifyReply,
  ) {
    const configured = oauthConfigured(env)[provider];
    if (!configured) {
      return reply.code(503).send({
        error: `Провайдер ${provider} не настроен. Добавьте ключи в .env`,
      });
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const cookiePayload = encodeState({ state, codeVerifier, mode });

    reply.setCookie(`oauth_${provider}`, cookiePayload, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.COOKIE_SECURE,
      maxAge: 60 * 10,
    });

    if (provider === "google" && oauth.google) {
      const url = oauth.google.createAuthorizationURL(state, codeVerifier, [
        "openid",
        "email",
        "profile",
      ]);
      return reply.redirect(url.toString());
    }

    if (provider === "yandex" && oauth.yandex) {
      const url = oauth.yandex.createAuthorizationURL(state, codeVerifier, [
        "login:email",
        "login:info",
        "login:avatar",
      ]);
      return reply.redirect(url.toString());
    }

    return reply.code(503).send({ error: "OAuth недоступен" });
  }

  app.get("/auth/google", async (request, reply) => {
    const mode = (request.query as { mode?: string }).mode === "link" ? "link" : "login";
    if (mode === "link") await requireUser(request);
    return startOAuth("google", mode, reply);
  });

  app.get("/auth/yandex", async (request, reply) => {
    const mode = (request.query as { mode?: string }).mode === "link" ? "link" : "login";
    if (mode === "link") await requireUser(request);
    return startOAuth("yandex", mode, reply);
  });

  app.get("/auth/google/callback", async (request, reply) => {
    return handleCallback("google", request, reply);
  });

  app.get("/auth/yandex/callback", async (request, reply) => {
    return handleCallback("yandex", request, reply);
  });

  async function handleCallback(
    provider: "google" | "yandex",
    request: import("fastify").FastifyRequest,
    reply: import("fastify").FastifyReply,
  ) {
    const query = request.query as { code?: string; state?: string; error?: string };
    if (query.error || !query.code || !query.state) {
      return reply.redirect(`${env.WEB_ORIGIN}/login?error=oauth_denied`);
    }

    const stored = decodeState(request.cookies[`oauth_${provider}`]);
    reply.clearCookie(`oauth_${provider}`, { path: "/" });

    if (!stored || stored.state !== query.state || !stored.codeVerifier) {
      return reply.redirect(`${env.WEB_ORIGIN}/login?error=oauth_state`);
    }

    try {
      let profile: OAuthProfile;

      if (provider === "google" && oauth.google) {
        const tokens = await oauth.google.validateAuthorizationCode(
          query.code,
          stored.codeVerifier,
        );
        profile = await fetchGoogleProfile(tokens.accessToken());
      } else if (provider === "yandex" && oauth.yandex) {
        const tokens = await oauth.yandex.validateAuthorizationCode(
          query.code,
          stored.codeVerifier,
        );
        profile = await fetchYandexProfile(tokens.accessToken());
      } else {
        return reply.redirect(`${env.WEB_ORIGIN}/login?error=oauth_config`);
      }

      if (stored.mode === "link") {
        const user = await requireUser(request);
        const clash = await prisma.oAuthAccount.findUnique({
          where: {
            provider_providerUserId: {
              provider: profile.provider,
              providerUserId: profile.providerUserId,
            },
          },
        });
        if (clash && clash.userId !== user.id) {
          return reply.redirect(`${env.WEB_ORIGIN}/settings?error=oauth_taken`);
        }
        if (!clash) {
          await prisma.oAuthAccount.create({
            data: {
              provider: profile.provider,
              providerUserId: profile.providerUserId,
              userId: user.id,
            },
          });
        }
        return reply.redirect(`${env.WEB_ORIGIN}/settings?linked=${provider}`);
      }

      const user = await upsertOAuthUser(profile);
      const session = await createSession(user.id);
      setSessionCookie(reply, env, session.token, session.expiresAt);
      return reply.redirect(`${env.WEB_ORIGIN}/app`);
    } catch (err) {
      app.log.error(err);
      return reply.redirect(`${env.WEB_ORIGIN}/login?error=oauth_failed`);
    }
  }

  app.delete("/auth/providers/:provider", async (request, reply) => {
    const user = await requireUser(request);
    const provider = (request.params as { provider: string }).provider;
    if (provider !== "google" && provider !== "yandex") {
      return reply.code(400).send({ error: "Неизвестный провайдер" });
    }

    const full = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { accounts: true },
    });

    const methods =
      (full.passwordHash ? 1 : 0) + full.accounts.length;
    const hasThis = full.accounts.some((a) => a.provider === provider);
    if (!hasThis) {
      return reply.code(404).send({ error: "Провайдер не привязан" });
    }
    if (methods <= 1) {
      return reply.code(400).send({
        error: "Нельзя отвязать единственный способ входа",
      });
    }

    await prisma.oAuthAccount.deleteMany({
      where: { userId: user.id, provider },
    });

    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { accounts: true },
    });
    return { user: publicUser(updated) };
  });
}
