import { Google, Yandex } from "arctic";
import type { Env } from "../../lib/env.js";
import { oauthConfigured } from "../../lib/env.js";

export function createOAuthClients(env: Env) {
  const configured = oauthConfigured(env);

  const google = configured.google
    ? new Google(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_CALLBACK_URL,
      )
    : null;

  const yandex = configured.yandex
    ? new Yandex(
        env.YANDEX_CLIENT_ID,
        env.YANDEX_CLIENT_SECRET,
        env.YANDEX_CALLBACK_URL,
      )
    : null;

  return { google, yandex, configured };
}

export type OAuthProfile = {
  provider: "google" | "yandex";
  providerUserId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
};

export async function fetchGoogleProfile(
  accessToken: string,
): Promise<OAuthProfile> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Google profile fetch failed");
  const data = (await res.json()) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };
  return {
    provider: "google",
    providerUserId: data.sub,
    email: data.email.toLowerCase(),
    name: data.name ?? null,
    avatarUrl: data.picture ?? null,
  };
}

export async function fetchYandexProfile(
  accessToken: string,
): Promise<OAuthProfile> {
  const res = await fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (!res.ok) throw new Error("Yandex profile fetch failed");
  const data = (await res.json()) as {
    id: string;
    default_email?: string;
    emails?: string[];
    real_name?: string;
    display_name?: string;
    default_avatar_id?: string;
    is_avatar_empty?: boolean;
  };
  const email = (data.default_email || data.emails?.[0] || "").toLowerCase();
  if (!email) throw new Error("Yandex account has no email");
  const avatarUrl =
    data.default_avatar_id && !data.is_avatar_empty
      ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200`
      : null;
  return {
    provider: "yandex",
    providerUserId: String(data.id),
    email,
    name: data.real_name || data.display_name || null,
    avatarUrl,
  };
}
