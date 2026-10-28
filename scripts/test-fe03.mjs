import { segundoFactor } from "./lib/segundo-factor.mjs";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.FE03_PLAYWRIGHT || "playwright");
const origin = process.env.FE03_ORIGIN || "http://127.0.0.1:3000";
const artifacts = process.env.FE03_ARTIFACTS || "/tmp/salud-u-fe03-evidence";
const password = process.env.FE03_PASSWORD || "SaludDemo2026!";

async function run() {
  assert(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
  mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.FE03_CHROMIUM ? { executablePath: process.env.FE03_CHROMIUM } : {}) });
  const traffic=[],results=[],cleanup=[];
  let admin;
  async function api(context,path,method="GET",data,expected=200) {
    const headers={};
    if(method!=="GET") { const csrf=(await (await context.request.get(`${origin}/api/v1/security/csrf`)).json()).data; headers[csrf.headerName]=csrf.token; }
    const response=await context.request.fetch(path.startsWith("http")?path:`${origin}${path}`,{method,data,headers});
    const body=await response.json();assert.equal(response.status(),expected,`${method} ${path}: ${JSON.stringify(body)}`);return body;
  }
  async function login(email) {
    const context=await browser.newContext({locale:"es-BO",timezoneId:"America/La_Paz",viewport:{width:1366,height:900}});
    await segundoFactor(context, origin, {email,password}, await api(context, "/api/v1/auth/login", "POST", {email,password}));
    context.on("request",r=>traffic.push({method:r.method(),url:r.url()}));return context;
  }
  async function ensure(email,role,code) {
    let person=(await api(admin,"/api/v1/admin/principals")).data.find(p=>p.email===email);
    if(!person) person=(await api(admin,"/api/v1/admin/principals","POST",{email,displayName:`Profesional ${code}`,password,roles:[role]},201)).data;
    const staff=(await api(admin,"/api/v1/admin/staff","POST",{principalId:person.id,staffCode:code,active:true})).data;
    return {context:await login(email),staffId:staff.id};
  }
  async function publish(context,days,specialtyId=null) {
    let starts=Date.now()+days*86400000;
    const slots=(await api(admin,"/api/availability-slots")).data;
    while(slots.some(s=>starts<Date.parse(s.endsAt)&&starts+1800000>Date.parse(s.startsAt)))starts+=3600000;
    return (await api(context,"/api/availability-slots","POST",{startsAt:new Date(starts).toISOString(),endsAt:new Date(starts+1800000).toISOString(),capacity:1,specialtyId},201)).data.id;
  }
  async function assign(patientId,slotId,specialtyId=null) {
    const requestId=(await api(admin,"/api/appointment-requests","POST",{patientId,appointmentType:specialtyId?"SPECIALTY":"INITIAL",specialtyId},201)).data.id;
    const id=(await api(admin,`/api/appointment-requests/${requestId}/assign`,"POST",{slotId})).data.appointmentId;cleanup.push(id);return id;
  }
  async function present(dialog,group,label,value) {
    await dialog.getByRole("group",{name:group,exact:true}).getByRole("radio",{name:"Sí",exact:true}).check();
    await dialog.getByRole("textbox",{name:label,exact:true}).fill(value);
  }
  try {
    admin=await login(process.env.FE03_ADMIN||"admin.demo@salud-universitaria.test");
    const doctor=await login(process.env.FE03_DOCTOR||"revision.ana.demo@salud-universitaria.test");
    const specialist=await ensure("fe09.especialista@salud-universitaria.test","SPECIALIST","FE09-ESPECIALISTA");
    const outsider=(await ensure("fe09.ajeno@salud-universitaria.test","REVIEW_DOCTOR","FE09-AJENO")).context;
    const career=(await api(admin,"/api/careers")).data[0];assert(career,"An active synthetic career is required");
    const seed=Date.now().toString();
    const patientId=(await api(admin,"/api/patients","POST",{fullName:`Paciente Sintético FE03 ${seed}`,carnet:`FE03-${seed}`,registrationCode:`REG-FE03-${seed}`,birthDate:"2002-01-15",phone:null,email:null,careerId:career.id,academicPeriod:"2026-II",enrollmentStart:"2026-01-01"},201)).data.id;
    const appointmentId=await assign(patientId,await publish(doctor,75));
    const encounterId=(await api(doctor,`/api/medical/appointments/${appointmentId}/start`,"POST",undefined,201)).data.encounterId;
    const endpoint=`/api/medical/patients/${patientId}/clinical-background`;
    assert.deepEqual((await api(doctor,endpoint)).data,{current:null,encounter:null});
    const page=await doctor.newPage();
    await page.goto(`${origin}/medico/citas/${appointmentId}`);
    await page.getByRole("link",{name:"Antecedentes generales",exact:true}).click();
    await page.getByRole("button",{name:"Completar datos",exact:true}).click();
    let dialog=page.getByRole("dialog");
    await present(dialog,"Alergias","Alergias 1","Penicilina FE03");
    await dialog.getByRole("button",{name:"Añadir alergia",exact:true}).click();
    await dialog.getByRole("textbox",{name:"Alergias 2",exact:true}).fill("Látex FE03");
    await dialog.getByRole("combobox",{name:/Alimentación/}).selectOption("REGULAR");
    const reason=dialog.getByRole("textbox",{name:"Motivo de actualización",exact:true});
    await reason.fill("");await dialog.getByRole("button",{name:"Guardar datos generales",exact:true}).click();
    assert.equal((await api(doctor,endpoint)).data.current,null);
    await reason.fill("Ingreso de antecedentes FE03");
    await page.route(`**${endpoint}`,r=>r.request().method()==="PATCH"?r.abort("failed"):r.continue(),{times:1});
    await dialog.getByRole("button",{name:"Guardar datos generales",exact:true}).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(await reason.inputValue(),"Ingreso de antecedentes FE03");
    assert.equal(await dialog.getByRole("textbox",{name:"Alergias 1",exact:true}).inputValue(),"Penicilina FE03");
    await dialog.getByRole("button",{name:"Guardar datos generales",exact:true}).focus();await page.keyboard.press("Enter");
    await page.getByText("Antecedentes guardados. Versión 1.",{exact:true}).waitFor();
    await page.reload();await page.getByText("Penicilina FE03 · Látex FE03",{exact:true}).waitFor();
    let stored=(await api(doctor,`${endpoint}?encounterId=${encounterId}`)).data;
    assert.equal(stored.current.versionNo,1);assert.deepEqual(stored.current,stored.encounter);
    assert.equal(typeof stored.current.recordedBy,"string");
    results.push("Null/list state, required reason, keyboard save, ordered allergies, actor/reason/reload and encounter binding; network error preserves fields");

    const otherPage=await doctor.newPage();await otherPage.goto(`${origin}/medico/pacientes/${patientId}/antecedentes`);
    await otherPage.getByRole("button",{name:"Editar datos generales",exact:true}).click();
    const staleDialog=otherPage.getByRole("dialog");
    await present(staleDialog,"Antecedentes familiares","Antecedentes familiares 1","Diabetes familiar FE03");
    await staleDialog.getByRole("textbox",{name:"Motivo de actualización",exact:true}).fill("Actualización concurrente FE03");
    await page.getByRole("button",{name:"Editar datos generales",exact:true}).click();dialog=page.getByRole("dialog");
    await present(dialog,"Medicamentos actuales","Medicamentos actuales 1","Medicación FE03");
    await dialog.getByRole("button",{name:"Guardar datos generales",exact:true}).click();await page.getByText("Antecedentes guardados. Versión 2.",{exact:true}).waitFor();
    await staleDialog.getByRole("button",{name:"Guardar datos generales",exact:true}).click();
    await staleDialog.getByRole("alert").filter({hasText:"otro profesional"}).waitFor();
    assert.equal(await staleDialog.getByRole("textbox",{name:"Antecedentes familiares 1",exact:true}).inputValue(),"Diabetes familiar FE03");
    assert.equal((await api(doctor,endpoint)).data.current.versionNo,2);
    await staleDialog.getByRole("button",{name:"Consultar versión vigente",exact:true}).click();
    await staleDialog.getByText("Versión vigente: 2",{exact:true}).waitFor();
    await present(staleDialog,"Medicamentos actuales","Medicamentos actuales 1","Medicación FE03");
    await staleDialog.getByRole("button",{name:"Usar versión vigente como base",exact:true}).click();
    await staleDialog.getByRole("button",{name:"Guardar datos generales",exact:true}).click();
    await otherPage.getByText("Antecedentes guardados. Versión 3.",{exact:true}).waitFor();
    await otherPage.reload();await otherPage.getByText("Diabetes familiar FE03",{exact:true}).waitFor();
    results.push("Real 409 keeps the full draft; comparison and explicit rebase preserve manually merged concurrent changes");

    let specialty=(await api(admin,"/api/v1/catalogs/SPECIALTY")).data.find(s=>s.code==="FE03_TEST");
    if(!specialty)specialty=(await api(admin,"/api/v1/admin/catalogs/SPECIALTY","POST",{code:"FE03_TEST",name:"Especialidad FE03",active:true})).data;
    await api(admin,"/api/v1/admin/staff/specialties","POST",{staffMemberId:specialist.staffId,specialtyId:specialty.id,activeFrom:"2026-01-01"});
    await assign(patientId,await publish(specialist.context,76,specialty.id),specialty.id);
    const specialistPage=await specialist.context.newPage();await specialistPage.goto(`${origin}/medico/pacientes/${patientId}/antecedentes`);
    await specialistPage.getByText("Diabetes familiar FE03",{exact:true}).waitFor();
    await specialistPage.getByRole("button",{name:"Editar datos generales",exact:true}).click();
    const sd=specialistPage.getByRole("dialog");await sd.getByRole("combobox",{name:/Actividad física/}).selectOption("YES");
    await sd.getByRole("textbox",{name:"Motivo de actualización",exact:true}).fill("Revisión del especialista FE03");
    await sd.getByRole("button",{name:"Guardar datos generales",exact:true}).click();
    await specialistPage.getByText("Antecedentes guardados. Versión 4.",{exact:true}).waitFor();
    stored=(await api(doctor,endpoint)).data;assert.equal(stored.current.versionNo,4);assert.equal(stored.current.data.habitos.actividadFisica,"SI");
    await page.reload();await page.getByText("Revisión del especialista FE03",{exact:true}).waitFor();
    await page.screenshot({path:`${artifacts}/antecedentes.png`,fullPage:true});
    results.push("Assigned specialist reads and updates the same global background; review sees version 4 after reload");
    await api(outsider,endpoint,"GET",undefined,404);
    await api(outsider,endpoint,"PATCH",{data:stored.current.data,expectedVersion:4,changeReason:"Ajeno"},404);
    await api(admin,endpoint,"GET",undefined,403);
    await api(doctor,endpoint,"PATCH",{data:stored.current.data,expectedVersion:4,changeReason:""},400);
    const foreignPage=await outsider.newPage();await foreignPage.goto(`${origin}/medico/pacientes/${patientId}/antecedentes`);
    await foreignPage.locator('p[role="alert"]').waitFor();assert(!(await foreignPage.locator("body").innerText()).includes("Penicilina FE03"));
    assert.equal((await api(doctor,endpoint)).data.current.versionNo,4);
    results.push("Foreign actor gets 404 without clinical content; administrator gets 403; invalid reason writes nothing");

    // Prepare a closed synthetic encounter directly through Spring; FE-12 routing is a later increment.
    const backend=new URL(origin);backend.port="8080";
    await api(doctor,`${backend.origin}/api/medical/encounters/${encounterId}/finalize`,"POST",{
      chiefComplaint:"Prueba sintética de snapshot FE03",assessment:"Cierre para comprobar antecedentes inmutables",
      bloodChemistryStatus:"NOT_PRESENTED",reviewHistory:{schemaVersion:1,personalHistory:{},habits:{},vitals:{},physicalExam:{},laboratory:{},conduct:{}}
    });
    cleanup.splice(cleanup.indexOf(appointmentId),1);
    const snapshot=(await api(doctor,`${endpoint}?encounterId=${encounterId}`)).data.encounter;
    assert.equal(snapshot.versionNo,2);
    await api(doctor,endpoint,"PATCH",{data:stored.current.data,expectedVersion:4,changeReason:"Actualización global tras cierre"});
    const closed=(await api(doctor,`${endpoint}?encounterId=${encounterId}`)).data;
    assert.equal(closed.current.versionNo,5);assert.deepEqual(closed.encounter,snapshot);
    await page.reload();
    await page.getByText("Antecedentes asociados a esta atención en modo de consulta.",{exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"Editar datos generales",exact:true}).count(),0);
    await api(doctor,endpoint,"PATCH",{data:closed.current.data,expectedVersion:5,changeReason:"No reescribir cerrada",encounterId},409);
    assert.equal((await api(doctor,endpoint)).data.current.versionNo,5);
    results.push("Real closed encounter keeps snapshot version 2 after global version 5; screen is read-only and server rejects rebinding with 409");
    assert(!traffic.some(r=>/supabase\.(co|com)/.test(r.url)));
    writeFileSync(`${artifacts}/resultado.json`,JSON.stringify({status:"PASS",results,patientId,appointmentId,encounterId,version:5,traffic},null,2));
    console.log(JSON.stringify({status:"PASS",results,patientId,encounterId,artifacts},null,2));
  } catch(error) {
    for(const [i,context]of browser.contexts().entries()) for(const [j,page]of context.pages().entries()) {
      await page.screenshot({path:`${artifacts}/fallo-${i}-${j}.png`,fullPage:true}).catch(()=>{});
      writeFileSync(`${artifacts}/fallo-${i}-${j}.txt`,await page.locator("body").innerText().catch(()=>"No disponible"));
    }
    throw error;
  } finally {
    for(const id of cleanup)try{await api(admin,`/api/appointments/${id}/no-show`,"POST",{reason:"Fin de prueba FE03"});}catch{}
    await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
