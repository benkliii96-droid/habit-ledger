import type { CheckIn, Habit } from "@prisma/client";

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function computeStreak(checkIns: CheckIn[], today = new Date()) {
  const done = new Set(
    checkIns
      .filter((c) => c.status === "done")
      .map((c) => toDateKey(new Date(c.date))),
  );

  let streak = 0;
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  // If today not done yet, start from yesterday for "current streak still alive"
  if (!done.has(toDateKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (done.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const sorted = [...done].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    if (!prev) {
      run = 1;
    } else {
      const prevDate = new Date(prev + "T00:00:00.000Z");
      const curDate = new Date(key + "T00:00:00.000Z");
      const diff = (curDate.getTime() - prevDate.getTime()) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
    prev = key;
  }

  return { currentStreak: streak, longestStreak: Math.max(longest, streak) };
}

export function applyDebtRules(
  habit: Habit,
  status: "done" | "skipped",
  alreadyExists: boolean,
) {
  if (alreadyExists) return habit.debt;
  if (status === "skipped") return habit.debt + 1;
  // 3 successful days extinguish 1 debt point
  // debt reduction happens when streak milestones hit — simplified: each done with debt>0 after 1 done reduces? 
  // Spec: N successful days extinguish 1 debt. Use N=3 stored as constant.
  if (habit.debt <= 0) return 0;
  // temporary: reduce by chance of completion counter stored externally — handled in route with consecutive dones
  return habit.debt;
}

export const DEBT_CLEAR_EVERY = 3;
