import { HttpSignageService } from "../src/services/HttpSignageService";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log("  \u2713 " + name);
  } else {
    fail++;
    console.log("  \u2717 FAIL " + name);
  }
}

async function main() {
  const svc = new HttpSignageService("http://localhost:3000");

  console.log("— http service: reference data (no auth) —");
  const airlines = await svc.listAirlines();
  check("listAirlines -> 6 airlines", airlines.length === 6);
  const gates = await svc.listGates();
  check("listGates includes C1", gates.includes("C1"));

  const snap = await svc.pullAll();
  check("pullAll screens >= 13", snap.screens.length >= 13);
  check("pullAll flights non-empty", snap.flights.length >= 1);

  console.log("— http service: officer flow —");
  const s = await svc.loginAirline({ airlineCode: "TG", gateId: "D1", username: "tg.officer", password: "demo1234" });
  check("loginAirline -> TG officer", s.role === "airline_officer" && s.airlineCode === "TG");

  const tpl = await svc.listTemplates("TG");
  check("listTemplates -> tenant TG", tpl.length >= 1 && tpl[0].airlineCode === "TG");

  const screens = await svc.listScreens();
  check("listScreens -> full fleet", screens.length >= 13);

  const assigned = await svc.assignScreen("D1", "screen_1", "tpl-tg-boarding", "f-tg920");
  const s1 = assigned.find((x) => x.screenId === "screen_1");
  check("assignScreen -> template mode", s1?.currentMode === "template" && s1?.templateId === "tpl-tg-boarding");

  const cached = svc.snapshot();
  check("snapshot() reflects assignment", cached.screens.find((x) => x.screenId === "screen_1")?.templateId === "tpl-tg-boarding");

  console.log("— http service: admin flow —");
  await svc.loginAdmin();
  const all = await svc.listAllTemplates();
  check("listAllTemplates -> non-empty", all.length >= 1);

  const acc = await svc.createAirlineAccount({ airlineCode: "VZ", username: "vz.httpcheck", password: "pass1234", allowedGates: ["D4"] });
  check("createAirlineAccount -> VZ", acc.username === "vz.httpcheck" && acc.airlineCode === "VZ");

  const accounts = await svc.listAirlineAccounts();
  check("listAirlineAccounts includes new account", accounts.some((a) => a.username === "vz.httpcheck"));

  const tel = await svc.listTelemetry();
  check("listTelemetry -> full fleet", tel.length >= 13);

  const em = await svc.setEmergencyOverride(true, "EVACUATION");
  check("setEmergencyOverride -> active", em.active === true);
  await svc.setEmergencyOverride(false);

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
