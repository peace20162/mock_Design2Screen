import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GateScreen, SignageTemplate } from "../types";
import { service } from "../services";
import { useDataStore } from "../store/dataStore";
import { useLang, useT } from "../lib/useT";
import { ScreenThumb } from "../components/ScreenPreview";

export default function AdminScreensPage() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const { screens, flights, telemetry, emergency } = useDataStore();
  const refresh = useDataStore((s) => s.refresh);

  const [allTemplates, setAllTemplates] = useState<SignageTemplate[]>([]);

  useEffect(() => {
    service.listAllTemplates().then(setAllTemplates);
  }, [emergency.active, screens.length]);

  useEffect(() => {
    const id = setInterval(() => refresh(), 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const templateMap = useMemo(
    () => Object.fromEntries(allTemplates.map((x) => [x.templateId, x])),
    [allTemplates]
  );
  const flightMap = useMemo(() => Object.fromEntries(flights.map((f) => [f.id, f])), [flights]);
  const gduMap = useMemo(
    () => Object.fromEntries(telemetry.map((g) => [g.gduHardwareId, g])),
    [telemetry]
  );

  const gates = useMemo(() => [...new Set(screens.map((s) => s.gateId))].sort(), [screens]);
  const online = screens.filter((s) => s.isOnline).length;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ fontSize: 22 }}>{t("admin.screens")}</h2>
          <div className="muted small">
            {t("admin.fleetHealth")} ·{" "}
            <b style={{ color: online === screens.length ? "var(--green)" : "var(--amber)" }}>
              {online}/{screens.length}
            </b>{" "}
            {t("admin.online")}
          </div>
        </div>
        <button className="btn btn-danger btn-lg" onClick={() => nav("/admin/broadcast")}>
          {emergency.active ? `⚠ ${t("admin.overrideActive")}` : `⚠ ${t("admin.override")}`}
        </button>
      </div>

      {emergency.active && (
        <div className="banner-red">
          ⚠ {t("admin.overrideActive")} — {emergency.message || "…"}
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
        {gates.map((gateId) => {
          const gs = screens.filter((s) => s.gateId === gateId);
          return (
            <div key={gateId} className="card">
              <div className="spread" style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 15 }}>
                  {t("gate.gate")} {gateId}
                </h3>
                <span className={gs.every((s) => s.isOnline) ? "badge badge-green" : "badge badge-amber"}>
                  <span className="status-dot" style={{ background: "currentColor" }} />
                  {gs.every((s) => s.isOnline) ? t("admin.online") : t("admin.offline")}
                </span>
              </div>

              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {gs.map((s) => {
                  const gdu = gduMap[s.gduHardwareId];
                  return (
                    <div key={s.screenId}>
                      <ScreenThumb
                        template={s.templateId ? templateMap[s.templateId] ?? null : null}
                        flight={s.flightId ? flightMap[s.flightId] ?? null : null}
                        lang={lang}
                        width={150}
                        mode={s.currentMode}
                        emergencyMessage={emergency.message}
                      />
                      <div
                        className="small"
                        style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}
                      >
                        <span className="muted">
                          {s.screenIndex === 1 && s.label ? `${s.label} · ` : ""}
                          {s.displaySize === "55_inch" ? "55″" : "43″"} ·{" "}
                          {s.currentMode === "emergency"
                            ? t("admin.overrideActive")
                            : s.currentMode === "template"
                              ? t("gate.live")
                              : t("gate.idle")}
                        </span>
                        <span className="faint">{gdu ? `${gdu.gpuTemp}°` : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="faint small" style={{ marginTop: 10, borderTop: "1px solid var(--border-soft)", paddingTop: 8 }}>
                {gs[0]?.lastHeartbeat ? `♥ ${new Date(gs[0].lastHeartbeat).toLocaleTimeString()}` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}