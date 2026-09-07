import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type {
  BindingKey,
  LayerStyle,
  LayerType,
  SignageTemplate,
  TemplateCategory,
  TemplateLayer,
} from "../types";
import { service } from "../services";
import { useAppStore } from "../store/appStore";
import { useDataStore } from "../store/dataStore";
import { useLang, useT } from "../lib/useT";
import type { TranslationKey } from "../i18n/translations";
import { useElementWidth } from "../lib/useElementWidth";
import TemplateStage from "../components/TemplateStage";

const STAGE_W = 1920;
const CATS: TemplateCategory[] = ["welcome", "boarding", "final_call", "delay", "gate_closed"];
const FONTS = ["Thai Sans", "Arial", "Helvetica", "Tahoma", "Sarabun", "Segoe UI"];
const BINDINGS: { key: BindingKey; label: string }[] = [
  { key: "flight.number", label: "Flight number" },
  { key: "flight.destination", label: "Destination" },
  { key: "flight.origin", label: "Origin" },
  { key: "flight.status", label: "Status" },
  { key: "flight.std", label: "STD (scheduled)" },
  { key: "flight.etd", label: "ETD (estimated)" },
  { key: "flight.gate", label: "Gate" },
];
const GLYPH: Record<LayerType, string> = {
  image: "🖼",
  free_text: "Aa",
  ifims_binding: "⛓",
  clock_widget: "🕑",
  shape_container: "▣",
};
const HANDLES = [
  { dir: "nw", cx: 0, cy: 0, cursor: "nwse-resize" },
  { dir: "n", cx: 0.5, cy: 0, cursor: "ns-resize" },
  { dir: "ne", cx: 1, cy: 0, cursor: "nesw-resize" },
  { dir: "e", cx: 1, cy: 0.5, cursor: "ew-resize" },
  { dir: "se", cx: 1, cy: 1, cursor: "nwse-resize" },
  { dir: "s", cx: 0.5, cy: 1, cursor: "ns-resize" },
  { dir: "sw", cx: 0, cy: 1, cursor: "nesw-resize" },
  { dir: "w", cx: 0, cy: 0.5, cursor: "ew-resize" },
] as const;

function uid() {
  return crypto.randomUUID().slice(0, 8);
}

function blankTemplate(airlineCode: string): SignageTemplate {
  return {
    templateId: "",
    airlineCode,
    templateName: "",
    category: "boarding",
    layoutConfig: {
      resolution: { width: 1920, height: 1080 },
      gridSettings: { snapToGrid: true, gridGap: 16, bezelSafeMargin: 60 },
      layers: [
        {
          id: "bg",
          type: "shape_container",
          locked: true,
          visible: true,
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          style: { background: "linear-gradient(135deg, #0b1f3a 0%, #132748 55%, #0e2a52 100%)" },
        },
      ],
    },
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    lastModifiedBy: "",
    originGate: "",
    version: 1,
  };
}

function defaultLayer(type: LayerType): TemplateLayer {
  const base: TemplateLayer = {
    id: uid(),
    type,
    locked: false,
    visible: true,
    x: 0,
    y: 0,
    width: 400,
    height: 120,
    style: {},
  };
  switch (type) {
    case "free_text":
      return {
        ...base,
        x: 560,
        y: 470,
        width: 800,
        height: 140,
        content: "New text",
        style: { color: "#ffffff", fontSize: 96, fontWeight: 700, textAlign: "center", verticalAlign: "middle" },
      };
    case "ifims_binding":
      return {
        ...base,
        x: 310,
        y: 470,
        width: 1300,
        height: 220,
        bindingKey: "flight.destination",
        style: { color: "#ffffff", fontSize: 150, fontWeight: 800, textAlign: "center", verticalAlign: "middle", textOutline: true },
      };
    case "clock_widget":
      return {
        ...base,
        x: 810,
        y: 80,
        width: 300,
        height: 120,
        style: { color: "#ffffff", fontSize: 72, fontWeight: 700, textAlign: "center", verticalAlign: "middle", clockFormat: "HH:mm" },
      };
    case "shape_container":
      return {
        ...base,
        x: 560,
        y: 400,
        width: 800,
        height: 280,
        style: { background: "rgba(255,255,255,0.12)", borderRadius: 32 },
      };
    case "image":
      return {
        ...base,
        x: 660,
        y: 390,
        width: 600,
        height: 300,
        content: "",
        style: { aspectScale: true, borderRadius: 16 },
      };
  }
}

