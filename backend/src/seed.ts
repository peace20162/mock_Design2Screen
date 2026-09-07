import type { AirlineAccount, Flight, GateScreen, SignageTemplate } from "./types";

export const AIRLINES = [
  { code: "TG", name: "Thai Airways", nameTh: "การบินไทย", accent: "#5b21b6" },
  { code: "PG", name: "Bangkok Airways", nameTh: "บางกอกแอร์เวย์ส", accent: "#0e7490" },
  { code: "SQ", name: "Singapore Airlines", nameTh: "สิงคโปร์แอร์ไลน์", accent: "#1e3a8a" },
  { code: "FD", name: "Thai AirAsia", nameTh: "ไทยแอร์เอเชีย", accent: "#dc2626" },
  { code: "VZ", name: "VietJet Air", nameTh: "เวียดเจ็ทแอร์", accent: "#ea580c" },
  { code: "NH", name: "All Nippon Airways", nameTh: "ออลนิปปอนแอร์เวย์", accent: "#1d4ed8" },
];

export const GATES = ["D1", "D2", "D3", "D4", "C1", "C3"];

const SCREEN_CFG: Record<string, { label: string; size: "43_inch" | "55_inch" }[]> = {
  D1: [
    { label: "Primary", size: "55_inch" },
    { label: "Secondary", size: "43_inch" },
  ],
  D2: [
    { label: "Main", size: "55_inch" },
    { label: "Zone", size: "43_inch" },
  ],
  D3: [
    { label: "Primary", size: "55_inch" },
    { label: "Secondary", size: "43_inch" },
  ],
  D4: [
    { label: "Primary", size: "55_inch" },
    { label: "Secondary", size: "43_inch" },
  ],
  C1: [
    { label: "Primary", size: "55_inch" },
    { label: "Secondary", size: "43_inch" },
    { label: "Tertiary", size: "43_inch" },
  ],
  C3: [
    { label: "Primary", size: "55_inch" },
    { label: "Secondary", size: "43_inch" },
  ],
};

export function seedScreens(): GateScreen[] {
  const now = new Date().toISOString();
  const out: GateScreen[] = [];
  for (const gateId of GATES) {
    (SCREEN_CFG[gateId] ?? []).forEach((cfg, i) => {
      out.push({
        gateId,
        screenId: `screen_${i + 1}`,
        screenIndex: i + 1,
        label: cfg.label,
        displaySize: cfg.size,
        gduHardwareId: `GDU-${gateId}-S${i + 1}`,
        currentMode: "ifims_default",
        isOnline: true,
        lastHeartbeat: now,
        templateId: null,
        flightId: null,
      });
    });
  }
  return out;
}

function fl(
  id: string,
  flightNumber: string,
  airlineCode: string,
  destination: string,
  destinationCode: string,
  std: string,
  etd: string,
  gate: string,
  status: Flight["status"]
): Flight {
  return {
    id,
    flightNumber,
    airlineCode,
    destination,
    destinationCode,
    origin: "Bangkok (BKK)",
    originCode: "BKK",
    std,
    etd,
    gate,
    status,
    codeshares: [],
  };
}

export const SEED_FLIGHTS: Flight[] = [
  fl("f-tg920", "TG920", "TG", "Frankfurt (FRA)", "FRA", "23:45", "00:15", "D1", "boarding"),
  fl("f-tg414", "TG414", "TG", "Singapore (SIN)", "SIN", "18:10", "18:40", "D1", "zones"),
  fl("f-tg676", "TG676", "TG", "Tokyo Narita (NRT)", "NRT", "07:20", "07:55", "D2", "final_call"),
  fl("f-pg250", "PG250", "PG", "Koh Samui (USM)", "USM", "09:05", "10:50", "D2", "delayed"),
  fl("f-sq707", "SQ707", "SQ", "Singapore (SIN)", "SIN", "21:30", "21:30", "D3", "boarding"),
  fl("f-fd301", "FD301", "FD", "Don Mueang (DMK)", "DMK", "14:00", "14:00", "D3", "scheduled"),
  fl("f-tg565", "TG565", "TG", "Hanoi (HAN)", "HAN", "16:45", "17:10", "D4", "scheduled"),
  fl("f-nh850", "NH850", "NH", "Tokyo Haneda (HND)", "HND", "23:05", "23:20", "D4", "boarding"),
  fl("f-vz217", "VZ217", "VZ", "Ho Chi Minh City (SGN)", "SGN", "13:40", "13:40", "D4", "scheduled"),
  fl("f-tg910", "TG910", "TG", "Osaka (KIX)", "KIX", "06:30", "06:40", "C1", "boarding"),
  fl("f-tg900", "TG900", "TG", "London (LHR)", "LHR", "00:35", "01:00", "C3", "gate_closed"),
];

