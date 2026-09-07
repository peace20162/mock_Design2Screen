import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { GateScreen, SignageTemplate, TemplateCategory } from "../types";
import { useAppStore } from "../store/appStore";
import { useDataStore } from "../store/dataStore";
import { useLang, useT } from "../lib/useT";
import { useElementWidth } from "../lib/useElementWidth";
import { Modal } from "../components/bits";
import { ScreenThumb } from "../components/ScreenPreview";
import { airlineByCode } from "../services/mockData";

const CATS: TemplateCategory[] = ["welcome", "boarding", "final_call", "delay", "gate_closed"];
const SORTS = ["created_desc", "created_asc", "updated_desc", "name_asc", "name_desc"] as const;

function sizeLabel(displaySize: "43_inch" | "55_inch") {
  return displaySize === "55_inch" ? "55″" : "43″";
}

export default function TemplateGalleryPage() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const target = params.get("target");
  const session = useAppStore((s) => s.session);
  const { templates, screens } = useDataStore();

  const airlineCode = session?.role === "airline_officer" ? session.airlineCode : "";
  const airline = airlineByCode(airlineCode);
  const gate =
    params.get("gate") ?? (session?.role === "airline_officer" ? session.assignedGate : "D1");

  const [cat, setCat] = useState<TemplateCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("updated_desc");
  const [toDelete, setToDelete] = useState<SignageTemplate | null>(null);
  const [flashApplied, setFlashApplied] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query);

  const gateScreens = useMemo(
    () =>
      screens.filter((s) => s.gateId === gate).sort((a, b) => a.screenIndex - b.screenIndex),
    [screens, gate]
  );

  const list = useMemo(() => {
    let out = templates.slice();
    if (cat !== "all") out = out.filter((x) => x.category === cat);
    const q = deferredQuery.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (x) =>
          x.templateName.toLowerCase().includes(q) || x.category.toLowerCase().includes(q)
      );
    }
    const [field, order] = sort.split("_") as [string, string];
    out.sort((a, b) => {
      if (field === "name") {
        return order === "asc"
          ? a.templateName.localeCompare(b.templateName)
          : b.templateName.localeCompare(a.templateName);
      }
      if (field === "created") {
        return order === "asc"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt);
      }
      return order === "asc"
        ? a.updatedAt.localeCompare(b.updatedAt)
        : b.updatedAt.localeCompare(a.updatedAt);
    });
    return out;
  }, [templates, cat, deferredQuery, sort]);

  async function apply(templateId: string, screenId: string) {
    const flightId = screens.find((s) => s.gateId === gate)?.flightId ?? "";
    await useDataStore.getState().assignScreen(gate, screenId, templateId, flightId);
    setFlashApplied(`${templateId}:${screenId}`);
    window.setTimeout(() => {
      setFlashApplied(null);
      if (target) nav(`/gate/${gate}`);
    }, 450);
  }

  const hasSearch = deferredQuery.trim().length > 0;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ fontSize: 22 }}>{t("gallery.title")}</h2>
          <div className="muted small">
            {airlineCode ? t("gallery.subtitle", { airline: `${airline.name} (${airline.code})` }) : ""}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => nav("/templates/editor")}>
          ＋ {t("gallery.new")}
        </button>
      </div>

      {target && (
        <div className="banner-sky">
          {t("common.apply")} →{" "}
          <b>{gateScreens.find((s) => s.screenId === target)?.label ?? target}</b> ·{" "}
          {t("gate.gate")} {gate}
        </div>
      )}

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <div className="field grow" style={{ minWidth: 220, margin: 0 }}>
          <input
            className="input"
            placeholder={t("gallery.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field" style={{ minWidth: 190, margin: 0 }}>
          <select
            className="select"
            value={sort}
            onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`gallery.sort.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className={`btn btn-sm ${cat === "all" ? "btn-primary" : ""}`} onClick={() => setCat("all")}>
          {t("gallery.all")} ({templates.length})
        </button>
        {CATS.map((c) => (
          <button
            key={c}
            className={`btn btn-sm ${cat === c ? "btn-primary" : ""}`}
            onClick={() => setCat(c)}
          >
            {t(`gallery.cat.${c}`)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">{hasSearch ? "🔍" : "🎨"}</div>
            <div className="empty-title">
              {hasSearch ? t("gallery.noResults") : t("gallery.empty")}
            </div>
            {hasSearch ? (
              <button className="btn" onClick={() => setQuery("")}>
                {t("gallery.clearSearch")}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => nav("/templates/editor")}>
                ＋ {t("gallery.new")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="gallery-grid">
          {list.map((tpl) => (
            <GalleryCard
              key={tpl.templateId}
              template={tpl}
              gateScreens={gateScreens}
              applied={flashApplied?.startsWith(tpl.templateId) ? flashApplied : null}
              onApply={apply}
              onEdit={() => nav(`/templates/editor/${tpl.templateId}`)}
              onDuplicate={async () => {
                const c = await useDataStore.getState().duplicateTemplate(tpl.templateId);
                nav(`/templates/editor/${c.templateId}`);
              }}
              onDelete={() => setToDelete(tpl)}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!toDelete}
        title={t("gallery.confirmDelete")}
        onClose={() => setToDelete(null)}
        footer={
          <>
            <button className="btn" onClick={() => setToDelete(null)}>
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (toDelete) await useDataStore.getState().deleteTemplate(toDelete.templateId);
                setToDelete(null);
              }}
            >
              {t("gallery.delete")}
            </button>
          </>
        }
      >
        <p className="muted">{toDelete?.templateName}</p>
      </Modal>
    </div>
  );
}

function GalleryCard({
  template,
  gateScreens,
  applied,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: SignageTemplate;
  gateScreens: GateScreen[];
  applied: string | null;
  onApply: (id: string, screenId: string) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const justApplied = !!applied;

  return (
    <div className="card gcard">
      <div ref={ref} style={{ width: "100%" }}>
        <ScreenThumb template={template} flight={null} lang={lang} width={Math.max(width - 2, 100)} />
      </div>
      <div className="gcard-body">
        <div className="row" style={{ gap: 8 }}>
          <span className="badge badge-sky">{t(`gallery.cat.${template.category}`)}</span>
          <span className="faint small">
            {template.layoutConfig.layers.length} {t("gallery.layers")}
          </span>
        </div>
        <div className="gcard-name">{template.templateName}</div>

        <div className="gcard-actions">
          <select
            className="select"
            style={{ flex: 1 }}
            value=""
            onChange={(e) => {
              if (e.target.value) onApply(template.templateId, e.target.value);
            }}
          >
            <option value="">
              {justApplied ? "✓ " : "▾ "}
              {t("gallery.applyToScreen")}
            </option>
            {gateScreens.map((s) => (
              <option key={s.screenId} value={s.screenId}>
                {s.label} · {sizeLabel(s.displaySize)}
              </option>
            ))}
          </select>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>
            ✏️ {t("gallery.edit")}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onDuplicate}>
            ⧉ {t("gallery.duplicate")}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onDelete} style={{ color: "#f87171" }}>
            🗑 {t("gallery.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}