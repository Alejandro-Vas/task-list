# task-list

Fullstack TypeScript-монорепозиторий: Next.js + NestJS + Prisma + BullMQ.

## Стек

| Слой | Технология |
| --- | --- |
| Монорепо | Turborepo 2 + Yarn 1 workspaces |
| Frontend | Next.js 16 (App Router, RSC) + React 19 |
| Backend | NestJS 12 + Express |
| БД | PostgreSQL 16 + Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Очереди | BullMQ 6 + Redis 7 |
| Валидация | Zod 4 (общие схемы в `packages/shared`) |

## Структура

```
task-list/
├── apps/
│   ├── web/       # Next.js: RSC-страница со списком задач и формой создания
│   ├── api/       # NestJS: REST API, Prisma, постановка задач в BullMQ
│   └── worker/    # BullMQ-воркер: обработка фоновых задач
├── packages/
│   ├── db/        # Prisma schema, миграции, seed, клиент с pg-адаптером
│   └── shared/    # Общие Zod-схемы, типы задач и имя очереди
├── docker-compose.yml
└── turbo.json
```


## Требования

- **Node.js 24 LTS** (обязательно: NestJS 12 требует Node 22.12+/24). В репозитории есть `.nvmrc`.
- **Yarn 1.x**
- **Docker** (для Postgres и Redis)

```bash
nvm install 24
nvm use 24
```

## Запуск

```bash
# 1. Зависимости
yarn install

# 2. Поднять Postgres и Redis
yarn db:up

# 3. Сгенерировать Prisma Client, применить миграции и залить мок-данные
yarn db:generate
yarn db:migrate
yarn db:seed

# 4. Запустить web + api + worker одновременно
yarn dev
```

Всё вместе одной командой (кроме `yarn install`):

```bash
yarn setup
```

После запуска:

- Web: http://localhost:3000
- API: http://localhost:4000/api
- Postgres: `localhost:5433` (порт сдвинут, чтобы не конфликтовать с локальным)
- Redis: `localhost:6380`

## Проверка, что всё живо

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/tasks

# Создание задачи -> попадает в очередь -> воркер обрабатывает и логирует
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Проверка очереди"}'
```

В логах воркера появится:

```
[worker] processing job 1 (task_assigned): Task "Проверка очереди" was created
[worker] job 1 completed
```

## Как это работает

1. `POST /api/tasks` (NestJS) создаёт задачу в Postgres через Prisma.
2. `TasksService` кладёт джобу `task_assigned` в очередь `notifications` (BullMQ).
3. Отдельный процесс `apps/worker` забирает джобу, валидирует её Zod-схемой из `@repo/shared`
   и логирует результат (заглушка вместо реального email).
4. Страница `apps/web` — серверный компонент: тянет список задач с API и рендерит его,
   форма создания — клиентский компонент, после успеха вызывает `router.refresh()`.

## Полезные команды

```bash
yarn dev            # web + api + worker в watch-режиме
yarn build          # сборка всех пакетов через Turborepo
yarn db:up          # поднять Postgres + Redis
yarn db:down        # остановить контейнеры
yarn db:generate    # prisma generate
yarn db:migrate     # prisma migrate dev
yarn db:seed        # залить мок-данные
yarn workspace @repo/db studio   # Prisma Studio
```

## Переменные окружения

Скопируйте `.env.example` в `.env` (в репозитории уже есть `.env` для локального запуска).

| Переменная | Значение по умолчанию |
| --- | --- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/tasklist?schema=public` |
| `REDIS_HOST` | `localhost` |
| `REDIS_PORT` | `6380` |
| `API_PORT` | `4000` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |

## Что можно добавить дальше

- Кеширование списка задач в Redis (паттерн cache-aside).
- Retry и dead letter queue для BullMQ.
- `packages/ui` — общая дизайн-система.
- Тесты: Vitest для пакетов, e2e для API.
- CI: lint + typecheck + build на каждый PR.