export const SEED_ACCOUNTS: AirlineAccount[] = [
  { userId: "officer-tg-1", airlineCode: "TG", username: "tg.officer", password: "demo1234", allowedGates: ["D1", "D2", "D4", "C1", "C3"], createdAt: "2026-09-01T09:00:00Z" },
  { userId: "officer-pg-1", airlineCode: "PG", username: "pg.officer", password: "demo1234", allowedGates: ["D2"], createdAt: "2026-09-01T09:00:00Z" },
  { userId: "officer-sq-1", airlineCode: "SQ", username: "sq.officer", password: "demo1234", allowedGates: ["D3"], createdAt: "2026-09-01T09:00:00Z" },
  { userId: "officer-fd-1", airlineCode: "FD", username: "fd.officer", password: "demo1234", allowedGates: ["D3"], createdAt: "2026-09-01T09:00:00Z" },
  { userId: "officer-vz-1", airlineCode: "VZ", username: "vz.officer", password: "demo1234", allowedGates: ["D4"], createdAt: "2026-09-01T09:00:00Z" },
  { userId: "officer-nh-1", airlineCode: "NH", username: "nh.officer", password: "demo1234", allowedGates: ["D4"], createdAt: "2026-09-01T09:00:00Z" },
];

// One seed template so the gallery has content over the wire too.
export const SEED_TEMPLATES: SignageTemplate[] = [
  {
    templateId: "tpl-tg-boarding",
    airlineCode: "TG",
    templateName: "Boarding — International",
    category: "boarding",
    layoutConfig: {
      resolution: { width: 1920, height: 1080 },
      gridSettings: { snapToGrid: true, gridGap: 16, bezelSafeMargin: 60 },
      layers: [
        { id: "bg", type: "shape_container", locked: true, visible: true, x: 0, y: 0, width: 1920, height: 1080, style: { background: "linear-gradient(135deg,#0b1f3a,#132748,#0e2a52)" } },
        { id: "dest", type: "ifims_binding", locked: false, visible: true, x: 60, y: 300, width: 1600, height: 300, bindingKey: "flight.destination", style: { color: "#ffffff", fontSize: 172, fontWeight: 800, textAlign: "left", textOutline: true } },
        { id: "flightno", type: "ifims_binding", locked: false, visible: true, x: 60, y: 620, width: 800, height: 110, bindingKey: "flight.number", style: { color: "#38bdf8", fontSize: 88, fontWeight: 700, textAlign: "left" } },
        { id: "status", type: "ifims_binding", locked: false, visible: true, x: 1490, y: 80, width: 370, height: 100, bindingKey: "flight.status", style: { color: "#10b981", fontSize: 58, fontWeight: 800, textAlign: "center", verticalAlign: "middle", background: "rgba(255,255,255,0.08)", borderRadius: 20 } },
        { id: "clock", type: "clock_widget", locked: false, visible: true, x: 1690, y: 830, width: 230, height: 120, style: { color: "#ffffff", fontSize: 66, fontWeight: 700, textAlign: "center", clockFormat: "HH:mm" } },
      ],
    },
    createdAt: "2026-09-01T09:00:00Z",
    updatedAt: "2026-09-03T10:00:00Z",
    createdBy: "officer-tg-1",
    lastModifiedBy: "officer-tg-1",
    originGate: "D1",
    version: 3,
  },
];
