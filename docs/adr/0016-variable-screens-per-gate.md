# ADR-0016: Variable screens per gate (dynamic screen management)

## Status
Accepted

## Context
The original model fixed every gate at two screens (`screen_1`, `screen_2`).
DEC-14 requires the admin to add/edit/remove screens and for gates to carry a
*variable* panel count (doc §3.2 "Dynamic Screen Cards (1 to N)", §3.5 "Gate
Screen Manager" — D1 has 2 panels, C1 has 3).

## Decision
A screen's identity is **`gateId` + `screenIndex`** (1-based), exposed as a
string `screenId` (`screen_1`, `screen_2`, `screen_3`, …). Each screen carries
`label` and `displaySize` plus a `gduHardwareId` (its GDU binding). The admin
gate-manager (`/admin/gates`) adds a screen (appends `maxIndex+1`), edits
label/size/GDU, or removes it. All UI that assumed exactly two screens (gate
controller rack, gallery "Apply to screen…", editor "Deploy to…", admin
telemetry grid, the player route) now renders an arbitrary N, sorted by
`screenIndex`.

## Consequences
- + Gates scale to any panel count without schema migration.
- + One `GateScreenConfig` shape (doc §4) maps cleanly onto the admin form.
- − `screenId` encodes position; removing a middle screen leaves a gap rather
  than renumbering (acceptable — ids stay stable, which the player route and
  WS binding rely on).
- − Seed data must state screen counts per gate (`GATE_SCREENS`), not assume 2.