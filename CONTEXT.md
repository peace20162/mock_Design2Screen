# CONTEXT — SBG Gate LED Signage (Design2Screen)

A glossary of the canonical terms for this system. Implementation details
belong in ADRs and code, never here.

## Canonical terms

- **Gate Display Unit (GDU)** — the Mini PC mounted behind a physical 43" or
  55" LED panel. It runs the sign player and is identified by a
  `gduHardwareId`. A GDU drives exactly one **Screen**.

- **Screen** — one physical LED panel on a gate, addressed by `gateId` +
  `screenIndex` (1-based) with a string `screenId` (`screen_1`, `screen_2`, …).
  Every screen carries a `label`, `displaySize` (43″/55″) and a GDU binding.
  Gate panel counts vary (DEC-14): D1 has 2, C1 has 3. A Screen is a *physical*
  thing; it is never "off", only set to a mode.

- **Template** — a reusable 1920×1080 layout (background + ordered layers +
  IFIMS bindings) owned by one airline. Pre-approved visual layouts, not code.

- **Layer** — a single element on a template's canvas. Five kinds: image,
  free_text, ifims_binding, clock_widget, shape_container. A layer has
  position/size, is `locked` or `visible`, and may carry an IFIMS binding.

- **IFIMS Binding (`bindingKey`)** — a live data slot on a layer that
  interpolates a flight field (`flight.number`, `flight.destination`,
  `flight.origin`, `flight.status`, `flight.std`, `flight.etd`,
  `flight.gate`). Resolved live from IFIMS at render time.

- **Flight Status** — the operational phase of a flight. States: `scheduled`,
  `boarding`, `zones`, `final_call`, `delayed`, `gate_closed`, `departed`.
  Status drives the automatic colour-coding (green = boarding, amber = final
  call/delay, red = closed).

- **Template Category** — the boarding phase a template is authored for:
  `welcome`, `boarding`, `final_call`, `delay`, `gate_closed`.

- **Assignment** — binding a template *and* an active flight to a Screen. The
  push from officer console to player.

- **Mode** — the top-level state of a Screen: `template` (airline content),
  `ifims_default` (AOT hold-room idle loop), `emergency` (airport-wide
  override). Exactly one mode at a time; emergency pre-empts the other two.

- **Override** — an airport-wide emergency broadcast that suppresses all
  airline templates across the fleet with sub-second latency.

- **Tenant (Airline)** — the isolation boundary. Every template, account, and
  gate assignment is owned by an `airlineCode`; the backend (or mock service)
  never crosses tenants.

- **Player** — the fullscreen 1080p renderer the GDU shows. Renders a
  template's layers with live IFIMS values; in this build it is a normal route
  `/player/:gduHardwareId` plus in-card previews.

- **Screen Index** — the 1-based position of a screen within its gate; the
  stable identity behind `screenId`. Gaps are left when a middle screen is
  removed rather than renumbering.

- **GDU Binding** — the `gduHardwareId` a screen is mapped to; the WebSocket
  push channel (`/ws/v1/gdu/:gduHardwareId`) addresses a screen through it.

- **Data Mode** — `mock` (in-browser localStorage, default) vs `http`
  (backend over REST/WS). Both sit behind the `SignageService` interface.

- **Backend** — the Node/TS API (`backend/`) implementing the REST + WebSocket
  contracts, with a `Store` persistence seam (`MemoryStore` in-process;
  PostgreSQL via `init.sql`/compose).

- **Store** — the backend's persistence seam; the server-side analogue of the
  frontend `SignageService` seam (ADR-0017).

## Roles

- **Gate Officer** (`airline_officer`) — airline ground agent at a CUPPS
  counter. Local account, scoped to an assigned gate. Selects flight, picks
  template, pushes to screen, advances boarding phase.

- **Airport IT Administrator** (`airport_admin`, AOT ฝรส.) — Entra ID SSO.
  Fleet telemetry, airline provisioning, emergency override.