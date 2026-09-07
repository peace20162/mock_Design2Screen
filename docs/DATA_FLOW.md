# Data Flow — SBG Gate LED Signage

How data moves through the system, in both operating modes: the **in-browser
mock** (default, runs standalone) and the **production/http** mode (backend +
PostgreSQL + Redis + WebSocket, via `docker compose up`).

Both modes share the same UI, the same domain types, and the same
**`SignageService`** interface — only the implementation behind that interface
changes (ADR-0014).

---

## 1. Actors & entry points

| Actor | Entry | Data they touch |
| --- | --- | --- |
| Airline Gate Officer | `/login` → `/gate/:gateId` | flights, templates, screen assignment, boarding phase |
| AOT IT Admin (ฝรส.) | `/login` (Azure SSO) → `/admin/*` | fleet telemetry, accounts, gate screens, emergency |
| GDU Mini PC | `/player/:gateId/:screenId` | renders a screen's layout; sends heartbeats |
| IFIMS (flight system) | SFTP batch + SOAP push | authoritative flight schedule/status |

---

## 2. Topology

```
                        ┌──────────────────────────────────────────┐
                        │              React SPA (UI)              │
                        │  zustand stores  ──  SignageService      │
                        │      │                    │              │
                        │      │  mock mode         │  http mode   │
                        │      ▼                    ▼              │
                        │  MockSignageService   HttpSignageService │
                        │  (localStorage)       (fetch + WS)       │
                        └──────────────┬─────────────┬─────────────┘
                                       │             │ REST/WS
                          (mock only)  │             ▼
                                       │     ┌──────────────────┐
                                       │     │  Backend (Node)  │──▶ Redis (pub/sub)
                                       │     │  Store seam      │──▶ PostgreSQL
                                       │     └────────┬─────────┘
                                       │              │ WebSocket push
                                       │              ▼
                                       │        GDU player (1080p)
                                       └────────── (not used in mock)
```

**In mock mode** the left branch runs entirely in the browser; no backend is
needed. **In http mode** the right branch carries every read/write to the
backend over REST, and layout pushes reach GDUs over WebSocket.

---

## 3. The service seam

Every UI read/write crosses the `SignageService` interface
(`src/services/SignageService.ts`). Its method names mirror the REST endpoints
(doc §7.3):

| UI action | `SignageService` method | Backend endpoint |
| --- | --- | --- |
| Sign in (airline) | `loginAirline` | `POST /api/v1/auth/airline/login` |
| Sign in (admin SSO) | `loginAdmin` | `POST /api/v1/auth/admin/login` |
| Load airlines / gates | `listAirlines` / `listGates` | `GET /api/v1/airlines`, `/gates` |
| Load flights | `listFlights(gate)` | `GET /api/v1/flights?gate=` |
| Load screens | `listScreens` | `GET /api/v1/screens` |
| Pick template | `listTemplates(airline)` | `GET /api/v1/airlines/:id/templates` |
| Save / edit template | `saveTemplate` | `POST /api/v1/airlines/:id/templates` |
| Push to screen | `assignScreen` | `POST /api/v1/gates/:g/screens/:s/assign` |
| Advance boarding | `setFlightStatus` | `POST /api/v1/flights/:id/status` |
| Fleet telemetry | `listTelemetry` | `GET /api/v1/admin/screens/telemetry` |
| Provision account | `createAirlineAccount` | `POST /api/v1/admin/accounts` |
| Manage gate screens | `addScreen` / `updateScreen` / `removeScreen` | `POST/PUT/DELETE /api/v1/admin/screens` |
| Emergency override | `setEmergencyOverride` | `POST /api/v1/admin/broadcast/override` |

- `MockSignageService` (`src/services/MockSignageService.ts`): all state in
  memory, persisted to `localStorage`. **Synchronous `snapshot()`** for the UI
  stores.
- `HttpSignageService` (`src/services/HttpSignageService.ts`): the same methods
  over `fetch`, with a JWT header after login and an internal cache so
  `snapshot()` still works. Selected by `VITE_DATA_MODE=http`.

---

## 4. Authentication flow

1. Officer fills airline + gate + username/password; the form calls
   `loginAirline`.
2. **Mock:** the service matches against seeded accounts, enforcing tenant
   (airline code) and gate scope (`allowedGates`). **HTTP:** the backend
   verifies the same rules and returns a **JWT** (`role`, `airlineCode`,
   `assignedGate`).
