import http from "http";
import cors from "cors";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import type { Request, Response, NextFunction } from "express";
import type { Session } from "./types";
import { createStore, Store } from "./store";
import { signToken, verifyToken } from "./auth";

const PORT = Number(process.env.API_PORT || 3000);
const store: Store = createStore();

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

// --------------------------------------------------------------- auth mw

interface AuthedRequest extends Request {
  session?: Session;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    req.session = verifyToken(h.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

function requireRole(role: Session["role"]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (req.session?.role !== role) return res.status(403).json({ error: "forbidden" });
    next();
  };
}

// ------------------------------------------------------------- auth routes

app.post("/api/v1/auth/airline/login", (req, res) => {
  const { airlineCode, gateId, username, password } = req.body ?? {};
  const acc = store.findAccount(String(username ?? ""));
  if (
    !acc ||
    acc.password !== String(password ?? "").trim() ||
    acc.airlineCode !== airlineCode
  ) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  if (!acc.allowedGates.includes("*") && !acc.allowedGates.includes(gateId)) {
    return res.status(403).json({ error: "gate_not_allowed" });
  }
  const session: Session = {
    role: "airline_officer",
    officerId: acc.userId,
    airlineCode: acc.airlineCode,
    username: acc.username,
    assignedGate: gateId,
  };
  res.json({ token: signToken(session), session });
});

app.post("/api/v1/auth/admin/login", (_req, res) => {
  // Mock Azure AD SSO — a real deployment exchanges an OIDC code here.
  const session: Session = {
    role: "airport_admin",
    userId: "aot-admin-1",
    name: "Somchai R.",
    email: "somchai.r@airportthai.co.th",
  };
  res.json({ token: signToken(session), session });
});

// ---------------------------------------------------------- reference data

app.get("/api/v1/airlines", (_req, res) => res.json(store.listAirlines()));
app.get("/api/v1/gates", (_req, res) => res.json(store.listGates()));

app.get("/api/v1/airlines/:airlineCode/gates", (req, res) => {
  res.json(store.listAirlineGates(req.params.airlineCode));
});
app.get("/api/v1/flights", (req, res) => {
  const gate = typeof req.query.gate === "string" ? req.query.gate : undefined;
  res.json(store.listFlights(gate));
});

// ---------------------------------------------------------------- screens

app.get("/api/v1/gates/:gateId/screens", (req, res) => {
  res.json(store.listScreens().filter((s) => s.gateId === req.params.gateId));
});

app.get("/api/v1/screens", (_req, res) => res.json(store.listScreens()));

app.post("/api/v1/gates/:gateId/screens/:screenId/assign", requireAuth, requireRole("airline_officer"), (req, res) => {
  const { templateId, flightId } = req.body ?? {};
  store.assignScreen(req.params.gateId, req.params.screenId, templateId, flightId);
  pushScreen(req.params.gateId, req.params.screenId);
  res.json(store.listScreens().filter((s) => s.gateId === req.params.gateId));
});

app.post("/api/v1/gates/:gateId/screens/:screenId/flight", requireAuth, requireRole("airline_officer"), (req, res) => {
  store.setScreenFlight(req.params.gateId, req.params.screenId, req.body?.flightId);
  pushScreen(req.params.gateId, req.params.screenId);
  res.json(store.listScreens().filter((s) => s.gateId === req.params.gateId));
});

app.post("/api/v1/gates/:gateId/release", requireAuth, requireRole("airline_officer"), (req, res) => {
  store.releaseGate(req.params.gateId);
  for (const s of store.listScreens().filter((x) => x.gateId === req.params.gateId)) {
    pushScreen(req.params.gateId, s.screenId);
  }
  res.json(store.listScreens().filter((s) => s.gateId === req.params.gateId));
});

// -------------------------------------------------------------- templates

app.get("/api/v1/airlines/:airlineId/templates", requireAuth, requireRole("airline_officer"), (req: AuthedRequest, res: Response) => {
  const airline = req.session!.airlineCode ?? req.params.airlineId;
  let list = store.listTemplates(airline);
  const { search, sortBy, sortOrder, category } = req.query;
  if (typeof category === "string" && category !== "all") list = list.filter((t) => t.category === category);
  if (typeof search === "string" && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((t) => t.templateName.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }
  const field = (sortBy === "name" ? "templateName" : sortBy === "created_at" ? "createdAt" : "updatedAt") as "templateName" | "createdAt" | "updatedAt";
  const dir = sortOrder === "asc" ? 1 : -1;
  list.sort((a, b) => a[field].localeCompare(b[field]) * dir);
  res.json(list);
});

app.get("/api/v1/templates/:templateId", (req, res) => {
  const t = store.getTemplate(req.params.templateId);
  if (!t) return res.status(404).json({ error: "not_found" });
  res.json(t);
});

app.get("/api/v1/templates", requireAuth, requireRole("airport_admin"), (_req, res) => {
  res.json(store.listAllTemplates());
});

app.post("/api/v1/airlines/:airlineId/templates", requireAuth, requireRole("airline_officer"), (req: AuthedRequest, res: Response) => {
  const body = req.body ?? {};
  // Tenant isolation: force the airline code from the session.
  const saved = store.saveTemplate({ ...body, airlineCode: req.session!.airlineCode });
  res.json(saved);
});

app.post("/api/v1/templates/:templateId/duplicate", requireAuth, requireRole("airline_officer"), (req, res) => {
  const copy = store.duplicateTemplate(req.params.templateId);
  if (!copy) return res.status(404).json({ error: "not_found" });
  res.json(copy);
});

app.delete("/api/v1/templates/:templateId", requireAuth, requireRole("airline_officer"), (req, res) => {
  store.deleteTemplate(req.params.templateId);
  res.json({ ok: true });
});

// ------------------------------------------------------ flight progression

app.post("/api/v1/flights/:flightId/status", requireAuth, requireRole("airline_officer"), (req, res) => {
  store.setFlightStatus(req.params.flightId, req.body?.status);
  res.json(store.listFlights());
});

// ------------------------------------------------------------- admin API

app.get("/api/v1/admin/screens/telemetry", requireAuth, requireRole("airport_admin"), (_req, res) => {
  const now = Date.now();
  const units = store.listScreens().map((s, i) => ({
    gduHardwareId: s.gduHardwareId,
    gateId: s.gateId,
    screenId: s.screenId,
    screenIndex: s.screenIndex,
    displaySize: s.displaySize,
    online: s.isOnline,
    gpuTemp: 42 + Math.round(Math.sin((now / 60000) + s.gateId.length + s.screenIndex) * 6) + (i % 5),
    lastHeartbeat: s.lastHeartbeat,
  }));
  res.json(units);
});

app.post("/api/v1/admin/screens", requireAuth, requireRole("airport_admin"), (req, res) => {
  const { gateId, label, displaySize } = req.body ?? {};
  const s = store.addScreen(gateId, { label, displaySize });
  res.json(s);
});

app.put("/api/v1/admin/screens/:screenId", requireAuth, requireRole("airport_admin"), (req, res) => {
  store.updateScreen(req.params.screenId, req.body ?? {});
  res.json({ ok: true });
});

app.delete("/api/v1/admin/screens/:screenId", requireAuth, requireRole("airport_admin"), (req, res) => {
  store.removeScreen(req.params.screenId);
  res.json({ ok: true });
});

app.get("/api/v1/admin/accounts", requireAuth, requireRole("airport_admin"), (_req, res) => {
  res.json(store.listAccounts());
});

app.post("/api/v1/admin/accounts", requireAuth, requireRole("airport_admin"), (req, res) => {
  const { airlineCode, username, password, allowedGates } = req.body ?? {};
  const u = String(username ?? "").trim();
  const p = String(password ?? "").trim();
  if (!u || !p) return res.status(400).json({ error: "invalid_input" });
  if (p.length < 4) return res.status(400).json({ error: "password_too_short" });
  if (store.findAccount(u)) return res.status(409).json({ error: "username_taken" });
  const acc = store.addAccount({
    userId: `officer-${u.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`,
    airlineCode,
    username: u,
    password: p,
    allowedGates: allowedGates?.length ? allowedGates : ["*"],
    createdAt: new Date().toISOString(),
  });
  res.status(201).json(acc);
});

app.get("/api/v1/admin/broadcast", requireAuth, requireRole("airport_admin"), (_req, res) => {
  res.json(store.getEmergency());
});

app.post("/api/v1/admin/broadcast/override", requireAuth, requireRole("airport_admin"), (req, res) => {
  const { active, message } = req.body ?? {};
  const st = store.setEmergency(!!active, String(message ?? ""));
  // Push to every GDU so the override hits all screens at once.
  for (const s of store.listScreens()) pushScreen(s.gateId, s.screenId);
  res.json(st);
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "sbg-signage-backend" }));

// -------------------------------------------------------- WebSocket push

const gduClients = new Map<string, WebSocket>();

function pushScreen(gateId: string, screenId: string) {
  const s = store.listScreens().find((x) => x.gateId === gateId && x.screenId === screenId);
  if (!s) return;
  const payload = {
    type: "layout",
    screen: s,
    template: s.templateId ? store.getTemplate(s.templateId) ?? null : null,
    flight: s.flightId ? store.getFlight(s.flightId) ?? null : null,
    emergency: store.getEmergency(),
  };
  const client = gduClients.get(s.gduHardwareId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(payload));
  }
}

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = req.url ?? "";
  if (!url.startsWith("/ws/v1/gdu/")) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

wss.on("connection", (ws, req) => {
  const gduId = decodeURIComponent((req.url ?? "").split("/").pop() ?? "");
  gduClients.set(gduId, ws);
  ws.on("message", (raw) => {
    // GDU heartbeat / telemetry: refresh lastHeartbeat.
    try {
      const msg = JSON.parse(String(raw));
      if (msg.type === "heartbeat") {
        const s = store.listScreens().find((x) => x.gduHardwareId === gduId);
        if (s) s.lastHeartbeat = new Date().toISOString();
      }
    } catch {
      /* ignore malformed */
    }
  });
  ws.on("close", () => {
    if (gduClients.get(gduId) === ws) gduClients.delete(gduId);
  });
  // Push current state immediately on connect.
  const s = store.listScreens().find((x) => x.gduHardwareId === gduId);
  if (s) pushScreen(s.gateId, s.screenId);
});

server.listen(PORT, () => {
  console.log(`[sbg-backend] listening on :${PORT}  (REST + /ws/v1/gdu/:id)`);
});
