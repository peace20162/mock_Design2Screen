import type { AirlineAccount, EmergencyState, Flight, GateScreen, SignageTemplate } from "./types";
import { AIRLINES, GATES, SEED_ACCOUNTS, SEED_FLIGHTS, SEED_TEMPLATES, seedScreens } from "./seed";

// The storage seam. Production uses a PostgreSQL-backed store (schema in
// init.sql, wired via docker-compose + DATABASE_URL); this scaffold ships a
// full in-memory implementation so the API runs anywhere without a DB. A
// PostgresStore is a drop-in that implements this same interface.
export interface Store {
  // auth / accounts
  findAccount(username: string): AirlineAccount | undefined;
  listAccounts(): AirlineAccount[];
  addAccount(a: AirlineAccount): AirlineAccount;
  // reference
  listAirlines(): { code: string; name: string; nameTh: string; accent: string }[];
  listGates(): string[];
  listAirlineGates(airlineCode: string): string[];
  listFlights(gateId?: string): Flight[];
  getFlight(id: string): Flight | undefined;
  // screens
  listScreens(): GateScreen[];
  addScreen(gateId: string, cfg: { label: string; displaySize: "43_inch" | "55_inch" }): GateScreen;
  updateScreen(screenId: string, patch: Partial<Pick<GateScreen, "label" | "displaySize" | "gduHardwareId">>): void;
  removeScreen(screenId: string): void;
  assignScreen(gateId: string, screenId: string, templateId: string, flightId: string): void;
  setScreenFlight(gateId: string, screenId: string, flightId: string): void;
  releaseGate(gateId: string): void;
  // templates
  listTemplates(airlineCode: string): SignageTemplate[];
  listAllTemplates(): SignageTemplate[];
  getTemplate(id: string): SignageTemplate | undefined;
  saveTemplate(t: SignageTemplate): SignageTemplate;
  deleteTemplate(id: string): void;
  duplicateTemplate(id: string): SignageTemplate | undefined;
  // flight progression
  setFlightStatus(flightId: string, status: Flight["status"]): void;
  // emergency
  setEmergency(active: boolean, message: string): EmergencyState;
  getEmergency(): EmergencyState;
}

export class MemoryStore implements Store {
  private accounts: AirlineAccount[] = SEED_ACCOUNTS.map((a) => ({ ...a }));
  private flights: Flight[] = SEED_FLIGHTS.map((f) => ({ ...f }));
  private screens: GateScreen[] = seedScreens();
  private templates: SignageTemplate[] = SEED_TEMPLATES.map((t) => structuredClone(t));
  private emergency: EmergencyState = { active: false, message: "" };

  findAccount(username: string) {
    return this.accounts.find((a) => a.username === username.trim());
  }
  listAccounts() {
    return this.accounts.map((a) => ({ ...a }));
  }
  addAccount(a: AirlineAccount) {
    this.accounts.unshift({ ...a });
    return a;
  }

  listAirlines() {
    return AIRLINES;
  }
  listGates() {
    return GATES;
  }
  listAirlineGates(airlineCode: string) {
    const gates = new Set<string>();
    for (const a of this.accounts) {
      if (a.airlineCode === airlineCode) for (const g of a.allowedGates) if (g !== "*") gates.add(g);
    }
    return [...gates].sort();
  }
  listFlights(gateId?: string) {
    return this.flights
      .filter((f) => (!gateId || f.gate === gateId) && f.status !== "departed")
      .map((f) => ({ ...f }));
  }
  getFlight(id: string) {
    const f = this.flights.find((x) => x.id === id);
    return f ? { ...f } : undefined;
  }

