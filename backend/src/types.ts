// Shared wire contracts — mirror the frontend `src/types` so the HTTP client
// maps 1:1. Kept minimal; JSON is the transport.

export type FlightStatus =
  | "scheduled"
  | "boarding"
  | "zones"
  | "final_call"
  | "delayed"
  | "gate_closed"
  | "departed";

export interface Flight {
  id: string;
  flightNumber: string;
  airlineCode: string;
  destination: string;
  destinationCode: string;
  origin: string;
  originCode: string;
  std: string;
  etd: string;
  gate: string;
  status: FlightStatus;
  codeshares: string[];
  remarks?: string;
}

export type ScreenMode = "template" | "ifims_default" | "emergency";

export interface GateScreen {
  gateId: string;
  screenId: string;
  screenIndex: number;
  label: string;
  gduHardwareId: string;
  displaySize: "43_inch" | "55_inch";
  currentMode: ScreenMode;
  isOnline: boolean;
  lastHeartbeat: string;
  templateId: string | null;
  flightId: string | null;
}

export interface GduUnit {
  gduHardwareId: string;
  gateId: string;
  screenId: string;
  screenIndex: number;
  displaySize: "43_inch" | "55_inch";
  online: boolean;
  gpuTemp: number;
  lastHeartbeat: string;
}

export interface SignageTemplate {
  templateId: string;
  airlineCode: string;
  templateName: string;
  category: string;
  layoutConfig: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
  originGate: string;
  version: number;
}

export interface AirlineAccount {
  userId: string;
  airlineCode: string;
  username: string;
  password: string; // plaintext in-memory only; real backend stores a hash
  allowedGates: string[];
  createdAt: string;
}

export interface EmergencyState {
  active: boolean;
  message: string;
}

export interface Session {
  role: "airline_officer" | "airport_admin";
  officerId?: string;
  airlineCode?: string;
  username?: string;
  assignedGate?: string;
  userId?: string;
  name?: string;
  email?: string;
}