import { service } from "../src/services/MockSignageService";

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
  console.log("— auth —");
  const s = await service.loginAirline({
    airlineCode: "TG",
    gateId: "D1",
    username: "tg.officer",
    password: "demo1234",
  });
  check(
    "TG officer login returns officer session on D1",
    s.role === "airline_officer" && s.airlineCode === "TG" && s.assignedGate === "D1"
  );

  let threw = false;
  try {
    await service.loginAirline({ airlineCode: "TG", gateId: "D1", username: "tg.officer", password: "nope" });
  } catch {
    threw = true;
  }
  check("wrong password rejected", threw);

  threw = false;
  try {
    await service.loginAirline({ airlineCode: "SQ", gateId: "D3", username: "tg.officer", password: "demo1234" });
  } catch {
    threw = true;
  }
  check("cross-tenant login rejected (TG creds on SQ)", threw);

  threw = false;
  try {
    await service.loginAirline({ airlineCode: "TG", gateId: "D3", username: "tg.officer", password: "demo1234" });
  } catch {
    threw = true;
  }
  check("gate-not-allowed rejected (officer lacks D3)", threw);

  console.log("— tenant isolation —");
  const saved = await service.saveTemplate({
    templateId: "",
    airlineCode: "SQ", // must be overwritten
    templateName: "Smoke Test",
    category: "boarding",
    layoutConfig: {
      resolution: { width: 1920, height: 1080 },
      gridSettings: { snapToGrid: true, gridGap: 16, bezelSafeMargin: 60 },
      layers: [],
    },
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    lastModifiedBy: "",
    originGate: "",
    version: 1,
  });
  check("saveTemplate forces tenant to session airline (TG)", saved.airlineCode === "TG");
  check("new template gets an id + version 1", !!saved.templateId && saved.version === 1);

  console.log("— screen assignment —");
  const assigned = await service.assignScreen("D1", "screen_1", saved.templateId, "f-tg920");
  const sc1 = assigned.find((x) => x.gateId === "D1" && x.screenId === "screen_1");
  check(
    "assignScreen binds template+flight and sets mode=template",
    sc1?.currentMode === "template" && sc1.templateId === saved.templateId && sc1.flightId === "f-tg920"
  );

  console.log("— boarding progression —");
  const fs = await service.setFlightStatus("f-tg920", "final_call");
  check("setFlightStatus advances flight", fs.find((f) => f.id === "f-tg920")?.status === "final_call");

  console.log("— emergency override —");
  await service.setEmergencyOverride(true, "EVACUATION");
  const snap = service.snapshot();
  check("override flips ALL screens to emergency", snap.screens.length > 0 && snap.screens.every((x) => x.currentMode === "emergency"));
  check("emergency state active + message stored", snap.emergency.active && snap.emergency.message === "EVACUATION");

  await service.setEmergencyOverride(false);
  const sc1b = service.snapshot().screens.find((x) => x.gateId === "D1" && x.screenId === "screen_1");
  check("override off restores mapped screen to template mode", sc1b?.currentMode === "template");

  console.log("— gate release / handover —");
  await service.releaseGate("D1");
  const rel = service.snapshot().screens.filter((x) => x.gateId === "D1");
  check("releaseGate resets D1 screens to idle", rel.every((x) => x.currentMode === "ifims_default" && !x.templateId && !x.flightId));

  console.log("— credential whitespace trim —");
  const sTrim = await service.loginAirline({
    airlineCode: "TG",
    gateId: "D1",
    username: "  tg.officer  ",
    password: "demo1234   ",
  });
  check("trailing/leading whitespace trimmed on login", sTrim.role === "airline_officer" && sTrim.username === "tg.officer");

  console.log("— other-airline mock accounts —");
  const sFd = await service.loginAirline({
    airlineCode: "FD",
    gateId: "D3",
    username: "fd.officer",
    password: "demo1234",
  });
  check("FD mock account logs in", sFd.airlineCode === "FD");

  console.log("— admin account provisioning —");
  await service.loginAdmin();
  const created = await service.createAirlineAccount({
    airlineCode: "VZ",
    username: "vz.agent2",
    password: "pass1234",
    allowedGates: ["D4"],
  });
  check("admin creates airline account", created.username === "vz.agent2" && created.airlineCode === "VZ");

  let dup = false;
  try {
    await service.createAirlineAccount({ airlineCode: "VZ", username: "vz.agent2", password: "x1234", allowedGates: ["D4"] });
  } catch {
    dup = true;
  }
  check("duplicate username rejected", dup);

  await service.loginAirline({ airlineCode: "TG", gateId: "D1", username: "tg.officer", password: "demo1234" });
  let unauth = false;
  try {
    await service.createAirlineAccount({ airlineCode: "VZ", username: "zzzz", password: "x1234", allowedGates: ["D4"] });
  } catch {
    unauth = true;
  }
  check("officer cannot create accounts", unauth);

  const sNew = await service.loginAirline({ airlineCode: "VZ", gateId: "D4", username: "vz.agent2", password: "pass1234" });
  check("created account can log in", sNew.airlineCode === "VZ" && sNew.assignedGate === "D4");

  console.log("— dynamic screen management (DEC-14) —");
  const seedSnap = service.snapshot();
  check("C1 seeds 3 screens", seedSnap.screens.filter((s) => s.gateId === "C1").length === 3);
  check("D1 seeds 2 screens", seedSnap.screens.filter((s) => s.gateId === "D1").length === 2);

  await service.loginAdmin();
  const afterAdd = await service.addScreen("C1", { label: "Zone 2", displaySize: "43_inch" });
  check("admin adds a 4th screen to C1", afterAdd.filter((s) => s.gateId === "C1").length === 4);
  const addedId = afterAdd.find((s) => s.gateId === "C1" && s.label === "Zone 2")!.screenId;

  await service.updateScreen(addedId, { label: "Zone B", displaySize: "55_inch" });
  const upd = service.snapshot().screens.find((s) => s.screenId === addedId);
  check("admin updates screen label + size", upd?.label === "Zone B" && upd?.displaySize === "55_inch");

  await service.loginAirline({ airlineCode: "TG", gateId: "D1", username: "tg.officer", password: "demo1234" });
  let scrUnauth = false;
  try {
    await service.addScreen("C1", { label: "x", displaySize: "43_inch" });
  } catch {
    scrUnauth = true;
  }
  check("officer cannot add screens", scrUnauth);

  await service.loginAdmin();
  await service.removeScreen(addedId);
  check("admin removes screen", service.snapshot().screens.filter((s) => s.gateId === "C1").length === 3);

  console.log("— airline gate assignment —");
  check("PG assigned gates", (await service.listAirlineGates("PG")).join(",") === "D2");
  check("TG assigned gates include C1", (await service.listAirlineGates("TG")).includes("C1"));
  check("SQ assigned gates", (await service.listAirlineGates("SQ")).join(",") === "D3");

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

main();