import type {
  AdminSession,
  Airline,
  AirlineAccount,
  Flight,
  FlightStatus,
  GduUnit,
  GateScreen,
  OfficerSession,
  ScreenId,
  Session,
  SignageTemplate,
} from "../types";
import type { AppSnapshot, EmergencyState, SignageService } from "./SignageService";
import {
  ADMIN_ACCOUNT,
  AIRLINES,
  FLIGHTS,
  GATES,
  OFFICER_ACCOUNTS,
  SEED_TEMPLATES,
  blankGateScreens,
  makeGdus,
} from "./mockData";

const LS_KEY = "sbg-signage-mock-v1";

interface PersistedState {
  flights: Flight[];
  screens: GateScreen[];
  templates: SignageTemplate[];
  accounts: AirlineAccount[];
  emergency: EmergencyState;
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export class MockSignageService implements SignageService {
  private session: Session | null = null;
  private flights: Flight[];
  private screens: GateScreen[];
  private templates: SignageTemplate[];
  private accounts: AirlineAccount[];
  private emergency: EmergencyState;

  constructor() {
    const s = this.load();
    this.flights = s.flights;
    this.screens = s.screens;
    this.templates = s.templates;
    this.accounts = s.accounts;
    this.emergency = s.emergency;
  }

  private load(): PersistedState {
    let parsed: Partial<PersistedState> | null = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) parsed = JSON.parse(raw) as Partial<PersistedState>;
    } catch {
      /* ignore */
    }
    // Schema migration: screens gained `screenIndex` + `label` in the DEC-14
    // refactor. Re-seed screens if the persisted shape predates that change,
    // while keeping flights/templates/accounts/emergency.
    const screens =
      parsed?.screens &&
      parsed.screens.every(
        (s) => typeof (s as GateScreen).screenIndex === "number" && typeof (s as GateScreen).label === "string"
      )
        ? parsed.screens
        : blankGateScreens();
    return {
      flights: parsed?.flights ?? deepClone(FLIGHTS),
      screens,
      templates: parsed?.templates ?? deepClone(SEED_TEMPLATES),
      accounts: parsed?.accounts ?? deepClone(OFFICER_ACCOUNTS),
      emergency: parsed?.emergency ?? { active: false, message: "" },
    };
  }

  private persist() {
    const state: PersistedState = {
      flights: this.flights,
      screens: this.screens,
      templates: this.templates,
      accounts: this.accounts,
      emergency: this.emergency,
    };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable (private mode) — mock still works in-memory */
    }
  }

  // ------------------------------------------------------------- auth

  async loginAirline(params: {
    airlineCode: string;
    gateId: string;
    username: string;
    password: string;
  }): Promise<OfficerSession> {
    const username = params.username.trim();
    const password = params.password.trim();
    const acc = this.accounts.find(
      (a) => a.username === username && a.password === password
    );
    // Multi-tenant + gate-scope enforcement: account must belong to the chosen
    // airline and be allowed the chosen gate.
    if (!acc || acc.airlineCode !== params.airlineCode) {
      throw new Error("invalid_credentials");
    }
    if (!acc.allowedGates.includes("*") && !acc.allowedGates.includes(params.gateId)) {
      throw new Error("gate_not_allowed");
    }
    const session: OfficerSession = {
      role: "airline_officer",
      officerId: acc.userId,
      airlineCode: acc.airlineCode,
      username: acc.username,
      assignedGate: params.gateId,
      sessionId: crypto.randomUUID(),
    };
    this.session = session;
    return session;
  }

  async loginAdmin(): Promise<AdminSession> {
    const session: AdminSession = {
      role: "airport_admin",
      userId: "aot-admin-1",
      name: ADMIN_ACCOUNT.name,
      email: ADMIN_ACCOUNT.email,
      sessionId: crypto.randomUUID(),
    };
    this.session = session;
    return session;
  }

  getSession(): Session | null {
    return this.session;
  }

  async listAirlineAccounts(): Promise<AirlineAccount[]> {
    return deepClone(this.accounts);
  }

  async createAirlineAccount(params: {
    airlineCode: string;
    username: string;
    password: string;
    allowedGates: string[];
  }): Promise<AirlineAccount> {
    if (!this.session || this.session.role !== "airport_admin") {
      throw new Error("unauthorized");
    }
    const username = params.username.trim();
    const password = params.password.trim();
    if (!username || !password) throw new Error("invalid_input");
    if (password.length < 4) throw new Error("password_too_short");
    if (this.accounts.some((a) => a.username === username)) throw new Error("username_taken");

    const acc: AirlineAccount = {
      userId: `officer-${username.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`,
      airlineCode: params.airlineCode,
      username,
      password,
      allowedGates: params.allowedGates.length ? params.allowedGates : ["*"],
      createdAt: new Date().toISOString(),
    };
    this.accounts.unshift(acc);
    this.persist();
    return { ...acc };
  }

  // -------------------------------------------------------- reference data

  async listAirlines(): Promise<Airline[]> {
    return AIRLINES;
  }
  async listGates(): Promise<string[]> {
    return deepClone(GATES);
  }

  async listAirlineGates(airlineCode: string): Promise<string[]> {
    // Gates an airline is provisioned to operate (union of its accounts' allowedGates).
    const gates = new Set<string>();
    for (const a of this.accounts) {
      if (a.airlineCode === airlineCode) {
        for (const g of a.allowedGates) if (g !== "*") gates.add(g);
      }
    }
    return [...gates].sort();
  }
  async listFlights(gateId: string): Promise<Flight[]> {
    return deepClone(
      this.flights.filter((f) => f.gate === gateId && f.status !== "departed")
    );
  }
  async listAllFlights(): Promise<Flight[]> {
    return deepClone(this.flights);
  }
  getFlight(id: string): Flight | null {
    return this.flights.find((f) => f.id === id) ?? null;
  }

  // ------------------------------------------------- templates

  async listTemplates(airlineCode: string): Promise<SignageTemplate[]> {
    return deepClone(
      this.templates
        .filter((t) => t.airlineCode === airlineCode)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    );
  }

  async getTemplate(templateId: string): Promise<SignageTemplate | null> {
    const t = this.templates.find((x) => x.templateId === templateId);
    return t ? deepClone(t) : null;
  }

  async listAllTemplates(): Promise<SignageTemplate[]> {
    return deepClone(this.templates);
  }

  // Tenant isolation (doc §5.3): the stored airlineCode is forced from the
  // session regardless of any client-supplied value.
  async saveTemplate(template: SignageTemplate): Promise<SignageTemplate> {
    if (!this.session || this.session.role !== "airline_officer") {
      throw new Error("unauthorized");
    }
    const tenant = this.session.airlineCode;
    const now = new Date().toISOString();
    const existing = this.templates.find((t) => t.templateId === template.templateId);
    if (existing) {
      Object.assign(existing, deepClone(template), {
        airlineCode: tenant,
        updatedAt: now,
        lastModifiedBy: this.session.officerId,
        version: existing.version + 1,
      });
      this.persist();
      return deepClone(existing);
    }
    const created: SignageTemplate = {
      ...deepClone(template),
      templateId: template.templateId || `tpl-${tenant.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
      airlineCode: tenant,
      createdAt: now,
      updatedAt: now,
      createdBy: this.session.officerId,
      lastModifiedBy: this.session.officerId,
      originGate: this.session.assignedGate,
      version: 1,
    };
    this.templates.unshift(created);
    this.persist();
    return deepClone(created);
  }

  async duplicateTemplate(templateId: string): Promise<SignageTemplate> {
    if (!this.session || this.session.role !== "airline_officer") {
      throw new Error("unauthorized");
    }
    const src = this.templates.find((t) => t.templateId === templateId);
    if (!src) throw new Error("not_found");
    const now = new Date().toISOString();
    const copy: SignageTemplate = {
      ...deepClone(src),
      templateId: `tpl-${src.airlineCode.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
      templateName: `${src.templateName} (copy)`,
      createdAt: now,
      updatedAt: now,
      createdBy: this.session.officerId,
      lastModifiedBy: this.session.officerId,
      version: 1,
    };
    this.templates.unshift(copy);
    this.persist();
    return deepClone(copy);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.session || this.session.role !== "airline_officer") {
      throw new Error("unauthorized");
    }
    this.templates = this.templates.filter((t) => t.templateId !== templateId);
    // Detach from any screen that referenced it.
    this.screens.forEach((s) => {
      if (s.templateId === templateId) {
        s.templateId = null;
        s.currentMode = s.currentMode === "emergency" ? "emergency" : "ifims_default";
      }
    });
    this.persist();
  }

  // ------------------------------------------------------------ screens

  async listScreens(): Promise<GateScreen[]> {
    return deepClone(this.screens);
  }

  async assignScreen(
    gateId: string,
    screenId: ScreenId,
    templateId: string,
    flightId: string
  ): Promise<GateScreen[]> {
    const s = this.screens.find((x) => x.gateId === gateId && x.screenId === screenId);
    if (s) {
      s.templateId = templateId;
      s.flightId = flightId;
      s.currentMode = this.emergency.active ? "emergency" : "template";
      s.lastHeartbeat = new Date().toISOString();
    }
    this.persist();
    return deepClone(this.screens);
  }

  async setScreenFlight(
    gateId: string,
    screenId: ScreenId,
    flightId: string
  ): Promise<GateScreen[]> {
    const s = this.screens.find((x) => x.gateId === gateId && x.screenId === screenId);
    if (s) {
      s.flightId = flightId;
      s.lastHeartbeat = new Date().toISOString();
    }
    this.persist();
    return deepClone(this.screens);
  }

  async releaseGate(gateId: string): Promise<GateScreen[]> {
    this.screens.forEach((s) => {
      if (s.gateId === gateId) {
        s.templateId = null;
        s.flightId = null;
        s.currentMode = "ifims_default";
      }
    });
    this.persist();
    return deepClone(this.screens);
  }

  // ------------------------------------------------- dynamic screens (admin, DEC-14)

  private requireAdmin() {
    if (!this.session || this.session.role !== "airport_admin") {
      throw new Error("unauthorized");
    }
  }

  async addScreen(
    gateId: string,
    cfg: { label: string; displaySize: "43_inch" | "55_inch" }
  ): Promise<GateScreen[]> {
    this.requireAdmin();
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
    this.persist();
    return deepClone(this.screens);
  }

  async updateScreen(
    screenId: string,
    patch: { label?: string; displaySize?: "43_inch" | "55_inch"; gduHardwareId?: string }
  ): Promise<GateScreen[]> {
    this.requireAdmin();
    const s = this.screens.find((x) => x.screenId === screenId);
    if (s) {
      if (patch.label !== undefined) s.label = patch.label;
      if (patch.displaySize !== undefined) s.displaySize = patch.displaySize;
      if (patch.gduHardwareId !== undefined) s.gduHardwareId = patch.gduHardwareId;
    }
    this.persist();
    return deepClone(this.screens);
  }

  async removeScreen(screenId: string): Promise<GateScreen[]> {
    this.requireAdmin();
    this.screens = this.screens.filter((x) => x.screenId !== screenId);
    this.persist();
    return deepClone(this.screens);
  }

  // ------------------------------------------------- flight progression

  async setFlightStatus(flightId: string, status: FlightStatus): Promise<Flight[]> {
    const f = this.flights.find((x) => x.id === flightId);
    if (f) f.status = status;
    this.persist();
    return deepClone(this.flights);
  }

  // ------------------------------------------------- telemetry + override

  async listTelemetry(): Promise<GduUnit[]> {
    // Slight jitter so the console feels live.
    const now = Date.now();
    const units = makeGdus(this.screens).map((g) => {
      const s = this.screens.find((x) => x.gduHardwareId === g.gduHardwareId);
      return {
        ...g,
        online: this.emergency.active ? true : !!s?.isOnline,
        lastHeartbeat: s?.lastHeartbeat ?? new Date(now).toISOString(),
      };
    });
    return units;
  }

  async setEmergencyOverride(active: boolean, message = ""): Promise<EmergencyState> {
    this.emergency = { active, message };
    this.screens.forEach((s) => {
      if (active) s.currentMode = "emergency";
      else s.currentMode = s.templateId ? "template" : "ifims_default";
    });
    this.persist();
    return { ...this.emergency };
  }

  getEmergencyState(): EmergencyState {
    return { ...this.emergency };
  }

  async pullAll(): Promise<AppSnapshot> {
    return this.snapshot();
  }

  snapshot(): AppSnapshot {
    return {
      flights: deepClone(this.flights),
      screens: deepClone(this.screens),
      telemetry: makeGdus(this.screens).map((g) => {
        const s = this.screens.find((x) => x.gduHardwareId === g.gduHardwareId);
        return { ...g, lastHeartbeat: s?.lastHeartbeat ?? g.lastHeartbeat };
      }),
      emergency: { ...this.emergency },
    };
  }
}

export const service = new MockSignageService();