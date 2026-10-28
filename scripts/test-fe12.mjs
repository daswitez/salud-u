import { segundoFactor } from "./lib/segundo-factor.mjs";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const { chromium }=await import(process.env.FE12_PLAYWRIGHT||"playwright");
const origin=process.env.FE12_ORIGIN||"http://127.0.0.1:3000";
const artifacts=process.env.FE12_ARTIFACTS||"/tmp/salud-u-fe12-evidence";
const password=process.env.FE12_PASSWORD||"SaludDemo2026!";
const checksum=data=>createHash("sha256").update(JSON.stringify({encounter:data.encounter,background:data.clinicalBackground.encounter,diagnoses:data.diagnoses,measurements:data.measurements})).digest("hex");
async function run(){
  assert(["127.0.0.1","localhost"].includes(new URL(origin).hostname));mkdirSync(artifacts,{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.FE12_CHROMIUM?{executablePath:process.env.FE12_CHROMIUM}:{})});
  const results=[],traffic=[],encounters=[],cleanup=[];let admin;
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
  async function api(context,path,method="GET",data,expected=200){
    const headers={};if(method!=="GET"){const csrf=(await(await context.request.get(origin+"/api/v1/security/csrf")).json()).data;headers[csrf.headerName]=csrf.token;}
    const response=await context.request.fetch(origin+path,{method,data,headers});const body=response.status()===204?null:await response.json();assert.equal(response.status(),expected,method+" "+path+" "+JSON.stringify(body));return body;
  }
  async function signIn(context,email){await segundoFactor(context, origin, {email,password}, await api(context, "/api/v1/auth/login", "POST", {email,password}));}
  async function login(email){const context=await browser.newContext({locale:"es-BO",timezoneId:"America/La_Paz",viewport:{width:1366,height:1000}});await signIn(context,email);context.on("request",r=>{const url=new URL(r.url());if(url.searchParams.has("token"))url.searchParams.set("token","REDACTED");traffic.push({method:r.method(),url:url.href});});return context;}
  try{
    admin=await login("admin.demo@salud-universitaria.test");const doctor=await login("revision.ana.demo@salud-universitaria.test");const outsider=await login("fe09.ajeno@salud-universitaria.test");const student=await login("estudiante.ana.demo@salud-universitaria.test");
    const seed=Date.now();const fullName="Paciente cierre FE12 "+seed;const career=(await api(admin,"/api/careers")).data[0];
    const patientId=(await api(admin,"/api/patients","POST",{fullName,carnet:"FE12-"+seed,registrationCode:"REG-FE12-"+seed,birthDate:"2002-01-15",careerId:career.id,academicPeriod:"2026-II",enrollmentStart:"2026-01-01"},201)).data.id;
    async function fixture(){
      let starts=Date.now()+130*86400000;const slots=(await api(admin,"/api/availability-slots")).data;while(slots.some(s=>starts<Date.parse(s.endsAt)&&starts+1800000>Date.parse(s.startsAt)))starts+=3600000;
      const slotId=await publishSlot(doctor,starts);
      const requestId=(await api(admin,"/api/appointment-requests","POST",{patientId},201)).data.id;
      const appointmentId=(await api(admin,"/api/appointment-requests/"+requestId+"/assign","POST",{slotId})).data.appointmentId;cleanup.push(appointmentId);
      const encounterId=(await api(doctor,"/api/medical/appointments/"+appointmentId+"/start","POST",undefined,201)).data.encounterId;const item={appointmentId,encounterId};encounters.push(item);return item;
    }
    async function open(item){const page=await doctor.newPage();page.on("dialog",d=>d.accept());await page.goto(origin+"/medico/citas/"+item.appointmentId+"?ficha=1");await page.getByRole("textbox",{name:/^Motivo de consulta/}).waitFor();return page;}
    async function fill(page,diagnosis){
      await page.getByRole("textbox",{name:/^Motivo de consulta/}).fill(" Control de cierre FE12 ");await page.getByRole("textbox",{name:/^Evaluación clínica/}).fill(" Evaluación FE12 ");
      await page.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).fill(diagnosis);await page.getByRole("textbox",{name:"Observaciones e indicaciones",exact:true}).fill("Indicaciones FE12");
      for(const [name,value]of [["PA sistólica","120"],["PA diastólica","80"],["FC","72"],["FR","18"],["Temperatura","36.5"],["SpO₂","98"],["Peso","70"],["Talla","1.75"]])await page.getByRole("spinbutton",{name:new RegExp("^"+name)}).fill(value);
      await page.getByRole("combobox",{name:"Química sanguínea",exact:true}).selectOption("PENDING");
    }
    async function submit(page,item,expected){const response=page.waitForResponse(r=>r.url().endsWith("/"+item.encounterId+"/finalize"));await page.getByRole("button",{name:"Cerrar atención",exact:true}).click();const r=await response;assert.equal(r.status(),expected);return r;}
    function retainClosed(item){cleanup.splice(cleanup.indexOf(item.appointmentId),1);}
    const first=await fixture();const bg={versionEsquema:1,alergias:{estado:"DESCONOCIDO",elementos:[]},enfermedadesPersonales:{estado:"DESCONOCIDO",elementos:[]},cirugias:{estado:"DESCONOCIDO",elementos:[]},medicamentos:{estado:"DESCONOCIDO",elementos:[]},antecedentesFamiliares:{estado:"DESCONOCIDO",elementos:[]},habitos:{}};
    await api(doctor,"/api/medical/patients/"+patientId+"/clinical-background","PATCH",{data:bg,expectedVersion:0,changeReason:"Preparación cierre FE12",encounterId:first.encounterId});
    const page=await open(first);const chief=page.getByRole("textbox",{name:/^Motivo de consulta/});const assessment=page.getByRole("textbox",{name:/^Evaluación clínica/});
    let requests=0;page.on("request",r=>{if(r.url().endsWith("/"+first.encounterId+"/finalize"))requests++;});
    await page.getByRole("button",{name:"Cerrar atención",exact:true}).click();assert(await chief.evaluate(el=>document.activeElement===el));assert.equal(requests,0);
    await chief.fill("Control FE12");await page.getByRole("button",{name:"Cerrar atención",exact:true}).click();assert(await assessment.evaluate(el=>document.activeElement===el));assert.equal(requests,0);
    await fill(page,"Diagnóstico inmutable FE12");await assessment.fill(" ");await submit(page,first,400);
    assert.equal(await assessment.inputValue()," ");assert.equal(await chief.inputValue()," Control de cierre FE12 ");assert((await page.evaluate(()=>document.activeElement.textContent)).includes("obligatorios"));
    await assessment.fill(" Evaluación FE12 ");const blood=page.getByRole("combobox",{name:"Química sanguínea",exact:true});await blood.locator('option[value="ATTACHED"]').evaluate(option=>option.disabled=false);await blood.selectOption("ATTACHED");await submit(page,first,409);
    assert.equal((await api(doctor,"/api/medical/encounters/"+first.encounterId)).data.encounter.reviewHistory,null);
    assert.equal(await page.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).inputValue(),"Diagnóstico inmutable FE12");
    results.push("Native required-field validation, server whitespace 400 and unavailable ATTACHED 409 retain the clinical draft, focus errors and do not persist a partial record");
    const uploader=page.getByRole("region",{name:"Adjuntar documento",exact:true});await uploader.getByLabel("Tipo de documento",{exact:true}).selectOption("BLOOD_CHEMISTRY");await uploader.getByLabel("Archivo clínico",{exact:true}).setInputFiles({name:"quimica-fe12.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.7\nPrueba sintética FE12")});
    await uploader.getByRole("button",{name:"Subir archivo",exact:true}).click();await page.getByRole("heading",{name:"quimica-fe12.pdf",exact:true}).waitFor();await blood.selectOption("ATTACHED");
    requests=0;let release;const held=new Promise(resolve=>release=resolve);await page.route("**/"+first.encounterId+"/finalize",async route=>{await held;await route.continue();},{times:1});
    const closeResponse=page.waitForResponse(r=>r.url().endsWith("/"+first.encounterId+"/finalize"));
    await page.locator("form").evaluate(form=>{form.requestSubmit();form.requestSubmit();});await page.getByRole("button",{name:"Guardando…",exact:true}).waitFor();assert(await page.getByRole("button",{name:"Guardando…",exact:true}).isDisabled());await page.waitForTimeout(100);assert.equal(requests,1);release();
    const completed=await closeResponse;assert.equal(completed.status(),200);assert.deepEqual(await completed.json(),{ok:true,data:{encounterId:first.encounterId,referralId:null,reviewHistoryVersion:1}});
    await page.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();retainClosed(first);await page.getByText("Atendida",{exact:true}).waitFor();
    const stored=(await api(doctor,"/api/medical/encounters/"+first.encounterId)).data;assert.equal(stored.appointment.status,"ATTENDED");assert.equal(stored.encounter.bloodChemistryStatus,"ATTACHED");assert.equal(stored.encounter.reviewHistoryVersion,1);assert.equal(stored.diagnoses.length,1);assert.equal(stored.measurements.length,9);
    const originalChecksum=checksum(stored);assert.equal(await page.getByRole("textbox",{name:/^Motivo de consulta/}).count(),0);assert.equal(await page.getByRole("button",{name:"Cerrar atención",exact:true}).count(),0);
    await page.reload();await page.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();await page.getByText("Atendida",{exact:true}).waitFor();await page.getByText("Diagnóstico inmutable FE12",{exact:true}).waitFor();
    await page.getByRole("link",{name:"Ver atenciones realizadas",exact:true}).click();await page.getByRole("heading",{name:"Atenciones realizadas",exact:true}).waitFor();await page.getByRole("textbox",{name:"Buscar",exact:true}).fill(fullName);await page.getByRole("link",{name:"Ver atención completa",exact:true}).click();await page.getByText("Atendida",{exact:true}).waitFor();await page.getByRole("link",{name:"Consultar atención",exact:true}).click();await page.getByText("Diagnóstico inmutable FE12",{exact:true}).waitFor();
    await api(doctor,"/api/medical/encounters/"+first.encounterId+"/finalize","POST",{chiefComplaint:"Reescritura",assessment:"Prohibida"},409);assert.equal(checksum((await api(doctor,"/api/medical/encounters/"+first.encounterId)).data),originalChecksum);
    await page.screenshot({path:artifacts+"/cierre-confirmado.png",fullPage:true});
    results.push("Single-form duplicate submit sends one POST; exact RPC response, ATTACHED document, version/diagnosis/measurements, ATTENDED reload and agenda navigation verified; closed record cannot be rewritten");
    const raced=await fixture();const a=await open(raced),b=await open(raced);await fill(a,"Diagnóstico pestaña A");await fill(b,"Diagnóstico pestaña B");
    let arrived=0,releaseRace;const barrier=new Promise(resolve=>releaseRace=resolve);
    for(const tab of [a,b])await tab.route("**/"+raced.encounterId+"/finalize",async route=>{arrived++;if(arrived===2)releaseRace();await barrier;await route.continue();},{times:1});
    const responses=[a,b].map(tab=>tab.waitForResponse(r=>r.url().endsWith("/"+raced.encounterId+"/finalize")));
    await Promise.all([a,b].map(tab=>tab.getByRole("button",{name:"Cerrar atención",exact:true}).click()));const raceResults=await Promise.all(responses);assert.deepEqual(raceResults.map(r=>r.status()).sort(),[200,409]);retainClosed(raced);
    const winner=raceResults[0].status()===200?a:b,loser=winner===a?b:a;const loserDiagnosis=loser===a?"Diagnóstico pestaña A":"Diagnóstico pestaña B";
    await winner.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();await loser.locator('p[role="alert"]').filter({hasText:"no puede modificarse"}).waitFor();assert.equal(await loser.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).inputValue(),loserDiagnosis);
    const raceStored=(await api(doctor,"/api/medical/encounters/"+raced.encounterId)).data;assert.equal(raceStored.encounter.reviewHistoryVersion,2);assert.equal(raceStored.diagnoses.length,1);assert.notEqual(raceStored.diagnoses[0].label,loserDiagnosis);
    await loser.getByRole("button",{name:"Comprobar estado de la atención",exact:true}).click();await loser.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();await loser.getByText(raceStored.diagnoses[0].label,{exact:true}).waitFor();
    results.push("Two real tabs race to close: one 200 and one 409, one persisted version/diagnosis; losing tab keeps its fields until explicit state recovery displays the winning immutable record");
    const late=await fixture();const latePage=await open(late);await fill(latePage,"No debe persistir");await api(admin,"/api/appointments/"+late.appointmentId+"/no-show","POST",{reason:"Cambio concurrente FE12"});
    await submit(latePage,late,409);assert.equal(await latePage.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).inputValue(),"No debe persistir");
    const reverted=(await api(doctor,"/api/medical/encounters/"+late.encounterId)).data;assert.equal(reverted.encounter.status,"DRAFT");assert.equal(reverted.encounter.reviewHistory,null);assert.equal(reverted.appointment.status,"NO_SHOW");assert.deepEqual(reverted.diagnoses,[]);assert.deepEqual(reverted.measurements,[]);
    await latePage.getByRole("button",{name:"Comprobar estado de la atención",exact:true}).click();await latePage.getByText("Inasistencia",{exact:true}).waitFor();assert.equal(await latePage.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).inputValue(),"No debe persistir");
    results.push("Late appointment-state conflict rolls back clinical record, version, diagnosis and measurements; UI keeps fields and refreshes actual NO_SHOW state without announcing success");
    const uncertain=await fixture();const uncertainPage=await open(uncertain);await fill(uncertainPage,"Confirmación posterior FE12");let posted=false;
    await uncertainPage.route("**/"+uncertain.encounterId+"/finalize",async route=>{const response=await route.fetch();assert.equal(response.status(),200);posted=true;await route.fulfill({response});},{times:1});
    await uncertainPage.route("**/api/medical/encounters/"+uncertain.encounterId,async route=>{if(!posted)return route.continue();const response=await route.fetch();const payload=await response.json();payload.data.appointment.status="SCHEDULED";await route.fulfill({response,json:payload});await uncertainPage.unroute("**/api/medical/encounters/"+uncertain.encounterId);});
    await submit(uncertainPage,uncertain,200);retainClosed(uncertain);await uncertainPage.locator('p[role="alert"]').filter({hasText:"No pudimos confirmar"}).waitFor();assert.equal(await uncertainPage.getByRole("heading",{name:"Atención cerrada",exact:true}).count(),0);assert.equal(await uncertainPage.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).inputValue(),"Confirmación posterior FE12");
    await uncertainPage.getByRole("button",{name:"Comprobar estado de la atención",exact:true}).click();await uncertainPage.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();await uncertainPage.getByText("Atendida",{exact:true}).waitFor();assert.equal((await api(doctor,"/api/medical/encounters/"+uncertain.encounterId)).data.encounter.reviewHistoryVersion,3);
    results.push("A 200 POST followed by inconsistent confirmation does not announce success or clear the draft; fresh state check recovers the committed CLOSED/ATTENDED record without a second POST");
    const expired=await fixture();const expiredPage=await open(expired);await fill(expiredPage,"Sesión recuperada FE12");await api(doctor,"/api/v1/session/logout","POST",undefined,204);await submit(expiredPage,expired,401);
    await expiredPage.getByRole("link",{name:"Iniciar sesión en otra pestaña y volver a esta ficha",exact:true}).waitFor();assert.equal(await expiredPage.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).inputValue(),"Sesión recuperada FE12");await signIn(doctor,"revision.ana.demo@salud-universitaria.test");
    await submit(expiredPage,expired,200);retainClosed(expired);await expiredPage.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();assert.equal(await expiredPage.getByRole("link",{name:"Iniciar sesión en otra pestaña y volver a esta ficha",exact:true}).count(),0);
    await expiredPage.reload();await expiredPage.getByText("Atendida",{exact:true}).waitFor();assert.equal((await api(doctor,"/api/medical/encounters/"+expired.encounterId)).data.encounter.reviewHistoryVersion,4);
    await api(outsider,"/api/medical/encounters/"+first.encounterId,"GET",undefined,404);await api(outsider,"/api/medical/encounters/"+first.encounterId+"/finalize","POST",{chiefComplaint:"Ajeno",assessment:"Ajeno"},404);await api(student,"/api/medical/encounters/"+first.encounterId+"/finalize","POST",{chiefComplaint:"Ajeno",assessment:"Ajeno"},403);
    const foreignPage=await outsider.newPage();await foreignPage.goto(origin+"/medico/citas/"+first.appointmentId+"?ficha=1");await foreignPage.locator('p[role="alert"]').waitFor();assert(!(await foreignPage.locator("body").innerText()).includes("Diagnóstico inmutable FE12"));
    assert.equal(checksum((await api(doctor,"/api/medical/encounters/"+first.encounterId)).data),originalChecksum);assert(!traffic.some(t=>/supabase\.(co|com)/.test(t.url)));assert(!traffic.some(t=>/\/api\/medical\/patients\/[^/?]+$/.test(t.url)));
    results.push("Expired session/CSRF recovery preserves fields and closes after reauthentication; foreign doctor and student cannot read or finalize; original checksum stays intact and no Supabase is called");
    writeFileSync(artifacts+"/resultado.json",JSON.stringify({status:"PASS",results,patientId,encounters,originalChecksum,traffic},null,2));console.log(JSON.stringify({status:"PASS",results,patientId,encounters,artifacts},null,2));
  }catch(error){for(const[i,context]of browser.contexts().entries())for(const[j,page]of context.pages().entries()){await page.screenshot({path:artifacts+"/fallo-"+i+"-"+j+".png",fullPage:true}).catch(()=>{});writeFileSync(artifacts+"/fallo-"+i+"-"+j+".txt",await page.locator("body").innerText().catch(()=>""));}throw error;
  }finally{if(admin)for(const id of cleanup)try{await api(admin,"/api/appointments/"+id+"/no-show","POST",{reason:"Fin prueba FE12"});}catch{/* Preserve synthetic clinical history. */}await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
