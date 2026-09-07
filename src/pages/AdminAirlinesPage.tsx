import { useEffect, useState } from "react";
import type { Airline, AirlineAccount } from "../types";
import { service } from "../services";
import { GATES } from "../services/mockData";
import { useT } from "../lib/useT";
import { Modal } from "../components/bits";

export default function AdminAirlinesPage() {
  const t = useT();
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [accounts, setAccounts] = useState<AirlineAccount[]>([]);

  // create-account form
  const [open, setOpen] = useState(false);
  const [nAirline, setNAirline] = useState("TG");
  const [nUser, setNUser] = useState("");
  const [nPass, setNPass] = useState("");
  const [nGates, setNGates] = useState<string[]>(["D1"]);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  const [resetFor, setResetFor] = useState<string | null>(null);

  async function load() {
    const [a, acc] = await Promise.all([service.listAirlines(), service.listAirlineAccounts()]);
    setAirlines(a);
    setAccounts(acc);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleGate(g: string) {
    setNGates((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function create() {
    setErr("");
    try {
      const acc = await service.createAirlineAccount({
        airlineCode: nAirline,
        username: nUser,
        password: nPass,
        allowedGates: nGates,
      });
      setCreated(acc.username);
      setOpen(false);
      setNUser("");
      setNPass("");
      setNGates(["D1"]);
      setNAirline("TG");
      window.setTimeout(() => setCreated(null), 2500);
      await load();
    } catch (e) {
      const m = (e as Error).message;
      setErr(
        m === "username_taken"
          ? t("admin.usernameTaken")
          : m === "unauthorized"
            ? t("login.error")
            : m
      );
    }
  }

  const accountsFor = (code: string) => accounts.filter((a) => a.airlineCode === code);

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ fontSize: 22 }}>{t("admin.airlines")}</h2>
          <div className="muted small">
            {t("admin.accounts")} · {accounts.length}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          ＋ {t("admin.newAccount")}
        </button>
      </div>

      {created && (
        <div className="banner-sky">
          ✓ {t("admin.created")} — <code>{created}</code>
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>{t("login.selectAirline")}</th>
              <th>{t("login.username")}</th>
              <th>{t("admin.gates")}</th>
              <th style={{ textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            {airlines.map((a) => {
              const accs = accountsFor(a.code);
              if (accs.length === 0) return null;
              return accs.map((acc) => (
                <tr key={acc.userId}>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="avatar" style={{ background: a.accent, fontSize: 12 }}>
                        {a.code}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{a.name}</div>
                        <div className="faint small">{a.code}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <code>{acc.username}</code>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                      {acc.allowedGates.map((g) => (
                        <span key={g} className="badge badge-slate">
                          {g}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm" onClick={() => setResetFor(acc.username)}>
                      {t("admin.resetPassword")}
                    </button>
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      {/* create account */}
      <Modal
        open={open}
        title={t("admin.newAccount")}
        onClose={() => {
          setOpen(false);
          setErr("");
        }}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-primary"
              onClick={create}
              disabled={!nUser.trim() || !nPass.trim()}
            >
              {t("admin.createAccount")}
            </button>
          </>
        }
      >
        <div className="stack">
          <div className="field">
            <label>{t("login.selectAirline")}</label>
            <select className="select" value={nAirline} onChange={(e) => setNAirline(e.target.value)}>
              {airlines.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t("login.username")}</label>
            <input
              className="input"
              value={nUser}
              onChange={(e) => setNUser(e.target.value)}
              placeholder={`${nAirline.toLowerCase()}.officer`}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label>{t("login.password")}</label>
            <input
              className="input"
              type="text"
              value={nPass}
              onChange={(e) => setNPass(e.target.value)}
              placeholder="••••••"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label>{t("admin.gates")}</label>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {GATES.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`btn btn-sm ${nGates.includes(g) ? "btn-primary" : ""}`}
                  onClick={() => toggleGate(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          {err && <div className="login-error">{err}</div>}
        </div>
      </Modal>

      {/* reset (mock) */}
      <Modal
        open={!!resetFor}
        title={`${t("admin.resetPassword")} — mock`}
        onClose={() => setResetFor(null)}
        footer={
          <button className="btn btn-primary" onClick={() => setResetFor(null)}>
            {t("common.confirm")}
          </button>
        }
      >
        <p className="muted">
          {t("login.username")} <b>{resetFor}</b> → <code>demo1234</code>
        </p>
        <p className="faint small">Demo reset only — no real credential store in the mockup.</p>
      </Modal>
    </div>
  );
}