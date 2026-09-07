# SBG Gate LED Signage — Suvarnabhumi Airport

Interactive gate-display control for Suvarnabhumi (AOT ฝรส.), per
`SBG_Gate_LED_Signage_System_Architecture_v2.md`. One React app with role-based
routing, plus a Node backend for the production topology.

## Stack

- **Frontend** (`/`): React 18 + TypeScript + Vite, zustand. Bilingual TH/EN.
- **Backend** (`backend/`): Node + TypeScript + Express — REST + WebSocket,
  JWT auth, a `Store` seam (in-memory default; PostgreSQL via `init.sql`).
- **Infra**: `docker-compose.yml` (PostgreSQL 16 + Redis 7 + backend + nginx SPA).

## Run it

**Frontend only (mock data, no backend):**

```bash
npm install
npm run dev          # http://localhost:5173
```

Demo officer: `tg.officer / demo1234` (Gate D1). Admin: "Continue with Azure
AD SSO" (mock).

**Frontend against the real backend:**

```bash
# terminal 1 — backend (in-memory store, no DB needed)
cd backend && npm install && npm run dev    # :3000

# terminal 2 — frontend in http mode
VITE_DATA_MODE=http npm run dev             # :5173
```

**Full production stack (Docker):**

```bash
docker compose up -d --build                # frontend :80, backend :3000
```

## Setting a screen to display a template

A screen shows a template when its `currentMode === "template"` **and** its
`templateId` resolves to a saved template. A `flightId` supplies live values for
the template's `{{flight.*}}` chips (no flight → placeholder text). That state
is written by one call: `assignScreen(gateId, screenId, templateId, flightId)`.

**In the UI**

1. On the gate controller (`/gate/:gateId`), select the flight in the dropdown —
   this binds `flightId` to every screen on that gate.
2. Click a screen card's **Choose template** → the gallery opens targeting that
   screen (the editor also works).
3. In the gallery, open that template's **"Apply to screen…"** dropdown and pick
   the screen — or use the editor's **"Deploy to…"** dropdown.

**From code (any page / component)**

```ts
await useDataStore
  .getState()
  .assignScreen("D1", "screen_1", "tpl-tg-boarding", "f-tg920");
```

The store action (`src/store/dataStore.ts:87`) calls `service.assignScreen(...)`
then `refresh()`. Mock mode writes `templateId`/`flightId`/`currentMode` and
persists to localStorage (`src/services/MockSignageService.ts:308`); http mode
uses `POST …/assign` (below), which also pushes the layout to the GDU over
WebSocket.

**Over the REST API** (`$T` = Bearer token from login)

```bash
curl -X POST http://localhost:3000/api/v1/gates/D1/screens/screen_1/assign \
  -H "authorization: Bearer $T" -H "content-type: application/json" \
  -d '{"templateId":"tpl-tg-boarding","flightId":"f-tg920"}'
```

**Release (back to the idle AOT loop)**

```ts
await useDataStore.getState().releaseGate("D1");
// nulls templateId/flightId, currentMode → ifims_default
```

Rendering dispatch lives in `src/components/ScreenPreview.tsx` (`ScreenRender`):

| `currentMode` | rendered |
| --- | --- |
| `emergency` | `EmergencyScreen` (global override) |
| `template` **+** valid `templateId` | `<TemplateStage …>` — the template |
| otherwise (`ifims_default` / no template) | `IdleScreen` — AOT hold loop |

## API

Base URL `http://localhost:3000`. Auth: `—` = public, **officer** =
`airline_officer` Bearer JWT, **admin** = `airport_admin` Bearer JWT.

### Auth

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `POST /api/v1/auth/airline/login` | — | Log in airline officer. Body `{airlineCode, gateId, username, password}` → `{token, session}` |
| `POST /api/v1/auth/admin/login` | — | Mock Azure AD SSO admin login → `{token, session}` |

