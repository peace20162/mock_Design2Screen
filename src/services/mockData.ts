import type {
  Airline,
  AirlineAccount,
  Flight,
  GduUnit,
  GateScreen,
  SignageTemplate,
  TemplateLayer,
} from "../types";

// ---------------------------------------------------------------- airlines

export const AIRLINES: Airline[] = [
  { code: "TG", name: "Thai Airways", nameTh: "การบินไทย", accent: "#5b21b6" },
  { code: "PG", name: "Bangkok Airways", nameTh: "บางกอกแอร์เวย์ส", accent: "#0e7490" },
  { code: "SQ", name: "Singapore Airlines", nameTh: "สิงคโปร์แอร์ไลน์", accent: "#1e3a8a" },
  { code: "FD", name: "Thai AirAsia", nameTh: "ไทยแอร์เอเชีย", accent: "#dc2626" },
  { code: "VZ", name: "VietJet Air", nameTh: "เวียดเจ็ทแอร์", accent: "#ea580c" },
  { code: "NH", name: "All Nippon Airways", nameTh: "ออลนิปปอนแอร์เวย์", accent: "#1d4ed8" },
];

export function airlineByCode(code: string): Airline {
  return AIRLINES.find((a) => a.code === code) ?? AIRLINES[0];
}

// ------------------------------------------------------------------ gates

export const GATES = ["D1", "D2", "D3", "D4", "C1", "C3"];

