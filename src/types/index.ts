// Domain types per Architecture_v2.md §7.1, cleaned of the doc's duplicated
// layoutConfig block.

export type Role = "airline_officer" | "airport_admin";

export interface AirlineUserAccount {
  userId: string;
  airlineCode: string;
  username: string;
  passwordHash: string;
  allowedGates: string[]; // ["D1","D2"] or ["*"]
  createdAt: string;
}

// Mock-only account record (plaintext credential — a real backend stores a hash).
export interface AirlineAccount {
  userId: string;
  airlineCode: string;
  username: string;
  password: string;
  allowedGates: string[];
  createdAt: string;
}

export interface OfficerSession {
  role: "airline_officer";
  officerId: string;
  airlineCode: string;
  username: string;
  assignedGate: string;
  sessionId: string;
}

export interface AdminSession {
  role: "airport_admin";
  userId: string;
  name: string;
  email: string;
  sessionId: string;
}

export type Session = OfficerSession | AdminSession;

export interface Airline {
  code: string;
  name: string; // English
  nameTh: string; // Thai
  accent: string; // brand colour for avatar chip
}

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
  flightNumber: string; // "TG920"
  airlineCode: string; // "TG"
  destination: string; // "Frankfurt (FRA)"
  destinationCode: string; // "FRA"
  origin: string; // "Bangkok (BKK)"
  originCode: string; // "BKK"
  std: string; // scheduled "23:45"
  etd: string; // estimated "00:15"
  gate: string; // "D1"
  status: FlightStatus;
  codeshares: string[];
  remarks?: string;
}

export type LayerType =
  | "image"
  | "free_text"
  | "ifims_binding"
  | "clock_widget"
  | "shape_container";

export type BindingKey =
  | "flight.number"
  | "flight.destination"
  | "flight.origin"
  | "flight.status"
  | "flight.std"
  | "flight.etd"
  | "flight.gate";

export interface LayerStyle {
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  color?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  textOutline?: boolean;
  textShadow?: boolean;
  clockSeconds?: boolean; // clock_widget: tick seconds
  clockFormat?: "HH:mm" | "HH:mm:ss";
  aspectScale?: boolean; // image: cover-fit
}

export interface TemplateLayer {
  id: string;
  type: LayerType;
  locked: boolean;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string; // text content / image dataURL / shape label
  bindingKey?: BindingKey;
  statusColorMapping?: { boarding: string; finalCall: string; delayed: string };
  style: LayerStyle;
}

export type TemplateCategory =
  | "welcome"
  | "boarding"
  | "final_call"
  | "delay"
  | "gate_closed";

export interface SignageTemplate {
  templateId: string;
  airlineCode: string;
  templateName: string;
  category: TemplateCategory;
  layoutConfig: {
    resolution: { width: 1920; height: 1080 };
    gridSettings: { snapToGrid: boolean; gridGap: number; bezelSafeMargin: number };
    layers: TemplateLayer[];
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
  originGate: string;
  version: number;
}

export type ScreenId = string;

export type ScreenMode = "template" | "ifims_default" | "emergency";

export interface GateScreen {
  gateId: string;
  screenId: ScreenId;
  screenIndex: number; // 1-based position within the gate
  label: string; // e.g. "Primary", "Secondary", "Zone"
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
  screenId: ScreenId;
  screenIndex: number;
  displaySize: "43_inch" | "55_inch";
  online: boolean;
  gpuTemp: number; // Celsius
  lastHeartbeat: string;
}

// Admin screen-manager config (doc §4 GateScreenConfig).
export interface GateScreenConfig {
  gateId: string;
  screenId: string;
  screenIndex: number;
  label: string;
  displaySize: "43_inch" | "55_inch";
  gduId: string;
  status: "online" | "offline";
}