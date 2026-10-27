// Local synthetic environment only. SQL is used solely for template fixture administration.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.FE18_PLAYWRIGHT || "playwright");
const origin = process.env.FE18_ORIGIN || "http://localhost:3000", artifacts = process.env.FE18_ARTIFACTS || "/tmp/salud-u-fe18-evidence";
const password = process.env.FE18_PASSWORD || "SaludDemo2026!";
async function run() {
  assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname)); mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.FE18_CHROMIUM ? { executablePath: process.env.FE18_CHROMIUM } : {}) });
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
    const specialty = (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: "FE18_" + seed, name: "Área FE18 " + seed, active: true })).data;
    const principal = (await api(special, "/api/me")).user;
    const staff = (await api(admin, "/api/v1/admin/staff", "POST", { principalId: principal.id, staffCode: "FE09-ESPECIALISTA", active: true })).data;
    const affiliate = s => api(admin, "/api/v1/admin/staff/specialties", "POST", { staffMemberId: staff.id, specialtyId: s.id, activeFrom: "2026-01-01", activeTo: null }); await affiliate(specialty);
    sql("INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) VALUES(" + uuid(specialty.id) + ",1,'{}') RETURNING id;");
    async function patient(suffix) { return (await api(admin, "/api/patients", "POST", { fullName: "Paciente FE18 " + suffix + " " + seed, carnet: "FE18-" + suffix + "-" + seed, registrationCode: "REG-FE18-" + suffix + "-" + seed, birthDate: "2002-01-15", careerId: career.id, academicPeriod: "2026-II", enrollmentStart: "2026-01-01" }, 201)).data.id; }
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
        await api(doctor, "/api/medical/patients/" + patientId + "/clinical-background", "PATCH", { data, expectedVersion: 0, changeReason: "Preparación FE18", encounterId: sourceEncounterId });
        const csrf = (await (await doctor.request.get(origin + "/api/v1/security/csrf")).json()).data;
        const upload = await doctor.request.post(origin + "/api/medical/documents", { headers: { [csrf.headerName]: csrf.token }, multipart: { patientId, encounterId: sourceEncounterId, documentType: "OTHER", file: { name: "origen-fe18.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") } } }); assert.equal(upload.status(), 201);
        sql("UPDATE salud_u.encuentro_clinico SET ocurrido_en='2026-10-25T04:00:00Z' WHERE id=" + uuid(sourceEncounterId) + ";");
        referralId = (await api(doctor, "/api/medical/encounters/" + sourceEncounterId + "/finalize", "POST", { chiefComplaint: "Origen remitido FE18", assessment: "Evaluación origen FE18", diagnosisText: "Diagnóstico origen FE18", reviewHistory: {}, referralSpecialtyId: area.id, referralReason: "Motivo remitido FE18", referralComment: "Resumen remitido FE18", referralPriority: "URGENT" })).data.referralId;
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
      const email = "fe18." + suffix + "." + seed + "@salud-universitaria.test";
      const principal = (await api(admin, "/api/v1/admin/principals", "POST", { email, displayName: "Profesional FE18 " + suffix, password, roles: [role] }, 201)).data;
      const staff = (await api(admin, "/api/v1/admin/staff", "POST", { principalId: principal.id, staffCode: "FE18-" + suffix + "-" + seed, active: true })).data;
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
    const own = await fixture("principal", specialty, true), page = await open(own); sql("UPDATE salud_u.encuentro_clinico SET ocurrido_en='2026-10-25T02:30:00Z' WHERE id=" + uuid(own.encounterId) + ";"); await fill(page, "AREA_A_FE18"); await page.getByRole("textbox",{name:"Patológicos del área",exact:true}).fill("Antecedente\nAREA_A_FE18"); own.doc = await attach(special, own, "AREA_A_FE18.png"); await submit(page, own, 200); await page.getByRole("heading", { name: "Atención cerrada", exact: true }).waitFor();
    const clinicalOriginal = JSON.stringify((await api(special, "/api/medical/encounters/" + own.encounterId)).data.encounter);
    const areaB = (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: "FE18_B_" + seed, name: "Área reservada B FE18 " + seed, active: true })).data;
    sql("INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) VALUES(" + uuid(areaB.id) + ",1,'{}');");
    const specialistB = await actor("areaB", "SPECIALIST", areaB), peerA = await actor("parA", "SPECIALIST", specialty), otherReview = await actor("revisionB", "REVIEW_DOCTOR"), outsider = await actor("ajeno", "REVIEW_DOCTOR"), unrelatedArea = await actor("sinRelacionA", "SPECIALIST", specialty);
    const other = await assigned(specialistB, own.patientId, areaB); other.encounterId = (await api(specialistB, "/api/medical/appointments/" + other.appointmentId + "/start", "POST", undefined, 201)).data.encounterId; other.doc = await attach(specialistB, other, "SECRETO_AREA_B_FE18.png");
    await api(specialistB, "/api/medical/encounters/" + other.encounterId + "/finalize", "POST", { chiefComplaint: "SECRETO_AREA_B_FE18", assessment: "Evaluación secreta B", diagnosisText: "DIAGNOSTICO_SECRETO_B", specialtyHistory: { codigoEspecialidad: areaB.code } });
    const otherInitial = await assigned(otherReview, own.patientId); otherInitial.encounterId = (await api(otherReview, "/api/medical/appointments/" + otherInitial.appointmentId + "/start", "POST", undefined, 201)).data.encounterId;
    sql("UPDATE salud_u.encuentro_clinico SET ocurrido_en='2026-10-25T04:00:00Z' WHERE id=" + uuid(otherInitial.encounterId) + ";");
    await api(otherReview, "/api/medical/encounters/" + otherInitial.encounterId + "/finalize", "POST", { chiefComplaint: "REVISION_NO_REMITIDA_FE18", assessment: "Evaluación de segunda revisión", diagnosisText: "DIAGNOSTICO_REVISION_2", reviewHistory: {} });
    await assigned(peerA, own.patientId, specialty);
    const later = { versionEsquema: 1, alergias: { estado: "PRESENTE", elementos: ["ALERGIA_ACTUAL_FE18"] }, enfermedadesPersonales: { estado: "DESCONOCIDO", elementos: [] }, cirugias: { estado: "DESCONOCIDO", elementos: [] }, medicamentos: { estado: "DESCONOCIDO", elementos: [] }, antecedentesFamiliares: { estado: "DESCONOCIDO", elementos: [] }, habitos: {} };
    await api(doctor, "/api/medical/patients/" + own.patientId + "/clinical-background", "PATCH", { data: later, expectedVersion: 1, changeReason: "Versión posterior FE18" });
    const path = "/api/medical/patients/" + own.patientId + "/search";
    const searchApi = async (context, filters = {}, expected = 200) => (await api(context,path + "?" + new URLSearchParams(filters),"GET",undefined,expected))?.data;
    const ids = rows => rows.map(r => r.id);
    assert.deepEqual(ids(await searchApi(special,{q:"  DIAGNOSTICO   AREA_A_FE18  "})),[own.encounterId]);
    assert.deepEqual(ids(await searchApi(special,{q:"evaluacio\u0301n area_a_fe18"})),[own.encounterId]);
    assert.deepEqual(ids(await searchApi(special,{q:"Antecedente AREA_A_FE18"})),[own.encounterId]);
    assert.deepEqual(ids(await searchApi(special,{q:"origen"})),[own.sourceEncounterId]); assert.equal((await searchApi(special,{q:"origen"}))[0].specialty,null);
    assert.deepEqual(await searchApi(special,{q:"SECRETO_AREA_B_FE18"}),[]); assert.deepEqual(ids(await searchApi(specialistB,{q:"SECRETO_AREA_B_FE18"})),[other.encounterId]);
    assert.deepEqual(await searchApi(peerA,{q:"origen"}),[]); assert.deepEqual(await searchApi(special,{q:"REVISION_NO_REMITIDA_FE18"}),[]);
    assert.deepEqual(await searchApi(special,{q:"ALERGIA_ACTUAL_FE18"}),[]); assert.deepEqual(await searchApi(special,{q:"%"}),[]);
    assert.deepEqual(ids(await searchApi(special,{from:"2026-10-24",to:"2026-10-24"})),[own.encounterId]);
    assert.deepEqual(ids(await searchApi(special,{from:"2026-10-25",to:"2026-10-25"})),[own.sourceEncounterId]);
    await searchApi(special,{from:"2026-10-25",to:"2026-10-24"},400); await searchApi(special,{from:"no-fecha"},400); await searchApi(special,{q:"a".repeat(201)},400);
    record("API: texto parcial normalizado, Unicode/acento/espacios, diagnóstico y ficha estructurada; null, ámbito, rangos inclusivos Bolivia, búsqueda literal y errores 400");
    await page.goto(origin + "/medico/pacientes/" + own.patientId); await page.locator(`[data-history-encounter-id="${own.encounterId}"]`).waitFor();
    const text = page.getByRole("textbox",{name:"Buscar en el historial visible",exact:true}), from = page.getByLabel("Desde",{exact:true}), to = page.getByLabel("Hasta",{exact:true});
    async function submitSearch(expected = 200) {
      const response = page.waitForResponse(r => r.url().includes(path + "?") && r.request().method() === "GET");
      await page.getByRole("button",{name:"Buscar en historia",exact:true}).focus(); await page.keyboard.press("Enter"); const r = await response; assert.equal(r.status(),expected); return r;
    }
    let searches=0; page.on("request",r=>{if(r.url().includes(path+"?")) searches++;});
    await text.fill("  DIAGNOSTICO   AREA_A_FE18  "); await from.fill("2026-10-24"); await to.fill("2026-10-24"); assert.equal(searches,0,"Typing must not issue a search per keystroke");
    const response = await submitSearch(); assert.equal(response.headers()["cache-control"],"no-store, private"); assert.deepEqual(ids((await response.json()).data),[own.encounterId]);
    await page.getByRole("status").filter({hasText:"Resultados: 1"}).waitFor(); assert.equal(await page.locator("[data-history-encounter-id]").count(),1);
    const url = new URL(page.url()); assert.equal(url.searchParams.get("q"),"  DIAGNOSTICO   AREA_A_FE18  "); assert.equal(url.searchParams.get("from"),"2026-10-24");
    await page.reload(); await page.getByRole("status").filter({hasText:"Resultados: 1"}).waitFor(); assert.equal(await text.inputValue(),"  DIAGNOSTICO   AREA_A_FE18  "); assert.equal(await from.inputValue(),"2026-10-24");
    await page.locator(`[data-history-encounter-id="${own.encounterId}"]`).click(); await page.getByRole("dialog",{name:"Ficha clínica autorizada",exact:true}).getByText("Diagnóstico AREA_A_FE18",{exact:true}).waitFor(); await page.getByRole("button",{name:"Cerrar ficha",exact:true}).click();
    await text.fill("sin coincidencias FE18"); await submitSearch(); await page.getByText("No hay atenciones que coincidan con la búsqueda.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Limpiar filtros",exact:true}).click(); await page.locator(`[data-history-encounter-id="${own.sourceEncounterId}"]`).waitFor(); assert.equal(new URL(page.url()).search,""); assert.equal(await text.inputValue(),""); assert.equal(await from.inputValue(),"");
    record("Pantalla: búsqueda por teclado, IDs coherentes con historia/detalle, filtros conservados tras recarga, cero coincidencias y limpieza de filtros/URL");
    await text.fill("Evaluación AREA_A_FE18"); await from.fill("2026-10-25"); await to.fill("2026-10-24"); await submitSearch(400); await page.locator('p[role="alert"]').filter({hasText:"rango de fechas"}).waitFor(); assert.equal(await text.inputValue(),"Evaluación AREA_A_FE18"); assert.equal(await from.inputValue(),"2026-10-25"); assert.equal(await page.locator("[data-history-encounter-id]").count(),0);
    await from.fill("2026-10-24"); await page.route("**" + path + "?**",r => r.abort("failed"),{times:1}); await page.getByRole("button",{name:"Buscar en historia",exact:true}).click(); await page.locator('p[role="alert"]').filter({hasText:"conservan los filtros"}).waitFor(); assert.equal(await text.inputValue(),"Evaluación AREA_A_FE18"); await submitSearch(); await page.getByRole("status").filter({hasText:"Resultados: 1"}).waitFor();
    await api(special,"/api/v1/session/logout","POST",undefined,204); await submitSearch(401); await page.getByRole("link",{name:"Iniciar sesión en otra pestaña y volver a la historia",exact:true}).waitFor(); assert.equal(await text.inputValue(),"Evaluación AREA_A_FE18"); assert.equal(await from.inputValue(),"2026-10-24"); assert.equal(await page.locator("[data-history-encounter-id]").count(),0);
    await signIn(special,"fe09.especialista@salud-universitaria.test"); await submitSearch(); await page.getByRole("status").filter({hasText:"Resultados: 1"}).waitFor();
    record("Validación, red y sesión: conserva texto/fechas, oculta resultados fallidos, recupera la búsqueda sin perder filtros ni anunciar un falso vacío");
    for (const context of [outsider,unrelatedArea]) await searchApi(context,{q:"AREA_A_FE18"},404);
    for (const context of [admin,student]) await searchApi(context,{q:"AREA_A_FE18"},403);
    const anonymous = await browser.newContext(); await searchApi(anonymous,{q:"AREA_A_FE18"},401);
    assert.equal(JSON.stringify((await api(special,"/api/medical/encounters/" + own.encounterId)).data.encounter),clinicalOriginal);
    const timings = [];
    for (let batch=0;batch<2;batch++) await Promise.all(Array.from({length:10},async(_,i) => {
      const context = i%2 ? specialistB : special, began = performance.now(); const result = await searchApi(context,{q:"SECRETO_AREA_B_FE18"});
      timings.push(performance.now()-began); assert.deepEqual(ids(result),i%2 ? [other.encounterId] : []);
    }));
    timings.sort((a,b)=>a-b); const peak = {concurrency:10,samples:timings.length,p95Ms:timings[18],maxMs:timings[19]}; assert(peak.p95Ms<3000,"Synthetic HTTP peak exceeded 3 s");
    assert(!traffic.some(t => /supabase\.(co|com)/.test(t.url)));
    record("Roles/relación/área protegidos, ficha inmutable y pico HTTP de 20 consultas con concurrencia 10 sin mezcla de actores; sin Supabase");
    await page.screenshot({path:artifacts + "/busqueda.png",fullPage:true});
    const evidence = sql("SELECT accion,count(*),bool_and(NOT detalles::text LIKE '%AREA_A%' AND NOT detalles::text LIKE '%SECRETO%') sin_texto_clinico FROM salud_u.evento_auditoria WHERE id_recurso=" + uuid(own.patientId) + " AND accion='HISTORIA_LONGITUDINAL_BUSCADA' GROUP BY accion;");
    writeFileSync(artifacts + "/resultado.json",JSON.stringify({status:"PASS",results,own,other,peak,evidence,traffic},null,2)); console.log(JSON.stringify({status:"PASS",results,peak,artifacts},null,2));
  } catch (error) {
    for (const [i,context] of browser.contexts().entries()) for (const [j,page] of context.pages().entries()) {await page.screenshot({path:artifacts + "/fallo-" + i + "-" + j + ".png",fullPage:true}).catch(()=>{}); writeFileSync(artifacts + "/fallo-" + i + "-" + j + ".txt",await page.locator("body").innerText().catch(()=>""));} throw error;
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
