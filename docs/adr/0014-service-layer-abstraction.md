# ADR-0014: Service-layer abstraction behind all data access

## Status
Accepted

## Context
The architecture document (§2, §7.3, Appendix A) reserves the enterprise
backend (NestJS + PostgreSQL + Redis + SFTP/SOAP IFIMS ingestion) for future
work. For v1 we build only the interactive mockup with local mock state
(DEC-12). But writing UI code that reads mock data directly would require a
large rewrite when the real backend arrives.

## Decision
All data access flows through a `SignageService` interface whose method
signatures mirror the REST/WebSocket endpoints in §7.3
(`login`, `getScreens`, `assignTemplate`, `getTemplates`,
`saveTemplate`, `getTelemetry`, `broadcastOverride`, …). v1 ships one
implementation, `MockSignageService`, backed by in-memory mock IFIMS data
persisted to `localStorage`. A future `HttpSignageService` implements the same
interface over fetch/WebSocket with no UI changes.

The interface returns domain types; the mock simulates latency and emits a
synthetic "push" snapshot for screens so the WebSocket semantics (sub-second
push) are represented even though no socket exists yet.

## Consequences
- + One seam to swap: mock → HTTP/WS is a new file, not a refactor.
- - The interface is a guess until the real backend exists; some methods may
  need reshaping when the transport is wired (acceptable per "drop in later").
- Mock state is per-browser (localStorage), not multi-user — correct for a
  walk-through prototype.