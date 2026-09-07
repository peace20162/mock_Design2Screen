import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Airline } from "../types";
import { service } from "../services";
import { useAppStore } from "../store/appStore";
import { useT } from "../lib/useT";

type RoleTab = "airline" | "admin";

export default function LoginPage() {
  const t = useT();
  const nav = useNavigate();
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const loginAirline = useAppStore((s) => s.loginAirline);
  const loginAdmin = useAppStore((s) => s.loginAdmin);

  const [tab, setTab] = useState<RoleTab>("airline");
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [gates, setGates] = useState<string[]>([]);

  const [airline, setAirline] = useState("TG");
  const [gate, setGate] = useState("D1");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    service.listAirlines().then(setAirlines);
  }, []);

  useEffect(() => {
    let cancelled = false;
    service.listAirlineGates(airline).then((g) => {
      if (cancelled) return;
      setGates(g);
      setGate((prev) => (g.includes(prev) ? prev : g[0] ?? ""));
    });
    return () => {
      cancelled = true;
    };
  }, [airline]);

  async function submitAirline() {
    if (!airline || !gate) {
      setError(t("login.chooseAirlineFirst"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      await loginAirline({ airlineCode: airline, gateId: gate, username, password });
      nav(`/gate/${gate}`);
    } catch (e) {
      setError(t("login.error"));
    } finally {
      setBusy(false);
    }
  }

  async function submitAdmin() {
    setError("");
    setBusy(true);
    try {
      await loginAdmin();
      nav("/admin/screens");
    } finally {
      setBusy(false);
    }
  }

  const airlineName = (a: Airline) => (lang === "th" ? a.nameTh : a.name);

  return (
    <div className="login-wrap">
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="login-logo">✈</div>
          <h1>{t("app.name")}</h1>
          <div className="login-airport">{t("app.airport")}</div>
          <ul className="login-points">
            <li>Screen 1 · 55″ and Screen 2 · 43″ control</li>
            <li>Live IFIMS flight data binding</li>
            <li>One-click push to gate displays</li>
          </ul>
        </div>
      </div>

      <div className="login-form">
        <div className="login-card">
          <div className="seg login-seg">
            <button className={tab === "airline" ? "active" : ""} onClick={() => setTab("airline")}>
              ✈️ {t("login.airlineStaff")}
            </button>
            <button className={tab === "admin" ? "active" : ""} onClick={() => setTab("admin")}>
              🛡️ {t("login.airportAdmin")}
            </button>
          </div>

          <div className="muted small" style={{ textAlign: "center", marginTop: 8 }}>
            {tab === "airline" ? t("login.airlineDesc") : t("login.adminDesc")}
          </div>

          {tab === "airline" ? (
            <div className="stack" style={{ marginTop: 20 }}>
              <div className="row" style={{ gap: 12 }}>
                <div className="field grow">
                  <label>{t("login.selectAirline")}</label>
                  <select className="select" value={airline} onChange={(e) => setAirline(e.target.value)}>
                    {airlines.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} — {airlineName(a)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ width: 120 }}>
                  <label>{t("login.selectGate")}</label>
                  <select className="select" value={gate} onChange={(e) => setGate(e.target.value)}>
                    {gates.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>{t("login.username")}</label>
                <input
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tg.officer"
                  autoComplete="username"
                />
              </div>
              <div className="field">
                <label>{t("login.password")}</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && submitAirline()}
                />
              </div>

              {error && <div className="login-error">{error}</div>}

              <button className="btn btn-primary btn-lg btn-block" onClick={submitAirline} disabled={busy}>
                {busy ? t("common.loading") : t("login.signIn")}
              </button>

              <div className="muted small" style={{ textAlign: "center" }}>
                {t("login.demoHint")} — <code>tg.officer / demo1234</code>
              </div>
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 20 }}>
              <button className="btn btn-sky btn-lg btn-block" onClick={submitAdmin} disabled={busy}>
                {busy ? t("common.loading") : t("login.azure")}
              </button>
              <div className="muted small" style={{ textAlign: "center" }}>
                {t("login.adminHint")}
              </div>
              <div className="muted small" style={{ textAlign: "center" }}>
                {t("login.demoHint")} — <code>somchai.r@airportthai.co.th</code>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="login-lang">
        <div className="seg" style={{ padding: 2 }}>
          <button className={lang === "th" ? "active" : ""} onClick={() => setLang("th")}>
            ไทย
          </button>
          <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
            EN
          </button>
        </div>
      </div>
    </div>
  );
}