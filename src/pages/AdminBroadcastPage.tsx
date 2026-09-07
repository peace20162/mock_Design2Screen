import { useState } from "react";
import { useDataStore } from "../store/dataStore";
import { useT } from "../lib/useT";
import { EmergencyScreen } from "../components/ScreenPreview";

const PRESETS = [
  {
    label: "Evacuation",
    msg: "EVACUATION — proceed to the nearest exit\nกรุณาอพยพออกทางทางออกที่ใกล้ที่สุด",
  },
  {
    label: "Security",
    msg: "SECURITY ALERT — remain calm and follow staff\nแจ้งเตือนด้านความปลอดภัย — โปรดอยู่ในความสงบ",
  },
  {
    label: "Severe weather",
    msg: "SEVERE WEATHER — flights may be delayed\nสภาพอากาศรุนแรง — เที่ยวบินอาจล่าช้า",
  },
];

function PreviewThumb({ msg }: { msg: string }) {
  const w = 520;
  const scale = w / 1920;
  return (
    <div className="tpl-stage" style={{ width: 1920 * scale, height: 1080 * scale, maxWidth: "100%" }}>
      <div
        className="tpl-canvas"
        style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "0 0" }}
      >
        <EmergencyScreen message={msg} />
      </div>
    </div>
  );
}

export default function AdminBroadcastPage() {
  const t = useT();
  const emergency = useDataStore((s) => s.emergency);
  const [msg, setMsg] = useState(emergency.message || PRESETS[0].msg);
  const [sent, setSent] = useState(false);

  async function send() {
    await useDataStore.getState().setEmergencyOverride(true, msg.trim() || PRESETS[0].msg);
    setSent(true);
    setTimeout(() => setSent(false), 1500);
  }

  async function cancel() {
    await useDataStore.getState().setEmergencyOverride(false);
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ fontSize: 22 }}>{t("admin.broadcast")}</h2>
          <div className="muted small">{t("admin.emergencyNote")}</div>
        </div>
        <span className={emergency.active ? "badge badge-red" : "badge badge-slate"}>
          {emergency.active ? `⚠ ${t("admin.overrideActive")}` : t("admin.offline")}
        </span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card stack">
          <div className="field">
            <label>{t("admin.broadcastMessage")}</label>
            <textarea className="textarea" rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} />
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {PRESETS.map((p) => (
              <button key={p.label} className="btn btn-sm" onClick={() => setMsg(p.msg)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-danger btn-lg grow" onClick={send}>
              {sent ? "✓ " : "📡 "}
              {t("admin.broadcastSend")}
            </button>
            {emergency.active && (
              <button className="btn btn-lg" onClick={cancel}>
                {t("admin.broadcastCancel")}
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 12 }}>{t("editor.livePreview")}</h3>
          <PreviewThumb msg={msg} />
        </div>
      </div>
    </div>
  );
}