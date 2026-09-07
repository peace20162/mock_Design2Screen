import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { Flight, SignageTemplate, TemplateLayer } from "../types";
import type { Lang } from "../i18n/translations";
import {
  PLACEHOLDER_TOKEN,
  PLACEHOLDER_VALUES,
  resolveBinding,
  statusColor,
} from "../lib/binding";

const STAGE_W = 1920;
const STAGE_H = 1080;

// Live ticking clock (Bangkok UTC+7), local to the stage so previews pulse.
function useBangkokNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function formatClock(date: Date, format: string, seconds: boolean): string {
  const bangkok = new Date(date.getTime() + 7 * 3600 * 1000);
  const hh = String(bangkok.getUTCHours()).padStart(2, "0");
  const mm = String(bangkok.getUTCMinutes()).padStart(2, "0");
  if (format === "HH:mm:ss" || seconds) {
    const ss = String(bangkok.getUTCSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}`;
}

function outlineShadow(px: number, color = "rgba(0,0,0,0.9)"): string {
  if (px <= 0) return "none";
  const d = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  return d.map(([x, y]) => `${x * px}px ${y * px}px 0 ${color}`).join(", ");
}

const FONT_MAP: Record<string, string> = {
  "thai sans": '"Leelawadee UI", "Tahoma", sans-serif',
  arial: '"Segoe UI", Arial, sans-serif',
  helvetica: '"Segoe UI", Helvetica, Arial, sans-serif',
  tahoma: '"Tahoma", "Leelawadee UI", sans-serif',
  sarabun: '"Sarabun", "Leelawadee UI", sans-serif',
  "segoe ui": '"Segoe UI", sans-serif',
};

function resolveFont(font?: string): string | undefined {
  if (!font) return undefined;
  return FONT_MAP[font.toLowerCase()] ?? font;
}

function chipText(layer: TemplateLayer, flight: Flight | null, livePreview: boolean, lang: Lang): string {
  if (!layer.bindingKey) return "";
  if (flight) return resolveBinding(layer.bindingKey, flight, lang);
  return livePreview ? PLACEHOLDER_VALUES[layer.bindingKey] : PLACEHOLDER_TOKEN[layer.bindingKey];
}

interface LayerViewProps {
  layer: TemplateLayer;
  flight: Flight | null;
  livePreview: boolean;
  lang: Lang;
  selected: boolean;
  onPointerDown?: (e: ReactPointerEvent, layer: TemplateLayer) => void;
}

function LayerView({ layer, flight, livePreview, lang, selected, onPointerDown }: LayerViewProps) {
  const s = layer.style;
  const base: CSSProperties = {
    position: "absolute",
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
    opacity: s.opacity ?? 1,
  };

  // Doc §2: flight codes, times & the clock use a monospaced tabular face so
  // numeric glyphs never shift layout.
  const isMono =
    layer.type === "clock_widget" ||
    (layer.type === "ifims_binding" &&
      !!layer.bindingKey &&
      ["flight.number", "flight.std", "flight.etd", "flight.gate"].includes(layer.bindingKey));
  const fontFamily =
    resolveFont(s.fontFamily) ?? (isMono ? "JetBrains Mono, Space Grotesk, ui-monospace, monospace" : undefined);

  if (!layer.visible) {
    base.display = "none";
  }

  if (layer.type === "shape_container") {
    base.background = s.background;
    base.borderColor = s.borderColor;
    base.borderWidth = s.borderWidth;
    base.borderStyle = s.borderWidth ? "solid" : undefined;
    base.borderRadius = s.borderRadius;
    return <div style={base} data-layer={layer.id} onPointerDown={onPointerDown && ((e) => onPointerDown(e, layer))} />;
  }

  if (layer.type === "image") {
    base.overflow = "hidden";
    base.borderRadius = s.borderRadius;
    return (
      <div style={base} data-layer={layer.id} onPointerDown={onPointerDown && ((e) => onPointerDown(e, layer))}>
        {layer.content ? (
          <img
            src={layer.content}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: s.aspectScale ? "cover" : "contain",
              display: "block",
            }}
          />
        ) : (
          <div className="stage-image-empty">🖼️</div>
        )}
      </div>
    );
  }

  // text / ifims / clock
  const align = s.textAlign ?? "left";
  const valign = s.verticalAlign ?? "top";
  const fontPx = s.fontSize ?? 48;
  const color = layer.type === "ifims_binding" && layer.bindingKey === "flight.status" && flight
    ? statusColor(flight.status, layer.statusColorMapping)
    : s.color ?? "#ffffff";

  const flexAlign =
    valign === "middle" ? "center" : valign === "bottom" ? "flex-end" : "flex-start";
  const flexJustify = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  let text = "";
  if (layer.type === "clock_widget") {
    text = "";
  } else if (layer.type === "ifims_binding") {
    text = chipText(layer, flight, livePreview, lang);
  } else {
    text = layer.content ?? "";
  }

  const textShadow = s.textOutline
    ? outlineShadow(Math.max(1, Math.round(fontPx * 0.04)), "rgba(0,0,0,0.85)")
    : s.textShadow
      ? outlineShadow(Math.max(1, Math.round(fontPx * 0.03)), "rgba(0,0,0,0.5)")
      : "none";

  if (layer.type === "clock_widget") {
    return (
      <div
        style={{ ...base, display: "flex", alignItems: flexAlign, justifyContent: flexJustify, background: s.background, borderRadius: s.borderRadius, border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor ?? "#0000"}` : undefined }}
        data-layer={layer.id}
        onPointerDown={onPointerDown && ((e) => onPointerDown(e, layer))}
      >
        <ClockText
          format={s.clockFormat ?? "HH:mm"}
          seconds={!!s.clockSeconds}
          color={color}
          fontSize={fontPx}
          fontWeight={s.fontWeight ?? 700}
          fontFamily={fontFamily}
          textShadow={textShadow}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...base,
        display: "flex",
        alignItems: flexAlign,
        justifyContent: flexJustify,
        color,
        fontSize: fontPx,
        fontWeight: s.fontWeight ?? 400,
        fontFamily,
        textAlign: align as CSSProperties["textAlign"],
        background: s.background,
        borderRadius: s.borderRadius,
        padding: s.background ? "0 18px" : undefined,
        whiteSpace: "pre-wrap",
        overflow: "hidden",
        textShadow,
        border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor ?? "#0000"}` : undefined,
        lineHeight: 1.12,
      }}
      data-layer={layer.id}
      onPointerDown={onPointerDown && ((e) => onPointerDown(e, layer))}
    >
      {text}
    </div>
  );
}

function ClockText(props: {
  format: string;
  seconds: boolean;
  color: string;
  fontSize: number;
  fontWeight: number;
  fontFamily?: string;
  textShadow: string;
}) {
  const now = useBangkokNow(props.seconds || props.format === "HH:mm:ss" ? 1000 : 30000);
  const txt = formatClock(now, props.format, props.seconds);
  return (
    <span
      style={{
        color: props.color,
        fontSize: props.fontSize,
        fontWeight: props.fontWeight,
        fontFamily: props.fontFamily,
        textShadow: props.textShadow,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {txt}
    </span>
  );
}

export interface TemplateStageProps {
  template: SignageTemplate | null;
  flight?: Flight | null;
  lang: Lang;
  scale: number;
  livePreview?: boolean;
  selectedLayerId?: string | null;
  showGuides?: boolean;
  onLayerPointerDown?: (e: ReactPointerEvent, layer: TemplateLayer) => void;
  onStagePointerDown?: (e: ReactPointerEvent) => void;
}

export default function TemplateStage({
  template,
  flight,
  lang,
  scale,
  livePreview = false,
  selectedLayerId = null,
  showGuides = false,
  onLayerPointerDown,
  onStagePointerDown,
}: TemplateStageProps) {
  const ordered = useMemo(() => (template ? [...template.layoutConfig.layers] : []), [template]);

  if (!template) return null;

  const margin = template.layoutConfig.gridSettings.bezelSafeMargin;

  return (
    <div
      className="tpl-stage"
      style={{ width: STAGE_W * scale, height: STAGE_H * scale }}
      onPointerDown={onStagePointerDown}
    >
      <div
        className="tpl-canvas"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "0 0" }}
      >
        {ordered.map((layer) => (
          <LayerView
            key={layer.id}
            layer={layer}
            flight={flight ?? null}
            livePreview={livePreview}
            lang={lang}
            selected={selectedLayerId === layer.id}
            onPointerDown={onLayerPointerDown}
          />
        ))}
        {showGuides && (
          <div
            className="stage-guide"
            style={{ left: margin, top: margin, right: margin, bottom: margin }}
          />
        )}
      </div>
    </div>
  );
}

// Placeholder styling injected only when the stage is rendered in-browser.
if (typeof document !== "undefined") {
  // (styles appended via index.css)
}