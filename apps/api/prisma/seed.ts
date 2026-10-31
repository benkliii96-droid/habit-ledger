import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(rootDir, ".env") });

const prisma = new PrismaClient();

async function main() {
  const email = "demo@habitledger.ru";
  const passwordHash = await bcrypt.hash("demo12345", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Демо", passwordHash },
    create: {
      email,
      name: "Демо",
      passwordHash,
    },
  });

  await prisma.checkIn.deleteMany({
    where: { habit: { userId: user.id } },
  });
  await prisma.habit.deleteMany({ where: { userId: user.id } });

  const habits = await Promise.all([
    prisma.habit.create({
      data: {
        userId: user.id,
        title: "Утренняя зарядка",
        description: "10 минут без телефона",
        color: "#C8F54B",
        icon: "sun",
        debt: 1,
      },
    }),
    prisma.habit.create({
      data: {
        userId: user.id,
        title: "Чтение",
        description: "20 страниц",
        color: "#7DD3FC",
        icon: "book",
        debt: 0,
      },
    }),
    prisma.habit.create({
      data: {
        userId: user.id,
        title: "Без сахара",
        description: "День без сладкого",
        color: "#F9A8D4",
        icon: "leaf",
        debt: 2,
      },
    }),
  ]);

  const today = new Date();
  for (const habit of habits) {
    for (let i = 1; i <= 5; i++) {
      const d = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i),
      );
      await prisma.checkIn.create({
        data: {
          habitId: habit.id,
          date: d,
          status: i === 3 ? "skipped" : "done",
        },
      });
    }
  }

  console.log("Seed OK");
  console.log(`  email: ${email}`);
  console.log("  password: demo12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