3. The session lands in the `appStore` (persisted), and role-based routing
   sends the officer to `/gate/:gateId` and the admin to `/admin/screens`.

> JWT claims (doc §5.3): `sub/officerId`, `airlineCode`, `role`, `assignedGate`.

---

## 5. Flight data flow (IFIMS)

1. **Production intent:** IFIMS delivers two channels — a **daily 17:00 SFTP
   fixed-length file** (batch schedule) and a **Port 8443 SOAP
   `RealTimeFlightNotification`** stream (intra-day changes). The backend
   ingests both into PostgreSQL and caches hot state in Redis.
2. **This build:** flights are seeded JSON (`backend/src/seed.ts` for http mode,
   `src/services/mockData.ts` for mock mode). The officer's flight dropdown is
   filtered to the gate (`listFlights(gate)`), and picking a flight calls
   `setScreenFlight`, binding `{{flight.*}}` tokens to that flight.

Flight fields bound into templates: `flight.number`, `flight.destination`,
`flight.origin`, `flight.status`, `flight.std`, `flight.etd`, `flight.gate`.

---

## 6. Template flow

1. Officer opens the **editor** (`/templates/editor`), places layers (image,
   text, IFIMS chip, clock, shape) on a 1920×1080 canvas. `saveTemplate`
   stamps `airlineCode` **from the session**, never from the payload
   (tenant isolation).
2. The **gallery** (`/templates/gallery`) lists the airline's templates
   (search + sort + category, DEC-18) and offers **Apply to screen…** for each
   screen of the active gate.
3. Apply calls `assignScreen(gate, screen, templateId, flightId)`, which sets
   the screen to `mode = template` and (in http mode) pushes the layout to the
   GDU over WebSocket.

---

## 7. Screen push & the GDU player

1. `assignScreen` updates the screen state.
2. **HTTP mode:** the backend's WS gateway looks up the GDU by
   `gduHardwareId` (`/ws/v1/gdu/:gduHardwareId`) and sends a
   `{ type: "layout", screen, template, flight, emergency }` payload with
   **sub-second latency**. The GDU renders the JSON layers with no reload
   (zero-flicker), and caches them in IndexedDB for offline resilience.
3. **Mock mode:** the player page renders the same `TemplateStage` component
   directly from the store (the same single source of truth as the editor
   preview and admin thumbnails — ADR-0015).
4. The GDU sends **heartbeats** every 15 s; the backend refreshes
   `lastHeartbeat` and the admin telemetry grid shows online state / GPU temp.

---

## 8. Boarding progression

The officer advances the active flight (`scheduled → boarding → zones →
final_call → gate_closed`). `setFlightStatus` updates the flight; every
`{{flight.status}}` chip re-renders with its automatic colour (emerald
boarding, amber final call, ruby delayed/closed).

---

## 9. Emergency override

1. Admin composes a message and triggers `setEmergencyOverride(true, msg)`.
2. **HTTP mode:** `POST /api/v1/admin/broadcast/override` sets every screen to
   `mode = emergency` and broadcasts to **all** GDUs at once, suppressing every
   airline template airport-wide.
3. Cancelling restores each screen to `template` (if assigned) or
   `ifims_default` (idle AOT hold-room loop).

---

## 10. Data stores

| Store | Mock mode | HTTP mode |
| --- | --- | --- |
| Flights / screens / templates / accounts / emergency | `localStorage` (`sbg-signage-mock-v1`) | PostgreSQL (schema `backend/init.sql`) |
| UI state | zustand (`appStore`, `dataStore`) | zustand (same stores) |
| Live push / session cache | — | WebSocket gateway + Redis (`redis://redis:6379`) |
| Media / template cache on edge | — | GDU IndexedDB |

---

## 11. Intended production flow (summary)

```
IFIMS ──SFTP 17:00──▶ Backend ingestion ──▶ PostgreSQL
IFIMS ──SOAP :8443──▶ Backend ingestion ──▶ Redis (hot cache)
                                            │
Officer UI ──REST──▶ Backend API ──▶ assignScreen ──WebSocket──▶ GDU
Admin UI   ──REST──▶ Backend API ──▶ telemetry / override ─────▶ all GDUs
GDU        ──WS heartbeat──▶ Backend ──▶ PostgreSQL (telemetry)
```
