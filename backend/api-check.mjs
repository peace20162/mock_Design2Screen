import WebSocket from "ws";

const BASE = "http://localhost:3000";
let pass = 0;
let fail = 0;
const check = (n, c) => {
  if (c) {
    pass++;
    console.log("  \u2713 " + n);
  } else {
    fail++;
    console.log("  \u2717 " + n);
  }
};
const j = (r) => r.json();

async function main() {
  const h = await (await fetch(BASE + "/health")).json();
  check("health", h.ok === true);

  const login = await j(
    await fetch(BASE + "/api/v1/auth/airline/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ airlineCode: "TG", gateId: "D1", username: "tg.officer", password: "demo1234" }),
    })
  );
  check("officer login returns JWT", !!login.token && login.session.role === "airline_officer");
  const tok = login.token;

  const bad = await fetch(BASE + "/api/v1/auth/airline/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ airlineCode: "TG", gateId: "D1", username: "tg.officer", password: "nope" }),
  });
  check("wrong password -> 401", bad.status === 401);

  const adm = await j(await fetch(BASE + "/api/v1/auth/admin/login", { method: "POST" }));
  check("admin login (mock SSO)", !!adm.token && adm.session.role === "airport_admin");
  const atok = adm.token;

  const d1 = await j(await fetch(BASE + "/api/v1/gates/D1/screens"));
  check("D1 has 2 screens", d1.length === 2);
  const c1 = await j(await fetch(BASE + "/api/v1/gates/C1/screens"));
  check("C1 has 3 screens", c1.length === 3);

  const fl = await j(await fetch(BASE + "/api/v1/flights?gate=D1"));
  check("D1 flights non-empty", fl.length >= 1);

  const tpl = await j(await fetch(BASE + "/api/v1/airlines/TG/templates", { headers: { authorization: "Bearer " + tok } }));
  check("TG templates (tenant)", tpl.length >= 1 && tpl[0].airlineCode === "TG");

  const unauth = await fetch(BASE + "/api/v1/airlines/TG/templates");
  check("templates requires auth -> 401", unauth.status === 401);

  const assign = await j(
    await fetch(BASE + "/api/v1/gates/D1/screens/screen_1/assign", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + tok },
      body: JSON.stringify({ templateId: "tpl-tg-boarding", flightId: "f-tg920" }),
    })
  );
  const s1 = assign.find((s) => s.screenId === "screen_1");
  check("assign -> template mode", s1.currentMode === "template" && s1.templateId === "tpl-tg-boarding");

  const ws = new WebSocket("ws://localhost:3000/ws/v1/gdu/GDU-D1-S1");
  const wsMsg = await new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("ws timeout")), 3000);
    ws.on("message", (d) => {
      clearTimeout(to);
      resolve(JSON.parse(String(d)));
    });
    ws.on("error", reject);
  });
  check("WS initial layout push", wsMsg.type === "layout" && wsMsg.screen.gateId === "D1" && wsMsg.template);
  ws.close();

  const tel = await j(await fetch(BASE + "/api/v1/admin/screens/telemetry", { headers: { authorization: "Bearer " + atok } }));
  check("telemetry covers 13 screens", tel.length === 13);

  const acc = await j(
    await fetch(BASE + "/api/v1/admin/accounts", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + atok },
      body: JSON.stringify({ airlineCode: "VZ", username: "vz.agent3", password: "pass1234", allowedGates: ["D4"] }),
    })
  );
  check("admin creates account", acc.username === "vz.agent3");

  const dup = await fetch(BASE + "/api/v1/admin/accounts", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + atok },
    body: JSON.stringify({ airlineCode: "VZ", username: "vz.agent3", password: "x1234", allowedGates: ["D4"] }),
  });
  check("duplicate username -> 409", dup.status === 409);

  const added = await j(
    await fetch(BASE + "/api/v1/admin/screens", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + atok },
      body: JSON.stringify({ gateId: "C1", label: "Zone 2", displaySize: "43_inch" }),
    })
  );
  check("admin adds 4th screen to C1", added.screenId === "screen_4" && added.gateId === "C1");

  const em = await j(
    await fetch(BASE + "/api/v1/admin/broadcast/override", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + atok },
      body: JSON.stringify({ active: true, message: "EVACUATION" }),
    })
  );
  check("override active", em.active === true);

  const after = await j(await fetch(BASE + "/api/v1/gates/D1/screens"));
  check("override flips D1 to emergency", after.every((s) => s.currentMode === "emergency"));

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
