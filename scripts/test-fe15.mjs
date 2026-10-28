import { segundoFactor } from "./lib/segundo-factor.mjs";
// Local synthetic environment only. SQL is used solely for template fixture administration.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.FE15_PLAYWRIGHT || "playwright");
const origin = process.env.FE15_ORIGIN || "http://127.0.0.1:3000", artifacts = process.env.FE15_ARTIFACTS || "/tmp/salud-u-fe15-evidence";
const password = process.env.FE15_PASSWORD || "SaludDemo2026!";
async function run() {
  assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname)); mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.FE15_CHROMIUM ? { executablePath: process.env.FE15_CHROMIUM } : {}) });
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
    const specialty = (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: "FE15_" + seed, name: "Área FE15 " + seed, active: true })).data;
    const principal = (await api(special, "/api/me")).user;
    const staff = (await api(admin, "/api/v1/admin/staff", "POST", { principalId: principal.id, staffCode: "FE09-ESPECIALISTA", active: true })).data;
    const affiliate = s => api(admin, "/api/v1/admin/staff/specialties", "POST", { staffMemberId: staff.id, specialtyId: s.id, activeFrom: "2026-01-01", activeTo: null }); await affiliate(specialty);
    const template = sql("INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) VALUES(" + uuid(specialty.id) + ",1,'{}') RETURNING id;").split("\n")[0];
    async function patient(suffix) { return (await api(admin, "/api/patients", "POST", { fullName: "Paciente FE15 " + suffix + " " + seed, carnet: "FE15-" + suffix + "-" + seed, registrationCode: "REG-FE15-" + suffix + "-" + seed, birthDate: "2002-01-15", careerId: career.id, academicPeriod: "2026-II", enrollmentStart: "2026-01-01" }, 201)).data.id; }
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
        await api(doctor, "/api/medical/patients/" + patientId + "/clinical-background", "PATCH", { data, expectedVersion: 0, changeReason: "Preparación FE15", encounterId: sourceEncounterId });
        const csrf = (await (await doctor.request.get(origin + "/api/v1/security/csrf")).json()).data;
        const upload = await doctor.request.post(origin + "/api/medical/documents", { headers: { [csrf.headerName]: csrf.token }, multipart: { patientId, encounterId: sourceEncounterId, documentType: "OTHER", file: { name: "origen-fe15.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") } } }); assert.equal(upload.status(), 201);
        referralId = (await api(doctor, "/api/medical/encounters/" + sourceEncounterId + "/finalize", "POST", { chiefComplaint: "Origen remitido FE15", assessment: "Evaluación origen FE15", diagnosisText: "Diagnóstico origen FE15", reviewHistory: {}, referralSpecialtyId: area.id, referralReason: "Motivo remitido FE15", referralComment: "Resumen remitido FE15", referralPriority: "URGENT" })).data.referralId;
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
    const direct = await fixture("directa"), page = await open(direct); await page.getByText("Atención directa: no tiene ficha de origen remitida.", { exact: true }).waitFor(); await fill(page, "directo FE15");
    await page.getByRole("textbox", { name: /^Evaluación clínica/ }).fill(" "); await submit(page, direct, 400); assert.equal(await page.getByRole("textbox", { name: /^Motivo de consulta/ }).inputValue(), "Motivo directo FE15"); await fill(page, "directo FE15");
    sql("UPDATE salud_u.plantilla_ficha_especialidad SET activa=false WHERE id=" + uuid(template) + ";");
    await submit(page, direct, 409); await page.getByRole("button", { name: "Comprobar estado y actualizar plantilla", exact: true }).click(); await page.getByText("Sin plantilla activa", { exact: true }).waitFor(); assert(await page.getByRole("button", { name: "Cerrar atención de especialidad", exact: true }).isDisabled());
    const replacement = sql("INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) VALUES(" + uuid(specialty.id) + ",2,'{}') RETURNING id;").split("\n")[0];
    await page.getByRole("button", { name: "Comprobar estado y actualizar plantilla", exact: true }).click(); await page.getByText("Versión 2", { exact: true }).waitFor(); assert.equal(await page.getByRole("textbox", { name: "Patológicos del área", exact: true }).inputValue(), "Antecedente directo FE15");
    record("Atención directa sin origen/antecedentes, inicio por pantalla, validación y cambio/ausencia de plantilla recuperables sin perder borrador");
    const pattern = "**/" + direct.encounterId + "/finalize";
    await page.route(pattern, r => r.abort("failed"), { times: 1 }); await page.getByRole("button", { name: "Cerrar atención de especialidad", exact: true }).click(); await page.locator('p[role="alert"]').filter({ hasText: "No pudimos confirmar" }).waitFor();
    await api(special, "/api/v1/session/logout", "POST", undefined, 204); await submit(page, direct, 401); await page.getByRole("link", { name: "Iniciar sesión en otra pestaña y volver a esta ficha", exact: true }).waitFor(); await signIn(special, "fe09.especialista@salud-universitaria.test");
    let committed;
    await page.route(pattern, async route => { const response = await route.fetch(); if (response.headers()["x-error-code"] === "CSRF_INVALID") return route.fulfill({ response }); assert.equal(response.status(), 200); committed = (await response.json()).data; await route.abort("failed"); await page.unroute(pattern); });
    await page.getByRole("button", { name: "Cerrar atención de especialidad", exact: true }).click(); await page.locator('p[role="alert"]').filter({ hasText: "No pudimos confirmar" }).waitFor(); assert(committed);
    await page.getByRole("button", { name: "Comprobar estado y actualizar plantilla", exact: true }).click(); await page.getByRole("heading", { name: "Atención cerrada", exact: true }).waitFor();
    await page.reload(); for (const text of ["Motivo directo FE15", "Evaluación directo FE15", "Plan directo FE15", "Control directo FE15", "Antecedente directo FE15"]) await page.getByText(text, { exact: true }).waitFor();
    const stored = (await api(special, "/api/medical/encounters/" + direct.encounterId)).data; assert.equal(stored.encounter.specialtyHistoryId, committed.specialtyHistoryId); assert.equal(stored.template.id, replacement); assert.equal(stored.appointment.status, "ATTENDED"); assert.equal(stored.encounter.specialtyHistoryVersion, 1);
    const original = JSON.stringify(stored.encounter);
    sql("UPDATE salud_u.plantilla_ficha_especialidad SET activa=false WHERE id=" + uuid(replacement) + "; INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) VALUES(" + uuid(specialty.id) + ",3,'{}');");
    await page.reload(); await page.getByText("Versión 2", { exact: true }).waitFor(); assert.equal(JSON.stringify((await api(special, "/api/medical/encounters/" + direct.encounterId)).data.encounter), original);
    const laterBackground = { versionEsquema: 1, alergias: { estado: "PRESENTE", elementos: ["Alergia posterior al cierre FE15"] }, enfermedadesPersonales: { estado: "DESCONOCIDO", elementos: [] }, cirugias: { estado: "DESCONOCIDO", elementos: [] }, medicamentos: { estado: "DESCONOCIDO", elementos: [] }, antecedentesFamiliares: { estado: "DESCONOCIDO", elementos: [] }, habitos: {} };
    await api(special, "/api/medical/patients/" + direct.patientId + "/clinical-background", "PATCH", { data: laterBackground, expectedVersion: 0, changeReason: "Antecedentes posteriores al cierre FE15" });
    await page.reload(); await page.getByText("Sin antecedentes generales vinculados a esta atención.", { exact: true }).waitFor(); assert(!(await page.locator("body").innerText()).includes("Alergia posterior al cierre FE15"));
    assert.equal(JSON.stringify((await api(special, "/api/medical/encounters/" + direct.encounterId)).data.encounter), original);
    record("Red/sesión y respuesta perdida: recuperación sin nuevo cierre, persistencia de todos los textos/JSON y plantilla histórica intacta tras publicar otra versión");
    const referred = await fixture("derivada", specialty, true), refPage = await open(referred);
    await refPage.getByText("Motivo remitido FE15", { exact: true }).waitFor(); await refPage.getByText("Resumen remitido FE15", { exact: true }).waitFor(); await refPage.getByText("Diagnóstico origen FE15", { exact: true }).waitFor();
    await refPage.getByRole("heading", { name: "origen-fe15.png", exact: true }).waitFor();
    const docs = refPage.getByRole("region", { name: "Contexto remitido", exact: true }); await docs.getByRole("button", { name: /^Previsualizar/ }).click(); await refPage.getByRole("dialog").waitFor(); await refPage.getByRole("button", { name: "Cerrar vista previa", exact: true }).click();
    await fill(refPage, "derivado FE15"); await submit(refPage, referred, 200); await refPage.getByRole("heading", { name: "Atención cerrada", exact: true }).waitFor(); await refPage.reload(); await refPage.getByText("Motivo derivado FE15", { exact: true }).waitFor();
    record("Derivación: contexto autorizado, diagnóstico/documento compartido previsualizable, cierre y lectura persistida");
    const raced = await fixture("carrera"), a = await open(raced), b = await open(raced); await fill(a, "pestaña A"); await fill(b, "pestaña B");
    let arrived = 0, release; const barrier = new Promise(resolve => release = resolve);
    for (const tab of [a, b]) await tab.route("**/" + raced.encounterId + "/finalize", async route => { arrived++; if (arrived === 2) release(); await barrier; await route.continue(); }, { times: 1 });
    const responses = [a, b].map(tab => responseFor(tab, raced)); await Promise.all([a, b].map(tab => tab.getByRole("button", { name: "Cerrar atención de especialidad", exact: true }).click())); const concurrent = await Promise.all(responses); assert.deepEqual(concurrent.map(r => r.status()).sort(), [200, 409]);
    const loser = concurrent[0].status() === 409 ? a : b; await loser.locator('p[role="alert"]').waitFor(); assert.equal(await loser.getByRole("textbox", { name: /^Motivo de consulta/ }).inputValue(), loser === a ? "Motivo pestaña A" : "Motivo pestaña B"); await loser.getByRole("button", { name: "Comprobar estado y actualizar plantilla", exact: true }).click(); await loser.getByRole("heading", { name: "Atención cerrada", exact: true }).waitFor();
    const invalid = await fixture("rollback"), invalidPage = await open(invalid); await fill(invalidPage, "rollback");
    await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { ...specialty, active: false }); await submit(invalidPage, invalid, 409); await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { ...specialty, active: true });
    await api(admin, "/api/appointments/" + invalid.appointmentId + "/no-show", "POST", { reason: "Conflicto tardío FE15" }); await submit(invalidPage, invalid, 409);
    const rollback = (await api(special, "/api/medical/encounters/" + invalid.encounterId)).data; assert.equal(rollback.encounter.status, "DRAFT"); assert.equal(rollback.encounter.specialtyHistory, null); assert.deepEqual(rollback.diagnoses, []);
    record("Dos pestañas: 200/409 y una versión; especialidad inactiva y conflicto tardío revierten clínica/diagnóstico/cita sin perder campos");
    for (const code of ["OPHTHALMOLOGY", "GYNECOLOGY"]) {
      const areas = (await api(admin, "/api/v1/catalogs/SPECIALTY")).data;
      const area = areas.find(s => s.code === code) ?? (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code, name: code === "OPHTHALMOLOGY" ? "Oftalmología" : "Ginecología", active: true })).data; await affiliate(area);
      sql("INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) SELECT " + uuid(area.id) + ",1,'{}' WHERE NOT EXISTS(SELECT 1 FROM salud_u.plantilla_ficha_especialidad WHERE id_especialidad=" + uuid(area.id) + ");");
      const item = await fixture(code, area), tab = await open(item); await fill(tab, code);
      if (code === "OPHTHALMOLOGY") { await tab.getByRole("textbox", { name: "Enfermedad actual", exact: true }).fill("Enfermedad ocular FE15"); await tab.getByRole("textbox", { name: "Agudeza visual · ojo derecho (V.D.)", exact: true }).fill("20/20"); }
      else { await tab.getByRole("textbox", { name: "Síntomas principales", exact: true }).fill("Síntoma ginecológico FE15"); await tab.getByRole("textbox", { name: "Detalle de ITS", exact: true }).fill("Detalle FE15"); await tab.getByRole("textbox", { name: "Otros antecedentes familiares", exact: true }).fill("Familia FE15"); await tab.getByRole("checkbox", { name: "Preservativo", exact: true }).check(); }
      await submit(tab, item, 200); await tab.getByRole("heading", { name: "Atención cerrada", exact: true }).waitFor(); await tab.reload(); await tab.getByText(code === "OPHTHALMOLOGY" ? "20/20" : "Familia FE15", { exact: true }).waitFor();
    }
    record("Campos propios de oftalmología/ginecología, listas y opcionales null conservados tras cierre y recarga");
    const outsider = await login("fe09.ajeno@salud-universitaria.test");
    const foreignEmail = "fe15.ajeno." + seed + "@salud-universitaria.test";
    const foreignPrincipal = (await api(admin, "/api/v1/admin/principals", "POST", { email: foreignEmail, displayName: "Especialista ajeno FE15", password, roles: ["SPECIALIST"] }, 201)).data;
    await api(admin, "/api/v1/admin/staff", "POST", { principalId: foreignPrincipal.id, staffCode: "FE15-AJENO-" + seed, active: true });
    const foreignSpecialist = await login(foreignEmail);
    for (const suffix of ["", "/source-context"]) await api(foreignSpecialist, "/api/medical/encounters/" + referred.encounterId + suffix, "GET", undefined, 404);
    await api(foreignSpecialist, "/api/medical/encounters/" + referred.encounterId + "/finalize", "POST", { chiefComplaint: "Ajeno", assessment: "Ajeno", specialtyHistory: { specialtyCode: specialty.code } }, 404);
    for (const context of [outsider, student, admin]) await api(context, "/api/medical/encounters/" + direct.encounterId, "GET", undefined, context === outsider ? 404 : 403);
    await api(doctor, "/api/medical/encounters/" + direct.encounterId + "/source-context", "GET", undefined, 403);
    await api(special, "/api/medical/encounters/" + direct.encounterId + "/finalize", "POST", { chiefComplaint: "Otra", assessment: "Otra", specialtyHistory: { specialtyCode: specialty.code } }, 409);
    const foreignPage = await foreignSpecialist.newPage(); await foreignPage.goto(origin + "/medico/citas/" + direct.appointmentId + "?ficha=1"); await foreignPage.locator('p[role="alert"]').waitFor(); assert(!(await foreignPage.locator("body").innerText()).includes("Motivo directo FE15"));
    assert(!traffic.some(r => /supabase\.(co|com)/.test(r.url))); assert(!traffic.some(r => /\/api\/medical\/patients\/[^/?]+$/.test(r.url)));
    await page.screenshot({ path: artifacts + "/ficha-cerrada.png", fullPage: true });
    record("Roles/ajeno rechazados sin datos clínicos; ficha cerrada inmutable; sin llamadas Supabase ni historia longitudinal heredada");
    const evidence = sql("SELECT d.id_encuentro,d.numero_version,t.numero_version AS plantilla,e.estado,c.estado,(SELECT count(*) FROM salud_u.evento_auditoria a WHERE a.id_recurso=e.id AND a.accion='ENCUENTRO_ESPECIALIDAD_CERRADO') FROM salud_u.version_ficha_especialidad d JOIN salud_u.encuentro_clinico e ON e.id=d.id_encuentro JOIN salud_u.cita c ON c.id=e.id_cita JOIN salud_u.plantilla_ficha_especialidad t ON t.id=d.id_plantilla WHERE e.id IN (" + fixtures.filter(f => f.encounterId).map(f => uuid(f.encounterId)).join(",") + ");");
    writeFileSync(artifacts + "/datos-postgresql.txt", evidence); writeFileSync(artifacts + "/resultado.json", JSON.stringify({ status: "PASS", results, fixtures, traffic, evidence }, null, 2)); console.log(JSON.stringify({ status: "PASS", results, artifacts }, null, 2));
  } catch (error) {
    for (const [i, context] of browser.contexts().entries()) for (const [j, page] of context.pages().entries()) { await page.screenshot({ path: artifacts + "/fallo-" + i + "-" + j + ".png", fullPage: true }).catch(() => {}); writeFileSync(artifacts + "/fallo-" + i + "-" + j + ".txt", await page.locator("body").innerText().catch(() => "")); } throw error;
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
