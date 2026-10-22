# E2E-тесты (Playwright)

Автоматизация браузерных сценариев `apps/web` + агентный режим для AI-ассистентов (Koda).

## Быстрый старт

```bash
# Все e2e-тесты (webServer поднимет Next сам, либо переиспользует запущенный yarn dev)
yarn test:e2e                        # из apps/web
yarn workspace @repo/web test:e2e    # из корня

# Режим разработки
yarn test:e2e:ui          # интерактивный UI Runner (watch + time travel)
yarn test:e2e:headed      # с видимым браузером
yarn test:e2e:codegen     # запись действий → код (прототип селекторов)

# Один файл / один тест
yarn test:e2e e2e/auth.spec.ts
yarn test:e2e -g "should render login form"
```

Браузеры один раз: `yarn workspace @repo/web exec playwright install chromium`.

## Структура

```
apps/web/
├── playwright.config.ts   # baseURL, webServer, trace/video/screenshot на failure
└── e2e/
    ├── fixtures.ts        # login() через UI-форму + skipWithoutApi
    ├── seed.spec.ts       # seed-тест для AI-агентов (быстрый старт среды)
    ├── auth.spec.ts       # smoke без бэкенда: рендеринг, редиректы, валидация
    ├── tasks.spec.ts      # создание задачи
    ├── task-flow.spec.ts  # CRUD: создать → изменить → удалить
    ├── export.spec.ts     # скачивание CSV
    └── share.spec.ts      # share-ссылка
specs/                     # markdown-планы тестов (артефакты planner-агента)
.agents/skills/playwright-*  # Playwright-скиллы для AI-агентов
```

Конвенции:
- файлы тестов — `*.spec.ts` в `e2e/`;
- селекторы — по ролям/placeholder'ам (`getByRole`, `getByPlaceholder`), CSS — только
  как последний вариант (см. `type="email"` + нативная валидация браузера в `auth.spec.ts`);
- тесты, которым нужен бэкенд, начинаются с `test.beforeEach(skipWithoutApi)` и
  скипаются, если `GET /api/health` недоступен;
- валидацию форм не дублируем в E2E — она покрыта unit-тестами (`*.test.tsx`).

## Работа с бэкендом

- Тесты с API требуют запущенных API + Postgres + seed (`yarn dev`, `yarn db:seed`).
  Демо-пользователь — `owner@example.com` / `demo1234` (константа `DEMO_USER` в `fixtures.ts`).
- **`workers: 1`** — тесты логинятся одним пользователем; параллельные сессии ротируют
  один refresh-токен и мешают друг другу.
- **Rate limit на auth** (`THROTTLE_AUTH_LIMIT`): для локальных прогонов в `.env`
  стоит `1000`, иначе 429 после 5 логинов в минуту. В production держите `5`.
- `baseURL` — `http://localhost:3000` (не `127.0.0.1`!): API разрешает CORS
  только origin'у из `CORS_ORIGIN`, иначе запросы из браузера блокируются.
  Если гоняешь прод-сервер на порту, отличном от 3000, добавь этот origin в
  `CORS_ORIGIN` API (`.env`) и перезапусти API.

## Агентный режим (AI + Koda)

Playwright умеет MCP — AI-агент управляет живым браузером: читает accessibility-снапшоты,
кликает, смотрит консоль/сеть, надебажит упавший тест и тут же проверяет фикс.

### 1. Skills (рекомендуется, работают в Koda из коробки)

В репозиторий установлены официальные скиллы Playwright (`.agents/skills/`):

- `playwright-cli` — запуск тестов, codegen, работа с тестовыми сессиями;
- `playwright-trace` — разбор trace-файлов (консоль, сеть, снапшоты DOM) из `test-results/`;
- `playwright-component-testing` — компонентные тесты.

Koda подхватывает их автоматически — достаточно попросить: *«запусти e2e и разбери
trace упавшего теста»*, *«напиши тест для страницы настроек по seed.spec.ts»*.

### 2. MCP-серверы

Два варианта, оба идут в комплекте с установленными пакетами:

| Сервер | Команда | Для чего |
| --- | --- | --- |
| `playwright mcp` (из `@playwright/test`) | `yarn workspace @repo/web exec playwright mcp` | полный браузерный MCP: навигация, снапшоты, консоль, сеть, скриншоты |
| `playwright run-test-mcp-server` | `yarn workspace @repo/web exec playwright run-test-mcp-server` | агент управляет самим тест-раннером (запуск/отладка конкретных тестов) — так работают официальные агент-определения Playwright |

Добавьте нужный в MCP-настройки Koda (Settings → MCP servers) как stdio-сервер с
командой выше. После этого агент может сам открывать страницы, снимать DOM-снапшоты
и находить селекторы — идеально для дебага падающих e2e.

### 3. Рабочий цикл «агент пишет тесты»

Koda (через MCP-сервер `playwright mcp`) выполняет роли трёх агентов Playwright:

- **planner** — исследует приложение через `browser_snapshot` и пишет markdown-план
  в `specs/`;
- **generator** — превращает план `specs/*.md` в `e2e/*.spec.ts`, проверяя селекторы
  живьём через `browser_click` / `browser_navigate`;
- **healer** — запускает тест-суиту через `run-test-mcp-server`, чинит упавшие тесты
  (селекторы/ожидания), помечая починенное на ревью.

Промпт для Koda: *«Сгенерируй план для flow "создание и удаление задачи"
(planner), затем напиши тесты по плану (generator), затем прогони и почини (healer)»*.
Ориентир среды для агентов — `e2e/seed.spec.ts`: он быстрый, без внешних зависимостей.

## Отладка упавших тестов

```bash
yarn workspace @repo/web exec playwright show-report          # HTML-отчёт
yarn workspace @repo/web exec playwright show-trace test-results/**/trace.zip
```

Trace включает снимки DOM до/после каждого шага, консоль, сеть, скриншоты и видео —
скролится назад по времени. Конфиг сохраняет `trace/video/screenshot` только на провал,
локально мусор не копится.
