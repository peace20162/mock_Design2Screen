import type { ReactNode } from "react";
import { useEffect } from "react";
import type { FlightStatus } from "../types";
import { useT } from "../lib/useT";

const TONE: Record<FlightStatus, "green" | "amber" | "red" | "slate"> = {
  scheduled: "slate",
  boarding: "green",
  zones: "green",
  final_call: "amber",
  delayed: "red",
  gate_closed: "red",
  departed: "slate",
};

export function StatusBadge({ status }: { status: FlightStatus }) {
  const t = useT();
  const tone = TONE[status];
  return <span className={`badge badge-${tone}`}>{t(`status.${status}`)}</span>;
}

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {hint && <div className="muted small">{hint}</div>}
      {action}
    </div>
  );
}