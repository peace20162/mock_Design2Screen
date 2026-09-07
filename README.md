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
node scripts/service-smoke.ts ...    # 24 checks (see below)
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
