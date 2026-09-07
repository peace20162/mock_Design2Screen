import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { SignageTemplate } from "../types";
import { service } from "../services";
import { useDataStore } from "../store/dataStore";
import { useLang } from "../lib/useT";
import { ScreenRender } from "../components/ScreenPreview";

export default function PlayerPage() {
  const { gateId, screenId } = useParams();
  const lang = useLang();
  const screens = useDataStore((s) => s.screens);
  const flights = useDataStore((s) => s.flights);
  const emergency = useDataStore((s) => s.emergency);

  const screen = screens.find((s) => s.gateId === gateId && s.screenId === screenId);
  const [tpl, setTpl] = useState<SignageTemplate | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (screen?.templateId) {
      service.getTemplate(screen.templateId).then((t) => {
        if (!cancelled) setTpl(t);
      });
    } else {
      setTpl(null);
    }
    return () => {
      cancelled = true;
    };
  }, [screen?.templateId]);

  const flight = flights.find((f) => f.id === screen?.flightId) ?? null;

  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const scale = Math.min(vp.w / 1920, vp.h / 1080);

  if (!screen) {
    return (
      <div className="player-wrap">
        <div style={{ color: "#556", fontFamily: "monospace" }}>
          no screen — {gateId}/{screenId}
        </div>
      </div>
    );
  }

  return (
    <div className="player-wrap">
      <div className="player-stage" style={{ width: 1920 * scale, height: 1080 * scale }}>
        <ScreenRender
          screen={screen}
          template={tpl}
          flight={flight}
          lang={lang}
          scale={scale}
          emergencyMessage={emergency.message}
        />
      </div>
    </div>
  );
}