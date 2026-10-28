import { segundoFactor } from "./lib/segundo-factor.mjs";
// Local synthetic environment only. SQL is used solely for template fixture administration.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.FE17_PLAYWRIGHT || "playwright");
const origin = process.env.FE17_ORIGIN || "http://localhost:3000", artifacts = process.env.FE17_ARTIFACTS || "/tmp/salud-u-fe17-evidence";
const password = process.env.FE17_PASSWORD || "SaludDemo2026!";
async function run() {
  assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname)); mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.FE17_CHROMIUM ? { executablePath: process.env.FE17_CHROMIUM } : {}) });
  const results = [], traffic = [], fixtures = []; let special, admin;
  const record = message => { results.push(message); console.log("PASS " + message); };
  const sql = query => execFileSync("docker", ["compose", "exec", "-T", "postgres", "sh", "-c", 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'], { cwd: fileURLToPath(new URL("../../salud-u-backend/", import.meta.url)), input: query, encoding: "utf8" }).trim();
  const uuid = id => { assert.match(id, /^[0-9a-f-]{36}$/); return "'" + id + "'"; };
  async function api(context, path, method = "GET", data, expected = 200) {
    const headers = {}; if (method !== "GET") { const csrf = (await (await context.request.get(origin + "/api/v1/security/csrf")).json()).data; headers[csrf.headerName] = csrf.token; }
    const response = await context.request.fetch(origin + path, { method, data, headers }); const body = response.status() === 204 ? null : await response.json();
    assert.equal(response.status(), expected, method + " " + path + " " + JSON.stringify(body)); return body;
  }
  async function signIn(context, email) { await segundoFactor(context, origin, { email, password }, await api(context, "/api/v1/auth/login", "POST", { email, password })); }
  async function login(email) {
    const context = await browser.newContext({ locale: "es-BO", timezoneId: "America/La_Paz", viewport: { width: 1366, height: 1000 } }); await signIn(context, email);
    context.on("request", r => { const url = new URL(r.url()); if (url.searchParams.has("token")) url.searchParams.set("token", "REDACTED"); traffic.push({ method: r.method(), url: url.href }); }); return context;
  }
  const responseFor = (page, item) => page.waitForResponse(r => r.url().endsWith("/" + item.encounterId + "/finalize") && r.headers()["x-error-code"] !== "CSRF_INVALID");
  const submit = async (page, item, expected) => { const response = responseFor(page, item); await page.getByRole("button", { name: "Cerrar atención de especialidad", exact: true }).focus(); await page.keyboard.press("Enter"); const r = await response; assert.equal(r.status(), expected); return r; };
  try {
    admin = await login("admin.demo@salud-universitaria.test"); const doctor = await login("revision.ana.demo@salud-universitaria.test"); special = await login("fe09.especialista@salud-universitaria.test"); const student = await login("estudiante.ana.demo@salud-universitaria.test");
    const seed = Date.now(), career = (await api(admin, "/api/careers")).data[0];
    const specialty = (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: "FE17_" + seed, name: "Área FE17 " + seed, active: true })).data;
    const principal = (await api(special, "/api/me")).user;
    const staff = (await api(admin, "/api/v1/admin/staff", "POST", { principalId: principal.id, staffCode: "FE09-ESPECIALISTA", active: true })).data;
    const affiliate = s => api(admin, "/api/v1/admin/staff/specialties", "POST", { staffMemberId: staff.id, specialtyId: s.id, activeFrom: "2026-01-01", activeTo: null }); await affiliate(specialty);
    sql("INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) VALUES(" + uuid(specialty.id) + ",1,'{}') RETURNING id;");
    async function patient(suffix) { return (await api(admin, "/api/patients", "POST", { fullName: "Paciente FE17 " + suffix + " " + seed, carnet: "FE17-" + suffix + "-" + seed, registrationCode: "REG-FE17-" + suffix + "-" + seed, birthDate: "2002-01-15", careerId: career.id, academicPeriod: "2026-II", enrollmentStart: "2026-01-01" }, 201)).data.id; }
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
        await api(doctor, "/api/medical/patients/" + patientId + "/clinical-background", "PATCH", { data, expectedVersion: 0, changeReason: "Preparación FE17", encounterId: sourceEncounterId });
        const csrf = (await (await doctor.request.get(origin + "/api/v1/security/csrf")).json()).data;
        const upload = await doctor.request.post(origin + "/api/medical/documents", { headers: { [csrf.headerName]: csrf.token }, multipart: { patientId, encounterId: sourceEncounterId, documentType: "OTHER", file: { name: "origen-fe17.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") } } }); assert.equal(upload.status(), 201);
        referralId = (await api(doctor, "/api/medical/encounters/" + sourceEncounterId + "/finalize", "POST", { chiefComplaint: "Origen remitido FE17", assessment: "Evaluación origen FE17", diagnosisText: "Diagnóstico origen FE17", reviewHistory: {}, referralSpecialtyId: area.id, referralReason: "Motivo remitido FE17", referralComment: "Resumen remitido FE17", referralPriority: "URGENT" })).data.referralId;
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
    async function actor(suffix, role, area) {
      const email = "fe17." + suffix + "." + seed + "@salud-universitaria.test";
      const principal = (await api(admin, "/api/v1/admin/principals", "POST", { email, displayName: "Profesional FE17 " + suffix, password, roles: [role] }, 201)).data;
      const staff = (await api(admin, "/api/v1/admin/staff", "POST", { principalId: principal.id, staffCode: "FE17-" + suffix + "-" + seed, active: true })).data;
      if (area) await api(admin, "/api/v1/admin/staff/specialties", "POST", { staffMemberId: staff.id, specialtyId: area.id, activeFrom: "2026-01-01", activeTo: null });
      return login(email);
    }
    async function attach(context, item, name) {
      const csrf = (await (await context.request.get(origin + "/api/v1/security/csrf")).json()).data;
      const response = await context.request.post(origin + "/api/medical/documents", { headers: { [csrf.headerName]: csrf.token }, multipart: { patientId: item.patientId, encounterId: item.encounterId, documentType: "OTHER", file: { name, mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") } } }); assert.equal(response.status(), 201); return (await response.json()).data.id;
    }
    async function assigned(context, patientId, area = null) {
      const request = (await api(admin, "/api/appointment-requests", "POST", { patientId, appointmentType: area ? "SPECIALTY" : "INITIAL", specialtyId: area?.id ?? null }, 201)).data.id;
      const appointmentId = (await api(admin, "/api/appointment-requests/" + request + "/assign", "POST", { slotId: await slot(context, area?.id ?? null) })).data.appointmentId;
      return { patientId, appointmentId };
    }
    const own = await fixture("principal", specialty, true), page = await open(own); await fill(page, "AREA_A_FE17"); own.doc = await attach(special, own, "AREA_A_FE17.png"); await submit(page, own, 200); await page.getByRole("heading", { name: "Atención cerrada", exact: true }).waitFor();
    const clinicalOriginal = JSON.stringify((await api(special, "/api/medical/encounters/" + own.encounterId)).data.encounter);
    const areaB = (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: "FE17_B_" + seed, name: "Área reservada B FE17 " + seed, active: true })).data;
    sql("INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) VALUES(" + uuid(areaB.id) + ",1,'{}');");
    const specialistB = await actor("areaB", "SPECIALIST", areaB), peerA = await actor("parA", "SPECIALIST", specialty), otherReview = await actor("revisionB", "REVIEW_DOCTOR"), outsider = await actor("ajeno", "REVIEW_DOCTOR"), unrelatedArea = await actor("sinRelacionA", "SPECIALIST", specialty);
    const other = await assigned(specialistB, own.patientId, areaB); other.encounterId = (await api(specialistB, "/api/medical/appointments/" + other.appointmentId + "/start", "POST", undefined, 201)).data.encounterId; other.doc = await attach(specialistB, other, "SECRETO_AREA_B_FE17.png");
    await api(specialistB, "/api/medical/encounters/" + other.encounterId + "/finalize", "POST", { chiefComplaint: "SECRETO_AREA_B_FE17", assessment: "Evaluación secreta B", diagnosisText: "DIAGNOSTICO_SECRETO_B", specialtyHistory: { codigoEspecialidad: areaB.code } });
    const otherInitial = await assigned(otherReview, own.patientId); otherInitial.encounterId = (await api(otherReview, "/api/medical/appointments/" + otherInitial.appointmentId + "/start", "POST", undefined, 201)).data.encounterId;
    await api(otherReview, "/api/medical/encounters/" + otherInitial.encounterId + "/finalize", "POST", { chiefComplaint: "REVISION_NO_REMITIDA_FE17", assessment: "Evaluación de segunda revisión", diagnosisText: "DIAGNOSTICO_REVISION_2", reviewHistory: {} });
    await assigned(peerA, own.patientId, specialty);
    const later = { versionEsquema: 1, alergias: { estado: "PRESENTE", elementos: ["ALERGIA_ACTUAL_FE17"] }, enfermedadesPersonales: { estado: "DESCONOCIDO", elementos: [] }, cirugias: { estado: "DESCONOCIDO", elementos: [] }, medicamentos: { estado: "DESCONOCIDO", elementos: [] }, antecedentesFamiliares: { estado: "DESCONOCIDO", elementos: [] }, habitos: {} };
    await api(doctor, "/api/medical/patients/" + own.patientId + "/clinical-background", "PATCH", { data: later, expectedVersion: 1, changeReason: "Versión posterior FE17" });
    const path = "/api/medical/patients/" + own.patientId;
    const review = (await api(doctor, path)).data, historyA = (await api(special, path)).data, historyB = (await api(specialistB, path)).data, historyPeer = (await api(peerA, path)).data;
    assert.deepEqual(new Set(review.encounters.map(e => e.id)), new Set([own.sourceEncounterId, otherInitial.encounterId]));
    assert.deepEqual(new Set(historyA.encounters.map(e => e.id)), new Set([own.sourceEncounterId, own.encounterId]));
    assert.deepEqual(historyB.encounters.map(e => e.id), [other.encounterId]); assert.deepEqual(historyPeer.encounters.map(e => e.id), [own.encounterId]);
    assert.equal(historyA.encounters.find(e => e.id === own.sourceEncounterId).accessReason, "REFERRAL_SOURCE"); assert.equal(historyA.encounters.find(e => e.id === own.encounterId).specialtyHistoryVersion, 1); assert.equal(historyA.encounters.find(e => e.id === own.encounterId).template.version, 1);
    assert.equal(review.clinicalBackground.versionNo, 2); assert.equal(typeof review.intake.allergies, "string"); assert.equal(review.encounters.find(e => e.id === own.sourceEncounterId).clinicalBackground.versionNo, 1);
    for (const h of [review, historyA, historyPeer]) assert(!JSON.stringify(h).includes("SECRETO_AREA_B_FE17"));
    for (const h of [historyA, historyPeer]) assert(!JSON.stringify(h).includes("REVISION_NO_REMITIDA_FE17"));
    for (const h of [review, historyA, historyB, historyPeer]) {
      for (const e of h.encounters) for (const key of ["referral_id","specialty_id","closed_at","blood_chemistry_status","clinical_background_version_id"]) assert(Object.hasOwn(e,key), key);
      for (const d of h.diagnoses) { assert.equal(d.free_text,d.label); assert.equal(d.diagnosis_kind,"CONFIRMED"); assert.equal(d.condition,null); }
      for (const a of h.appointments) { assert(Object.hasOwn(a,"checked_in_at")); assert(a.assigned_staff_id); assert(Object.hasOwn(a,"availability_slot")); }
      for (const r of h.referrals) { assert(r.source_encounter_id); assert(r.specialty_id); assert(r.created_at); assert(Object.hasOwn(r,"assigned_staff_id")); assert(Object.hasOwn(r,"comment_for_specialist")); }
      h.encounters.forEach((e, i) => { if (i) assert(Date.parse(h.encounters[i - 1].occurred_at) >= Date.parse(e.occurred_at)); });
      h.documents.forEach((d, i) => { if (i) assert(Date.parse(h.documents[i - 1].uploaded_at) >= Date.parse(d.uploaded_at)); assert.equal(d.study_date, null); assert.equal(d.description, null); });
      assert(h.appointments.every(a => a.isAssignedToMe)); assert(h.documents.every(d => h.encounters.some(e => e.id === d.encounter_id))); assert(h.diagnoses.every(d => h.encounters.some(e => e.id === d.encounter_id)));
    }
    record("Spring aplica relación clínica y áreas: revisión ve revisiones, especialista A su área/origen remitido, B solo su área y par A su área sin origen ajeno; versiones/null/orden preservados");
    await page.route("**" + path, r => r.abort("failed"), { times: 1 }); await page.goto(origin + "/medico/pacientes/" + own.patientId); await page.locator('p[role="alert"]').waitFor();
    await page.getByRole("button", { name: "Actualizar historia", exact: true }).click(); await page.locator(`[data-history-encounter-id="${own.encounterId}"]`).waitFor();
    const visibleIds = await page.locator("[data-history-encounter-id]").evaluateAll(nodes => nodes.map(n => n.dataset.historyEncounterId)); assert.deepEqual(visibleIds, historyA.encounters.filter(e => e.status === "CLOSED").map(e => e.id));
    await page.getByRole("textbox", { name: "Buscar en el historial visible", exact: true }).fill("sin coincidencias FE17"); await page.getByRole("button", { name: "Buscar en historia", exact: true }).click(); await page.getByText("No hay atenciones que coincidan con la búsqueda.", { exact: true }).waitFor();
    await page.route("**" + path, r => r.abort("failed"), { times: 1 }); await page.getByRole("button", { name: "Actualizar historia", exact: true }).click(); await page.locator('p[role="alert"]').waitFor(); assert.equal(await page.getByRole("textbox", { name: "Buscar en el historial visible", exact: true }).inputValue(), "sin coincidencias FE17"); await page.getByRole("button", { name: "Actualizar historia", exact: true }).click();
    await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
    const sourceCard = page.locator(`[data-history-encounter-id="${own.sourceEncounterId}"]`); await sourceCard.focus(); await page.keyboard.press("Enter");
    let modal = page.getByRole("dialog", { name: "Ficha clínica autorizada", exact: true }); await modal.waitFor(); await modal.getByText("Versión de ficha: 1", { exact: true }).waitFor(); assert(!(await modal.innerText()).includes("ALERGIA_ACTUAL_FE17")); await modal.getByText("Diagnóstico origen FE17", { exact: true }).waitFor();
    await modal.getByRole("button", { name: /^Previsualizar/ }).click(); const preview = page.getByRole("dialog", { name: "Vista previa de origen-fe17.png", exact: true }); await preview.waitFor(); await preview.getByRole("button", { name: "Cerrar vista previa", exact: true }).click(); await modal.waitFor();
    await modal.getByRole("button", { name: "Cerrar ficha", exact: true }).focus(); await page.keyboard.press("Escape"); await modal.waitFor({ state: "hidden" });
    assert.equal(await sourceCard.evaluate(e => e === document.activeElement), true);
    await page.locator(`[data-history-encounter-id="${own.encounterId}"]`).click(); modal = page.getByRole("dialog", { name: "Ficha clínica autorizada", exact: true }); await modal.getByText("Plantilla: versión 1", { exact: true }).waitFor(); await modal.getByText("Antecedente AREA_A_FE17", { exact: true }).waitFor();
    const download = page.waitForEvent("download"); await modal.getByRole("button", { name: /^Descargar AREA_A_FE17/ }).click(); assert.equal((await download).suggestedFilename(), "AREA_A_FE17.png"); await modal.getByRole("button", { name: "Cerrar ficha", exact: true }).click();
    await page.reload(); await page.locator(`[data-history-encounter-id="${own.sourceEncounterId}"]`).waitFor(); assert(!(await page.locator("body").innerText()).includes("SECRETO_AREA_B_FE17"));
    record("Pantalla muestra origen remitido y ficha propia con versión/plantilla; teclado/foco/dialog, vista previa y descarga privadas; red/filtro/recarga sin perder selección de búsqueda");
    const peerPage = await peerA.newPage(); await peerPage.goto(origin + "/medico/pacientes/" + own.patientId); await peerPage.locator(`[data-history-encounter-id="${own.encounterId}"]`).click(); await peerPage.getByRole("dialog", { name: "Ficha clínica autorizada", exact: true }).getByRole("button", { name: /^Previsualizar/ }).click(); await peerPage.getByRole("dialog", { name: "Vista previa de AREA_A_FE17.png", exact: true }).waitFor();
    for (const context of [special, peerA, doctor]) await api(context, "/api/medical/documents/" + other.doc + "/download", "GET", undefined, 404);
    await api(peerA, "/api/medical/documents?encounterId=" + own.sourceEncounterId, "GET", undefined, 404);
    const reviewerPage = await doctor.newPage(); await reviewerPage.goto(origin + "/medico/pacientes"); const patientCard = reviewerPage.getByRole("link", { name: "Paciente FE17 principal " + seed, exact: true }); await patientCard.click(); await reviewerPage.locator(`[data-history-encounter-id="${own.sourceEncounterId}"]`).waitFor(); await reviewerPage.locator(`[data-history-encounter-id="${otherInitial.encounterId}"]`).waitFor(); assert.equal(await reviewerPage.locator(`[data-history-encounter-id="${own.encounterId}"]`).count(), 0);
    record("Navegación desde Mis pacientes; historial de otro autor de mi área y sus documentos accesibles; otras áreas y origen no remitido rechazados también por API");
    const emptyPatient = await patient("vacio"); await assigned(doctor, emptyPatient); const empty = (await api(doctor, "/api/medical/patients/" + emptyPatient)).data; assert.deepEqual(empty.encounters, []); assert.deepEqual(empty.documents, []); assert.equal(empty.clinicalBackground, null);
    await reviewerPage.goto(origin + "/medico/pacientes/" + emptyPatient); await reviewerPage.getByText("No hay atenciones cerradas en este historial.", { exact: true }).waitFor();
    await api(special, "/api/v1/session/logout", "POST", undefined, 204); await page.getByRole("button", { name: "Actualizar historia", exact: true }).click(); await page.getByRole("link", { name: "Iniciar sesión en otra pestaña y volver a la historia", exact: true }).waitFor(); assert.equal(await page.locator("[data-history-encounter-id]").count(), 0); await signIn(special, "fe09.especialista@salud-universitaria.test"); await page.getByRole("button", { name: "Actualizar historia", exact: true }).click(); await page.locator(`[data-history-encounter-id="${own.encounterId}"]`).waitFor();
    for (const context of [outsider, unrelatedArea]) { await api(context, path, "GET", undefined, 404); await api(context, "/api/medical/documents/" + own.doc + "/download", "GET", undefined, 404); }
    for (const context of [admin, student]) await api(context, path, "GET", undefined, 403);
    const anonymous = await browser.newContext(); await api(anonymous, path, "GET", undefined, 401);
    const foreignPage = await outsider.newPage(); await foreignPage.goto(origin + "/medico/pacientes/" + own.patientId); await foreignPage.locator('p[role="alert"]').filter({ hasText: "No tienes acceso clínico a este paciente." }).waitFor(); assert(!(await foreignPage.locator("body").innerText()).includes("Paciente FE17 principal"));
    assert.equal(JSON.stringify((await api(special, "/api/medical/encounters/" + own.encounterId)).data.encounter), clinicalOriginal);
    assert(!traffic.some(t => /supabase\.(co|com)/.test(t.url)));
    record("Historia vacía autorizada, sesión caducada sin datos residuales y recuperación; ajeno/misma área sin relación/administración/estudiante/anonimato denegados sin exposición ni escrituras clínicas");
    await page.screenshot({ path: artifacts + "/historia-especialista.png", fullPage: true }); await reviewerPage.goto(origin + "/medico/pacientes/" + own.patientId); await reviewerPage.locator(`[data-history-encounter-id="${otherInitial.encounterId}"]`).waitFor(); await reviewerPage.screenshot({ path: artifacts + "/historia-revision.png", fullPage: true });
    const evidence = sql("SELECT accion,count(*),count(distinct id_actor) FROM salud_u.evento_auditoria WHERE id_recurso=" + uuid(own.patientId) + " AND accion='HISTORIA_LONGITUDINAL_CONSULTADA' GROUP BY accion;");
    writeFileSync(artifacts + "/resultado.json", JSON.stringify({ status: "PASS", results, own, other, otherInitial, emptyPatient, evidence, traffic }, null, 2)); console.log(JSON.stringify({ status: "PASS", results, artifacts }, null, 2));
  } catch (error) {
    for (const [i, context] of browser.contexts().entries()) for (const [j, page] of context.pages().entries()) { await page.screenshot({ path: artifacts + "/fallo-" + i + "-" + j + ".png", fullPage: true }).catch(() => {}); writeFileSync(artifacts + "/fallo-" + i + "-" + j + ".txt", await page.locator("body").innerText().catch(() => "")); } throw error;
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
