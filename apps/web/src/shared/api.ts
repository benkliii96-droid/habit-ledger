const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  hasPassword: boolean;
  providers: Array<"google" | "yandex">;
};

export type Habit = {
  id: string;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  frequency: "daily" | "weekly";
  timesPerWeek: number;
  debt: number;
  currentStreak: number;
  longestStreak: number;
  todayStatus: "done" | "skipped" | null;
  completionRateMonth: number;
  checkIns: Array<{
    id: string;
    date: string;
    status: "done" | "skipped";
    note: string | null;
  }>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Ошибка запроса");
  }
  return data as T;
}

export const api = {
  providers: () =>
    request<{ email: boolean; google: boolean; yandex: boolean }>("/auth/providers"),
  me: () => request<{ user: PublicUser | null }>("/auth/me"),
  register: (body: { email: string; password: string; name?: string }) =>
    request<{ user: PublicUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ user: PublicUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  setPassword: (password: string) =>
    request<{ user: PublicUser }>("/auth/password", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  unlinkProvider: (provider: "google" | "yandex") =>
    request<{ user: PublicUser }>(`/auth/providers/${provider}`, {
      method: "DELETE",
    }),
  habits: () => request<{ habits: Habit[] }>("/habits"),
  createHabit: (body: {
    title: string;
    description?: string;
    color?: string;
    icon?: string;
  }) =>
    request<{ habit: Habit }>("/habits", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  checkIn: (id: string, body: { date: string; status: "done" | "skipped"; note?: string }) =>
    request<{ habit: Habit }>(`/habits/${id}/check-ins`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  archiveHabit: (id: string) =>
    request<{ ok: boolean }>(`/habits/${id}`, { method: "DELETE" }),
  overview: () =>
    request<{
      habitsCount: number;
      checkedToday: number;
      bestStreak: number;
      totalDebt: number;
      habits: Habit[];
    }>("/stats/overview"),
  oauthUrl: (provider: "google" | "yandex", mode: "login" | "link" = "login") =>
    `${API_URL}/auth/${provider}?mode=${mode}`,
};
