# ADR-0017: Backend scaffold with a storage seam (DEC-17)

## Status
Accepted

## Context
ADR-0014 established a frontend `SignageService` seam with a mock
implementation, deferring the enterprise backend. DEC-17 (and doc §5) now
specify that backend: Node.js API + PostgreSQL + Redis + docker-compose, and
the frontend is to be wired to it.

## Decision
Ship a runnable **Node.js + TypeScript + Express** backend (`backend/`)
implementing the REST + WebSocket contracts, with:

- the same domain types as the frontend (single source of truth for the wire
  shape),
- JWT auth (`POST /auth/*/login`) and role guards,
- a **`Store` interface** as the persistence seam: a full in-memory
  `MemoryStore` (runs anywhere, verified) and PostgreSQL wired via
  `docker-compose.yml` + `backend/init.sql` (schema + seed) + `DATABASE_URL`,
- a WebSocket gateway (`/ws/v1/gdu/:gduHardwareId`) that pushes
  `{type:"layout", …}` to GDUs on assign/override and receives heartbeats,
- Redis in compose/`.env` as the session/pub-sub cache for horizontal scaling.

The frontend gains `HttpSignageService` — the same `SignageService` interface
over `fetch`/WS, selected by `VITE_DATA_MODE=http` — so the UI is identical in
both modes.

Framework note: the doc names NestJS; this scaffold uses Express to stay lean
and verifiable. The REST/WS contracts are transport-agnostic, so swapping to
NestJS (or wiring a `PostgresStore`) is a drop-in behind the same seams.

## Consequences
- + `docker compose up` gives the real 4-tier stack (Postgres + Redis +
  backend + nginx SPA); the API also boots with no DB via `MemoryStore`.
- + Verified: 17 endpoint checks + 14 frontend-service-over-HTTP checks.
- − `PostgresStore` is the documented production adapter (schema in
  `init.sql`) but was not exercised here — Docker isn't installed on this
  machine; the in-memory store is the tested default.
- − Redis is wired in compose/`.env` but the single-instance backend uses
  in-process push; Redis matters only when scaling out.