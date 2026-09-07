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

// The seam from ADR-0014. Every UI read/write crosses this interface, whose
// signatures mirror Architecture_v2.md §7.3. v1 ships MockSignageService; a
// future HttpSignageService implements the same surface over REST/WS with no
// UI change.
export interface SignageService {
  // auth
  loginAirline(params: {
    airlineCode: string;
    gateId: string;
    username: string;
    password: string;
  }): Promise<OfficerSession>;
  loginAdmin(): Promise<AdminSession>;

  // reference data
  listAirlines(): Promise<Airline[]>;
  listGates(): Promise<string[]>;
  listAirlineGates(airlineCode: string): Promise<string[]>;
  listFlights(gateId: string): Promise<Flight[]>;
  listAllFlights(): Promise<Flight[]>;

  // airline account provisioning (admin)
  listAirlineAccounts(): Promise<AirlineAccount[]>;
  createAirlineAccount(params: {
    airlineCode: string;
    username: string;
    password: string;
    allowedGates: string[];
  }): Promise<AirlineAccount>;

  // tenant-aware templates
  listTemplates(airlineCode: string): Promise<SignageTemplate[]>;
  listAllTemplates(): Promise<SignageTemplate[]>;
  getTemplate(templateId: string): Promise<SignageTemplate | null>;
  saveTemplate(template: SignageTemplate): Promise<SignageTemplate>;
  duplicateTemplate(templateId: string): Promise<SignageTemplate>;
  deleteTemplate(templateId: string): Promise<void>;

  // screens
  listScreens(): Promise<GateScreen[]>;
  assignScreen(
    gateId: string,
    screenId: ScreenId,
    templateId: string,
    flightId: string
  ): Promise<GateScreen[]>;
  setScreenFlight(gateId: string, screenId: ScreenId, flightId: string): Promise<GateScreen[]>;
  releaseGate(gateId: string): Promise<GateScreen[]>;
  addScreen(gateId: string, cfg: { label: string; displaySize: "43_inch" | "55_inch" }): Promise<GateScreen[]>;
  updateScreen(
    screenId: string,
    patch: { label?: string; displaySize?: "43_inch" | "55_inch"; gduHardwareId?: string }
  ): Promise<GateScreen[]>;
  removeScreen(screenId: string): Promise<GateScreen[]>;

  // flight status progression
  setFlightStatus(flightId: string, status: FlightStatus): Promise<Flight[]>;

  // telemetry + admin
  listTelemetry(): Promise<GduUnit[]>;
  setEmergencyOverride(active: boolean, message?: string): Promise<EmergencyState>;
  getEmergencyState(): EmergencyState;
  // Fetch a full snapshot over the wire (async equivalent of the mock's sync
  // snapshot) so the UI stores can hydrate in either data mode.
  pullAll(): Promise<AppSnapshot>;
}

export interface EmergencyState {
  active: boolean;
  message: string;
}

// A consistent snapshot for the UI stores to hydrate from after any mutation.
export interface AppSnapshot {
  flights: Flight[];
  screens: GateScreen[];
  telemetry: GduUnit[];
  emergency: EmergencyState;
}