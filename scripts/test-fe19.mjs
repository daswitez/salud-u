import { segundoFactor } from "./lib/segundo-factor.mjs";
// Local synthetic environment only. SQL is used solely for template fixture administration.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.FE19_PLAYWRIGHT || "playwright");
const origin = process.env.FE19_ORIGIN || "http://localhost:3000", artifacts = process.env.FE19_ARTIFACTS || "/tmp/salud-u-fe19-evidence";
const password = process.env.FE19_PASSWORD || "SaludDemo2026!";
async function run() {
  assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname)); mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.FE19_CHROMIUM ? { executablePath: process.env.FE19_CHROMIUM } : {}) });
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
    const specialty = (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: "FE19_" + seed, name: "Área FE19 " + seed, active: true })).data;
    const principal = (await api(special, "/api/me")).user;
    const staff = (await api(admin, "/api/v1/admin/staff", "POST", { principalId: principal.id, staffCode: "FE09-ESPECIALISTA", active: true })).data;
    const affiliate = s => api(admin, "/api/v1/admin/staff/specialties", "POST", { staffMemberId: staff.id, specialtyId: s.id, activeFrom: "2026-01-01", activeTo: null }); await affiliate(specialty);
    sql("INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) VALUES(" + uuid(specialty.id) + ",1,'{}') RETURNING id;");
    async function patient(suffix) { return (await api(admin, "/api/patients", "POST", { fullName: "Paciente FE19 " + suffix + " " + seed, carnet: "FE19-" + suffix + "-" + seed, registrationCode: "REG-FE19-" + suffix + "-" + seed, birthDate: "2002-01-15", careerId: career.id, academicPeriod: "2026-II", enrollmentStart: "2026-01-01" }, 201)).data.id; }
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
        await api(doctor, "/api/medical/patients/" + patientId + "/clinical-background", "PATCH", { data, expectedVersion: 0, changeReason: "Preparación FE19", encounterId: sourceEncounterId });
        const csrf = (await (await doctor.request.get(origin + "/api/v1/security/csrf")).json()).data;
        const upload = await doctor.request.post(origin + "/api/medical/documents", { headers: { [csrf.headerName]: csrf.token }, multipart: { patientId, encounterId: sourceEncounterId, documentType: "OTHER", file: { name: "origen-fe19.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") } } }); assert.equal(upload.status(), 201);
        referralId = (await api(doctor, "/api/medical/encounters/" + sourceEncounterId + "/finalize", "POST", { chiefComplaint: "Origen remitido FE19", assessment: "Evaluación origen FE19", diagnosisText: "Diagnóstico origen FE19", reviewHistory: {}, referralSpecialtyId: area.id, referralReason: "Motivo remitido FE19", referralComment: "Resumen remitido FE19", referralPriority: "URGENT" })).data.referralId;
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
      const email = "fe19." + suffix + "." + seed + "@salud-universitaria.test";
      const principal = (await api(admin, "/api/v1/admin/principals", "POST", { email, displayName: "Profesional FE19 " + suffix, password, roles: [role] }, 201)).data;
      const staff = (await api(admin, "/api/v1/admin/staff", "POST", { principalId: principal.id, staffCode: "FE19-" + suffix + "-" + seed, active: true })).data;
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
    const own = await fixture("principal", specialty, true), page = await open(own); await fill(page, "AREA_A_FE19"); own.doc = await attach(special, own, "AREA_A_FE19.png"); await submit(page, own, 200); await page.getByRole("heading", { name: "Atención cerrada", exact: true }).waitFor();
    const areaB = (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: "FE19_B_" + seed, name: "Área reservada B FE19 " + seed, active: true })).data;
    sql("INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) VALUES(" + uuid(areaB.id) + ",1,'{}');");
    const specialistB = await actor("areaB", "SPECIALIST", areaB), peerA = await actor("parA", "SPECIALIST", specialty), otherReview = await actor("revisionB", "REVIEW_DOCTOR"), outsider = await actor("ajeno", "REVIEW_DOCTOR"), unrelatedArea = await actor("sinRelacionA", "SPECIALIST", specialty);
    const other = await assigned(specialistB, own.patientId, areaB); other.encounterId = (await api(specialistB, "/api/medical/appointments/" + other.appointmentId + "/start", "POST", undefined, 201)).data.encounterId; other.doc = await attach(specialistB, other, "SECRETO_AREA_B_FE19.png");
    await api(specialistB, "/api/medical/encounters/" + other.encounterId + "/finalize", "POST", { chiefComplaint: "SECRETO_AREA_B_FE19", assessment: "Evaluación secreta B", diagnosisText: "DIAGNOSTICO_SECRETO_B", specialtyHistory: { codigoEspecialidad: areaB.code } });
    const otherInitial = await assigned(otherReview, own.patientId); otherInitial.encounterId = (await api(otherReview, "/api/medical/appointments/" + otherInitial.appointmentId + "/start", "POST", undefined, 201)).data.encounterId;
    await api(otherReview, "/api/medical/encounters/" + otherInitial.encounterId + "/finalize", "POST", { chiefComplaint: "REVISION_NO_REMITIDA_FE19", assessment: "Evaluación de segunda revisión", diagnosisText: "DIAGNOSTICO_REVISION_2", reviewHistory: {} });
    await assigned(peerA, own.patientId, specialty);
    const later = { versionEsquema: 1, alergias: { estado: "PRESENTE", elementos: ["ALERGIA_ACTUAL_FE19"] }, enfermedadesPersonales: { estado: "DESCONOCIDO", elementos: [] }, cirugias: { estado: "DESCONOCIDO", elementos: [] }, medicamentos: { estado: "DESCONOCIDO", elementos: [] }, antecedentesFamiliares: { estado: "DESCONOCIDO", elementos: [] }, habitos: {} };
    await api(doctor, "/api/medical/patients/" + own.patientId + "/clinical-background", "PATCH", { data: later, expectedVersion: 1, changeReason: "Versión posterior FE19" });
    const path = "/api/medical/encounters/" + own.encounterId + "/amendments";
    const amendments = async () => (await api(special,path)).data;
    async function graph(context,id) {
      const c=(await api(context,"/api/medical/encounters/"+id)).data;
      return createHash("sha256").update(JSON.stringify({encounter:c.encounter,appointment:c.appointment,diagnoses:c.diagnoses,measurements:c.measurements,documents:c.documents,template:c.template,background:c.clinicalBackground.encounter})).digest("hex");
    }
    const originalHash=await graph(special,own.encounterId),sourceHash=await graph(doctor,own.sourceEncounterId);
    const sourceContext=(await api(doctor,"/api/medical/encounters/"+own.sourceEncounterId)).data;
    assert.deepEqual(await amendments(),{canAdd:true,items:[]});
    const region=p=>p.getByRole("region",{name:"Correcciones auditables",exact:true});
    async function fillAmendment(p,reason,content) {await region(p).getByRole("textbox",{name:/^Motivo de corrección/}).fill(reason);await region(p).getByRole("textbox",{name:/^Contenido de la corrección/}).fill(content);}
    const responseFor=(p,url=path)=>p.waitForResponse(r=>r.url().endsWith(url)&&r.request().method()==="POST"&&r.headers()["x-error-code"]!=="CSRF_INVALID");
    async function send(p,expected,url=path){const response=responseFor(p,url);await region(p).getByRole("button",{name:"Guardar adenda",exact:true}).focus();await p.keyboard.press("Enter");const r=await response;assert.equal(r.status(),expected);return r;}
    await page.route("**"+path,r=>r.abort("failed"),{times:1});await page.reload();await region(page).locator('p[role="alert"]').waitFor();
    await region(page).getByRole("button",{name:"Comprobar adendas guardadas",exact:true}).click();await region(page).getByText("No hay adendas registradas.",{exact:true}).waitFor();
    let posts=0;page.on("request",r=>{if(r.method()==="POST"&&r.url().endsWith(path))posts++;});
    await region(page).getByRole("button",{name:"Guardar adenda",exact:true}).click();assert.equal(posts,0);
    await fillAmendment(page," ","Contenido FE19");await send(page,400);assert.equal(await region(page).getByRole("textbox",{name:/^Contenido de la corrección/}).inputValue(),"Contenido FE19");
    await api(special,path,"POST",{reason:"a".repeat(1001),content:"Contenido"},400);
    await fillAmendment(page," Motivo aclaración FE19 "," Corrección protegida FE19 ");
    await page.route("**"+path,r=>r.abort("failed"),{times:1});await region(page).getByRole("button",{name:"Guardar adenda",exact:true}).click();await region(page).locator('p[role="alert"]').filter({hasText:"No pudimos confirmar"}).waitFor();assert.deepEqual((await amendments()).items,[]);
    await api(special,"/api/v1/session/logout","POST",undefined,204);await send(page,401);await region(page).getByRole("link",{name:"Iniciar sesión en otra pestaña y conservar la adenda",exact:true}).waitFor();
    await signIn(special,"fe09.especialista@salud-universitaria.test");await region(page).getByRole("button",{name:"Comprobar adendas guardadas",exact:true}).click();await region(page).getByRole("textbox",{name:/^Motivo de corrección/}).waitFor();assert.equal(await region(page).getByRole("textbox",{name:/^Motivo de corrección/}).inputValue()," Motivo aclaración FE19 ");
    record("Lista vacía/carga fallida y reintento; validación nativa/400, red y sesión conservan motivo/contenido sin ninguna escritura parcial");
    let first,firstPayload;
    const lose=async(callback)=>page.route("**"+path,async route=>{if(route.request().method()!=="POST")return route.continue();const response=await route.fetch();if(response.headers()["x-error-code"]==="CSRF_INVALID")return route.fulfill({response});assert.equal(response.status(),200);callback((await response.json()).data,route.request().postDataJSON());await route.abort("failed");await page.unroute("**"+path);});
    await lose((data,payload)=>{first=data;firstPayload=payload;});await region(page).getByRole("button",{name:"Guardar adenda",exact:true}).click();await region(page).locator('p[role="alert"]').filter({hasText:"No pudimos confirmar"}).waitFor();assert(first);
    await region(page).getByRole("button",{name:"Comprobar adendas guardadas",exact:true}).click();await region(page).locator(`[data-amendment-id="${first.id}"]`).waitFor();assert.equal(await region(page).getByRole("textbox",{name:/^Contenido de la corrección/}).inputValue(),"");
    const replay=(await api(special,path,"POST",firstPayload)).data;assert.deepEqual(replay,first);assert.equal((await amendments()).items.length,1);
    await api(special,path,"POST",{...firstPayload,content:"Otra corrección"},409);
    await page.reload();await region(page).getByText("Corrección protegida FE19",{exact:true}).waitFor();assert((await amendments()).items[0].createdByName);assert.equal((await amendments()).items[0].amendmentNo,1);
    record("Respuesta perdida: recupera la adenda persistida por su envío; repetición devuelve el mismo ID/número sin duplicar; cambio del mismo envío 409 y recarga mantiene autor/fecha/contenido");
    await fillAmendment(page,"Segundo motivo FE19","Contenido anterior FE19");let second;
    await lose(data=>{second=data;});await region(page).getByRole("button",{name:"Guardar adenda",exact:true}).click();await region(page).locator('p[role="alert"]').filter({hasText:"No pudimos confirmar"}).waitFor();assert(second);
    await region(page).getByRole("textbox",{name:/^Contenido de la corrección/}).fill("CORRECCION_B_EDITADA_FE19");await send(page,409);
    await region(page).getByRole("button",{name:"Comprobar adendas guardadas",exact:true}).click();await region(page).getByRole("status").filter({hasText:"Se conservan tus cambios para una nueva adenda"}).waitFor();assert.equal(await region(page).getByRole("textbox",{name:/^Contenido de la corrección/}).inputValue(),"CORRECCION_B_EDITADA_FE19");
    const third=(await(await send(page,200)).json()).data;await region(page).locator(`[data-amendment-id="${third.id}"]`).waitFor();assert.equal((await amendments()).items.length,3);
    record("Edición tras respuesta perdida: conserva el nuevo borrador, recupera el envío anterior y guarda los cambios como una nueva adenda solo al confirmar Guardar");
    const tabs=await Promise.all([special.newPage(),special.newPage()]);for(const tab of tabs){await tab.goto(origin+"/medico/citas/"+own.appointmentId+"?ficha=1");await region(tab).getByRole("textbox",{name:/^Motivo de corrección/}).waitFor();}
    await fillAmendment(tabs[0],"Pestaña A FE19","Contenido A FE19");await fillAmendment(tabs[1],"Pestaña B FE19","Contenido B FE19");
    let arrived=0,release;const barrier=new Promise(resolve=>release=resolve);
    for(const tab of tabs)await tab.route("**"+path,async route=>{if(route.request().method()!=="POST")return route.continue();arrived++;if(arrived===2)release();await barrier;await route.continue();},{times:1});
    const racing=tabs.map(tab=>responseFor(tab));await Promise.all(tabs.map(tab=>region(tab).getByRole("button",{name:"Guardar adenda",exact:true}).click()));assert.deepEqual((await Promise.all(racing)).map(r=>r.status()),[200,200]);
    await Promise.all(tabs.map(tab=>region(tab).getByRole("status").filter({hasText:"guardada. La atención original"}).waitFor()));const stored=await amendments();assert.deepEqual(stored.items.map(a=>a.amendmentNo),[1,2,3,4,5]);assert.equal(new Set(stored.items.map(a=>a.id)).size,5);assert(stored.items.every(a=>a.createdBy===principal.id));
    const historyPage=await special.newPage();historyPage.on("dialog",d=>d.dismiss());await historyPage.goto(origin+"/medico/pacientes/"+own.patientId);await historyPage.locator(`[data-history-encounter-id="${own.encounterId}"]`).click();const modal=historyPage.getByRole("dialog",{name:"Ficha clínica autorizada",exact:true});await region(historyPage).getByRole("textbox",{name:/^Motivo de corrección/}).waitFor();await fillAmendment(historyPage,"Borrador sin guardar FE19","No descartar FE19");
    await historyPage.keyboard.press("Escape");assert(await modal.isVisible());await modal.getByRole("button",{name:"Cerrar ficha",exact:true}).click();assert(await modal.isVisible());assert.equal(await region(historyPage).getByRole("textbox",{name:/^Contenido de la corrección/}).inputValue(),"No descartar FE19");
    historyPage.removeAllListeners("dialog");historyPage.on("dialog",d=>d.accept());await modal.getByRole("button",{name:"Cerrar ficha",exact:true}).click();await modal.waitFor({state:"hidden"});assert.equal((await amendments()).items.length,5);
    record("Dos correcciones legítimas concurrentes conservan numeración única; cerrar el modal con borrador requiere decisión explícita y no escribe ni pierde datos silenciosamente");
    const reviewPage=await doctor.newPage();await reviewPage.goto(origin+"/medico/citas/"+sourceContext.appointment.id+"?ficha=1");await region(reviewPage).getByRole("textbox",{name:/^Motivo de corrección/}).waitFor();await fillAmendment(reviewPage,"Aclaración de revisión FE19","Corrección de origen FE19");const sourcePath="/api/medical/encounters/"+own.sourceEncounterId+"/amendments";await send(reviewPage,200,sourcePath);await region(reviewPage).getByText("Corrección de origen FE19",{exact:true}).waitFor();
    const peerRead=(await api(peerA,path)).data;assert.equal(peerRead.canAdd,false);assert.equal(peerRead.items.length,5);await api(peerA,path,"POST",{reason:"Ajeno",content:"Ajeno"},403);
    await api(outsider,sourcePath,"GET",undefined,403);
    const reviewerRead=(await api(otherReview,sourcePath)).data;assert.equal(reviewerRead.canAdd,false);assert.equal(reviewerRead.items.length,1);
    const originRead=(await api(special,sourcePath)).data;assert.equal(originRead.canAdd,false);assert.equal(originRead.items[0].content,"Corrección de origen FE19");await api(special,sourcePath,"POST",{reason:"Ajeno",content:"Ajeno"},403);
    const peerPage=await peerA.newPage();await peerPage.goto(origin+"/medico/pacientes/"+own.patientId);await peerPage.locator(`[data-history-encounter-id="${own.encounterId}"]`).click();await region(peerPage).getByText("CORRECCION_B_EDITADA_FE19",{exact:true}).waitFor();assert.equal(await region(peerPage).getByRole("button",{name:"Guardar adenda",exact:true}).count(),0);
    for(const context of [specialistB,outsider,unrelatedArea,admin,student]){await api(context,path,"GET",undefined,403);await api(context,path,"POST",{reason:"Ajeno",content:"Ajeno"},403);}
    const anonymous=await browser.newContext();await api(anonymous,path,"GET",undefined,401);
    const pending=await assigned(special,own.patientId,specialty);pending.encounterId=(await api(special,"/api/medical/appointments/"+pending.appointmentId+"/start","POST",undefined,201)).data.encounterId;await api(special,"/api/medical/encounters/"+pending.encounterId+"/amendments","POST",{reason:"No cerrada",content:"No permitida"},403);
    const search=(await api(special,"/api/medical/patients/"+own.patientId+"/search?q=CORRECCION_B_EDITADA_FE19")).data;assert.deepEqual(search.map(e=>e.id),[own.encounterId]);
    assert.equal(await graph(special,own.encounterId),originalHash);assert.equal(await graph(doctor,own.sourceEncounterId),sourceHash);assert(!traffic.some(t=>/supabase\.(co|com)/.test(t.url)));
    record("Revisión y especialista propios agregan; colega/origen remitido consultan sin escribir; otras áreas/ajeno/roles/borrador rechazados. Hash original íntegro, búsqueda incluye adendas autorizadas y no hay Supabase");
    await page.reload();await region(page).getByText("CORRECCION_B_EDITADA_FE19",{exact:true}).waitFor();await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));await page.screenshot({path:artifacts+"/adendas.png",fullPage:true});
    const evidence=sql("SELECT a.id_encuentro,count(*) adendas,count(distinct a.numero_adenda) numeros,(SELECT count(*) FROM salud_u.evento_auditoria v WHERE v.accion='ADENDA_ENCUENTRO_AGREGADA' AND v.id_recurso IN(SELECT x.id FROM salud_u.adenda_encuentro_clinico x WHERE x.id_encuentro=a.id_encuentro)) auditorias FROM salud_u.adenda_encuentro_clinico a WHERE a.id_encuentro IN("+uuid(own.encounterId)+","+uuid(own.sourceEncounterId)+") GROUP BY a.id_encuentro;");
    writeFileSync(artifacts+"/resultado.json",JSON.stringify({status:"PASS",results,own,originalHash,sourceHash,evidence,traffic},null,2));console.log(JSON.stringify({status:"PASS",results,artifacts},null,2));
  }catch(error){for(const[i,context]of browser.contexts().entries())for(const[j,page]of context.pages().entries()){await page.screenshot({path:artifacts+"/fallo-"+i+"-"+j+".png",fullPage:true}).catch(()=>{});writeFileSync(artifacts+"/fallo-"+i+"-"+j+".txt",await page.locator("body").innerText().catch(()=>""));}throw error;}
  finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
