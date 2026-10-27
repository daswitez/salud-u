// Local synthetic environment only. SQL is used solely for template fixture administration.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.FE16_PLAYWRIGHT || "playwright");
const origin = process.env.FE16_ORIGIN || "http://localhost:3000", artifacts = process.env.FE16_ARTIFACTS || "/tmp/salud-u-fe16-evidence";
const password = process.env.FE16_PASSWORD || "SaludDemo2026!";
async function run() {
  assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname)); mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.FE16_CHROMIUM ? { executablePath: process.env.FE16_CHROMIUM } : {}) });
  const results = [], traffic = [], fixtures = []; let special, admin;
  const record = message => { results.push(message); console.log("PASS " + message); };
  const sql = query => execFileSync("docker", ["compose", "exec", "-T", "postgres", "sh", "-c", 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'], { cwd: fileURLToPath(new URL("../../salud-u-backend/", import.meta.url)), input: query, encoding: "utf8" }).trim();
  const uuid = id => { assert.match(id, /^[0-9a-f-]{36}$/); return "'" + id + "'"; };
  async function api(context, path, method = "GET", data, expected = 200) {
    const headers = {}; if (method !== "GET") { const csrf = (await (await context.request.get(origin + "/api/v1/security/csrf")).json()).data; headers[csrf.headerName] = csrf.token; }
    const response = await context.request.fetch(origin + path, { method, data, headers }); const body = response.status() === 204 ? null : await response.json();
    assert.equal(response.status(), expected, method + " " + path + " " + JSON.stringify(body)); return body;
  }
  async function signIn(context, email) { await api(context, "/api/v1/auth/login", "POST", { email, password }); }
  async function login(email) {
    const context = await browser.newContext({ locale: "es-BO", timezoneId: "America/La_Paz", viewport: { width: 1366, height: 1000 } }); await signIn(context, email);
    context.on("request", r => { const url = new URL(r.url()); if (url.searchParams.has("token")) url.searchParams.set("token", "REDACTED"); traffic.push({ method: r.method(), url: url.href }); }); return context;
  }
  const responseFor = (page, item) => page.waitForResponse(r => r.url().endsWith("/" + item.encounterId + "/finalize") && r.headers()["x-error-code"] !== "CSRF_INVALID");
  const submit = async (page, item, expected) => { const response = responseFor(page, item); await page.getByRole("button", { name: "Cerrar atención de especialidad", exact: true }).focus(); await page.keyboard.press("Enter"); const r = await response; assert.equal(r.status(), expected); return r; };
  try {
    admin = await login("admin.demo@salud-universitaria.test"); const doctor = await login("revision.ana.demo@salud-universitaria.test"); special = await login("fe09.especialista@salud-universitaria.test"); const student = await login("estudiante.ana.demo@salud-universitaria.test");
    const seed = Date.now(), career = (await api(admin, "/api/careers")).data[0];
    const specialty = (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: "FE16_" + seed, name: "Área FE16 " + seed, active: true })).data;
    const principal = (await api(special, "/api/me")).user;
    const staff = (await api(admin, "/api/v1/admin/staff", "POST", { principalId: principal.id, staffCode: "FE09-ESPECIALISTA", active: true })).data;
    const affiliate = s => api(admin, "/api/v1/admin/staff/specialties", "POST", { staffMemberId: staff.id, specialtyId: s.id, activeFrom: "2026-01-01", activeTo: null }); await affiliate(specialty);
    sql("INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) VALUES(" + uuid(specialty.id) + ",1,'{}') RETURNING id;");
    async function patient(suffix) { return (await api(admin, "/api/patients", "POST", { fullName: "Paciente FE16 " + suffix + " " + seed, carnet: "FE16-" + suffix + "-" + seed, registrationCode: "REG-FE16-" + suffix + "-" + seed, birthDate: "2002-01-15", careerId: career.id, academicPeriod: "2026-II", enrollmentStart: "2026-01-01" }, 201)).data.id; }
    async function slot(context, specialtyId = null) {
      // The published collection is capped at 100. Choose an isolated fixture time using all rows.
    const last = Number(sql("SELECT coalesce(extract(epoch from max(termina_a))*1000,0) FROM salud_u.cupo_disponibilidad;"));
      const time = Math.max(Date.now() + 220 * 86400000, last + 3600000);
      return (await api(context, "/api/availability-slots", "POST", { specialtyId, startsAt: new Date(time).toISOString(), endsAt: new Date(time + 1800000).toISOString(), capacity: 1 }, 201)).data.id;
    }
    async function fixture(suffix, area = specialty, referred = false) {
      const patientId = await patient(suffix); let referralId, sourceEncounterId;
      if (referred) {
        const initial = (await api(admin, "/api/appointment-requests", "POST", { patientId }, 201)).data.id;
        const initialAppointment = (await api(admin, "/api/appointment-requests/" + initial + "/assign", "POST", { slotId: await slot(doctor) })).data.appointmentId;
        sourceEncounterId = (await api(doctor, "/api/medical/appointments/" + initialAppointment + "/start", "POST", undefined, 201)).data.encounterId;
        const data = { versionEsquema: 1, alergias: { estado: "DESCONOCIDO", elementos: [] }, enfermedadesPersonales: { estado: "DESCONOCIDO", elementos: [] }, cirugias: { estado: "DESCONOCIDO", elementos: [] }, medicamentos: { estado: "DESCONOCIDO", elementos: [] }, antecedentesFamiliares: { estado: "DESCONOCIDO", elementos: [] }, habitos: {} };
        await api(doctor, "/api/medical/patients/" + patientId + "/clinical-background", "PATCH", { data, expectedVersion: 0, changeReason: "Preparación FE16", encounterId: sourceEncounterId });
        const csrf = (await (await doctor.request.get(origin + "/api/v1/security/csrf")).json()).data;
        const upload = await doctor.request.post(origin + "/api/medical/documents", { headers: { [csrf.headerName]: csrf.token }, multipart: { patientId, encounterId: sourceEncounterId, documentType: "OTHER", file: { name: "origen-fe16.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") } } }); assert.equal(upload.status(), 201);
        referralId = (await api(doctor, "/api/medical/encounters/" + sourceEncounterId + "/finalize", "POST", { chiefComplaint: "Origen remitido FE16", assessment: "Evaluación origen FE16", diagnosisText: "Diagnóstico origen FE16", reviewHistory: {}, referralSpecialtyId: area.id, referralReason: "Motivo remitido FE16", referralComment: "Resumen remitido FE16", referralPriority: "URGENT" })).data.referralId;
      }
      const requestId = (await api(admin, "/api/appointment-requests", "POST", { patientId, appointmentType: referred ? "REFERRAL" : "SPECIALTY", specialtyId: referred ? null : area.id, referralId: referralId ?? null }, 201)).data.id;
      const appointmentId = (await api(admin, "/api/appointment-requests/" + requestId + "/assign", "POST", { slotId: await slot(special, area.id) })).data.appointmentId;
      const item = { patientId, appointmentId, requestId, sourceEncounterId, referralId, area }; fixtures.push(item); return item;
    }
    async function open(item) {
      const page = await special.newPage(); page.on("dialog", d => d.accept()); await page.goto(origin + "/medico/citas/" + item.appointmentId);
      if (!item.encounterId) {
        const response = page.waitForResponse(r => r.url().endsWith("/" + item.appointmentId + "/start") && r.headers()["x-error-code"] !== "CSRF_INVALID");
        await page.getByRole("button", { name: "Iniciar cita", exact: true }).click(); const r = await response; assert.equal(r.status(), 201); item.encounterId = (await r.json()).data.encounterId;
        await page.getByRole("link", { name: "Completar ficha", exact: true }).click();
      } else await page.goto(origin + "/medico/citas/" + item.appointmentId + "?ficha=1");
      await page.getByRole("textbox", { name: /^Motivo de consulta/ }).waitFor(); return page;
    }
    async function fill(page, label) {
      await page.getByRole("textbox", { name: /^Motivo de consulta/ }).fill("Motivo " + label); await page.getByRole("textbox", { name: /^Evaluación clínica/ }).fill("Evaluación " + label);
      await page.getByRole("textbox", { name: "Diagnóstico principal", exact: true }).fill("Diagnóstico " + label);
      await page.getByRole("textbox", { name: "Plan y tratamiento", exact: true }).fill("Plan " + label); await page.getByRole("textbox", { name: "Seguimiento", exact: true }).fill("Control " + label);
      await page.getByRole("textbox", { name: "Patológicos del área", exact: true }).fill("Antecedente " + label);
    }
    const byId = item => "/api/medical/assigned-referrals/" + item.referralId;
    const patchPath = item => "/api/medical/referrals/" + item.referralId;
    const read = async item => (await api(special, byId(item))).data;
    const clinical = async item => JSON.stringify((await api(doctor, "/api/medical/encounters/" + item.sourceEncounterId)).data.encounter);
    async function manage(item) { const page = await special.newPage(); page.on("dialog", d => d.accept()); await page.goto(origin + "/medico/derivaciones/" + item.referralId); await page.getByRole("combobox", { name: "Acción", exact: true }).waitFor(); return page; }
    async function change(page, item, expected, label) {
      const waiting = page.waitForResponse(r => r.url().endsWith(patchPath(item)) && r.request().method() === "PATCH" && r.headers()["x-error-code"] !== "CSRF_INVALID");
      await page.getByRole("button", { name: label, exact: true }).focus(); await page.keyboard.press("Enter"); const response = await waiting; assert.equal(response.status(), expected); return response;
    }
    const emptyEmail = "fe16.vacio." + seed + "@salud-universitaria.test";
    const emptyPrincipal = (await api(admin, "/api/v1/admin/principals", "POST", { email: emptyEmail, displayName: "Especialista sin derivaciones FE16", password, roles: ["SPECIALIST"] }, 201)).data;
    await api(admin, "/api/v1/admin/staff", "POST", { principalId: emptyPrincipal.id, staffCode: "FE16-VACIO-" + seed, active: true });
    const foreign = await login(emptyEmail), emptyPage = await foreign.newPage(); await emptyPage.goto(origin + "/medico/derivaciones"); await emptyPage.getByText("No hay derivaciones asignadas a tu cuenta.", { exact: true }).waitFor(); assert.deepEqual((await api(foreign, "/api/medical/assigned-referrals")).data, []);
    const returned = await fixture("devuelta", specialty, true), resolved = await fixture("resuelta", specialty, true), raced = await fixture("carrera", specialty, true);
    for (const item of [returned, resolved, raced]) item.originalClinical = await clinical(item);
    const listing = await special.newPage(); await listing.route("**/api/medical/assigned-referrals", route => route.abort("failed"), { times: 1 }); await listing.goto(origin + "/medico/derivaciones"); await listing.locator('p[role="alert"]').waitFor();
    await listing.getByRole("button", { name: "Actualizar derivaciones recibidas", exact: true }).click(); await listing.locator(`[data-referral-id="${returned.referralId}"]`).getByRole("link").click(); await listing.getByRole("combobox", { name: "Acción", exact: true }).waitFor();
    const initial = await read(returned); assert.equal(initial.status, "ASSIGNED"); assert.equal(initial.followUpText, null); assert.equal(initial.returnReason, null); assert.equal(initial.encounter, null);
    const list = (await api(special, "/api/medical/assigned-referrals")).data; list.forEach((item, i) => { if (i) assert(Date.parse(list[i - 1].createdAt) >= Date.parse(item.createdAt)); });
    await listing.getByRole("textbox", { name: "Seguimiento", exact: true }).fill("Seguimiento conservado FE16"); await change(listing, returned, 409, "Resolver derivación"); assert.equal(await listing.getByRole("textbox", { name: "Seguimiento", exact: true }).inputValue(), "Seguimiento conservado FE16");
    await listing.getByRole("combobox", { name: "Acción", exact: true }).selectOption("RETURN"); let patches = 0; listing.on("request", r => { if (r.method() === "PATCH") patches++; });
    await listing.getByRole("button", { name: "Devolver derivación", exact: true }).click(); assert.equal(patches, 0);
    await listing.getByRole("textbox", { name: /^Motivo de devolución/ }).fill(" "); await change(listing, returned, 400, "Devolver derivación");
    await listing.getByRole("textbox", { name: /^Motivo de devolución/ }).fill(" Motivo retorno FE16 ");
    await api(special, patchPath(returned), "PATCH", { action: "RETURN", reason: "Motivo", followUpText: {} }, 400);
    record("Bandeja propia/orden/null/vacío, carga con error/reintento; resolver sin atención cerrada 409 y devolución sin motivo 400 sin perder campos");
    await listing.route("**/api/medical/referrals/" + returned.referralId, route => route.abort("failed"), { times: 1 }); await listing.getByRole("button", { name: "Devolver derivación", exact: true }).click(); await listing.locator('p[role="alert"]').filter({ hasText: "No pudimos confirmar" }).waitFor();
    await api(special, "/api/v1/session/logout", "POST", undefined, 204); await change(listing, returned, 401, "Devolver derivación"); await listing.getByRole("link", { name: "Iniciar sesión en otra pestaña y conservar el formulario", exact: true }).waitFor(); assert.equal(await listing.getByRole("textbox", { name: /^Motivo de devolución/ }).inputValue(), " Motivo retorno FE16 "); await signIn(special, "fe09.especialista@salud-universitaria.test");
    let committed; const lostPattern = "**/api/medical/referrals/" + returned.referralId;
    await listing.route(lostPattern, async route => { const response = await route.fetch(); if (response.headers()["x-error-code"] === "CSRF_INVALID") return route.fulfill({ response }); assert.equal(response.status(), 200); committed = (await response.json()).data; await route.abort("failed"); await listing.unroute(lostPattern); });
    await listing.getByRole("button", { name: "Devolver derivación", exact: true }).click(); await listing.locator('p[role="alert"]').filter({ hasText: "No pudimos confirmar" }).waitFor(); assert.deepEqual(committed, { referralId: returned.referralId, status: "RETURNED" });
    await listing.getByRole("button", { name: "Comprobar estado de la derivación", exact: true }).click(); await listing.locator("article strong").filter({ hasText: "Devuelta" }).waitFor(); await listing.getByText("Motivo retorno FE16", { exact: true }).waitFor(); assert.equal(await listing.getByRole("combobox", { name: "Acción", exact: true }).count(), 0);
    await listing.reload(); await listing.getByText("Motivo retorno FE16", { exact: true }).waitFor(); const storedReturn = await read(returned); assert.equal(storedReturn.events.filter(e => e.to === "RETURNED").length, 1); assert.equal(storedReturn.followUpText, "Seguimiento conservado FE16"); assert(storedReturn.returnedBy); assert(storedReturn.returnedAt);
    await api(special, patchPath(returned), "PATCH", { action: "RETURN", reason: "Otro motivo" }, 403);
    record("Red/sesión y respuesta perdida conservan motivo/seguimiento; consulta recupera la devolución sin repetir PATCH y persiste actor/fecha/evento tras recargar");
    const clinicalPage = await open(resolved); await fill(clinicalPage, "resolución FE16"); await submit(clinicalPage, resolved, 200); await clinicalPage.getByRole("heading", { name: "Atención cerrada", exact: true }).waitFor();
    resolved.closedClinical = JSON.stringify((await api(special, "/api/medical/encounters/" + resolved.encounterId)).data.encounter);
    await clinicalPage.getByRole("link", { name: "Gestionar derivación y seguimiento", exact: true }).click(); await clinicalPage.getByRole("textbox", { name: "Seguimiento", exact: true }).fill("Control resuelto FE16");
    const result = (await (await change(clinicalPage, resolved, 200, "Resolver derivación")).json()).data; assert.deepEqual(result, { referralId: resolved.referralId, status: "CLOSED" }); await clinicalPage.locator("article strong").filter({ hasText: "Resuelta" }).waitFor(); await clinicalPage.reload(); await clinicalPage.getByText("Control resuelto FE16", { exact: true }).waitFor();
    const storedResolved = await read(resolved); assert.equal(storedResolved.status, "CLOSED"); assert.equal(storedResolved.returnReason, null); assert(storedResolved.resolvedBy); assert(storedResolved.resolvedAt); assert.equal(storedResolved.events.filter(e => e.to === "CLOSED").length, 1);
    assert.equal(JSON.stringify((await api(special, "/api/medical/encounters/" + resolved.encounterId)).data.encounter), resolved.closedClinical);
    record("Desde ficha especializada cerrada se resuelve con contrato exacto, seguimiento/actor/fecha persistidos y ficha original inmutable");
    const raceClinical = await open(raced); await fill(raceClinical, "carrera FE16"); await submit(raceClinical, raced, 200); await raceClinical.getByRole("heading", { name: "Atención cerrada", exact: true }).waitFor();
    const a = await manage(raced), b = await manage(raced); await a.getByRole("textbox", { name: "Seguimiento", exact: true }).fill("Resolución pestaña A"); await b.getByRole("combobox", { name: "Acción", exact: true }).selectOption("RETURN"); await b.getByRole("textbox", { name: /^Motivo de devolución/ }).fill("Devolución pestaña B"); await b.getByRole("textbox", { name: "Seguimiento", exact: true }).fill("Control pestaña B");
    let arrived = 0, release; const barrier = new Promise(resolve => release = resolve);
    for (const tab of [a, b]) await tab.route("**/api/medical/referrals/" + raced.referralId, async route => { arrived++; if (arrived === 2) release(); await barrier; await route.continue(); }, { times: 1 });
    const responses = [a, b].map(tab => tab.waitForResponse(r => r.url().endsWith(patchPath(raced)) && r.request().method() === "PATCH" && r.headers()["x-error-code"] !== "CSRF_INVALID"));
    await Promise.all([a.getByRole("button", { name: "Resolver derivación", exact: true }).click(), b.getByRole("button", { name: "Devolver derivación", exact: true }).click()]); const raceResults = await Promise.all(responses); assert.deepEqual(raceResults.map(r => r.status()).sort(), [200, 403]);
    const loser = raceResults[0].status() === 403 ? a : b; await loser.locator('p[role="alert"]').waitFor(); assert.equal(await loser.getByRole("textbox", { name: "Seguimiento", exact: true }).inputValue(), loser === a ? "Resolución pestaña A" : "Control pestaña B"); await loser.getByRole("button", { name: "Comprobar estado de la derivación", exact: true }).click(); await loser.getByText("Se muestra el resultado guardado en la derivación.", { exact: true }).waitFor();
    const storedRace = await read(raced); assert.equal(storedRace.events.filter(e => ["CLOSED", "RETURNED"].includes(e.to)).length, 1);
    record("Resolver y devolver desde dos pestañas: un 200 y un 403, un estado/evento final y recuperación del resultado ganador conservando el formulario perdedor");
    await api(foreign, byId(resolved), "GET", undefined, 404); await api(foreign, patchPath(resolved), "PATCH", { action: "RETURN", reason: "Ajeno" }, 403);
    for (const context of [admin, student, doctor]) { await api(context, "/api/medical/assigned-referrals", "GET", undefined, 403); await api(context, patchPath(resolved), "PATCH", { action: "RESOLVE" }, 403); }
    await emptyPage.goto(origin + "/medico/derivaciones/" + resolved.referralId); await emptyPage.locator('p[role="alert"]').waitFor(); assert(!(await emptyPage.locator("body").innerText()).includes("Resumen remitido FE16"));
    const anonymous = await browser.newContext(); await api(anonymous, "/api/medical/assigned-referrals", "GET", undefined, 401);
    for (const item of [returned, resolved, raced]) assert.equal(await clinical(item), item.originalClinical);
    assert(!traffic.some(r => /supabase\.(co|com)/.test(r.url))); assert(!traffic.some(r => /\/api\/medical\/patients\/[^/?]+$/.test(r.url)));
    record("Especialista ajeno y roles sin permiso denegados sin exposición; origen clínico intacto y ninguna llamada Supabase o historia heredada");
    await listing.screenshot({ path: artifacts + "/devolucion.png", fullPage: true }); await clinicalPage.screenshot({ path: artifacts + "/resolucion.png", fullPage: true });
    const evidence = sql("SELECT d.id,d.estado,d.motivo_devolucion,d.seguimiento,(SELECT count(*) FROM salud_u.evento_estado_derivacion v WHERE v.id_derivacion=d.id AND v.estado_nuevo IN ('RETURNED','CLOSED')) eventos,(SELECT count(*) FROM salud_u.evento_auditoria v WHERE v.id_recurso=d.id AND v.accion IN ('DERIVACION_DEVUELTA','DERIVACION_RESUELTA')) auditorias FROM salud_u.derivacion d WHERE d.id IN (" + [returned,resolved,raced].map(i => uuid(i.referralId)).join(",") + ");");
    writeFileSync(artifacts + "/datos-postgresql.txt", evidence); writeFileSync(artifacts + "/resultado.json", JSON.stringify({ status: "PASS", results, fixtures, evidence, traffic }, null, 2)); console.log(JSON.stringify({ status: "PASS", results, artifacts }, null, 2));
  } catch (error) {
    for (const [i, context] of browser.contexts().entries()) for (const [j, page] of context.pages().entries()) { await page.screenshot({ path: artifacts + "/fallo-" + i + "-" + j + ".png", fullPage: true }).catch(() => {}); writeFileSync(artifacts + "/fallo-" + i + "-" + j + ".txt", await page.locator("body").innerText().catch(() => "")); } throw error;
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