  listScreens() {
    return this.screens.map((s) => ({ ...s }));
  }
  addScreen(gateId: string, cfg: { label: string; displaySize: "43_inch" | "55_inch" }) {
    const existing = this.screens.filter((s) => s.gateId === gateId);
    const next = existing.reduce((m, s) => Math.max(m, s.screenIndex), 0) + 1;
    const screen: GateScreen = {
      gateId,
      screenId: `screen_${next}`,
      screenIndex: next,
      label: cfg.label || `Screen ${next}`,
      displaySize: cfg.displaySize,
      gduHardwareId: `GDU-${gateId}-S${next}`,
      currentMode: "ifims_default",
      isOnline: true,
      lastHeartbeat: new Date().toISOString(),
      templateId: null,
      flightId: null,
    };
    this.screens.push(screen);
    return { ...screen };
  }
  updateScreen(screenId: string, patch: Partial<Pick<GateScreen, "label" | "displaySize" | "gduHardwareId">>) {
    const s = this.screens.find((x) => x.screenId === screenId);
    if (!s) return;
    if (patch.label !== undefined) s.label = patch.label;
    if (patch.displaySize !== undefined) s.displaySize = patch.displaySize;
    if (patch.gduHardwareId !== undefined) s.gduHardwareId = patch.gduHardwareId;
  }
  removeScreen(screenId: string) {
    this.screens = this.screens.filter((x) => x.screenId !== screenId);
  }
  assignScreen(gateId: string, screenId: string, templateId: string, flightId: string) {
    const s = this.screens.find((x) => x.gateId === gateId && x.screenId === screenId);
    if (s) {
      s.templateId = templateId;
      s.flightId = flightId;
      s.currentMode = this.emergency.active ? "emergency" : "template";
      s.lastHeartbeat = new Date().toISOString();
    }
  }
  setScreenFlight(gateId: string, screenId: string, flightId: string) {
    const s = this.screens.find((x) => x.gateId === gateId && x.screenId === screenId);
    if (s) {
      s.flightId = flightId;
      s.lastHeartbeat = new Date().toISOString();
    }
  }
  releaseGate(gateId: string) {
    this.screens.forEach((s) => {
      if (s.gateId === gateId) {
        s.templateId = null;
        s.flightId = null;
        s.currentMode = "ifims_default";
      }
    });
  }

  listTemplates(airlineCode: string) {
    return this.templates
      .filter((t) => t.airlineCode === airlineCode)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((t) => structuredClone(t));
  }
  listAllTemplates() {
    return this.templates.map((t) => structuredClone(t));
  }
  getTemplate(id: string) {
    const t = this.templates.find((x) => x.templateId === id);
    return t ? structuredClone(t) : undefined;
  }
  saveTemplate(t: SignageTemplate) {
    const now = new Date().toISOString();
    const existing = this.templates.find((x) => x.templateId === t.templateId);
    if (existing) {
      Object.assign(existing, structuredClone(t), { updatedAt: now, version: existing.version + 1 });
      return structuredClone(existing);
    }
    const created: SignageTemplate = {
      ...structuredClone(t),
      templateId: t.templateId || `tpl-${t.airlineCode.toLowerCase()}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.templates.unshift(created);
    return structuredClone(created);
  }
  deleteTemplate(id: string) {
    this.templates = this.templates.filter((t) => t.templateId !== id);
  }
  duplicateTemplate(id: string) {
    const src = this.templates.find((t) => t.templateId === id);
    if (!src) return undefined;
    const now = new Date().toISOString();
    const copy: SignageTemplate = {
      ...structuredClone(src),
      templateId: `tpl-${src.airlineCode.toLowerCase()}-${Math.random().toString(36).slice(2, 10)}`,
      templateName: `${src.templateName} (copy)`,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.templates.unshift(copy);
    return structuredClone(copy);
  }

  setFlightStatus(flightId: string, status: Flight["status"]) {
    const f = this.flights.find((x) => x.id === flightId);
    if (f) f.status = status;
  }

  setEmergency(active: boolean, message: string) {
    this.emergency = { active, message };
    this.screens.forEach((s) => {
      if (active) s.currentMode = "emergency";
      else s.currentMode = s.templateId ? "template" : "ifims_default";
    });
    return { ...this.emergency };
  }
  getEmergency() {
    return { ...this.emergency };
  }
}

// Production: `DATABASE_URL` selects a PostgreSQL-backed store (schema init.sql).
// This scaffold runs the full-featured in-memory store so the API boots without
// a database; the interface above is the swap seam.
export function createStore(): Store {
  return new MemoryStore();
}