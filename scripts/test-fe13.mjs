import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const { chromium }=await import(process.env.FE13_PLAYWRIGHT||"playwright");
const origin=process.env.FE13_ORIGIN||"http://127.0.0.1:3000";
const artifacts=process.env.FE13_ARTIFACTS||"/tmp/salud-u-fe13-evidence";
const password=process.env.FE13_PASSWORD||"SaludDemo2026!";
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=","base64");
async function run(){
  assert(["127.0.0.1","localhost"].includes(new URL(origin).hostname));mkdirSync(artifacts,{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.FE13_CHROMIUM?{executablePath:process.env.FE13_CHROMIUM}:{})});
  const results=[],traffic=[],encounters=[],referrals=[],cleanup=[];let admin,restoreSpecialty;
  const record=message=>{results.push(message);console.log("PASS "+message);};
  async function api(context,path,method="GET",data,expected=200){
    const headers={};if(method!=="GET"){const csrf=(await(await context.request.get(origin+"/api/v1/security/csrf")).json()).data;headers[csrf.headerName]=csrf.token;}
    const response=await context.request.fetch(origin+path,{method,data,headers});const body=response.status()===204?null:await response.json();assert.equal(response.status(),expected,method+" "+path+" "+JSON.stringify(body));return body;
  }
  async function signIn(context,email){await api(context,"/api/v1/auth/login","POST",{email,password});}
  async function login(email){const context=await browser.newContext({locale:"es-BO",timezoneId:"America/La_Paz",viewport:{width:1366,height:1000}});await signIn(context,email);context.on("request",r=>{const url=new URL(r.url());if(url.searchParams.has("token"))url.searchParams.set("token","REDACTED");traffic.push({method:r.method(),url:url.href});});return context;}
  async function attachment(context,patientId,item,name){
    const csrf=(await(await context.request.get(origin+"/api/v1/security/csrf")).json()).data;
    const response=await context.request.post(origin+"/api/medical/documents",{headers:{[csrf.headerName]:csrf.token},multipart:{patientId,encounterId:item.encounterId,documentType:"OTHER",file:{name,mimeType:"image/png",buffer:png}}});
    assert.equal(response.status(),201);return(await response.json()).data.id;
  }
  const labels={ROUTINE:"Rutinaria",PRIORITY:"Prioritaria",URGENT:"Urgente"};
  try{
    admin=await login("admin.demo@salud-universitaria.test");const doctor=await login("revision.ana.demo@salud-universitaria.test");const outsider=await login("fe09.ajeno@salud-universitaria.test");const student=await login("estudiante.ana.demo@salud-universitaria.test");const specialist=await login("fe09.especialista@salud-universitaria.test");
    const seed=Date.now(),email="fe13.vacio."+seed+"@salud-universitaria.test";
    const principal=(await api(admin,"/api/v1/admin/principals","POST",{email,displayName:"Revisión sin derivaciones FE13",password,roles:["REVIEW_DOCTOR"]},201)).data;
    await api(admin,"/api/v1/admin/staff","POST",{principalId:principal.id,staffCode:"FE13-"+seed,active:true});const emptyDoctor=await login(email);
    const emptyPage=await emptyDoctor.newPage();await emptyPage.goto(origin+"/medico/derivaciones");await emptyPage.getByText("No hay derivaciones emitidas por tu cuenta.",{exact:true}).waitFor();assert.deepEqual((await api(emptyDoctor,"/api/medical/referrals")).data,[]);
    const career=(await api(admin,"/api/careers")).data[0];
    async function patient(suffix){return(await api(admin,"/api/patients","POST",{fullName:"Paciente derivación FE13 "+suffix+" "+seed,carnet:"FE13-"+suffix+"-"+seed,registrationCode:"REG-FE13-"+suffix+"-"+seed,birthDate:"2002-01-15",careerId:career.id,academicPeriod:"2026-II",enrollmentStart:"2026-01-01"},201)).data.id;}
    const patientId=await patient("principal"),otherPatientId=await patient("otro");
    const specialty=(await api(admin,"/api/v1/admin/catalogs/SPECIALTY","POST",{code:"FE13_"+seed,name:"Especialidad FE13 "+seed,active:true})).data;
    async function fixture(pid=patientId){
      let starts=Date.now()+160*86400000;const slots=(await api(admin,"/api/availability-slots")).data;while(slots.some(s=>starts<Date.parse(s.endsAt)&&starts+1800000>Date.parse(s.startsAt)))starts+=3600000;
      const slotId=(await api(doctor,"/api/availability-slots","POST",{startsAt:new Date(starts).toISOString(),endsAt:new Date(starts+1800000).toISOString(),capacity:1},201)).data.id;
      const requestId=(await api(admin,"/api/appointment-requests","POST",{patientId:pid},201)).data.id;
      const appointmentId=(await api(admin,"/api/appointment-requests/"+requestId+"/assign","POST",{slotId})).data.appointmentId;cleanup.push(appointmentId);
      const encounterId=(await api(doctor,"/api/medical/appointments/"+appointmentId+"/start","POST",undefined,201)).data.encounterId;const item={appointmentId,encounterId,patientId:pid};encounters.push(item);return item;
    }
    const first=await fixture(),samePatientOther=await fixture(),foreignPatient=await fixture(otherPatientId);
    const excluded=[await attachment(doctor,patientId,samePatientOther,"otra-atencion.png"),await attachment(doctor,otherPatientId,foreignPatient,"otro-paciente.png")];
    const bg={versionEsquema:1,alergias:{estado:"DESCONOCIDO",elementos:[]},enfermedadesPersonales:{estado:"DESCONOCIDO",elementos:[]},cirugias:{estado:"DESCONOCIDO",elementos:[]},medicamentos:{estado:"DESCONOCIDO",elementos:[]},antecedentesFamiliares:{estado:"DESCONOCIDO",elementos:[]},habitos:{}};
    await api(doctor,"/api/medical/patients/"+patientId+"/clinical-background","PATCH",{data:bg,expectedVersion:0,changeReason:"Preparación derivación FE13",encounterId:first.encounterId});
    async function open(item){const page=await doctor.newPage();page.on("dialog",dialog=>dialog.accept());await page.goto(origin+"/medico/citas/"+item.appointmentId+"?ficha=1");await page.getByRole("textbox",{name:/^Motivo de consulta/}).waitFor();return page;}
    async function fill(page,priority,reason,diagnosis=""){
      await page.getByRole("textbox",{name:/^Motivo de consulta/}).fill("Contexto revisión FE13");
      await page.getByRole("textbox",{name:/^Evaluación clínica/}).fill("Evaluación origen FE13");await page.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).fill(diagnosis);
      await page.getByRole("checkbox",{name:"Derivación a especialidad",exact:true}).check();
      await page.getByRole("combobox",{name:/^Especialidad/}).selectOption(specialty.id);await page.getByRole("textbox",{name:/^Motivo de derivación/}).fill(reason);await page.getByRole("textbox",{name:/^Resumen para el especialista/}).fill("Resumen clínico FE13");await page.getByRole("combobox",{name:"Prioridad",exact:true}).selectOption(priority);
    }
    async function submit(page,item,expected,name="Cerrar y emitir derivación"){
      const response=page.waitForResponse(r=>r.url().endsWith("/"+item.encounterId+"/finalize")&&r.headers()["x-error-code"]!=="CSRF_INVALID");await page.getByRole("button",{name,exact:true}).focus();await page.keyboard.press("Enter");const result=await response;assert.equal(result.status(),expected);return result;
    }
    function kept(item){cleanup.splice(cleanup.indexOf(item.appointmentId),1);}
    async function detail(item){return(await api(doctor,"/api/medical/encounters/"+item.encounterId)).data;}
    const page=await doctor.newPage();page.on("dialog",dialog=>dialog.accept());await page.route("**/api/specialties",r=>r.abort("failed"),{times:1});await page.goto(origin+"/medico/citas/"+first.appointmentId+"?ficha=1");
    await page.getByRole("textbox",{name:/^Motivo de consulta/}).fill("Contexto revisión FE13");await page.getByRole("textbox",{name:/^Evaluación clínica/}).fill("Evaluación origen FE13");await page.getByRole("textbox",{name:"Diagnóstico principal",exact:true}).fill("Diagnóstico compartido FE13");
    await page.getByRole("checkbox",{name:"Derivación a especialidad",exact:true}).check();await page.locator('p[role="alert"]').filter({hasText:"especialidades"}).waitFor();
    let requests=0;page.on("request",r=>{if(r.url().endsWith("/"+first.encounterId+"/finalize"))requests++;});
    await page.getByRole("button",{name:"Cerrar y emitir derivación",exact:true}).click();assert.equal(requests,0);
    await page.getByRole("textbox",{name:/^Motivo de derivación/}).fill(" Motivo urgente FE13 ");await page.getByRole("textbox",{name:/^Resumen para el especialista/}).fill(" Resumen clínico FE13 ");await page.getByRole("combobox",{name:"Prioridad",exact:true}).selectOption("URGENT");
    await page.route("**/api/specialties",r=>r.fulfill({status:200,json:{ok:true,data:[]}}),{times:1});await page.getByRole("button",{name:"Actualizar especialidades",exact:true}).click();await page.getByText("No hay especialidades activas disponibles.",{exact:true}).waitFor();assert.equal(await page.getByRole("textbox",{name:/^Motivo de derivación/}).inputValue()," Motivo urgente FE13 ");
    await page.getByRole("button",{name:"Actualizar especialidades",exact:true}).click();await page.getByRole("combobox",{name:/^Especialidad/}).selectOption(specialty.id);
    await page.getByRole("textbox",{name:/^Resumen para el especialista/}).fill(" ");await submit(page,first,400);assert.equal(await page.getByRole("combobox",{name:"Prioridad",exact:true}).inputValue(),"URGENT");
    await page.getByRole("textbox",{name:/^Resumen para el especialista/}).fill(" Resumen clínico FE13 ");
    const priority=page.getByRole("combobox",{name:"Prioridad",exact:true});await priority.evaluate(select=>select.add(new Option("Inválida","INVALID")));await priority.selectOption("INVALID");await submit(page,first,400);await priority.selectOption("URGENT");
    await api(admin,"/api/v1/admin/catalogs/SPECIALTY","POST",{id:specialty.id,code:specialty.code,name:specialty.name,active:false});restoreSpecialty=specialty;
    await submit(page,first,409);assert.equal((await detail(first)).encounter.status,"DRAFT");assert.equal((await detail(first)).referral,null);
    await api(admin,"/api/v1/admin/catalogs/SPECIALTY","POST",{id:specialty.id,code:specialty.code,name:specialty.name,active:true});restoreSpecialty=null;
    const uploader=page.getByRole("region",{name:"Adjuntar documento",exact:true});await uploader.getByLabel("Archivo clínico",{exact:true}).setInputFiles({name:"compartido-fe13.png",mimeType:"image/png",buffer:png});await uploader.getByLabel("Tipo de documento",{exact:true}).selectOption("LAB_RESULT");await uploader.getByRole("button",{name:"Subir archivo",exact:true}).click();await page.getByRole("heading",{name:"compartido-fe13.png",exact:true}).waitFor();
    assert(!(await page.locator("body").innerText()).includes("otra-atencion.png"));assert(!(await page.locator("body").innerText()).includes("otro-paciente.png"));
    record("Empty own inbox, catalog network/empty/retry, native required fields, whitespace/priority 400 and deactivated specialty 409 preserve all clinical/referral fields without partial writes");
    await page.route("**/"+first.encounterId+"/finalize",r=>r.abort("failed"),{times:1});await page.getByRole("button",{name:"Cerrar y emitir derivación",exact:true}).click();await page.locator('p[role="alert"]').filter({hasText:"No pudimos confirmar"}).waitFor();assert.equal(await page.getByRole("textbox",{name:/^Motivo de derivación/}).inputValue()," Motivo urgente FE13 ");
    await page.getByRole("button",{name:"Comprobar estado de la atención",exact:true}).click();assert.equal((await detail(first)).referral,null);
    await api(doctor,"/api/v1/session/logout","POST",undefined,204);await submit(page,first,401);await page.getByRole("link",{name:"Iniciar sesión en otra pestaña y volver a esta ficha",exact:true}).waitFor();assert.equal(await priority.inputValue(),"URGENT");await signIn(doctor,"revision.ana.demo@salud-universitaria.test");
    let committed;const lostPattern="**/"+first.encounterId+"/finalize";
    await page.route(lostPattern,async route=>{const response=await route.fetch();if(response.status()===403&&response.headers()["x-error-code"]==="CSRF_INVALID")return route.fulfill({response});assert.equal(response.status(),200);committed=(await response.json()).data;await route.abort("failed");await page.unroute(lostPattern);});
    await page.getByRole("button",{name:"Cerrar y emitir derivación",exact:true}).click();await page.locator('p[role="alert"]').filter({hasText:"No pudimos confirmar"}).waitFor();const beforeRecovery=requests;
    await page.getByRole("button",{name:"Comprobar estado de la atención",exact:true}).click();await page.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();assert.equal(requests,beforeRecovery);kept(first);
    const firstStored=await detail(first);const emitted=firstStored.referral;referrals.push(emitted.id);assert.deepEqual(committed,{encounterId:first.encounterId,referralId:emitted.id,reviewHistoryVersion:1});assert.equal(firstStored.appointment.status,"ATTENDED");
    assert.equal(emitted.priority,"URGENT");assert.equal(emitted.reason,"Motivo urgente FE13");assert.equal(emitted.comment,"Resumen clínico FE13");assert.equal(emitted.source.status,"CLOSED");assert.equal(emitted.source.reviewHistoryVersion,1);assert.equal(emitted.source.followUpText,null);
    assert.equal(emitted.diagnoses.length,1);assert.equal(emitted.documents.length,1);assert(!excluded.includes(emitted.documents[0].id));assert.equal(emitted.documents[0].filename,"compartido-fe13.png");assert.equal(emitted.documents[0].description,null);
    const originalChecksum=createHash("sha256").update(JSON.stringify(emitted)).digest("hex");
    await page.reload();await page.getByRole("region",{name:"Derivación emitida",exact:true}).getByText("Urgente",{exact:true}).waitFor();await page.getByRole("link",{name:"Consultar derivación",exact:true}).click();await page.getByRole("heading",{name:"Contexto de revisión",exact:true}).waitFor();await page.getByText("Contexto revisión FE13",{exact:true}).waitFor();
    await page.getByRole("link",{name:"Ver documentos de origen",exact:true}).click();await page.getByRole("heading",{name:"compartido-fe13.png",exact:true}).waitFor();await page.goBack();await page.getByRole("link",{name:"Volver a derivaciones emitidas",exact:true}).click();
    await page.getByRole("heading",{name:"Derivaciones emitidas",exact:true}).waitFor();await page.locator('a[href="/medico/derivaciones/'+emitted.id+'"]').waitFor();await page.reload();await page.locator('a[href="/medico/derivaciones/'+emitted.id+'"]').waitFor();
    const listed=(await api(doctor,"/api/medical/referrals")).data;assert(listed.every((item,index)=>index===0||Date.parse(listed[index-1].createdAt)>=Date.parse(item.createdAt)));assert.equal(listed.find(d=>d.id===emitted.id).documentCount,1);
    record("Network and expired session keep reason/summary/priority; lost response after atomic commit recovers the same referral without replay; exact RPC, shared origin-only elements, nulls, reload, detail, source documents and inbox verified");
    await page.route("**/api/medical/referrals",r=>r.abort("failed"),{times:1});await page.getByRole("button",{name:"Actualizar derivaciones",exact:true}).click();await page.locator('p[role="alert"]').waitFor();await page.getByRole("button",{name:"Actualizar derivaciones",exact:true}).click();await page.locator('a[href="/medico/derivaciones/'+emitted.id+'"]').waitFor();
    for(const level of ["PRIORITY","ROUTINE"]){
      const item=await fixture();const tab=await open(item);await fill(tab,level,"Motivo "+level+" FE13");
      const response=await submit(tab,item,200);const contract=(await response.json()).data;await tab.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();kept(item);
      const stored=(await detail(item)).referral;referrals.push(stored.id);assert.equal(contract.referralId,stored.id);assert.equal(stored.priority,level);assert.deepEqual(stored.documents,[]);assert.deepEqual(stored.diagnoses,[]);
      await tab.getByRole("region",{name:"Derivación emitida",exact:true}).getByText(labels[level],{exact:true}).waitFor();await tab.reload();await tab.getByText("Sin documentos compartidos.",{exact:true}).waitFor();await tab.getByText("Sin diagnósticos compartidos.",{exact:true}).waitFor();
    }
    record("Urgent, priority and routine referrals retain server values; unavailable or other-encounter/patient documents are not shared; empty shared arrays and null are rendered correctly");
    const noReferral=await fixture();const noPage=await open(noReferral);await fill(noPage,"URGENT","No se debe emitir");await noPage.getByRole("checkbox",{name:"Derivación a especialidad",exact:true}).uncheck();
    const noResult=(await(await submit(noPage,noReferral,200,"Cerrar atención")).json()).data;assert.equal(noResult.referralId,null);await noPage.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();kept(noReferral);await noPage.getByText("Sin derivación emitida.",{exact:true}).waitFor();assert.equal((await detail(noReferral)).referral,null);
    const late=await fixture();const latePage=await open(late);await fill(latePage,"PRIORITY","Conservar ante conflicto FE13","No debe persistir");
    await api(admin,"/api/appointments/"+late.appointmentId+"/no-show","POST",{reason:"Cambio concurrente FE13"});await submit(latePage,late,409);assert.equal(await latePage.getByRole("textbox",{name:/^Motivo de derivación/}).inputValue(),"Conservar ante conflicto FE13");
    const reverted=await detail(late);assert.equal(reverted.encounter.status,"DRAFT");assert.equal(reverted.encounter.reviewHistory,null);assert.equal(reverted.referral,null);assert.deepEqual(reverted.diagnoses,[]);assert.deepEqual(reverted.measurements,[]);
    record("Unchecking referral omits specialty/reason/summary despite previous values; late appointment conflict rolls back closure and referral while preserving fields");
    const raced=await fixture();const a=await open(raced),b=await open(raced);await fill(a,"URGENT","Pestaña A FE13");await fill(b,"ROUTINE","Pestaña B FE13");
    let arrived=0,release;const barrier=new Promise(resolve=>release=resolve);
    for(const tab of [a,b])await tab.route("**/"+raced.encounterId+"/finalize",async route=>{arrived++;if(arrived===2)release();await barrier;await route.continue();},{times:1});
    const races=[a,b].map(tab=>tab.waitForResponse(r=>r.url().endsWith("/"+raced.encounterId+"/finalize")));await Promise.all([a,b].map(tab=>tab.getByRole("button",{name:"Cerrar y emitir derivación",exact:true}).click()));
    const raceResults=await Promise.all(races);assert.deepEqual(raceResults.map(r=>r.status()).sort(),[200,409]);kept(raced);const winner=raceResults[0].status()===200?a:b,loser=winner===a?b:a;
    await winner.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();await loser.locator('p[role="alert"]').filter({hasText:"no puede modificarse"}).waitFor();
    assert.equal(await loser.getByRole("textbox",{name:/^Motivo de derivación/}).inputValue(),loser===a?"Pestaña A FE13":"Pestaña B FE13");
    const racedReferral=(await detail(raced)).referral;referrals.push(racedReferral.id);await loser.getByRole("button",{name:"Comprobar estado de la atención",exact:true}).click();await loser.getByRole("region",{name:"Derivación emitida",exact:true}).getByText(racedReferral.reason,{exact:true}).waitFor();
    assert.equal((await api(doctor,"/api/medical/referrals")).data.filter(r=>r.sourceEncounterId===raced.encounterId).length,1);
    record("Two tabs closing with different referral content produce one 200 and one 409, one emitted referral and explicit recovery of the winning content");
    await api(outsider,"/api/medical/referrals/"+emitted.id,"GET",undefined,404);await api(student,"/api/medical/referrals/"+emitted.id,"GET",undefined,403);await api(admin,"/api/medical/referrals/"+emitted.id,"GET",undefined,403);await api(specialist,"/api/medical/referrals/"+emitted.id,"GET",undefined,403);
    const valid={chiefComplaint:"Ajeno",assessment:"Ajeno",referralSpecialtyId:specialty.id,referralReason:"Ajeno",referralComment:"Ajeno",referralPriority:"ROUTINE"};
    await api(outsider,"/api/medical/encounters/"+first.encounterId+"/finalize","POST",valid,404);await api(doctor,"/api/medical/encounters/"+first.encounterId+"/finalize","POST",valid,409);
    const foreignPage=await outsider.newPage();await foreignPage.goto(origin+"/medico/derivaciones/"+emitted.id);await foreignPage.locator('p[role="alert"]').waitFor();assert(!(await foreignPage.locator("body").innerText()).includes("Motivo urgente FE13"));
    assert.equal(createHash("sha256").update(JSON.stringify((await api(doctor,"/api/medical/referrals/"+emitted.id)).data)).digest("hex"),originalChecksum);
    await page.goto(origin+"/medico/derivaciones/"+emitted.id);await page.getByRole("heading",{name:"Contexto de revisión",exact:true}).waitFor();await page.screenshot({path:artifacts+"/derivacion.png",fullPage:true});
    assert(!traffic.some(r=>/supabase\.(co|com)/.test(r.url)));assert(!traffic.some(r=>/\/api\/medical\/patients\/[^/?]+$/.test(r.url)));
    record("Foreign review doctor and non-review roles cannot read referral clinical context or re-finalize; original referral checksum stays intact and no Supabase is called");
    writeFileSync(artifacts+"/resultado.json",JSON.stringify({status:"PASS",results,patientId,otherPatientId,encounters,referrals,excluded,originalChecksum,traffic},null,2));console.log(JSON.stringify({status:"PASS",results,patientId,referrals,artifacts},null,2));
  }catch(error){for(const[i,c]of browser.contexts().entries())for(const[j,p]of c.pages().entries()){await p.screenshot({path:artifacts+"/fallo-"+i+"-"+j+".png",fullPage:true}).catch(()=>{});writeFileSync(artifacts+"/fallo-"+i+"-"+j+".txt",await p.locator("body").innerText().catch(()=>""));}throw error;
  }finally{
    if(restoreSpecialty)await api(admin,"/api/v1/admin/catalogs/SPECIALTY","POST",{id:restoreSpecialty.id,code:restoreSpecialty.code,name:restoreSpecialty.name,active:true}).catch(()=>{});
    if(admin)for(const id of cleanup)try{await api(admin,"/api/appointments/"+id+"/no-show","POST",{reason:"Fin prueba FE13"});}catch{/* Keep synthetic history. */}await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
