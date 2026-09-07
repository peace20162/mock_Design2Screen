import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Flight, GateScreen, SignageTemplate } from "../types";
import type { Lang } from "../i18n/translations";
import { useT } from "../lib/useT";
import TemplateStage, { formatClock } from "./TemplateStage";

export const STAGE_W = 1920;
export const STAGE_H = 1080;

function ScaledCanvas({ scale, children }: { scale: number; children: ReactNode }) {
  return (
    <div className="tpl-stage" style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
      <div
        className="tpl-canvas"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "0 0" }}
      >
        {children}
      </div>
    </div>
  );
}

export function IdleScreen() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(1200px 700px at 50% 32%, #152a49 0%, #0a1424 70%)",
      }}
    >
      <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 64, color: "#38bdf8", fontWeight: 800, letterSpacing: 2 }}>AOT · ✈</div>
        <div style={{ fontSize: 112, color: "#eaf1fb", fontWeight: 800, marginTop: 20 }}>Suvarnabhumi</div>
        <div style={{ fontSize: 56, color: "#8fa6c4", fontWeight: 400, marginTop: 8 }}>
          ท่าอากาศยานสุวรรณภูมิ
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 150, width: "100%", textAlign: "center" }}>
        <span
          style={{ fontSize: 150, fontWeight: 800, color: "#eaf1fb", fontVariantNumeric: "tabular-nums" }}
        >
          {formatClock(now, "HH:mm", false)}
        </span>
        <div style={{ fontSize: 48, color: "#8fa6c4", marginTop: 8 }}>
          {new Intl.DateTimeFormat("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Bangkok",
          }).format(now)}
        </div>
      </div>
    </div>
  );
}

export function EmergencyScreen({ message }: { message: string }) {
  const t = useT();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 120px",
      }}
    >
      <div style={{ fontSize: 150, lineHeight: 1 }}>⚠️</div>
      <div style={{ fontSize: 130, fontWeight: 900, color: "#fff", marginTop: 30, letterSpacing: 3 }}>
        {t("admin.overrideActive").toUpperCase()}
      </div>
      <div style={{ fontSize: 66, fontWeight: 700, color: "#fecaca", marginTop: 40, maxWidth: 1500 }}>
        {message}
      </div>
    </div>
  );
}

// Renders the correct content for a screen's current mode, at `scale`.
export function ScreenRender({
  screen,
  template,
  flight,
  lang,
  scale,
  emergencyMessage,
}: {
  screen: GateScreen;
  template: SignageTemplate | null;
  flight: Flight | null;
  lang: Lang;
  scale: number;
  emergencyMessage: string;
}) {
  if (screen.currentMode === "emergency") {
    return (
      <ScaledCanvas scale={scale}>
        <EmergencyScreen message={emergencyMessage} />
      </ScaledCanvas>
    );
  }
  if (!template || screen.currentMode === "ifims_default") {
    return (
      <ScaledCanvas scale={scale}>
        <IdleScreen />
      </ScaledCanvas>
    );
  }
  return <TemplateStage template={template} flight={flight} lang={lang} scale={scale} livePreview />;
}

// Small fixed-width thumbnail (admin grid, gallery cards).
export function ScreenThumb({
  template,
  flight,
  lang,
  width = 250,
  mode = "template",
  emergencyMessage = "",
}: {
  template: SignageTemplate | null;
  flight: Flight | null;
  lang: Lang;
  width?: number;
  mode?: "template" | "ifims_default" | "emergency";
  emergencyMessage?: string;
}) {
  const scale = width / STAGE_W;
  const screen: GateScreen = {
    gateId: "thumb",
    screenId: "screen_1",
    screenIndex: 1,
    label: "thumb",
    gduHardwareId: "thumb",
    displaySize: "55_inch",
    currentMode: mode,
    isOnline: true,
    lastHeartbeat: "",
    templateId: template?.templateId ?? null,
    flightId: flight?.id ?? null,
  };
  return (
    <ScreenRender
      screen={screen}
      template={template}
      flight={flight}
      lang={lang}
      scale={scale}
      emergencyMessage={emergencyMessage}
    />
  );
}