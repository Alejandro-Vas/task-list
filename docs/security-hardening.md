# Security hardening — план работ

Связанная ишью: [#10](https://github.com/Alejandro-Vas/task-list/issues/10).

> Статус: черновик плана. Реализация ещё не начата.

## 1. Rate limiting (`@nestjs/throttler`)

1. Добавить зависимости в `apps/api`: `@nestjs/throttler`, `@nestjs/throttler-storage-redis` (хранилище в Redis, чтобы лимит работал при нескольких инстансах).
2. Зарегистрировать `ThrottlerModule.forRootAsync` в `apps/api/src/app.module.ts` с параметрами из env.
3. Повесить `ThrottlerGuard` глобально через `APP_GUARD` (или точечно на auth-контроллер).
4. На `POST /auth/login`, `/auth/register`, `/auth/refresh` задать более строгий `@Throttle` (например, 5–10 попыток/мин на IP).
5. Убедиться, что при превышении отдаётся `429` с заголовком `Retry-After`.
6. Новые переменные окружения: `THROTTLE_TTL`, `THROTTLE_LIMIT` (описать в `.env.example`).

Проверка: e2e-тест — N+1 запрос на `/auth/login` даёт `429`.

## 2. CSRF-защита

1. Выбрать механизм: double-submit CSRF-токен (cookie + заголовок) либо строгая проверка `Origin`/`Referer` для state-changing методов.
2. Реализовать как guard/middleware и подключить в `apps/api/src/main.ts`.
3. Исключить безопасные методы (`GET`, `HEAD`, `OPTIONS`) и публичные безопасные эндпоинты.
4. Прод-настройки cookie `refresh_token` в `apps/api/src/auth/auth.controller.ts`: `secure: true`, `SameSite=strict` (или `none` + `secure` для cross-site).
5. Обновить README: как фронт получает и присылает CSRF-токен.

Проверка: запрос без CSRF-токена/с неверным `Origin` на `POST /tasks` отклоняется; refresh-флоу не сломан.

## 3. RBAC / роли и проекты

1. `packages/db/prisma/schema.prisma`:
   - добавить модель `ProjectMember` (join-таблица `userId` ↔ `projectId` + `role`);
   - enum `ProjectRole { OWNER, ADMIN, MEMBER }`.
2. Миграция Prisma + обновление `packages/db/prisma/seed.ts` (демо-проект с участниками).
3. `apps/api/src/auth/guards`: `RolesGuard` + декоратор `@Roles(...)`, данные о роли брать из членства в проекте.
4. Новый модуль `apps/api/src/projects/*`: создание проекта, список, добавление/удаление участников, смена роли.
5. `apps/api/src/tasks/tasks.service.ts`: доступ к задачам по членству в проекте, а не только по `ownerId` (multi-tenancy).
6. Zod-схемы для проектов и ролей — в `packages/shared`.
7. Swagger: описать новые эндпоинты и ошибки доступа (`403`).

Проверка: member видит задачи проекта, чужой проект/задача недоступны (`403`/`404`); owner/admin могут управлять участниками.

## Общие шаги

- Обновить README (раздел «Безопасность»).
- Добавить unit/e2e тесты на новые сценарии.
- Прогнать `yarn lint` и `yarn typecheck`.