### Reference data

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/v1/airlines` | — | List airlines (`code`, `name`, `nameTh`, `accent`) |
| `GET /api/v1/gates` | — | List all gate ids |
| `GET /api/v1/airlines/:airlineCode/gates` | — | Gates an airline is provisioned to operate |
| `GET /api/v1/flights?gate=D1` | — | Flights (optional `gate` filter; `departed` excluded) |

### Screens

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/v1/gates/:gateId/screens` | — | Screens for one gate |
| `GET /api/v1/screens` | — | All screens (every gate) |
| `POST /api/v1/gates/:gateId/screens/:screenId/assign` | officer | **Assign a template to a screen.** Body `{templateId, flightId}`; pushes to the GDU |
| `POST /api/v1/gates/:gateId/screens/:screenId/flight` | officer | Bind / switch the flight on a screen |
| `POST /api/v1/gates/:gateId/release` | officer | Release the gate → idle AOT loop |

### Templates

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/v1/airlines/:airlineId/templates` | officer | Airline's templates; query `search`, `sortBy`, `sortOrder`, `category` |
| `GET /api/v1/templates/:templateId` | — | Fetch one template (404 if missing) |
| `GET /api/v1/templates` | admin | All airlines' templates |
| `POST /api/v1/airlines/:airlineId/templates` | officer | Save a template (tenant forced to the session's airline) |
| `POST /api/v1/templates/:templateId/duplicate` | officer | Duplicate a template |
| `DELETE /api/v1/templates/:templateId` | officer | Delete a template |

### Flight progression

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `POST /api/v1/flights/:flightId/status` | officer | Advance status (`boarding` → `zones` → `final_call` → `gate_closed`, …) |

### Admin

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/v1/admin/screens/telemetry` | admin | Fleet telemetry (`GduUnit[]`) |
| `POST /api/v1/admin/screens` | admin | Add a screen. Body `{gateId, label, displaySize}` |
| `PUT /api/v1/admin/screens/:screenId` | admin | Edit a screen (`label`, `displaySize`, `gduHardwareId`) |
| `DELETE /api/v1/admin/screens/:screenId` | admin | Remove a screen |
| `GET /api/v1/admin/accounts` | admin | List airline accounts |
| `POST /api/v1/admin/accounts` | admin | Create airline account. Body `{airlineCode, username, password, allowedGates}` |
| `GET /api/v1/admin/broadcast` | admin | Current emergency state |
| `POST /api/v1/admin/broadcast/override` | admin | Trigger / clear terminal-wide emergency. Body `{active, message}`; pushes to every GDU |

### Health & WebSocket

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /health` | — | Liveness probe |
| `WS /ws/v1/gdu/:gduHardwareId` | — | GDU push channel. Server sends `{type:"layout", screen, template, flight, emergency}` on assign / status change / override; client sends `{type:"heartbeat"}` |

## Structure

```
src/                frontend app
  services/         SignageService seam: MockSignageService | HttpSignageService
  pages/            login, gate controller, gallery, editor, admin (screens/
                    gates/airlines/broadcast), player
backend/            Node API (src/index.ts: routes + WS gateway)
backend/init.sql    PostgreSQL schema + seed
docs/DATA_FLOW.md   end-to-end data flow (mock + production)
docs/adr/           ADR-0014 … ADR-0017
CONTEXT.md          domain glossary
```

## Verify

```bash
npm run build                        # frontend typecheck + bundle
node scripts/service-smoke.ts ...    # 27 checks (see below)
cd backend && npm run build          # backend typecheck
node backend/api-check.mjs           # 17 endpoint + WebSocket checks
```

The smoke scripts are TypeScript; run them via esbuild:

```bash
npx esbuild scripts/service-smoke.ts --bundle --format=esm --platform=node --outfile=.smoke.mjs \
  && node -r ./scripts/polyfill.cjs ./.smoke.mjs
npx esbuild scripts/http-check.ts --bundle --format=esm --platform=node --outfile=.httpcheck.mjs \
  && node .httpcheck.mjs
```

## Decisions (ADRs)

- **0014** service-layer seam (mock ↔ HTTP) · **0015** DOM/CSS render engine ·
  **0016** variable screens per gate (DEC-14) · **0017** backend scaffold (DEC-17)
