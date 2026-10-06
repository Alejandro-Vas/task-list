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
| Аутентификация | @nestjs/jwt (access-токен) + bcrypt, refresh-токены в БД |

## Структура

```
task-list/
├── apps/
│   ├── web/       # Next.js: клиентское приложение с авторизацией (FSD: app/entities/features/widgets)
│   ├── api/       # NestJS: REST API, JWT-аутентификация, Prisma, BullMQ, Swagger
│   └── worker/    # BullMQ-воркер: обработка фоновых задач
├── packages/
│   ├── db/        # Prisma schema (User, Project, Task, RefreshToken), миграции, seed
│   └── shared/    # Общие Zod-схемы: задачи, регистрация/логин, имя очереди
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

Все эндпоинты задач защищены JWT (кроме `/api/health` и `/api/auth/*`).
После `yarn db:seed` есть демо-пользователь: `demo@example.com` / `demo1234`.

```bash
curl http://localhost:4000/api/health

# Получить access-токен
TOKEN=*** -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"***"}' | sed 's/.*"accessToken":"***"]*\)".*/\1/')

# Список задач
curl http://localhost:4000/api/tasks -H "Authorization: Bearer $TOKEN"

# Создание задачи -> попадает в очередь -> воркер обрабатывает и логирует
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Проверка очереди"}'
```

В логах воркера появится:

```
[worker] processing job 1 (task_assigned): Task "Проверка очереди" was created
[worker] job 1 completed
```

## Как это работает

**Аутентификация:**

1. `POST /api/auth/register|login` выдаёт access-токен JWT (15 минут) в теле ответа,
   а refresh-токен (7 дней) кладёт в httpOnly-cookie `refresh_token` (path `/api/auth`)
   и сохраняет его хеш в таблице `RefreshToken`.
2. Глобальный `JwtAuthGuard` (через `APP_GUARD`) требует `Authorization: Bearer <token>`
   на всех эндпоинтах, кроме помеченных `@Public` (`/api/auth/*`, health).
3. `POST /api/auth/refresh` ротацирует refresh-токен по cookie; `logout`/`logout-all`
   отзывают его в БД.
4. Все задачи привязаны к пользователю — API отдаёт только задачи текущего `userId`.

**Задачи и очереди:**

1. `POST /api/tasks` (NestJS) создаёт задачу в Postgres через Prisma.
2. `TasksService` кладёт джобу `task_assigned` в очередь `notifications` (BullMQ).
3. Отдельный процесс `apps/worker` забирает джобу, валидирует её Zod-схемой из `@repo/shared`
   и логирует результат (заглушка вместо реального email).

**Веб:**

- Клиентское приложение: `AuthProvider` хранит access-токен в памяти,
  при 401 автоматически обновляет его через `/api/auth/refresh`.
- Страницы `/login` и `/register`, защищённые задачи — через `RequireAuth`.
- Список задач, фильтры по статусу, создание/редактирование/удаление —
  клиентские фичи из `src/features`.

## Swagger

Документация API: **http://localhost:4000/api/docs** (доступна только не в production;
JSON-схема — `/api/docs/json`).

Как пользоваться с авторизацией:

1. Поднять БД и запустить API (`yarn db:up` + `yarn dev`, либо `yarn setup`).
2. Открыть http://localhost:4000/api/docs.
3. Раскрыть `POST /api/auth/login` -> `Try it out` -> выполнить с демо-парой
   `demo@example.com` / `demo1234` -> скопировать `accessToken` из ответа.
4. Нажать `Authorize` (справа сверху), вставить токен в Bearer-поле, `Authorize`.
   Токен сохраняется между запросами (`persistAuthorization`).
5. Эндпоинты `auth/*` и `health` помечены как публичные — токен для них не нужен.

## База локально и обзор данных

Postgres и Redis поднимаются в Docker (порты сдвинуты, чтобы не конфликтовать
с локальными инстансами). Для быстрого обзора таблиц есть Prisma Studio.

```bash
# 1. Поднять контейнеры (Postgres :5433, Redis :6380)
yarn db:up

# 2. Применить миграции и залить демо-данные (нужен доступ к БД)
yarn db:generate
yarn db:migrate
yarn db:seed

# 3. Открыть графический обзор БД в браузере
yarn workspace @repo/db studio
```

Studio поднимается на http://localhost:5555 и показывает таблицы
`User`, `Project`, `Task`, `RefreshToken` — их можно смотреть, фильтровать
и править прямо в браузере (изменения сразу пишутся в Postgres).

Остановить контейнеры: `yarn db:down` (данные остаются в docker-томах;
полностью стереть — `yarn db:down -v`).

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
| `JWT_ACCESS_SECRET` | `dev-only-insecure-secret` (только для dev) |
| `JWT_ACCESS_TTL` | `15m` |

В production обязательно переопределите `JWT_ACCESS_SECRET` — без него токены подписываются
на известное dev-значение из кода.

## Что можно добавить дальше

- Кеширование списка задач в Redis (паттерн cache-aside).
- Retry и dead letter queue для BullMQ.
- `packages/ui` — общая дизайн-система.
- Тесты: Vitest для пакетов, e2e для API.
- CI: lint + typecheck + build на каждый PR.