type Interaction =
  | { type: "move"; layerId: string; startX: number; startY: number; origX: number; origY: number }
  | {
      type: "resize";
      dir: string;
      layerId: string;
      startX: number;
      startY: number;
      orig: { x: number; y: number; w: number; h: number };
    };

export default function TemplateEditorPage() {
  const { templateId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const t = useT();
  const lang = useLang();

  const session = useAppStore((s) => s.session);
  const flights = useDataStore((s) => s.flights);
  const screens = useDataStore((s) => s.screens);

  const [draft, setDraft] = useState<SignageTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<"fit" | "50" | "75" | "100">("fit");
  const [snapOn, setSnapOn] = useState(true);
  const [livePreview, setLivePreview] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [deployFlash, setDeployFlash] = useState<string | null>(null);

  const mountRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const [areaRef, areaWidth] = useElementWidth<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const airlineCode = session?.role === "airline_officer" ? session.airlineCode : "TG";
      let d: SignageTemplate | null;
      if (templateId) {
        d = await service.getTemplate(templateId);
      } else {
        d = blankTemplate(airlineCode);
      }
      if (!cancelled) {
        setDraft(d);
        setLoading(false);
        if (d) setSnapOn(d.layoutConfig.gridSettings.snapToGrid);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const layers = draft?.layoutConfig.layers ?? [];
  const selected = draft?.layoutConfig.layers.find((l) => l.id === selectedId) ?? null;
  const gap = draft?.layoutConfig.gridSettings.gridGap ?? 16;

  const fitScale = areaWidth > 0 ? Math.min(0.95, (areaWidth - 90) / STAGE_W) : 0.42;
  const scale = zoom === "fit" ? fitScale : Number(zoom) / 100;

  const assignedGate = session?.role === "airline_officer" ? session.assignedGate : "D1";
  const deployGate = params.get("gate") ?? assignedGate;
  const deployScreens = screens
    .filter((s) => s.gateId === deployGate)
    .sort((a, b) => a.screenIndex - b.screenIndex);
  const previewFlight = livePreview
    ? flights.find((f) => f.gate === assignedGate) ?? flights[0] ?? null
    : null;

  function clientToLogical(ev: { clientX: number; clientY: number }) {
    const r = mountRef.current!.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale };
  }

  function updateLayer(id: string, patch: Partial<TemplateLayer>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            layoutConfig: {
              ...d.layoutConfig,
              layers: d.layoutConfig.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
            },
          }
        : d
    );
  }

  function updateStyle(id: string, patch: Partial<LayerStyle>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            layoutConfig: {
              ...d.layoutConfig,
              layers: d.layoutConfig.layers.map((l) =>
                l.id === id ? { ...l, style: { ...l.style, ...patch } } : l
              ),
            },
          }
        : d
    );
  }

  function beginMove(ev: ReactPointerEvent, layer: TemplateLayer) {
    if (layer.locked) return;
    setSelectedId(layer.id);
    const p = clientToLogical(ev);
    interaction.current = { type: "move", layerId: layer.id, startX: p.x, startY: p.y, origX: layer.x, origY: layer.y };
    ev.preventDefault();
  }

  function beginResize(ev: ReactPointerEvent, dir: string) {
    if (!selected) return;
    const p = clientToLogical(ev);
    interaction.current = {
      type: "resize",
      dir,
      layerId: selected.id,
      startX: p.x,
      startY: p.y,
      orig: { x: selected.x, y: selected.y, w: selected.width, h: selected.height },
    };
    ev.preventDefault();
    ev.stopPropagation();
  }

  useEffect(() => {
    const rnd = (v: number) => (snapOn ? Math.round(v / gap) * gap : Math.round(v));
    function onMove(ev: PointerEvent) {
      const it = interaction.current;
      if (!it || !draft) return;
      const p = clientToLogical(ev);
      const dx = p.x - it.startX;
      const dy = p.y - it.startY;

      if (it.type === "move") {
        const nx = rnd(it.origX + dx);
        const ny = rnd(it.origY + dy);
        updateLayer(it.layerId, { x: nx, y: ny });
      } else {
        const dir = it.dir;
        let x = it.orig.x;
        let y = it.orig.y;
        let w = it.orig.w;
        let h = it.orig.h;
        if (dir.includes("e")) w = it.orig.w + dx;
        if (dir.includes("s")) h = it.orig.h + dy;
        if (dir.includes("w")) {
          x = it.orig.x + dx;
          w = it.orig.w - dx;
        }
        if (dir.includes("n")) {
          y = it.orig.y + dy;
          h = it.orig.h - dy;
        }
        const MIN = 20;
        if (w < MIN) {
          if (dir.includes("w")) x = it.orig.x + it.orig.w - MIN;
          w = MIN;
        }
        if (h < MIN) {
          if (dir.includes("n")) y = it.orig.y + it.orig.h - MIN;
          h = MIN;
        }
        updateLayer(it.layerId, { x: rnd(x), y: rnd(y), width: rnd(w), height: rnd(h) });
      }
    }
    function onUp() {
      interaction.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, snapOn, gap, draft]);

  function addLayer(type: LayerType) {
    if (type === "image") {
      imageInputRef.current?.click();
      return;
    }
    const l = defaultLayer(type);
    setDraft((d) =>
      d
        ? { ...d, layoutConfig: { ...d.layoutConfig, layers: [...d.layoutConfig.layers, l] } }
        : d
    );
    setSelectedId(l.id);
  }

  function onImageFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const l = { ...defaultLayer("image"), content: String(reader.result) };
      setDraft((d) =>
        d
          ? { ...d, layoutConfig: { ...d.layoutConfig, layers: [...d.layoutConfig.layers, l] } }
          : d
      );
      setSelectedId(l.id);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  function onBgFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const l: TemplateLayer = {
        id: uid(),
        type: "image",
        locked: false,
        visible: true,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        content: String(reader.result),
        style: { aspectScale: true },
      };
      setDraft((d) =>
        d
          ? { ...d, layoutConfig: { ...d.layoutConfig, layers: [l, ...d.layoutConfig.layers] } }
          : d
      );
      setSelectedId(l.id);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  function reorder(id: string, dir: "forward" | "backward") {
    setDraft((d) => {
      if (!d) return d;
      const arr = [...d.layoutConfig.layers];
      const i = arr.findIndex((l) => l.id === id);
      if (i < 0) return d;
      const j = dir === "forward" ? Math.min(arr.length - 1, i + 1) : Math.max(0, i - 1);
      if (i === j) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, layoutConfig: { ...d.layoutConfig, layers: arr } };
    });
  }

  function duplicateLayer(id: string) {
    setDraft((d) => {
      if (!d) return d;
      const i = d.layoutConfig.layers.findIndex((l) => l.id === id);
      if (i < 0) return d;
      const src = d.layoutConfig.layers[i];
      const copy = { ...src, id: uid(), x: src.x + 24, y: src.y + 24, locked: false };
      const arr = [...d.layoutConfig.layers];
      arr.splice(i + 1, 0, copy);
      setSelectedId(copy.id);
      return { ...d, layoutConfig: { ...d.layoutConfig, layers: arr } };
    });
  }

  function removeLayer(id: string) {
    setDraft((d) =>
      d
        ? { ...d, layoutConfig: { ...d.layoutConfig, layers: d.layoutConfig.layers.filter((l) => l.id !== id) } }
        : d
    );
    setSelectedId(null);
  }

  async function save(): Promise<SignageTemplate | null> {
    if (!draft) return null;
    const name = draft.templateName.trim() || t("editor.untitled");
    const saved = await useDataStore.getState().saveTemplate({ ...draft, templateName: name });
    setDraft(saved);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
    return saved;
  }

  async function deploy(screenId: string) {
    const saved = await save();
    if (!saved) return;
    const gate = params.get("gate") ?? assignedGate;
    const flightId =
      useDataStore.getState().screens.find((s) => s.gateId === gate)?.flightId ?? "";
    await useDataStore.getState().assignScreen(gate, screenId, saved.templateId, flightId);
    setDeployFlash(screenId);
    setTimeout(() => setDeployFlash(null), 900);
  }

  function exportJson() {
    if (!draft) return;
    const blob = new Blob([JSON.stringify(draft.layoutConfig, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.templateName || "template"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="empty-state">{t("common.loading")}</div>;
  }

  return (
    <div className="editor-shell">
      {/* ------------------------------------------------ left: layers */}
      <div className="editor-panel">
        <div className="insp-section">{t("editor.addImage")}</div>
        <div className="stack" style={{ gap: 6 }}>
          <button className="toolbar-btn" onClick={() => imageInputRef.current?.click()}>
            🖼 {t("editor.addImage")}
          </button>
          <button className="toolbar-btn" onClick={() => bgInputRef.current?.click()}>
            🌅 {t("editor.bgUpload")}
          </button>
          <button className="toolbar-btn" onClick={() => addLayer("free_text")}>
            Aa {t("editor.addText")}
          </button>
          <button className="toolbar-btn" onClick={() => addLayer("ifims_binding")}>
            ⛓ {t("editor.addChip")}
          </button>
          <button className="toolbar-btn" onClick={() => addLayer("clock_widget")}>
            🕑 {t("editor.addClock")}
          </button>
          <button className="toolbar-btn" onClick={() => addLayer("shape_container")}>
            ▣ {t("editor.addShape")}
          </button>
        </div>

        <div className="insp-section" style={{ marginTop: 18 }}>
          {t("editor.layers")}
        </div>
        <div className="layers-list">
          {[...layers].reverse().map((l) => (
            <div
              key={l.id}
              className={`layer-item ${selectedId === l.id ? "active" : ""}`}
              onClick={() => setSelectedId(l.id)}
            >
              <span className="glyph">{GLYPH[l.type]}</span>
              <span className="grow" style={{ opacity: l.visible ? 1 : 0.4 }}>
                {l.bindingKey ? `${l.bindingKey}` : l.content || l.type}
              </span>
              {l.locked && <span style={{ fontSize: 11 }}>🔒</span>}
              {!l.visible && <span style={{ fontSize: 11 }}>🙈</span>}
            </div>
          ))}
        </div>

        {selected && (
          <>
            <div className="insp-section" style={{ marginTop: 18 }}>
              {t("editor.layers")} · actions
            </div>
            <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
              <button className="btn btn-sm" title={t("editor.bringForward")} onClick={() => reorder(selected.id, "forward")}>
                ↑
              </button>
              <button className="btn btn-sm" title={t("editor.sendBackward")} onClick={() => reorder(selected.id, "backward")}>
                ↓
              </button>
              <button className="btn btn-sm" title={t("editor.duplicate")} onClick={() => duplicateLayer(selected.id)}>
                ⧉
              </button>
              <button
                className="btn btn-sm"
                title={t("editor.lock")}
                onClick={() => updateLayer(selected.id, { locked: !selected.locked })}
              >
                {selected.locked ? "🔓" : "🔒"}
              </button>
              <button
                className="btn btn-sm"
                title={t("editor.hide")}
                onClick={() => updateLayer(selected.id, { visible: !selected.visible })}
              >
                👁
              </button>
              <button
                className="btn btn-sm"
                title={t("editor.delete")}
                style={{ color: "#f87171" }}
                onClick={() => removeLayer(selected.id)}
              >
                🗑
              </button>
            </div>
          </>
        )}

        <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={onImageFile} />
        <input ref={bgInputRef} type="file" accept="image/*" hidden onChange={onBgFile} />
      </div>

      {/* -------------------------------------------------- center stage */}
      <div className="editor-stage-area" ref={areaRef}>
        <div className="editor-toolbar">
          <div className="field" style={{ minWidth: 180 }}>
            <label>{t("editor.name")}</label>
            <input
              className="input-sm"
              value={draft?.templateName ?? ""}
              placeholder={t("editor.untitled")}
              onChange={(e) => setDraft((d) => (d ? { ...d, templateName: e.target.value } : d))}
            />
          </div>
          <div className="field" style={{ width: 130 }}>
            <label>{t("editor.category")}</label>
            <select
              className="input-sm"
              value={draft?.category ?? "boarding"}
              onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value as TemplateCategory } : d))}
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {t(`gallery.cat.${c}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ width: 110 }}>
            <label>{t("editor.zoom")}</label>
            <select className="input-sm" value={zoom} onChange={(e) => setZoom(e.target.value as typeof zoom)}>
              <option value="fit">{t("editor.fit")}</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="100">100%</option>
            </select>
          </div>

          <div className="grow" />

          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" className="tgl" checked={snapOn} onChange={(e) => {
              setSnapOn(e.target.checked);
              setDraft((d) =>
                d
                  ? { ...d, layoutConfig: { ...d.layoutConfig, gridSettings: { ...d.layoutConfig.gridSettings, snapToGrid: e.target.checked } } }
                  : d
              );
            }} />
            {t("editor.snap")}
          </label>

          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" className="tgl" checked={livePreview} onChange={(e) => setLivePreview(e.target.checked)} />
            {t("editor.livePreview")}
          </label>
        </div>

        <div className="editor-stage-scroll">
          <div className="stage-mount" ref={mountRef} style={{ width: STAGE_W * scale, height: 1080 * scale }}>
            <TemplateStage
              template={draft}
              flight={previewFlight}
              lang={lang}
              scale={scale}
              livePreview={livePreview}
              selectedLayerId={selectedId}
              showGuides
              onLayerPointerDown={beginMove}
              onStagePointerDown={() => setSelectedId(null)}
            />
            {selected && !(selected.locked && false) && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: selected.x * scale,
                    top: selected.y * scale,
                    width: selected.width * scale,
                    height: selected.height * scale,
                    border: "2px solid var(--sky)",
                    background: "rgba(56,189,248,0.06)",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}
                />
                {HANDLES.map((h) => (
                  <div
                    key={h.dir}
                    className="resize-handle"
                    style={{
                      left: (selected.x + h.cx * selected.width) * scale - 6,
                      top: (selected.y + h.cy * selected.height) * scale - 6,
                      zIndex: 6,
                      cursor: h.cursor,
                    }}
                    onPointerDown={(e) => (selected.locked ? undefined : beginResize(e, h.dir))}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        <div className="editor-toolbar" style={{ borderTop: "1px solid var(--border-soft)", borderBottom: "none" }}>
          <button className="btn" onClick={exportJson}>
            ⬇ {t("editor.export")}
          </button>
          <div className="grow" />
          <select
            className="input-sm"
            style={{ minWidth: 160 }}
            value=""
            onChange={(e) => {
              if (e.target.value) deploy(e.target.value);
            }}
          >
            <option value="">📺 {t("editor.deployTo")}</option>
            {deployScreens.map((s) => (
              <option key={s.screenId} value={s.screenId}>
                {s.label} · {s.displaySize === "55_inch" ? "55″" : "43″"}
              </option>
            ))}
          </select>
          <button className="btn btn-sky" onClick={save}>
            {savedFlash ? "✓ " : ""}
            {t("editor.save")}
          </button>
        </div>
      </div>

      {/* ------------------------------------------- right: properties */}
      <PropertiesPanel
        selected={selected}
        onPatch={updateLayer}
        onStyle={updateStyle}
        onDelete={removeLayer}
        onBack={() => nav(-1)}
        t={t}
      />
    </div>
  );
}

function PropertiesPanel({
  selected,
  onPatch,
  onStyle,
  onDelete,
  onBack,
  t,
}: {
  selected: TemplateLayer | null;
  onPatch: (id: string, patch: Partial<TemplateLayer>) => void;
  onStyle: (id: string, patch: Partial<LayerStyle>) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  t: (k: TranslationKey, vars?: Record<string, string>) => string;
}) {
  if (!selected) {
    return (
      <div className="editor-panel editor-panel-right">
        <div className="insp-section">{t("editor.properties")}</div>
        <p className="muted small">{t("editor.noSelection")}</p>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          ← {t("common.back")}
        </button>
      </div>
    );
  }

  const s = selected.style;
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);

  return (
    <div className="editor-panel editor-panel-right">
      <div className="insp-section">
        {selected.bindingKey ? "⛓ IFIMS" : selected.type.replace("_", " ")}
      </div>

      {/* position / size */}
      <div className="props-grid">
        {(["x", "y", "width", "height"] as const).map((k) => (
          <div className="props-field" key={k}>
            <label>{k}</label>
            <input
              type="number"
              className="input-sm"
              value={num(selected[k]) ?? 0}
              onChange={(e) => onPatch(selected.id, { [k]: Number(e.target.value) || 0 } as Partial<TemplateLayer>)}
            />
          </div>
        ))}
      </div>

      <div className="props-field">
        <label>{t("editor.opacity")}</label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((s.opacity ?? 1) * 100)}
          onChange={(e) => onStyle(selected.id, { opacity: Number(e.target.value) / 100 })}
        />
      </div>

      {/* binding field */}
      {selected.type === "ifims_binding" && (
        <div className="props-field">
          <label>{t("editor.field")}</label>
          <select
            className="input-sm"
            value={selected.bindingKey ?? ""}
            onChange={(e) => onPatch(selected.id, { bindingKey: (e.target.value || undefined) as BindingKey | undefined })}
          >
            <option value="">{t("editor.emptyField")}</option>
            {BINDINGS.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* status colour mapping */}
      {selected.type === "ifims_binding" && selected.bindingKey === "flight.status" && (
        <div className="props-grid">
          {(["boarding", "finalCall", "delayed"] as const).map((k) => (
            <div className="props-field" key={k}>
              <label>{k}</label>
              <input
                type="color"
                value={selected.statusColorMapping?.[k] ?? "#22c55e"}
                onChange={(e) =>
                  onPatch(selected.id, {
                    statusColorMapping: {
                      ...(selected.statusColorMapping ?? { boarding: "#22c55e", finalCall: "#f59e0b", delayed: "#ef4444" }),
                      [k]: e.target.value,
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* text-heavy styles */}
      {selected.type !== "shape_container" && selected.type !== "image" && (
        <>
          {selected.type === "free_text" && (
            <div className="props-field">
              <label>{t("editor.addText")}</label>
              <textarea
                className="input-sm"
                rows={2}
                value={selected.content ?? ""}
                onChange={(e) => onPatch(selected.id, { content: e.target.value })}
              />
            </div>
          )}

          <div className="props-field">
            <label>{t("editor.font")}</label>
            <select
              className="input-sm"
              value={s.fontFamily ?? "Thai Sans"}
              onChange={(e) => onStyle(selected.id, { fontFamily: e.target.value })}
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="props-grid">
            <div className="props-field">
              <label>{t("editor.size")} (px)</label>
              <input
                type="number"
                className="input-sm"
                value={s.fontSize ?? 48}
                onChange={(e) => onStyle(selected.id, { fontSize: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="props-field">
              <label>{t("editor.weight")}</label>
              <select
                className="input-sm"
                value={String(s.fontWeight ?? 400)}
                onChange={(e) => onStyle(selected.id, { fontWeight: Number(e.target.value) })}
              >
                {[300, 400, 500, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="props-grid">
            <div className="props-field">
              <label>{t("editor.color")}</label>
              <input
                type="color"
                value={typeof s.color === "string" ? s.color : "#ffffff"}
                onChange={(e) => onStyle(selected.id, { color: e.target.value })}
              />
            </div>
            <div className="props-field">
              <label>{t("editor.align")}</label>
              <select
                className="input-sm"
                value={s.textAlign ?? "left"}
                onChange={(e) => onStyle(selected.id, { textAlign: e.target.value as LayerStyle["textAlign"] })}
              >
                <option value="left">L</option>
                <option value="center">C</option>
                <option value="right">R</option>
              </select>
            </div>
          </div>

          {selected.type === "clock_widget" ? (
            <div className="props-field">
              <label>{t("editor.addClock")}</label>
              <select
                className="input-sm"
                value={s.clockFormat ?? "HH:mm"}
                onChange={(e) => onStyle(selected.id, { clockFormat: e.target.value as "HH:mm" | "HH:mm:ss" })}
              >
                <option value="HH:mm">HH:mm</option>
                <option value="HH:mm:ss">HH:mm:ss</option>
              </select>
            </div>
          ) : (
            <div className="row" style={{ gap: 12 }}>
              <label className="row small" style={{ gap: 5 }}>
                <input
                  type="checkbox"
                  className="tgl"
                  checked={!!s.textOutline}
                  onChange={(e) => onStyle(selected.id, { textOutline: e.target.checked })}
                />
                {t("editor.outline")}
              </label>
              <label className="row small" style={{ gap: 5 }}>
                <input
                  type="checkbox"
                  className="tgl"
                  checked={!!s.textShadow}
                  onChange={(e) => onStyle(selected.id, { textShadow: e.target.checked })}
                />
                {t("editor.shadow")}
              </label>
            </div>
          )}
        </>
      )}

      {/* shape styles */}
      {selected.type === "shape_container" && (
        <>
          <div className="props-field">
            <label>{t("editor.background")}</label>
            <input
              type="color"
              value={typeof s.background === "string" && s.background.startsWith("#") ? s.background : "#132748"}
              onChange={(e) => onStyle(selected.id, { background: e.target.value })}
            />
          </div>
          <div className="props-grid">
            <div className="props-field">
              <label>{t("editor.size")} · radius</label>
              <input
                type="number"
                className="input-sm"
                value={s.borderRadius ?? 0}
                onChange={(e) => onStyle(selected.id, { borderRadius: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="props-field">
              <label>border</label>
              <input
                type="number"
                className="input-sm"
                value={s.borderWidth ?? 0}
                onChange={(e) => onStyle(selected.id, { borderWidth: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        </>
      )}

      {/* image styles */}
      {selected.type === "image" && (
        <div className="row" style={{ gap: 10 }}>
          <label className="row small" style={{ gap: 5 }}>
            <input
              type="checkbox"
              className="tgl"
              checked={!!s.aspectScale}
              onChange={(e) => onStyle(selected.id, { aspectScale: e.target.checked })}
            />
            cover
          </label>
        </div>
      )}

      <div className="insp-section" style={{ marginTop: 18 }}>
        {t("common.screen")}
      </div>
      <button
        className="btn btn-danger btn-block"
        onClick={() => onDelete(selected.id)}
        disabled={selected.locked}
      >
        🗑 {t("editor.delete")}
      </button>
    </div>
  );
}