// Physical screen inventory per gate (DEC-14: variable screen counts — D1 has
// 2 panels, C1 has 3).
export const GATE_SCREENS: Record<string, { label: string; size: "43_inch" | "55_inch" }[]> = {
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

function seedScreens(): GateScreen[] {
  const now = new Date().toISOString();
  const out: GateScreen[] = [];
  for (const gateId of GATES) {
    (GATE_SCREENS[gateId] ?? []).forEach((cfg, i) => {
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

export function makeGdus(screens?: GateScreen[]): GduUnit[] {
  const src = screens ?? seedScreens();
  const now = Date.now();
  return src.map((s, i) => ({
    gduHardwareId: s.gduHardwareId,
    gateId: s.gateId,
    screenId: s.screenId,
    screenIndex: s.screenIndex,
    displaySize: s.displaySize,
    online: s.isOnline,
    gpuTemp: 42 + Math.round(Math.sin((now / 60000) + s.gateId.length + s.screenIndex) * 6) + (i % 5),
    lastHeartbeat: s.lastHeartbeat,
  }));
}

// ----------------------------------------------------------------- flights

function fl(
  id: string,
  flightNumber: string,
  airlineCode: string,
  destination: string,
  destinationCode: string,
  origin: string,
  originCode: string,
  std: string,
  etd: string,
  gate: string,
  status: Flight["status"],
  codeshares: string[] = []
): Flight {
  return {
    id,
    flightNumber,
    airlineCode,
    destination,
    destinationCode,
    origin,
    originCode,
    std,
    etd,
    gate,
    status,
    codeshares,
  };
}

export const FLIGHTS: Flight[] = [
  fl("f-tg920", "TG920", "TG", "Frankfurt (FRA)", "FRA", "Bangkok (BKK)", "BKK", "23:45", "00:15", "D1", "boarding"),
  fl("f-tg414", "TG414", "TG", "Singapore (SIN)", "SIN", "Bangkok (BKK)", "BKK", "18:10", "18:40", "D1", "zones"),
  fl("f-tg676", "TG676", "TG", "Tokyo Narita (NRT)", "NRT", "Bangkok (BKK)", "BKK", "07:20", "07:55", "D2", "final_call"),
  fl("f-pg250", "PG250", "PG", "Koh Samui (USM)", "USM", "Bangkok (BKK)", "BKK", "09:05", "10:50", "D2", "delayed", ["TG 5950"]),
  fl("f-sq707", "SQ707", "SQ", "Singapore (SIN)", "SIN", "Bangkok (BKK)", "BKK", "21:30", "21:30", "D3", "boarding"),
  fl("f-fd301", "FD301", "FD", "Don Mueang (DMK)", "DMK", "Chiang Mai (CNX)", "CNX", "14:00", "14:00", "D3", "scheduled"),
  fl("f-tg565", "TG565", "TG", "Hanoi (HAN)", "HAN", "Bangkok (BKK)", "BKK", "16:45", "17:10", "D4", "scheduled"),
  fl("f-nh806", "NH806", "NH", "Tokyo Haneda (HND)", "HND", "Bangkok (BKK)", "BKK", "22:15", "22:15", "D4", "departed"),
  fl("f-nh850", "NH850", "NH", "Tokyo Haneda (HND)", "HND", "Bangkok (BKK)", "BKK", "23:05", "23:20", "D4", "boarding"),
  fl("f-vz217", "VZ217", "VZ", "Ho Chi Minh City (SGN)", "SGN", "Bangkok (BKK)", "BKK", "13:40", "13:40", "D4", "scheduled"),
  fl("f-tg910", "TG910", "TG", "Osaka (KIX)", "KIX", "Bangkok (BKK)", "BKK", "06:30", "06:40", "C1", "boarding"),
  fl("f-tg900", "TG900", "TG", "London (LHR)", "LHR", "Bangkok (BKK)", "BKK", "00:35", "01:00", "C3", "gate_closed"),
];

export function flightsForGate(gateId: string): Flight[] {
  return FLIGHTS.filter((f) => f.gate === gateId && f.status !== "departed");
}

// ------------------------------------------------------- seed template kit

const GRID = { snapToGrid: true, gridGap: 16, bezelSafeMargin: 60 };
const RES = { width: 1920, height: 1080 } as const;

function L(
  id: string,
  partial: Omit<TemplateLayer, "id" | "locked" | "visible"> & Partial<Pick<TemplateLayer, "locked" | "visible">>
): TemplateLayer {
  return {
    id,
    locked: false,
    visible: true,
    ...partial,
    style: partial.style ?? {},
  };
}

const TG_BG: TemplateLayer["style"] = {
  background: "linear-gradient(135deg, #0b1f3a 0%, #132748 55%, #0e2a52 100%)",
};

function tgBrand(): TemplateLayer[] {
  return [
    L("bg", {
      type: "shape_container",
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      style: TG_BG,
    }),
    L("brandbar", {
      type: "shape_container",
      x: 60,
      y: 60,
      width: 24,
      height: 960,
      style: { background: "#5b21b6", borderRadius: 12 },
    }),
    L("airline", {
      type: "free_text",
      x: 60,
      y: 120,
      width: 720,
      height: 90,
      content: "THAI AIRWAYS",
      style: { color: "#c4b5fd", fontSize: 52, fontWeight: 700, textAlign: "left", verticalAlign: "middle" },
    }),
  ];
}

export const SEED_TEMPLATES: SignageTemplate[] = [
  {
    templateId: "tpl-tg-boarding",
    airlineCode: "TG",
    templateName: "Boarding — International",
    category: "boarding",
    layoutConfig: {
      resolution: RES,
      gridSettings: GRID,
      layers: [
        ...tgBrand(),
        L("dest", {
          type: "ifims_binding",
          x: 60,
          y: 300,
          width: 1600,
          height: 300,
          bindingKey: "flight.destination",
          style: { color: "#ffffff", fontSize: 172, fontWeight: 800, textAlign: "left", textOutline: true },
        }),
        L("flightno", {
          type: "ifims_binding",
          x: 60,
          y: 620,
          width: 800,
          height: 110,
          bindingKey: "flight.number",
          style: { color: "#fbbf24", fontSize: 88, fontWeight: 700, textAlign: "left" },
        }),
        L("times", {
          type: "free_text",
          x: 60,
          y: 780,
          width: 1000,
          height: 80,
          content: "Boarding · 🧳 Cabin baggage by zone",
          style: { color: "#e2e8f0", fontSize: 54, fontWeight: 400, textAlign: "left" },
        }),
        L("status", {
          type: "ifims_binding",
          x: 1490,
          y: 80,
          width: 370,
          height: 100,
          bindingKey: "flight.status",
          statusColorMapping: { boarding: "#10b981", finalCall: "#f59e0b", delayed: "#ef4444" },
          style: {
            color: "#10b981",
            fontSize: 58,
            fontWeight: 800,
            textAlign: "center",
            verticalAlign: "middle",
            background: "rgba(255,255,255,0.08)",
            borderRadius: 20,
            textShadow: true,
          },
        }),
        L("clock", {
          type: "clock_widget",
          x: 1690,
          y: 830,
          width: 230,
          height: 120,
          style: { color: "#ffffff", fontSize: 66, fontWeight: 700, textAlign: "center", clockFormat: "HH:mm" },
        }),
      ],
    },
    createdAt: "2026-09-01T09:00:00Z",
    updatedAt: "2026-09-03T10:00:00Z",
    createdBy: "officer-tg-1",
    lastModifiedBy: "officer-tg-1",
    originGate: "D1",
    version: 3,
  },
  {
    templateId: "tpl-tg-finalcall",
    airlineCode: "TG",
    templateName: "Final Call — Alert",
    category: "final_call",
    layoutConfig: {
      resolution: RES,
      gridSettings: GRID,
      layers: [
        ...tgBrand(),
        L("banner", {
          type: "shape_container",
          x: 0,
          y: 340,
          width: 1920,
          height: 400,
          style: { background: "rgba(245,158,11,0.95)", borderRadius: 0 },
        }),
        L("finalcall", {
          type: "free_text",
          x: 0,
          y: 400,
          width: 1920,
          height: 200,
          content: "FINAL CALL",
          style: { color: "#1f2937", fontSize: 150, fontWeight: 900, textAlign: "center", verticalAlign: "middle" },
        }),
        L("dest", {
          type: "ifims_binding",
          x: 100,
          y: 120,
          width: 1500,
          height: 180,
          bindingKey: "flight.destination",
          style: { color: "#ffffff", fontSize: 110, fontWeight: 700, textAlign: "left" },
        }),
        L("flightno", {
          type: "ifims_binding",
          x: 100,
          y: 800,
          width: 1200,
          height: 140,
          bindingKey: "flight.number",
          style: { color: "#fbbf24", fontSize: 90, fontWeight: 800, textAlign: "left" },
        }),
        L("status", {
          type: "ifims_binding",
          x: 1490,
          y: 830,
          width: 370,
          height: 100,
          bindingKey: "flight.status",
          style: {
            color: "#ef4444",
            fontSize: 58,
            fontWeight: 800,
            textAlign: "center",
            verticalAlign: "middle",
            background: "rgba(255,255,255,0.1)",
            borderRadius: 20,
          },
        }),
        L("clock", {
          type: "clock_widget",
          x: 1690,
          y: 60,
          width: 230,
          height: 100,
          style: { color: "#ffffff", fontSize: 60, fontWeight: 700, textAlign: "center", clockFormat: "HH:mm" },
        }),
      ],
    },
    createdAt: "2026-09-01T09:10:00Z",
    updatedAt: "2026-09-02T14:00:00Z",
    createdBy: "officer-tg-1",
    lastModifiedBy: "officer-tg-1",
    originGate: "D1",
    version: 2,
  },
  {
    templateId: "tpl-tg-welcome",
    airlineCode: "TG",
    templateName: "Welcome — Hold Room",
    category: "welcome",
    layoutConfig: {
      resolution: RES,
      gridSettings: GRID,
      layers: [
        ...tgBrand(),
        L("welcome", {
          type: "free_text",
          x: 0,
          y: 300,
          width: 1920,
          height: 220,
          content: "Welcome",
          style: { color: "#ffffff", fontSize: 150, fontWeight: 800, textAlign: "center", verticalAlign: "middle" },
        }),
        L("brand", {
          type: "free_text",
          x: 0,
          y: 540,
          width: 1920,
          height: 90,
          content: "THAI ·  smoothes as silk",
          style: { color: "#c4b5fd", fontSize: 52, fontWeight: 400, textAlign: "center", verticalAlign: "middle" },
        }),
        L("clock", {
          type: "clock_widget",
          x: 845,
          y: 700,
          width: 230,
          height: 130,
          style: { color: "#ffffff", fontSize: 90, fontWeight: 700, textAlign: "center", clockFormat: "HH:mm:ss", clockSeconds: true },
        }),
      ],
    },
    createdAt: "2026-09-01T09:20:00Z",
    updatedAt: "2026-09-01T09:20:00Z",
    createdBy: "officer-tg-1",
    lastModifiedBy: "officer-tg-1",
    originGate: "D1",
    version: 1,
  },
  {
    templateId: "tpl-tg-delay",
    airlineCode: "TG",
    templateName: "Delay Notice",
    category: "delay",
    layoutConfig: {
      resolution: RES,
      gridSettings: GRID,
      layers: [
        ...tgBrand(),
        L("delayed", {
          type: "free_text",
          x: 0,
          y: 360,
          width: 1920,
          height: 220,
          content: "DELAYED",
          style: { color: "#ef4444", fontSize: 160, fontWeight: 900, textAlign: "center", verticalAlign: "middle" },
        }),
        L("dest", {
          type: "ifims_binding",
          x: 200,
          y: 140,
          width: 1500,
          height: 180,
          bindingKey: "flight.destination",
          style: { color: "#ffffff", fontSize: 110, fontWeight: 700, textAlign: "left" },
        }),
        L("flightno", {
          type: "ifims_binding",
          x: 200,
          y: 660,
          width: 1000,
          height: 120,
          bindingKey: "flight.number",
          style: { color: "#fbbf24", fontSize: 84, fontWeight: 700, textAlign: "left" },
        }),
        L("etd", {
          type: "ifims_binding",
          x: 200,
          y: 810,
          width: 1000,
          height: 90,
          bindingKey: "flight.etd",
          style: { color: "#e2e8f0", fontSize: 56, fontWeight: 500, textAlign: "left" },
        }),
        L("clock", {
          type: "clock_widget",
          x: 1690,
          y: 820,
          width: 230,
          height: 100,
          style: { color: "#ffffff", fontSize: 60, fontWeight: 700, textAlign: "center" },
        }),
      ],
    },
    createdAt: "2026-09-02T08:00:00Z",
    updatedAt: "2026-09-02T08:00:00Z",
    createdBy: "officer-tg-1",
    lastModifiedBy: "officer-tg-1",
    originGate: "D2",
    version: 1,
  },
  {
    templateId: "tpl-pg-boarding",
    airlineCode: "PG",
    templateName: "Bangkok Airways — Boarding",
    category: "boarding",
    layoutConfig: {
      resolution: RES,
      gridSettings: GRID,
      layers: [
        L("bg", {
          type: "shape_container",
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          style: { background: "linear-gradient(160deg, #022c4a 0%, #0e7490 100%)" },
        }),
        L("airline", {
          type: "free_text",
          x: 80,
          y: 100,
          width: 900,
          height: 100,
          content: "Bangkok Airways",
          style: { color: "#a5f3fc", fontSize: 60, fontWeight: 700, textAlign: "left" },
        }),
        L("dest", {
          type: "ifims_binding",
          x: 80,
          y: 320,
          width: 1500,
          height: 300,
          bindingKey: "flight.destination",
          style: { color: "#ffffff", fontSize: 170, fontWeight: 800, textAlign: "left", textOutline: true },
        }),
        L("flightno", {
          type: "ifims_binding",
          x: 80,
          y: 680,
          width: 800,
          height: 110,
          bindingKey: "flight.number",
          style: { color: "#fde68a", fontSize: 90, fontWeight: 700, textAlign: "left" },
        }),
        L("status", {
          type: "ifims_binding",
          x: 1490,
          y: 700,
          width: 370,
          height: 100,
          bindingKey: "flight.status",
          style: { color: "#10b981", fontSize: 56, fontWeight: 800, textAlign: "center", verticalAlign: "middle", background: "rgba(255,255,255,0.1)", borderRadius: 20 },
        }),
        L("clock", {
          type: "clock_widget",
          x: 1690,
          y: 80,
          width: 230,
          height: 100,
          style: { color: "#ffffff", fontSize: 60, fontWeight: 700, textAlign: "center" },
        }),
      ],
    },
    createdAt: "2026-09-03T11:00:00Z",
    updatedAt: "2026-09-03T11:00:00Z",
    createdBy: "officer-pg-1",
    lastModifiedBy: "officer-pg-1",
    originGate: "D2",
    version: 1,
  },
  {
    templateId: "tpl-sq-boarding",
    airlineCode: "SQ",
    templateName: "Singapore Airlines — Boarding",
    category: "boarding",
    layoutConfig: {
      resolution: RES,
      gridSettings: GRID,
      layers: [
        L("bg", {
          type: "shape_container",
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          style: { background: "linear-gradient(150deg, #1e3a8a 0%, #1d4ed8 100%)" },
        }),
        L("airline", {
          type: "free_text",
          x: 80,
          y: 100,
          width: 900,
          height: 100,
          content: "SINGAPORE AIRLINES",
          style: { color: "#fcd34d", fontSize: 58, fontWeight: 700, textAlign: "left" },
        }),
        L("dest", {
          type: "ifims_binding",
          x: 80,
          y: 320,
          width: 1500,
          height: 300,
          bindingKey: "flight.destination",
          style: { color: "#ffffff", fontSize: 170, fontWeight: 800, textAlign: "left", textOutline: true },
        }),
        L("flightno", {
          type: "ifims_binding",
          x: 80,
          y: 700,
          width: 800,
          height: 110,
          bindingKey: "flight.number",
          style: { color: "#fde68a", fontSize: 90, fontWeight: 700, textAlign: "left" },
        }),
        L("status", {
          type: "ifims_binding",
          x: 1490,
          y: 720,
          width: 370,
          height: 100,
          bindingKey: "flight.status",
          style: { color: "#10b981", fontSize: 56, fontWeight: 800, textAlign: "center", verticalAlign: "middle", background: "rgba(255,255,255,0.1)", borderRadius: 20 },
        }),
        L("clock", {
          type: "clock_widget",
          x: 1690,
          y: 80,
          width: 230,
          height: 100,
          style: { color: "#ffffff", fontSize: 60, fontWeight: 700, textAlign: "center" },
        }),
      ],
    },
    createdAt: "2026-09-03T12:00:00Z",
    updatedAt: "2026-09-03T12:00:00Z",
    createdBy: "officer-sq-1",
    lastModifiedBy: "officer-sq-1",
    originGate: "D3",
    version: 1,
  },
];

// Local airline accounts (mock). Passwords are plaintext markers only — the
// mock service does a trivial match; a real backend would store hashes.
export const OFFICER_ACCOUNTS: AirlineAccount[] = [
  { userId: "officer-tg-1", airlineCode: "TG", username: "tg.officer", password: "demo1234", allowedGates: ["D1", "D2", "D4", "C1", "C3"], createdAt: "2026-09-01T09:00:00Z" },
  { userId: "officer-pg-1", airlineCode: "PG", username: "pg.officer", password: "demo1234", allowedGates: ["D2"], createdAt: "2026-09-01T09:00:00Z" },
  { userId: "officer-sq-1", airlineCode: "SQ", username: "sq.officer", password: "demo1234", allowedGates: ["D3"], createdAt: "2026-09-01T09:00:00Z" },
  { userId: "officer-fd-1", airlineCode: "FD", username: "fd.officer", password: "demo1234", allowedGates: ["D3"], createdAt: "2026-09-01T09:00:00Z" },
  { userId: "officer-vz-1", airlineCode: "VZ", username: "vz.officer", password: "demo1234", allowedGates: ["D4"], createdAt: "2026-09-01T09:00:00Z" },
  { userId: "officer-nh-1", airlineCode: "NH", username: "nh.officer", password: "demo1234", allowedGates: ["D4"], createdAt: "2026-09-01T09:00:00Z" },
];

export const ADMIN_ACCOUNT = {
  name: "Somchai R.",
  nameTh: "สมชาย",
  email: "somchai.r@airportthai.co.th",
};

export function blankGateScreens(): GateScreen[] {
  return seedScreens();
}