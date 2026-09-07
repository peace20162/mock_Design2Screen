import { useMemo, useState } from "react";
import type { GateScreen } from "../types";
import { useDataStore } from "../store/dataStore";
import { useT } from "../lib/useT";
import { GATES } from "../services/mockData";
import { Modal } from "../components/bits";

export default function AdminGatesPage() {
  const t = useT();
  const screens = useDataStore((s) => s.screens);
  const addScreen = useDataStore((s) => s.addScreen);
  const updateScreen = useDataStore((s) => s.updateScreen);
  const removeScreen = useDataStore((s) => s.removeScreen);

  const byGate = useMemo(() => {
    const m: Record<string, GateScreen[]> = {};
    for (const g of GATES) m[g] = screens.filter((s) => s.gateId === g).sort((a, b) => a.screenIndex - b.screenIndex);
    return m;
  }, [screens]);

  const [addOpen, setAddOpen] = useState(false);
  const [addGate, setAddGate] = useState("D1");
  const [addLabel, setAddLabel] = useState("");
  const [addSize, setAddSize] = useState<"55_inch" | "43_inch">("43_inch");

  const [editScreen, setEditScreen] = useState<GateScreen | null>(null);
  const [eLabel, setELabel] = useState("");
  const [eSize, setESize] = useState<"55_inch" | "43_inch">("43_inch");
  const [eGdu, setEGdu] = useState("");

  const [removeTarget, setRemoveTarget] = useState<GateScreen | null>(null);

  function openEdit(s: GateScreen) {
    setEditScreen(s);
    setELabel(s.label);
    setESize(s.displaySize);
    setEGdu(s.gduHardwareId);
  }

  async function submitAdd() {
    await addScreen(addGate, { label: addLabel.trim() || `Screen ${byGate[addGate].length + 1}`, displaySize: addSize });
    setAddOpen(false);
    setAddLabel("");
  }

  async function submitEdit() {
    if (!editScreen) return;
    await updateScreen(editScreen.screenId, { label: eLabel, displaySize: eSize, gduHardwareId: eGdu });
    setEditScreen(null);
  }

  async function confirmRemove() {
    if (removeTarget) await removeScreen(removeTarget.screenId);
    setRemoveTarget(null);
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ fontSize: 22 }}>{t("admin.gateScreens")}</h2>
          <div className="muted small">
            {t("admin.screens")} · {screens.length}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
          ＋ {t("admin.addScreen")}
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}>
        {GATES.map((g) => {
          const gs = byGate[g] ?? [];
          return (
            <div key={g} className="card">
              <div className="spread" style={{ marginBottom: 10 }}>
                <h3 style={{ fontSize: 15 }}>
                  {t("gate.gate")} {g}
                </h3>
                <span className="badge badge-slate">{gs.length}</span>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {gs.length === 0 && <div className="faint small">{t("gate.noFlight")} — 0</div>}
                {gs.map((s) => (
                  <div
                    key={s.screenId}
                    className="row"
                    style={{
                      gap: 8,
                      padding: "8px 10px",
                      background: "var(--bg-2)",
                      borderRadius: 8,
                      border: "1px solid var(--border-soft)",
                    }}
                  >
                    <span
                      className="status-dot"
                      style={{ background: s.isOnline ? "var(--green)" : "var(--red)" }}
                    />
                    <div className="grow">
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {s.label} · {s.displaySize === "55_inch" ? "55″" : "43″"}
                      </div>
                      <div className="faint" style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>
                        {s.gduHardwareId}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
                      ✏️ {t("admin.editScreen")}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: "#f87171" }}
                      onClick={() => setRemoveTarget(s)}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* add screen */}
      <Modal
        open={addOpen}
        title={t("admin.addScreen")}
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setAddOpen(false)}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary" onClick={submitAdd}>
              {t("admin.addScreen")}
            </button>
          </>
        }
      >
        <div className="stack">
          <div className="field">
            <label>{t("gate.gate")}</label>
            <select className="select" value={addGate} onChange={(e) => setAddGate(e.target.value)}>
              {GATES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t("admin.screenLabel")}</label>
            <input
              className="input"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="Zone"
            />
          </div>
          <div className="field">
            <label>{t("admin.screenSize")}</label>
            <select className="select" value={addSize} onChange={(e) => setAddSize(e.target.value as "55_inch" | "43_inch")}>
              <option value="55_inch">55″</option>
              <option value="43_inch">43″</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* edit screen */}
      <Modal
        open={!!editScreen}
        title={t("admin.editScreen")}
        onClose={() => setEditScreen(null)}
        footer={
          <>
            <button className="btn" onClick={() => setEditScreen(null)}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary" onClick={submitEdit}>
              {t("common.save")}
            </button>
          </>
        }
      >
        {editScreen && (
          <div className="stack">
            <div className="field">
              <label>{t("admin.screenLabel")}</label>
              <input className="input" value={eLabel} onChange={(e) => setELabel(e.target.value)} />
            </div>
            <div className="row" style={{ gap: 12 }}>
              <div className="field grow">
                <label>{t("admin.screenSize")}</label>
                <select className="select" value={eSize} onChange={(e) => setESize(e.target.value as "55_inch" | "43_inch")}>
                  <option value="55_inch">55″</option>
                  <option value="43_inch">43″</option>
                </select>
              </div>
              <div className="field grow">
                <label>{t("admin.gduId")}</label>
                <input className="input" value={eGdu} onChange={(e) => setEGdu(e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* remove screen */}
      <Modal
        open={!!removeTarget}
        title={t("admin.confirmRemoveScreen")}
        onClose={() => setRemoveTarget(null)}
        footer={
          <>
            <button className="btn" onClick={() => setRemoveTarget(null)}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-danger" onClick={confirmRemove}>
              {t("admin.removeScreen")}
            </button>
          </>
        }
      >
        <p className="muted">
          {removeTarget?.label} · {t("gate.gate")} {removeTarget?.gateId}
        </p>
      </Modal>
    </div>
  );
}