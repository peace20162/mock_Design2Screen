import type { BindingKey, Flight } from "../types";
import { translate, type Lang } from "../i18n/translations";

// Resolve an IFIMS binding key to its display string for a given flight.
// Returns null when no flight is bound (design placeholder mode) so the
// renderer can fall back to a token/sample.
export function resolveBinding(bindingKey: BindingKey, flight: Flight | null, lang: Lang): string {
  if (!flight) return "";

  switch (bindingKey) {
    case "flight.number":
      return flight.flightNumber;
    case "flight.destination":
      return flight.destination;
    case "flight.origin":
      return flight.origin;
    case "flight.status":
      return translate(lang, `status.${flight.status}` as const);
    case "flight.std":
      return flight.std;
    case "flight.etd":
      return flight.etd;
    case "flight.gate":
      return flight.gate;
    default:
      return "";
  }
}

// Sample values used in "design placeholder" mode so an un-bound canvas still
// looks real while being edited.
export const PLACEHOLDER_VALUES: Record<BindingKey, string> = {
  "flight.number": "TG920",
  "flight.destination": "Frankfurt (FRA)",
  "flight.origin": "Bangkok (BKK)",
  "flight.status": "Boarding",
  "flight.std": "23:45",
  "flight.etd": "00:15",
  "flight.gate": "D1",
};

export const PLACEHOLDER_TOKEN: Record<BindingKey, string> = {
  "flight.number": "{{flight.number}}",
  "flight.destination": "{{flight.destination}}",
  "flight.origin": "{{flight.origin}}",
  "flight.status": "{{flight.status}}",
  "flight.std": "{{flight.std}}",
  "flight.etd": "{{flight.etd}}",
  "flight.gate": "{{flight.gate}}",
};

// Automatic status colour-coding (doc §5.2): green boarding, amber final
// call, red delayed. "zones" reuses green, "scheduled" muted, "departed" grey.
export const DEFAULT_STATUS_COLORS: Record<string, string> = {
  scheduled: "#94a3b8",
  boarding: "#10b981",
  zones: "#10b981",
  final_call: "#f59e0b",
  delayed: "#ef4444",
  gate_closed: "#ef4444",
  departed: "#64748b",
};

export function statusColor(
  statusKey: string,
  mapping?: { boarding: string; finalCall: string; delayed: string } | null
): string {
  if (mapping) {
    if (statusKey === "boarding" || statusKey === "zones") return mapping.boarding;
    if (statusKey === "final_call") return mapping.finalCall;
    if (statusKey === "delayed" || statusKey === "gate_closed") return mapping.delayed;
  }
  return DEFAULT_STATUS_COLORS[statusKey] ?? "#ffffff";
}