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
  SignageTemplate,
} from "../types";
import type { AppSnapshot, EmergencyState, SignageService } from "./SignageService";

// HTTP/WS implementation of the SignageService seam (ADR-0014). Talks to the
// backend (backend/src/index.ts). Selected via VITE_DATA_MODE=http.
export class HttpSignageService implements SignageService {
  private token: string | null = null;
  private cache: AppSnapshot = {
    flights: [],
    screens: [],
    telemetry: [],
    emergency: { active: false, message: "" },
  };

  constructor(private baseUrl: string) {}

  private authHeaders(): Record<string, string> {
    return this.token ? { authorization: `Bearer ${this.token}` } : {};
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      method,
      headers: { "content-type": "application/json", ...this.authHeaders() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `http_${res.status}`);
    }
    return (await res.json()) as T;
  }

  // --------------------------------------------------------------- auth

  async loginAirline(params: {
    airlineCode: string;
    gateId: string;
    username: string;
    password: string;
  }): Promise<OfficerSession> {
    const r = await this.req<{ token: string; session: OfficerSession }>(
      "POST",
      "/api/v1/auth/airline/login",
      params
    );
    this.token = r.token;
    return r.session;
  }

  async loginAdmin(): Promise<AdminSession> {
    const r = await this.req<{ token: string; session: AdminSession }>(
      "POST",
      "/api/v1/auth/admin/login"
    );
    this.token = r.token;
    return r.session;
  }

  // -------------------------------------------------------- reference data

  async listAirlines(): Promise<Airline[]> {
    return this.req("GET", "/api/v1/airlines");
  }
  async listGates(): Promise<string[]> {
    return this.req("GET", "/api/v1/gates");
  }

  async listAirlineGates(airlineCode: string): Promise<string[]> {
    return this.req("GET", `/api/v1/airlines/${airlineCode}/gates`);
  }
  async listFlights(gateId: string): Promise<Flight[]> {
    return this.req("GET", `/api/v1/flights?gate=${encodeURIComponent(gateId)}`);
  }
  async listAllFlights(): Promise<Flight[]> {
    const f = await this.req<Flight[]>("GET", "/api/v1/flights");
    this.cache.flights = f;
    return f;
  }

  // ------------------------------------------------- account provisioning

  async listAirlineAccounts(): Promise<AirlineAccount[]> {
    return this.req("GET", "/api/v1/admin/accounts");
  }

  async createAirlineAccount(params: {
    airlineCode: string;
    username: string;
    password: string;
    allowedGates: string[];
  }): Promise<AirlineAccount> {
    return this.req("POST", "/api/v1/admin/accounts", params);
  }

  // ------------------------------------------------------------- templates

  async listTemplates(airlineCode: string): Promise<SignageTemplate[]> {
    return this.req("GET", `/api/v1/airlines/${airlineCode}/templates`);
  }
  async listAllTemplates(): Promise<SignageTemplate[]> {
    return this.req("GET", "/api/v1/templates");
  }
  async getTemplate(templateId: string): Promise<SignageTemplate | null> {
    try {
      return await this.req("GET", `/api/v1/templates/${templateId}`);
    } catch {
      return null;
    }
  }
  async saveTemplate(template: SignageTemplate): Promise<SignageTemplate> {
    return this.req("POST", `/api/v1/airlines/${template.airlineCode}/templates`, template);
  }
  async duplicateTemplate(templateId: string): Promise<SignageTemplate> {
    return this.req("POST", `/api/v1/templates/${templateId}/duplicate`);
  }
  async deleteTemplate(templateId: string): Promise<void> {
    await this.req("DELETE", `/api/v1/templates/${templateId}`);
  }

  // ---------------------------------------------------------------- screens

  async listScreens(): Promise<GateScreen[]> {
    const s = await this.req<GateScreen[]>("GET", "/api/v1/screens");
    this.cache.screens = s;
    return s;
  }
  async assignScreen(
    gateId: string,
    screenId: ScreenId,
    templateId: string,
    flightId: string
  ): Promise<GateScreen[]> {
    const s = await this.req<GateScreen[]>(
      "POST",
      `/api/v1/gates/${gateId}/screens/${screenId}/assign`,
      { templateId, flightId }
    );
    this.cache.screens = s;
    return s;
  }
  async setScreenFlight(gateId: string, screenId: ScreenId, flightId: string): Promise<GateScreen[]> {
    const s = await this.req<GateScreen[]>(
      "POST",
      `/api/v1/gates/${gateId}/screens/${screenId}/flight`,
      { flightId }
    );
    this.cache.screens = s;
    return s;
  }
  async releaseGate(gateId: string): Promise<GateScreen[]> {
    const s = await this.req<GateScreen[]>("POST", `/api/v1/gates/${gateId}/release`);
    this.cache.screens = s;
    return s;
  }
  async addScreen(gateId: string, cfg: { label: string; displaySize: "43_inch" | "55_inch" }): Promise<GateScreen[]> {
    await this.req("POST", "/api/v1/admin/screens", { gateId, ...cfg });
    return this.listScreens();
  }
  async updateScreen(
    screenId: string,
    patch: { label?: string; displaySize?: "43_inch" | "55_inch"; gduHardwareId?: string }
  ): Promise<GateScreen[]> {
    await this.req("PUT", `/api/v1/admin/screens/${screenId}`, patch);
    return this.listScreens();
  }
  async removeScreen(screenId: string): Promise<GateScreen[]> {
    await this.req("DELETE", `/api/v1/admin/screens/${screenId}`);
    return this.listScreens();
  }

  // ------------------------------------------------------ flight progression

  async setFlightStatus(flightId: string, status: FlightStatus): Promise<Flight[]> {
    const f = await this.req<Flight[]>("POST", `/api/v1/flights/${flightId}/status`, { status });
    this.cache.flights = f;
    return f;
  }

  // ------------------------------------------------- telemetry + override

  async listTelemetry(): Promise<GduUnit[]> {
    const t = await this.req<GduUnit[]>("GET", "/api/v1/admin/screens/telemetry");
    this.cache.telemetry = t;
    return t;
  }
  async setEmergencyOverride(active: boolean, message = ""): Promise<EmergencyState> {
    const e = await this.req<EmergencyState>("POST", "/api/v1/admin/broadcast/override", {
      active,
      message,
    });
    this.cache.emergency = e;
    return e;
  }
  getEmergencyState(): EmergencyState {
    return { ...this.cache.emergency };
  }

  // ------------------------------------------------------------- snapshot

  async pullAll(): Promise<AppSnapshot> {
    const [screens, flights] = await Promise.all([
      this.req<GateScreen[]>("GET", "/api/v1/screens"),
      this.req<Flight[]>("GET", "/api/v1/flights"),
    ]);
    this.cache.screens = screens;
    this.cache.flights = flights;
    return { ...this.cache };
  }

  snapshot(): AppSnapshot {
    return {
      flights: [...this.cache.flights],
      screens: [...this.cache.screens],
      telemetry: [...this.cache.telemetry],
      emergency: { ...this.cache.emergency },
    };
  }
}

// Re-export the account type for callers that need it.
export type { AirlineAccount };