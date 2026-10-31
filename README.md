# HabitLedger

Дневник привычек: стрики, долг за пропуски, вход через email / Google / Яндекс ID.

## Стек

- **web** — React + Vite + TypeScript
- **api** — Fastify + Prisma + PostgreSQL
- Auth: сессии в httpOnly cookie, OAuth через Arctic (Google + Yandex)

## Быстрый старт

### 1. База данных

Нужен PostgreSQL. Самый простой путь — Docker:

```bash
docker compose up -d
```

Либо локальный Postgres с БД/пользователем из `.env.example` (`habit` / `habit` / `habit_ledger`).

### 2. Установка

```bash
cp .env.example .env
npm install
npm run db:generate -w @habit-ledger/api
npm run db:push -w @habit-ledger/api
npm run db:seed -w @habit-ledger/api
```

### 3. Запуск

```bash
npm run dev:api
npm run dev:web
```

- Приложение: http://localhost:5173  
- API: http://localhost:4000  
- Демо: `demo@habitledger.ru` / `demo12345`

## OAuth

1. **Google** — [Google Cloud Console](https://console.cloud.google.com/apis/credentials): OAuth client, redirect `http://localhost:4000/auth/google/callback`
2. **Яндекс ID** — [oauth.yandex.ru](https://oauth.yandex.ru/): callback `http://localhost:4000/auth/yandex/callback`, права `login:email`, `login:info`, `login:avatar`

Пропиши `GOOGLE_*` и `YANDEX_*` в `.env`. Без ключей кнопки показывают понятную ошибку настройки.

## Структура

```
apps/
  api/     Fastify API, Prisma, auth, habits
  web/     React UI
docker-compose.yml
```

## Продуктовые правила

- Чекин идемпотентен на дату
- Пропуск увеличивает `debt`
- Каждые 3 успешных чекина гасят 1 очко долга
- Нельзя отвязать единственный способ входа
