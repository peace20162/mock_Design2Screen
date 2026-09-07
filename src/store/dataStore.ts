import { create } from "zustand";
import type {
  Flight,
  FlightStatus,
  GduUnit,
  GateScreen,
  ScreenId,
  SignageTemplate,
} from "../types";
import type { EmergencyState } from "../services/SignageService";
import { service } from "../services";
import { useAppStore } from "./appStore";

interface DataState {
  flights: Flight[];
  screens: GateScreen[];
  telemetry: GduUnit[];
  emergency: EmergencyState;
  templates: SignageTemplate[];

  refresh: () => void;
  init: (airlineCode?: string) => Promise<void>;
  loadTemplates: (airlineCode: string) => Promise<void>;
  pullAll: () => Promise<void>;

  assignScreen: (
    gateId: string,
    screenId: ScreenId,
    templateId: string,
    flightId: string
  ) => Promise<void>;
  setScreenFlight: (gateId: string, screenId: ScreenId, flightId: string) => Promise<void>;
  releaseGate: (gateId: string) => Promise<void>;
  addScreen: (gateId: string, cfg: { label: string; displaySize: "43_inch" | "55_inch" }) => Promise<void>;
  updateScreen: (
    screenId: string,
    patch: { label?: string; displaySize?: "43_inch" | "55_inch"; gduHardwareId?: string }
  ) => Promise<void>;
  removeScreen: (screenId: string) => Promise<void>;
  setFlightStatus: (flightId: string, status: FlightStatus) => Promise<void>;

  setEmergencyOverride: (active: boolean, message?: string) => Promise<void>;

  saveTemplate: (t: SignageTemplate) => Promise<SignageTemplate>;
  duplicateTemplate: (id: string) => Promise<SignageTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useDataStore = create<DataState>()((set, get) => ({
  flights: [],
  screens: [],
  telemetry: [],
  emergency: { active: false, message: "" },
  templates: [],

  refresh: () => {
    const snap = service.snapshot();
    set({
      flights: snap.flights,
      screens: snap.screens,
      telemetry: snap.telemetry,
      emergency: snap.emergency,
    });
  },

  init: async (airlineCode) => {
    await get().pullAll();
    if (airlineCode) await get().loadTemplates(airlineCode);
    else set({ templates: [] });
  },

  pullAll: async () => {
    const snap = await service.pullAll();
    set({
      flights: snap.flights,
      screens: snap.screens,
      telemetry: snap.telemetry,
      emergency: snap.emergency,
    });
  },

  loadTemplates: async (airlineCode) => {
    const templates = await service.listTemplates(airlineCode);
    set({ templates });
  },

  assignScreen: async (gateId, screenId, templateId, flightId) => {
    await service.assignScreen(gateId, screenId, templateId, flightId);
    get().refresh();
  },

  setScreenFlight: async (gateId, screenId, flightId) => {
    await service.setScreenFlight(gateId, screenId, flightId);
    get().refresh();
  },

  releaseGate: async (gateId) => {
    await service.releaseGate(gateId);
    get().refresh();
  },

  addScreen: async (gateId, cfg) => {
    await service.addScreen(gateId, cfg);
    get().refresh();
  },

  updateScreen: async (screenId, patch) => {
    await service.updateScreen(screenId, patch);
    get().refresh();
  },

  removeScreen: async (screenId) => {
    await service.removeScreen(screenId);
    get().refresh();
  },

  setFlightStatus: async (flightId, status) => {
    await service.setFlightStatus(flightId, status);
    get().refresh();
  },

  setEmergencyOverride: async (active, message = "") => {
    await service.setEmergencyOverride(active, message);
    get().refresh();
  },

  saveTemplate: async (t) => {
    const saved = await service.saveTemplate(t);
    const { session } = useAppStore.getState();
    if (session?.role === "airline_officer") await get().loadTemplates(session.airlineCode);
    return saved;
  },

  duplicateTemplate: async (id) => {
    const copy = await service.duplicateTemplate(id);
    const { session } = useAppStore.getState();
    if (session?.role === "airline_officer") await get().loadTemplates(session.airlineCode);
    return copy;
  },

  deleteTemplate: async (id) => {
    await service.deleteTemplate(id);
    const { session } = useAppStore.getState();
    if (session?.role === "airline_officer") await get().loadTemplates(session.airlineCode);
    get().refresh();
  },
}));