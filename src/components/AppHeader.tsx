import { NavLink, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { useT } from "../lib/useT";
import { airlineByCode } from "../services/mockData";

export default function AppHeader() {
  const t = useT();
  const session = useAppStore((s) => s.session);
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const logout = useAppStore((s) => s.logout);
  const nav = useNavigate();

  const isOfficer = session?.role === "airline_officer";
  const isAdmin = session?.role === "airport_admin";

  const officerNav = isOfficer
    ? [
        { to: `/gate/${session.assignedGate}`, label: `${t("gate.gate")} ${session.assignedGate}` },
        { to: "/templates/gallery", label: t("gallery.title") },
      ]
    : [];

  const adminNav = isAdmin
    ? [
        { to: "/admin/screens", label: t("admin.screens") },
        { to: "/admin/gates", label: t("admin.gates") },
        { to: "/admin/airlines", label: t("admin.airlines") },
        { to: "/admin/broadcast", label: t("admin.broadcast") },
      ]
    : [];

  return (
    <header className="app-header">
      <div className="brand">
        <span className="logo">✈</span>
        <div>
          <div>{t("app.name")}</div>
          <div className="sub">{t("app.airport")}</div>
        </div>
      </div>

      <nav style={{ display: "flex", gap: 4, marginLeft: 24 }}>
        {[...officerNav, ...adminNav].map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => `btn btn-sm ${isActive ? "btn-primary" : "btn-ghost"}`}
          >
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="spacer" />

      {session && (
        <span className="role-badge">
          {isOfficer ? (
            <>
              <span
                className="status-dot"
                style={{ background: airlineByCode(session.airlineCode).accent }}
              />
              {airlineByCode(session.airlineCode).code} · {t("app.role.officer")}
            </>
          ) : (
            <>
              <span className="status-dot" style={{ background: "var(--accent)" }} />
              {t("app.role.admin")}
            </>
          )}
        </span>
      )}

      <div className="seg" style={{ padding: 2 }}>
        <button className={lang === "th" ? "active" : ""} onClick={() => setLang("th")}>
          ไทย
        </button>
        <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
          EN
        </button>
      </div>

      <button
        className="btn btn-ghost btn-sm"
        onClick={() => {
          logout();
          nav("/login");
        }}
      >
        {t("header.signOut")}
      </button>
    </header>
  );
}