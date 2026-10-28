import { segundoFactor } from "./lib/segundo-factor.mjs";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const { chromium }=await import(process.env.FE10_PLAYWRIGHT||"playwright");
const origin=process.env.FE10_ORIGIN||"http://127.0.0.1:3000";
const artifacts=process.env.FE10_ARTIFACTS||"/tmp/salud-u-fe10-evidence";
const password=process.env.FE10_PASSWORD||"SaludDemo2026!";
async function run(){
  assert(["127.0.0.1","localhost"].includes(new URL(origin).hostname));mkdirSync(artifacts,{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.FE10_CHROMIUM?{executablePath:process.env.FE10_CHROMIUM}:{})});
  const traffic=[],results=[],encounters=[],cleanup=[];let admin;
  async function api(context,path,method="GET",data,expected=200){
    const headers={};if(method!=="GET"){const csrf=(await(await context.request.get(`${origin}/api/v1/security/csrf`)).json()).data;headers[csrf.headerName]=csrf.token;}
    const response=await context.request.fetch(`${origin}${path}`,{method,data,headers});const body=await response.json();assert.equal(response.status(),expected,`${method} ${path}: ${JSON.stringify(body)}`);return body;
  }
  async function signIn(context,email){await segundoFactor(context, origin, {email,password}, await api(context, "/api/v1/auth/login", "POST", {email,password}));}
  async function login(email){const context=await browser.newContext({locale:"es-BO",timezoneId:"America/La_Paz",viewport:{width:1366,height:1000}});await signIn(context,email);context.on("request",r=>traffic.push({method:r.method(),url:r.url()}));return context;}
  try{
    admin=await login(process.env.FE10_ADMIN||"admin.demo@salud-universitaria.test");
    const doctorEmail=process.env.FE10_DOCTOR||"revision.ana.demo@salud-universitaria.test";
    const doctor=await login(doctorEmail);
    const outsider=await login(process.env.FE10_OUTSIDER||"fe09.ajeno@salud-universitaria.test");
    const student=await login(process.env.FE10_STUDENT||"estudiante.ana.demo@salud-universitaria.test");
    const career=(await api(admin,"/api/careers")).data[0];const seed=Date.now();
    const patientId=(await api(admin,"/api/patients","POST",{fullName:`Paciente revisión FE10 ${seed}`,carnet:`FE10-${seed}`,registrationCode:`REG-FE10-${seed}`,birthDate:"2002-01-15",careerId:career.id,academicPeriod:"2026-II",enrollmentStart:"2026-01-01"},201)).data.id;
    async function fixture(day){
      let starts=Date.now()+day*86400000;const slots=(await api(admin,"/api/availability-slots")).data;
      while(slots.some(s=>starts<Date.parse(s.endsAt)&&starts+1800000>Date.parse(s.startsAt)))starts+=3600000;
      const slotId=(await api(doctor,"/api/availability-slots","POST",{startsAt:new Date(starts).toISOString(),endsAt:new Date(starts+1800000).toISOString(),capacity:1},201)).data.id;
      const requestId=(await api(admin,"/api/appointment-requests","POST",{patientId},201)).data.id;
      const appointmentId=(await api(admin,`/api/appointment-requests/${requestId}/assign`,"POST",{slotId})).data.appointmentId;cleanup.push(appointmentId);
      const encounterId=(await api(doctor,`/api/medical/appointments/${appointmentId}/start`,"POST",undefined,201)).data.encounterId;const item={appointmentId,encounterId};encounters.push(item);return item;
    }
    const page=await doctor.newPage();page.on("dialog",dialog=>dialog.accept());
    async function open(item){await page.goto(`${origin}/medico/citas/${item.appointmentId}`);await page.getByRole("button",{name:"Recuperar borrador",exact:true}).click();await page.getByRole("link",{name:"Completar ficha",exact:true}).click();await page.getByRole("textbox",{name:/^Motivo de consulta/}).waitFor();}
    async function fill(){
      await page.getByRole("textbox",{name:/^Motivo de consulta/}).fill("Control integral FE10");
      await page.getByRole("textbox",{name:/^Evaluación clínica/}).fill("Evaluación estable FE10");
      await page.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).fill("Diagnóstico de revisión FE10");
      for(const [name,value]of [["PA sistólica","120"],["PA diastólica","80"],["FC","70"],["FR","18"],["Temperatura","36.7"],["SpO₂","98"],["Peso","70.5"],["Talla","1.70"]])await page.getByRole("spinbutton",{name:new RegExp(`^${name}`)}).fill(value);
      await page.getByRole("textbox",{name:"Estado general",exact:true}).fill("Buen estado general FE10");
      await page.getByRole("textbox",{name:"Hemograma",exact:true}).fill("Normal FE10");
      await page.getByRole("textbox",{name:"Observaciones e indicaciones",exact:true}).fill(" Hidratación y seguimiento FE10 ");
      await page.getByRole("checkbox",{name:"Control médico",exact:true}).check();
    }
    const first=await fixture(90);await open(first);await fill();
    const endpoint=`/api/medical/encounters/${first.encounterId}`;
    await page.getByRole("button",{name:"Cerrar atención",exact:true}).click();
    await page.locator('p[role="alert"]').filter({hasText:"antecedentes globales"}).waitFor();
    assert.equal(await page.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).inputValue(),"Diagnóstico de revisión FE10");
    assert.equal((await api(doctor,endpoint)).data.encounter.status,"DRAFT");
    await page.getByRole("button",{name:"Completar datos",exact:true}).click();const dialog=page.getByRole("dialog");
    await dialog.getByRole("group",{name:"Alergias",exact:true}).getByRole("radio",{name:"Sí",exact:true}).check();
    await dialog.getByRole("textbox",{name:"Alergias 1",exact:true}).fill("Penicilina FE10");
    await dialog.getByRole("combobox",{name:/Alimentación/}).selectOption("REGULAR");
    await dialog.getByRole("button",{name:"Guardar datos generales",exact:true}).click();await dialog.waitFor({state:"detached"});
    const invalid={chiefComplaint:"Control",assessment:"Estable",reviewHistory:{vitals:{height:"1.70",weight:"70.5"}},bloodChemistryStatus:"ATTACHED"};
    await api(doctor,`${endpoint}/finalize`,"POST",invalid,409);
    const untouched=(await api(doctor,endpoint)).data;assert.equal(untouched.encounter.reviewHistory,null);assert.equal(untouched.measurements.length,0);
    await api(outsider,endpoint,"GET",undefined,404);await api(outsider,`${endpoint}/finalize`,"POST",invalid,404);
    await api(student,`${endpoint}/finalize`,"POST",invalid,403);
    await page.route(`**${endpoint}/finalize`,route=>route.abort("failed"),{times:1});
    await page.getByRole("button",{name:"Cerrar atención",exact:true}).click();
    await page.locator('p[role="alert"]').filter({hasText:"Conservamos lo que escribiste"}).waitFor();
    assert.equal(await page.getByRole("spinbutton",{name:/^Peso/}).inputValue(),"70.5");
    assert.equal(await page.getByRole("textbox",{name:/^Motivo de consulta/}).inputValue(),"Control integral FE10");
    results.push("Required background and unavailable ATTACHED document reject without partial writes; network error preserves the full clinical draft");
    const response=page.waitForResponse(r=>r.url().endsWith(`${endpoint}/finalize`));
    await page.getByRole("button",{name:"Cerrar atención",exact:true}).focus();await page.keyboard.press("Enter");
    const completed=await response;assert.equal(completed.status(),200);const contract=(await completed.json()).data;
    const sent=completed.request().postDataJSON().reviewHistory;
    assert.equal(sent.signosVitales.talla,"1.70");assert.equal(sent.antecedentesPersonales.alergicos,"Penicilina FE10");
    assert(!Object.hasOwn(sent,"vitals"));assert(!Object.hasOwn(sent,"personalHistory"));
    assert.equal(contract.encounterId,first.encounterId);assert.equal(contract.referralId,null);assert.equal(contract.reviewHistoryVersion,1);
    await page.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();cleanup.splice(cleanup.indexOf(first.appointmentId),1);
    await page.reload();await page.getByText("Diagnóstico de revisión FE10",{exact:true}).waitFor();
    const persisted=(await api(doctor,endpoint)).data;
    assert.equal(persisted.appointment.status,"ATTENDED");assert.equal(persisted.encounter.reviewHistory.antecedentesPersonales.alergicos,"Penicilina FE10");
    assert.equal(persisted.encounter.reviewHistory.habitos.alimentacion,"REGULAR");assert.equal(persisted.encounter.reviewHistory.signosVitales.temperatura,36.7);
    assert.equal(persisted.encounter.reviewHistory.laboratorio.grupoSanguineo,null);
    assert.equal(persisted.encounter.instructions,"Hidratación y seguimiento FE10");assert.equal(persisted.encounter.followUpText,"Control médico");
    assert.equal(persisted.diagnoses.length,1);assert.equal(persisted.measurements.length,9);
    assert.equal(persisted.measurements.find(m=>m.code==="TALLA").value,170);assert.equal(persisted.measurements.find(m=>m.code==="IMC").value,24.39);
    assert.equal(await page.getByRole("button",{name:"Cerrar atención",exact:true}).count(),0);
    const hash=createHash("sha256").update(JSON.stringify(persisted.encounter.reviewHistory)).digest("hex");
    await api(doctor,`${endpoint}/finalize`,"POST",{...invalid,bloodChemistryStatus:"PENDING"},409);
    assert.equal(createHash("sha256").update(JSON.stringify((await api(doctor,endpoint)).data.encounter.reviewHistory)).digest("hex"),hash);
    await page.screenshot({path:`${artifacts}/ficha-cerrada.png`,fullPage:true});
    results.push("Keyboard close persists structured fields, preloaded background, diagnosis, nine measurements, correct cm/BMI, instructions and exact RPC response; reload is read-only and duplicate close cannot rewrite");
    const second=await fixture(91);await open(second);await fill();let committed;
    await page.route(`**/api/medical/encounters/${second.encounterId}/finalize`,async route=>{const r=await route.fetch();assert.equal(r.status(),200);committed=(await r.json()).data;await route.abort("failed");},{times:1});
    await page.getByRole("button",{name:"Cerrar atención",exact:true}).click();
    await page.locator('p[role="alert"]').filter({hasText:"Conservamos lo que escribiste"}).waitFor();
    assert.equal(committed.reviewHistoryVersion,2);
    await page.getByRole("button",{name:"Comprobar estado de la atención",exact:true}).click();
    await page.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();cleanup.splice(cleanup.indexOf(second.appointmentId),1);
    results.push("Lost response after commit recovers CLOSED without resending; the second encounter receives longitudinal review version 2");
    const third=await fixture(92);await open(third);await fill();
    await doctor.clearCookies({name:"SALUD_U_SESSION"});
    await page.getByRole("button",{name:"Cerrar atención",exact:true}).click();
    await page.getByRole("link",{name:"Iniciar sesión en otra pestaña y volver a esta ficha",exact:true}).waitFor();
    assert.equal(await page.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).inputValue(),"Diagnóstico de revisión FE10");
    await signIn(doctor,doctorEmail);
    await api(admin,`/api/appointments/${third.appointmentId}/no-show`,"POST",{reason:"Cambio concurrente FE10"});cleanup.splice(cleanup.indexOf(third.appointmentId),1);
    await page.getByRole("button",{name:"Cerrar atención",exact:true}).click();
    await page.locator('p[role="alert"]').filter({hasText:"ya no puede marcarse como atendida"}).waitFor();
    const rolledBack=(await api(doctor,`/api/medical/encounters/${third.encounterId}`)).data;
    assert.equal(rolledBack.encounter.status,"DRAFT");assert.equal(rolledBack.encounter.reviewHistory,null);assert.deepEqual(rolledBack.diagnoses,[]);assert.deepEqual(rolledBack.measurements,[]);
    results.push("Session expiration keeps fields while reauthenticating; invalid concurrent appointment state rolls back history, diagnosis and measurements");
    page.removeAllListeners("dialog");
    const warning=page.waitForEvent("dialog");const previousUrl=page.url();
    const navigation=page.getByRole("link",{name:/Volver a la cita/}).click();
    const prompt=await warning;assert.equal(prompt.type(),"confirm");await prompt.dismiss();await navigation;
    assert.equal(page.url(),previousUrl);assert.equal(await page.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).inputValue(),"Diagnóstico de revisión FE10");
    results.push("Cancelling the navigation warning keeps the unsaved clinical draft, including internal Next links");
    const foreignPage=await outsider.newPage();await foreignPage.goto(`${origin}/medico/citas/${first.appointmentId}?ficha=1`);await foreignPage.locator('p[role="alert"]').waitFor();assert(!(await foreignPage.locator("body").innerText()).includes("Diagnóstico de revisión FE10"));
    assert(!traffic.some(r=>/supabase\.(co|com)|\/api\/medical\/patients\/[^/]+$/.test(r.url)));
    writeFileSync(`${artifacts}/resultado.json`,JSON.stringify({status:"PASS",results,patientId,encounters,traffic},null,2));console.log(JSON.stringify({status:"PASS",results,patientId,encounters,artifacts},null,2));
  }catch(error){for(const[i,context]of browser.contexts().entries())for(const[j,page]of context.pages().entries()){await page.screenshot({path:`${artifacts}/fallo-${i}-${j}.png`,fullPage:true}).catch(()=>{});writeFileSync(`${artifacts}/fallo-${i}-${j}.txt`,await page.locator("body").innerText().catch(()=>"No disponible"));}throw error;
  }finally{for(const id of cleanup)try{await api(admin,`/api/appointments/${id}/no-show`,"POST",{reason:"Fin prueba FE10"});}catch{/* Preserve synthetic history. */}await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
