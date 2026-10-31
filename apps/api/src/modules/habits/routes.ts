import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DEBT_CLEAR_EVERY, computeStreak } from "../../lib/habits.js";
import { prisma } from "../../lib/prisma.js";
import { requireUser } from "../../plugins/auth.js";

const habitBody = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(280).optional().nullable(),
  color: z.string().min(4).max(32).optional(),
  icon: z.string().min(1).max(32).optional(),
  frequency: z.enum(["daily", "weekly"]).optional(),
  timesPerWeek: z.number().int().min(1).max(7).optional(),
});

const checkInBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["done", "skipped"]),
  note: z.string().max(280).optional().nullable(),
});

function parseDateOnly(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function serializeHabit(
  habit: Awaited<ReturnType<typeof loadHabit>>,
  today = new Date(),
) {
  if (!habit) return null;
  const streaks = computeStreak(habit.checkIns, today);
  const todayKey = today.toISOString().slice(0, 10);
  const todayCheckIn = habit.checkIns.find(
    (c) => new Date(c.date).toISOString().slice(0, 10) === todayKey,
  );
  const monthStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );
  const doneThisMonth = habit.checkIns.filter(
    (c) => c.status === "done" && new Date(c.date) >= monthStart,
  ).length;
  const daysPassed = today.getUTCDate();
  return {
    id: habit.id,
    title: habit.title,
    description: habit.description,
    color: habit.color,
    icon: habit.icon,
    frequency: habit.frequency,
    timesPerWeek: habit.timesPerWeek,
    debt: habit.debt,
    archivedAt: habit.archivedAt,
    createdAt: habit.createdAt,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    todayStatus: todayCheckIn?.status ?? null,
    completionRateMonth: daysPassed
      ? Math.round((doneThisMonth / daysPassed) * 100)
      : 0,
    checkIns: habit.checkIns.map((c) => ({
      id: c.id,
      date: new Date(c.date).toISOString().slice(0, 10),
      status: c.status,
      note: c.note,
    })),
  };
}

async function loadHabit(userId: string, habitId: string) {
  return prisma.habit.findFirst({
    where: { id: habitId, userId, archivedAt: null },
    include: {
      checkIns: { orderBy: { date: "desc" }, take: 400 },
    },
  });
}

export async function habitRoutes(app: FastifyInstance) {
  app.get("/habits", async (request) => {
    const user = await requireUser(request);
    const habits = await prisma.habit.findMany({
      where: { userId: user.id, archivedAt: null },
      include: { checkIns: { orderBy: { date: "desc" }, take: 400 } },
      orderBy: { createdAt: "asc" },
    });
    return { habits: habits.map((h) => serializeHabit(h)) };
  });

  app.post("/habits", async (request, reply) => {
    const user = await requireUser(request);
    const body = habitBody.parse(request.body);
    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        title: body.title,
        description: body.description ?? null,
        color: body.color ?? "#C8F54B",
        icon: body.icon ?? "flame",
        frequency: body.frequency ?? "daily",
        timesPerWeek: body.timesPerWeek ?? 7,
      },
      include: { checkIns: true },
    });
    return reply.code(201).send({ habit: serializeHabit(habit) });
  });

  app.get("/habits/:id", async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const habit = await loadHabit(user.id, id);
    if (!habit) return reply.code(404).send({ error: "Привычка не найдена" });
    return { habit: serializeHabit(habit) };
  });

  app.patch("/habits/:id", async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const body = habitBody.partial().parse(request.body);
    const existing = await prisma.habit.findFirst({
      where: { id, userId: user.id, archivedAt: null },
    });
    if (!existing) return reply.code(404).send({ error: "Привычка не найдена" });

    const habit = await prisma.habit.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        color: body.color,
        icon: body.icon,
        frequency: body.frequency,
        timesPerWeek: body.timesPerWeek,
      },
      include: { checkIns: { orderBy: { date: "desc" }, take: 400 } },
    });
    return { habit: serializeHabit(habit) };
  });

  app.delete("/habits/:id", async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const existing = await prisma.habit.findFirst({
      where: { id, userId: user.id, archivedAt: null },
    });
    if (!existing) return reply.code(404).send({ error: "Привычка не найдена" });
    await prisma.habit.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return { ok: true };
  });

  app.post("/habits/:id/check-ins", async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const body = checkInBody.parse(request.body);
    const habit = await loadHabit(user.id, id);
    if (!habit) return reply.code(404).send({ error: "Привычка не найдена" });

    const date = parseDateOnly(body.date);
    const existing = habit.checkIns.find(
      (c) => new Date(c.date).toISOString().slice(0, 10) === body.date,
    );

    let debt = habit.debt;
    if (!existing) {
      if (body.status === "skipped") {
        debt += 1;
      } else if (body.status === "done" && debt > 0) {
        const recentDones = habit.checkIns
          .filter((c) => c.status === "done")
          .slice(0, DEBT_CLEAR_EVERY - 1).length;
        // after this done, count consecutive recent dones toward clear
        if (recentDones + 1 >= DEBT_CLEAR_EVERY) {
          debt = Math.max(0, debt - 1);
        }
      }
    }

    const checkIn = await prisma.checkIn.upsert({
      where: { habitId_date: { habitId: id, date } },
      create: {
        habitId: id,
        date,
        status: body.status,
        note: body.note ?? null,
      },
      update: {
        status: body.status,
        note: body.note ?? null,
      },
    });

    if (!existing) {
      await prisma.habit.update({ where: { id }, data: { debt } });
    }

    const refreshed = await loadHabit(user.id, id);
    return {
      checkIn: {
        id: checkIn.id,
        date: body.date,
        status: checkIn.status,
        note: checkIn.note,
      },
      habit: serializeHabit(refreshed),
    };
  });

  app.get("/stats/overview", async (request) => {
    const user = await requireUser(request);
    const habits = await prisma.habit.findMany({
      where: { userId: user.id, archivedAt: null },
      include: { checkIns: { orderBy: { date: "desc" }, take: 400 } },
    });
    const serialized = habits.map((h) => serializeHabit(h)!);
    const totalDebt = serialized.reduce((s, h) => s + h.debt, 0);
    const bestStreak = serialized.reduce(
      (s, h) => Math.max(s, h.currentStreak),
      0,
    );
    const checkedToday = serialized.filter((h) => h.todayStatus === "done").length;
    return {
      habitsCount: serialized.length,
      checkedToday,
      bestStreak,
      totalDebt,
      habits: serialized,
    };
  });
}
