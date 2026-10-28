import { segundoFactor } from "./lib/segundo-factor.mjs";
// Local synthetic Spring/PostgreSQL acceptance. See docs/evidencia-fe14.md.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const { chromium } = await import(process.env.FE14_PLAYWRIGHT || "playwright");
const origin = process.env.FE14_ORIGIN || "http://127.0.0.1:3000";
const artifacts = process.env.FE14_ARTIFACTS || "/tmp/salud-u-fe14-evidence";
const password = process.env.FE14_PASSWORD || "SaludDemo2026!";
async function run() {
  assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.FE14_CHROMIUM ? { executablePath: process.env.FE14_CHROMIUM } : {}) });
  const results = [], traffic = [], fixtures = [], cleanup = new Set();
  const record = message => { results.push(message); console.log("PASS " + message); };
  // Cupos en horas distintas dentro de la corrida; ante 409 (superposición con datos de corridas previas) prueba la hora siguiente.
  let nextSlotAt=0;
  async function publishSlot(context,starts,extra={}){
    starts=Math.max(starts,nextSlotAt);
    for(let attempt=0;attempt<500;attempt++,starts+=3600000){
      const token=(await (await context.request.get(origin+"/api/v1/security/csrf")).json()).data;
      const response=await context.request.post(origin+"/api/availability-slots",{data:{startsAt:new Date(starts).toISOString(),endsAt:new Date(starts+1800000).toISOString(),capacity:1,...extra},headers:{[token.headerName]:token.token}});
      if(response.status()===201){nextSlotAt=starts+3600000;return (await response.json()).data.id;}
      assert.equal(response.status(),409,await response.text());
    }
    throw new Error("No se encontró un horario libre para el cupo de prueba.");
  }
  async function api(context, path, method = "GET", data, expected = 200) {
    const headers = {};
    if (method !== "GET") { const csrf = (await (await context.request.get(origin + "/api/v1/security/csrf")).json()).data; headers[csrf.headerName] = csrf.token; }
    const response = await context.request.fetch(origin + path, { method, data, headers });
    const body = response.status() === 204 ? null : await response.json();
    assert.equal(response.status(), expected, method + " " + path + " " + JSON.stringify(body)); return body;
  }
  async function signIn(context, email) { await segundoFactor(context, origin, { email, password }, await api(context, "/api/v1/auth/login", "POST", { email, password })); }
  async function login(email) {
    const context = await browser.newContext({ locale: "es-BO", timezoneId: "America/La_Paz", viewport: { width: 1366, height: 1000 } });
    await signIn(context, email);
    context.on("request", r => { const url = new URL(r.url()); if (url.searchParams.has("token")) url.searchParams.set("token", "REDACTED"); traffic.push({ method: r.method(), url: url.href }); });
    return context;
  }
  const responseFor = (page, suffix) => page.waitForResponse(r => r.url().endsWith(suffix) && r.headers()["x-error-code"] !== "CSRF_INVALID");
  let admin;
  try {
    admin = await login("admin.demo@salud-universitaria.test");
    const doctor = await login("revision.ana.demo@salud-universitaria.test"), specialist = await login("fe09.especialista@salud-universitaria.test"), student = await login("estudiante.ana.demo@salud-universitaria.test");
    const seed = Date.now(), career = (await api(admin, "/api/careers")).data[0];
    const specialty = (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: "FE14_A_" + seed, name: "Área FE14 " + seed, active: true })).data;
    const wrongSpecialty = (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: "FE14_B_" + seed, name: "Otra área FE14 " + seed, active: true })).data;
    const principal = (await api(specialist, "/api/me")).user;
    const staff = (await api(admin, "/api/v1/admin/staff", "POST", { principalId: principal.id, staffCode: "FE09-ESPECIALISTA", active: true })).data;
    for (const s of [specialty, wrongSpecialty]) await api(admin, "/api/v1/admin/staff/specialties", "POST", { staffMemberId: staff.id, specialtyId: s.id, activeFrom: "2026-01-01", activeTo: null });
    async function patient(suffix) { return (await api(admin, "/api/patients", "POST", { fullName: "Paciente FE14 " + suffix + " " + seed, carnet: "FE14-" + suffix + "-" + seed, registrationCode: "REG-FE14-" + suffix + "-" + seed, birthDate: "2002-01-15", careerId: career.id, academicPeriod: "2026-II", enrollmentStart: "2026-01-01" }, 201)).data.id; }
    async function slot(context, specialtyId = null, days = 185) {
      let starts = Date.now() + days * 86400000; const existing = (await api(admin, "/api/availability-slots")).data;
      while (existing.some(s => starts < Date.parse(s.endsAt) && starts + 1800000 > Date.parse(s.startsAt))) starts += 3600000;
      return await publishSlot(context,starts,{specialtyId});
    }
    async function snapshot(item) {
      const data = (await api(doctor, "/api/medical/encounters/" + item.encounterId)).data;
      // Scheduling may change only referral operational state; all clinical fields stay exact.
      const referral = { ...data.referral }; delete referral.status;
      return createHash("sha256").update(JSON.stringify({ encounter: data.encounter, background: data.clinicalBackground, diagnoses: data.diagnoses, measurements: data.measurements, documents: data.documents, referral })).digest("hex");
    }
    for (const [index, level] of ["URGENT", "ROUTINE", "PRIORITY"].entries()) {
      const patientId = await patient(String(index)), initialSlot = await slot(doctor);
      const requestId = (await api(admin, "/api/appointment-requests", "POST", { patientId }, 201)).data.id;
      const appointmentId = (await api(admin, "/api/appointment-requests/" + requestId + "/assign", "POST", { slotId: initialSlot })).data.appointmentId; cleanup.add(appointmentId);
      const encounterId = (await api(doctor, "/api/medical/appointments/" + appointmentId + "/start", "POST", undefined, 201)).data.encounterId;
      const bg = { versionEsquema: 1, alergias: { estado: "DESCONOCIDO", elementos: [] }, enfermedadesPersonales: { estado: "DESCONOCIDO", elementos: [] }, cirugias: { estado: "DESCONOCIDO", elementos: [] }, medicamentos: { estado: "DESCONOCIDO", elementos: [] }, antecedentesFamiliares: { estado: "DESCONOCIDO", elementos: [] }, habitos: {} };
      await api(doctor, "/api/medical/patients/" + patientId + "/clinical-background", "PATCH", { data: bg, expectedVersion: 0, changeReason: "Preparación FE14", encounterId });
      if (index === 0) {
        const csrf = (await (await doctor.request.get(origin + "/api/v1/security/csrf")).json()).data;
        const upload = await doctor.request.post(origin + "/api/medical/documents", { headers: { [csrf.headerName]: csrf.token }, multipart: { patientId, encounterId, documentType: "OTHER", file: { name: "origen-fe14.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") } } });
        assert.equal(upload.status(), 201);
      }
      const referralId = (await api(doctor, "/api/medical/encounters/" + encounterId + "/finalize", "POST", { chiefComplaint: "Revisión origen FE14", assessment: "Evaluación FE14", diagnosis: "Diagnóstico FE14", reviewHistory: { conducta: { derivacion: true }, signosVitales: { peso: 70, talla: 1.7 } }, referralSpecialtyId: specialty.id, referralReason: "Motivo FE14 " + index, referralComment: "Resumen FE14 " + index, referralPriority: level })).data.referralId;
      cleanup.delete(appointmentId);
      const item = { patientId, encounterId, appointmentId, referralId }; item.originalHash = await snapshot(item); fixtures.push(item);
    }
    const [a, b, c] = fixtures, emptyPatient = await patient("sin-derivacion");
    const inbox = await admin.newPage();
    await inbox.route("**/api/administrative/referrals", r => r.abort("failed"), { times: 1 });
    await inbox.goto(origin + "/administrativo/derivaciones"); await inbox.locator('p[role="alert"]').waitFor();
    assert.equal(await inbox.locator('p[role="alert"]').evaluate(e => e === document.activeElement), true);
    await inbox.route("**/api/administrative/referrals", r => r.fulfill({ status: 200, json: { ok: true, data: [] } }), { times: 1 });
    await inbox.getByRole("button", { name: "Actualizar derivaciones", exact: true }).click(); await inbox.getByText("No hay derivaciones pendientes de programación.", { exact: true }).waitFor();
    await inbox.getByRole("button", { name: "Historial", exact: true }).click(); await inbox.getByText("Aún no hay historial de derivaciones.", { exact: true }).waitFor();
    await inbox.getByRole("button", { name: "Actualizar derivaciones", exact: true }).click();
    await inbox.getByRole("button", { name: /^Por programar/ }).click(); await inbox.locator(`[data-referral-id="${a.referralId}"]`).waitFor();
    const rows = (await api(admin, "/api/administrative/referrals")).data, row = rows.find(r => r.id === a.referralId);
    assert.equal(Object.keys(row).length, 15); for (const key of ["assigned_staff_name", "appointment_id", "scheduled_for"]) assert.equal(row[key], null);
    const group = s => ({ PENDING_ASSIGNMENT: 0, ASSIGNED: 1, IN_PROGRESS: 2 }[s] ?? 3);
    rows.forEach((r, i) => { if (i) assert(group(rows[i - 1].status) < group(r.status) || (group(rows[i - 1].status) === group(r.status) && Date.parse(rows[i - 1].requested_at) >= Date.parse(r.requested_at))); });
    record("Bandeja: error de red con foco, listas vacías, reintento, JSON/null y orden de referencia");
    const page = await admin.newPage();
    await page.goto(origin + "/administrativo/check-in?patientId=" + emptyPatient);
    await page.getByRole("combobox", { name: "Tipo de cita", exact: true }).selectOption("REFERRAL");
    await page.getByText("No hay derivaciones activas para este estudiante.", { exact: true }).waitFor(); assert(await page.getByRole("button", { name: "Crear solicitud", exact: true }).isDisabled());
    await page.goto(origin + "/administrativo/check-in?patientId=" + b.patientId + "&referralId=" + a.referralId);
    await page.locator('p[role="alert"]').filter({ hasText: "no está disponible para este estudiante" }).waitFor(); assert(await page.getByRole("button", { name: "Crear solicitud", exact: true }).isDisabled());
    const referralBody = item => ({ patientId: item.patientId, appointmentType: "REFERRAL", referralId: item.referralId, specialtyId: null });
    await api(admin, "/api/appointment-requests", "POST", { ...referralBody(a), patientId: b.patientId }, 409);
    await inbox.locator(`[data-referral-id="${a.referralId}"]`).getByRole("link", { name: "Asignar especialista y horario", exact: true }).click();
    await inbox.getByRole("combobox", { name: "Derivación disponible", exact: true }).waitFor();
    const choice = inbox.getByRole("combobox", { name: "Derivación disponible", exact: true }); assert.equal(await choice.inputValue(), a.referralId);
    await inbox.route("**/api/appointment-requests", r => r.request().method() === "POST" ? r.abort("failed") : r.continue(), { times: 1 });
    await inbox.getByRole("button", { name: "Crear solicitud", exact: true }).click(); await inbox.locator('p[role="alert"]').waitFor(); assert.equal(await choice.inputValue(), a.referralId);
    await inbox.getByRole("button", { name: "Reintentar carga", exact: true }).click(); await inbox.getByRole("button", { name: "Crear solicitud", exact: true }).waitFor();
    let committedRequest;
    const requestPattern = "**/api/appointment-requests";
    await inbox.route(requestPattern, async route => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch(); if (response.headers()["x-error-code"] === "CSRF_INVALID") return route.fulfill({ response });
      assert.equal(response.status(), 201); committedRequest = (await response.json()).data.id; await route.abort("failed"); await inbox.unroute(requestPattern);
    });
    await inbox.getByRole("button", { name: "Crear solicitud", exact: true }).click(); await inbox.locator('p[role="alert"]').waitFor(); assert(committedRequest); a.requestId = committedRequest;
    await inbox.getByRole("button", { name: "Reintentar carga", exact: true }).click(); await inbox.getByRole("button", { name: "Solicitud pendiente", exact: true }).waitFor();
    assert(await inbox.getByRole("button", { name: "Solicitud pendiente", exact: true }).isDisabled());
    assert.equal((await api(admin, "/api/appointment-requests")).data.filter(r => r.referral_id === a.referralId).length, 1);
    await inbox.getByText("No hay cupos publicados compatibles con esta solicitud.", { exact: true }).waitFor();
    record("Derivación precargada, paciente vacío/ajeno, red y respuesta perdida conservan selección; recuperación sin duplicar solicitud");
    const wrongSlot = await slot(specialist, wrongSpecialty.id, 195), firstSlot = await slot(specialist, specialty.id, 195), secondSlot = await slot(specialist, specialty.id, 195), thirdSlot = await slot(specialist, specialty.id, 195);
    await inbox.getByRole("button", { name: "Actualizar agenda", exact: true }).click(); await inbox.locator(`[data-slot-id="${firstSlot}"]`).waitFor(); assert.equal(await inbox.locator(`[data-slot-id="${wrongSlot}"]`).count(), 0);
    await api(admin, "/api/appointment-requests/" + a.requestId + "/assign", "POST", { slotId: wrongSlot }, 409);
    b.requestId = (await api(admin, "/api/appointment-requests", "POST", referralBody(b), 201)).data.id;
    b.specialtyAppointmentId = (await api(admin, "/api/appointment-requests/" + b.requestId + "/assign", "POST", { slotId: firstSlot })).data.appointmentId;
    let response = responseFor(inbox, "/" + a.requestId + "/assign"); await inbox.locator(`[data-slot-id="${firstSlot}"]`).click(); assert.equal((await response).status(), 409); await inbox.locator('p[role="alert"]').waitFor(); assert.equal(await choice.inputValue(), a.referralId);
    await api(admin, "/api/v1/session/logout", "POST", undefined, 204);
    response = responseFor(inbox, "/" + a.requestId + "/assign"); await inbox.locator(`[data-slot-id="${secondSlot}"]`).click(); assert.equal((await response).status(), 401);
    await inbox.getByRole("link", { name: "Iniciar sesión en otra pestaña y conservar la selección", exact: true }).waitFor(); assert.equal(await choice.inputValue(), a.referralId);
    await signIn(admin, "admin.demo@salud-universitaria.test");
    const assignPattern = "**/" + a.requestId + "/assign";
    await inbox.route(assignPattern, async route => {
      const response = await route.fetch(); if (response.headers()["x-error-code"] === "CSRF_INVALID") return route.fulfill({ response });
      assert.equal(response.status(), 200); a.specialtyAppointmentId = (await response.json()).data.appointmentId; await route.abort("failed"); await inbox.unroute(assignPattern);
    });
    await inbox.locator(`[data-slot-id="${secondSlot}"]`).click(); await inbox.locator('p[role="alert"]').filter({ hasText: "No pudimos confirmar" }).waitFor(); assert(a.specialtyAppointmentId);
    await inbox.getByRole("button", { name: "Reintentar carga", exact: true }).click(); await inbox.locator(`[data-request-id="${a.requestId}"]`).getByText("Confirmada", { exact: true }).waitFor();
    await inbox.getByRole("button", { name: "Derivación ya programada", exact: true }).waitFor(); await inbox.reload(); await inbox.locator(`[data-request-id="${a.requestId}"]`).getByText("Confirmada", { exact: true }).waitFor();
    await api(admin, "/api/appointment-requests/" + a.requestId + "/assign", "POST", { slotId: secondSlot }, 409); await api(admin, "/api/appointment-requests", "POST", referralBody(a), 409);
    record("Especialidad incompatible, cupo ocupado y sesión caducada rechazados; respuesta de asignación perdida se recupera sin doble cita y persiste tras recarga");
    c.requestId = (await api(admin, "/api/appointment-requests", "POST", referralBody(c), 201)).data.id;
    const global = await admin.newPage(), targeted = await admin.newPage();
    await global.goto(origin + "/administrativo/check-in"); await global.locator(`[data-select-request-id="${c.requestId}"]`).click();
    await targeted.goto(origin + "/administrativo/check-in?patientId=" + c.patientId + "&referralId=" + c.referralId);
    for (const tab of [global, targeted]) { await tab.locator(`[data-slot-id="${thirdSlot}"]`).waitFor(); assert.equal(await tab.locator(`[data-slot-id="${wrongSlot}"]`).count(), 0); }
    let arrived = 0, release; const barrier = new Promise(resolve => release = resolve);
    for (const tab of [global, targeted]) await tab.route("**/" + c.requestId + "/assign", async route => { arrived++; if (arrived === 2) release(); await barrier; await route.continue(); }, { times: 1 });
    const races = [global, targeted].map(tab => responseFor(tab, "/" + c.requestId + "/assign"));
    await Promise.all([global, targeted].map(tab => tab.locator(`[data-slot-id="${thirdSlot}"]`).click()));
    const raced = await Promise.all(races); assert.deepEqual(raced.map(r => r.status()).sort(), [200, 409]); c.specialtyAppointmentId = (await raced.find(r => r.status() === 200).json()).data.appointmentId;
    const loser = raced[0].status() === 409 ? global : targeted; await loser.locator('p[role="alert"]').waitFor(); await loser.getByRole("button", { name: "Reintentar carga", exact: true }).click(); await loser.locator(`[data-request-id="${c.requestId}"]`).getByText("Confirmada", { exact: true }).waitFor();
    record("Agenda global y paciente resuelven especialidad; dos pestañas producen 200/409 y recuperan la única asignación");
    await inbox.goto(origin + "/administrativo/derivaciones"); await inbox.getByRole("button", { name: "Historial", exact: true }).click();
    const history = inbox.locator(`[data-referral-id="${a.referralId}"]`); await history.getByText("Urgente · Programada", { exact: true }).waitFor(); await history.getByText("Motivo FE14 0", { exact: true }).waitFor(); await history.getByText("Resumen FE14 0", { exact: true }).waitFor(); assert.equal(await history.getByRole("link").count(), 0);
    await history.screenshot({ path: artifacts + "/derivacion-programada.png" });
    for (const context of [doctor, specialist, student]) { await api(context, "/api/administrative/referrals", "GET", undefined, 403); await api(context, "/api/patients/" + a.patientId + "/referrals", "GET", undefined, 403); }
    await api(student, "/api/appointment-requests", "POST", referralBody(a), 403); await api(doctor, "/api/appointment-requests/" + c.requestId + "/assign", "POST", { slotId: thirdSlot }, 403);
    await api(admin, "/api/medical/referrals/" + a.referralId, "GET", undefined, 403);
    const anonymous = await browser.newContext(); await api(anonymous, "/api/administrative/referrals", "GET", undefined, 401);
    for (const item of fixtures) assert.equal(await snapshot(item), item.originalHash, "Clinical source altered: " + item.referralId);
    const storedSlots = (await api(admin, "/api/availability-slots")).data;
    for (const id of [firstSlot, secondSlot, thirdSlot]) assert.equal(storedSlots.find(s => s.id === id).bookedCount, 1);
    assert.equal(storedSlots.find(s => s.id === wrongSlot).bookedCount, 0);
    const storedRequests = (await api(admin, "/api/appointment-requests")).data;
    for (const item of fixtures) { const matching = storedRequests.filter(r => r.referral_id === item.referralId); assert.equal(matching.length, 1); assert.equal(matching[0].appointment.id, item.specialtyAppointmentId); }
    assert(!traffic.some(r => /supabase\.(co|com)/.test(r.url)));
    record("Historial y nulos correctos, permisos de roles/anonimato, un cupo/cita por derivación, checksum clínico intacto y ninguna llamada Supabase");
    writeFileSync(artifacts + "/resultado.json", JSON.stringify({ status: "PASS", results, fixtures, specialty, wrongSpecialty, slots: { firstSlot, secondSlot, thirdSlot, wrongSlot }, traffic }, null, 2));
    console.log(JSON.stringify({ status: "PASS", artifacts, results, fixtures }, null, 2));
  } catch (error) {
    for (const [i, context] of browser.contexts().entries()) for (const [j, page] of context.pages().entries()) {
      await page.screenshot({ path: artifacts + "/fallo-" + i + "-" + j + ".png", fullPage: true }).catch(() => {});
      writeFileSync(artifacts + "/fallo-" + i + "-" + j + ".txt", await page.locator("body").innerText().catch(() => ""));
    }
    throw error;
  } finally {
    if (admin) for (const id of cleanup) await api(admin, "/api/appointments/" + id + "/no-show", "POST", { reason: "Fin prueba FE14 incompleta" }).catch(() => {});
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
