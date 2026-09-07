import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Flight, GateScreen, SignageTemplate } from "../types";
import { useDataStore } from "../store/dataStore";
import { useLang, useT } from "../lib/useT";
import { useElementWidth } from "../lib/useElementWidth";
import { StatusBadge } from "../components/bits";
import { ScreenRender } from "../components/ScreenPreview";

const STAGE_W = 1920;

function sizeLabel(displaySize: "43_inch" | "55_inch") {
  return displaySize === "55_inch" ? "55″" : "43″";
}

export default function GateControllerPage() {
  const { gateId = "D1" } = useParams();
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();

  const { screens, flights, templates, emergency } = useDataStore();

  const gateScreens = useMemo(
    () =>
      screens
        .filter((s) => s.gateId === gateId)
        .sort((a, b) => a.screenIndex - b.screenIndex),
    [screens, gateId]
  );

  const gateFlights = useMemo(
    () => flights.filter((f) => f.gate === gateId && f.status !== "departed"),
    [flights, gateId]
  );

  const activeFlightId = gateScreens[0]?.flightId ?? null;
  const activeFlight = flights.find((f) => f.id === activeFlightId) ?? null;

  function templateFor(s: GateScreen): SignageTemplate | null {
    if (!s.templateId) return null;
    return templates.find((t) => t.templateId === s.templateId) ?? null;
  }

  async function pickFlight(id: string) {
    if (!id) return;
    for (const s of gateScreens) {
      await useDataStore.getState().setScreenFlight(gateId, s.screenId, id);
    }
  }

  const SYNTH_STATUSES: Flight["status"][] = ["boarding", "zones", "final_call", "gate_closed"];

  return (
    <div className="stack">
      <div className="card">
        <div className="spread" style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 20 }}>
              {t("gate.gate")} {gateId}
            </h2>
            {activeFlight && <StatusBadge status={activeFlight.status} />}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              await useDataStore.getState().releaseGate(gateId);
            }}
          >
            {t("gate.released")}
          </button>
        </div>

        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ minWidth: 300 }}>
            <label>{t("gate.activeFlight")}</label>
            <select
              className="select"
              value={activeFlightId ?? ""}
              onChange={(e) => pickFlight(e.target.value)}
            >
              <option value="">{t("gate.noFlight")}</option>
              {gateFlights.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.flightNumber} · {f.destination} · {f.std}
                </option>
              ))}
            </select>
          </div>

          <div className="field grow" style={{ minWidth: 320 }}>
            <label>{t("gate.boardProgress")}</label>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {SYNTH_STATUSES.map((st) => (
                <button
                  key={st}
                  className={`btn btn-sm ${activeFlight?.status === st ? "btn-primary" : ""}`}
                  disabled={!activeFlight}
                  onClick={async () => {
                    if (activeFlight) {
                      await useDataStore.getState().setFlightStatus(activeFlight.id, st);
                    }
                  }}
                >
                  {t(`status.${st}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
        {gateScreens.map((s) => (
          <ScreenPanel
            key={s.screenId}
            screen={s}
            label={`${s.label} · ${sizeLabel(s.displaySize)}`}
            template={templateFor(s)}
            flight={activeFlight}
            emergencyMessage={emergency.message}
            onChoose={() => nav(`/templates/gallery?target=${s.screenId}&gate=${gateId}`)}
          />
        ))}
      </div>
    </div>
  );
}

function ScreenPanel({
  screen,
  label,
  template,
  flight,
  emergencyMessage,
  onChoose,
}: {
  screen: GateScreen;
  label: string;
  template: SignageTemplate | null;
  flight: Flight | null;
  emergencyMessage: string;
  onChoose: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const scale = width > 0 ? Math.min(1, (width - 4) / STAGE_W) : 0.5;

  const mode = screen.currentMode;
  const badge =
    mode === "emergency" ? (
      <span className="badge badge-red">⚠ {t("admin.overrideActive")}</span>
    ) : mode === "template" && template ? (
      <span className="badge badge-green">
        <span className="status-dot" style={{ background: "var(--green)" }} /> {t("gate.live")}
      </span>
    ) : (
      <span className="badge badge-slate">{t("gate.idle")}</span>
    );

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          <h3 style={{ fontSize: 15 }}>{label}</h3>
          {badge}
        </div>
        <span className="faint small">{template?.templateName ?? ""}</span>
      </div>

      <div ref={ref} style={{ width: "100%" }}>
        <ScreenRender
          screen={screen}
          template={template}
          flight={flight}
          lang={lang}
          scale={scale}
          emergencyMessage={emergencyMessage}
        />
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-primary btn-block" onClick={onChoose}>
          {template ? t("gallery.edit") : t("gate.chooseTemplate")} →
        </button>
      </div>
    </div>
  );
}