import { segundoFactorEnPagina } from "./lib/segundo-factor.mjs";
// ES-10: recorrido local por los seis roles con sesión Spring y contratos HTTP estables.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,rmSync} from 'node:fs';
const {chromium}=await import(process.env.ES10_PLAYWRIGHT||'playwright');
const origin=process.env.ES10_ORIGIN||'http://localhost:3000',artifacts=process.env.ES10_ARTIFACTS||'/tmp/salud-u-es10-evidence';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));mkdirSync(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.ES10_CHROMIUM?{executablePath:process.env.ES10_CHROMIUM}:{})});
const password='SaludDemo2026!',seed=Date.now(),results=[],requests=[];
async function api(context,path,method='GET',data,status=200){
 const headers={};if(method!=='GET'){const token=(await(await context.request.get(origin+'/api/v1/security/csrf')).json()).data;headers[token.headerName]=token.token;}
 const response=await context.request.fetch(origin+path,{method,data,headers});assert.equal(response.status(),status,method+' '+path+' '+await response.text());return status===204?null:response.json();
}
async function session(role,email){
 const context=await browser.newContext({locale:'es-BO',timezoneId:'America/La_Paz',viewport:{width:1440,height:1000}});
 const page=await context.newPage();await page.goto(origin+'/iniciar-sesion');await page.getByLabel(/Correo/i).fill(email);await page.getByLabel(/Contraseña/i).fill(password);await page.getByRole('button',{name:/Iniciar sesión|Ingresar/}).click();await segundoFactorEnPagina(page,origin,email);await page.waitForURL(url=>!url.pathname.startsWith('/iniciar-sesion'));
 const me=(await api(context,'/api/me')).user;assert.equal(me.clinicalRole,role);assert(me.roles===undefined||me.roles.includes(role));
 context.on('response',response=>{const u=new URL(response.url());if(u.pathname.startsWith('/api/'))requests.push({role,path:u.pathname,status:response.status()});});
 return {context,page,role};
}
async function visit(actor,path,endpoint){
 const loaded=actor.page.waitForResponse(response=>new URL(response.url()).pathname===endpoint&&response.request().method()==='GET');await actor.page.goto(origin+path);assert.equal((await loaded).status(),200,path);await actor.page.locator('main h1').first().waitFor();assert(!actor.page.url().includes('/iniciar-sesion'));const text=await actor.page.locator('main').innerText();assert(!/No pudimos cargar esta pantalla|Acceso restringido|No tienes permiso/.test(text),path);await actor.page.screenshot({path:artifacts+'/'+actor.role+'-'+path.split('/').at(-1)+'.png',fullPage:true});
 results.push({role:actor.role,page:path,status:'PASS'});console.log('PASS '+actor.role+' '+path);
}
try{
 const admin=await session('ADMINISTRATIVE','admin.demo@salud-universitaria.test');
 async function account(label,role){const email='es10.'+label+'.'+seed+'@salud-universitaria.test';const created=await api(admin.context,'/api/v1/admin/principals','POST',{email,displayName:'ES10 '+label,password,roles:[role]},201);return {email,id:created.data.id};}
 const specialistAccount=await account('especialista','SPECIALIST'),reporterAccount=await account('reportes','REPORTING_OFFICER'),auditorAccount=await account('auditor','AUDITOR');
 const staff=(await api(admin.context,'/api/v1/admin/staff','POST',{principalId:specialistAccount.id,staffCode:'ES10-'+seed,active:true})).data;
 const specialty=(await api(admin.context,'/api/v1/admin/catalogs/SPECIALTY','POST',{code:'ES10_'+seed,name:'Especialidad ES10 '+seed,active:true})).data;
 await api(admin.context,'/api/v1/admin/staff/specialties','POST',{staffMemberId:staff.id,specialtyId:specialty.id,activeFrom:'2026-01-01',activeTo:null});
 const doctor=await session('REVIEW_DOCTOR','revision.ana.demo@salud-universitaria.test'),specialist=await session('SPECIALIST',specialistAccount.email),student=await session('STUDENT','estudiante.ana.demo@salud-universitaria.test'),reporter=await session('REPORTING_OFFICER',reporterAccount.email),auditor=await session('AUDITOR',auditorAccount.email);
 await visit(admin,'/administrativo/estudiantes','/api/patients');await visit(admin,'/administrativo/derivaciones','/api/administrative/referrals');
 const patients=(await api(admin.context,'/api/patients')).data;assert(patients.length>0);assert(Object.hasOwn(patients[0],'email'));assert(Object.hasOwn(patients[0],'academicStatus'));assert(!Object.hasOwn(patients[0],'correo'));assert(['ACTIVE','INACTIVE','GRADUATED','SUSPENDED'].includes(patients[0].academicStatus));
 await visit(doctor,'/medico/agenda','/api/medical/appointments');await visit(doctor,'/medico/horarios','/api/availability-slots');
 const management=(await api(doctor.context,'/api/availability-slots?manage=true')).data;assert(management.schedules!==undefined);assert(management.recurringBlocks!==undefined);assert(management.dateBlocks!==undefined);
 await visit(specialist,'/medico/agenda','/api/medical/appointments');await visit(specialist,'/medico/derivaciones','/api/medical/assigned-referrals');
 await visit(student,'/estudiante/vacunas','/api/vaccination-card');await api(student.context,'/api/appointment-requests');
 await visit(reporter,'/administrativo/reportes','/api/reports/clinical');
 const report=(await api(reporter.context,'/api/reports/clinical?from=2026-01-01&to=2026-12-31')).data;assert(report.length>0);assert(Object.hasOwn(report[0],'encounter_id'));assert(Object.hasOwn(report[0],'patient_name'));assert(!Object.hasOwn(report[0],'id_encuentro'));
 const token=(await(await reporter.context.request.get(origin+'/api/v1/security/csrf')).json()).data;
 const exported=await reporter.context.request.post(origin+'/api/reports/clinical/export',{headers:{[token.headerName]:token.token},data:{format:'CSV',purpose:'Cierre ES10 '+seed,filters:{from:'2026-01-01',to:'2026-12-31',search:'SIN_FILAS_ES10_'+seed},columns:['patient_name','diagnoses'],groupBy:[]}});assert.equal(exported.status(),200);assert((await exported.body()).length>0);
 await visit(auditor,'/administrativo/auditoria','/api/audit-events');
 const events=(await api(auditor.context,'/api/audit-events?action=PRINCIPAL_CREATED&actorId='+(await api(admin.context,'/api/me')).user.id)).data;assert(events.some(e=>e.action==='CUENTA_CREADA'));assert(events.every(e=>['SUCCESS','DENIED','FAILURE'].includes(e.outcome)));
 for(const actor of [admin,doctor,specialist,student,reporter])await api(actor.context,'/api/audit-events','GET',undefined,403);
 await api(student.context,'/api/reports/clinical','GET',undefined,403);await api(reporter.context,'/api/patients','GET',undefined,403);
 const vaccine={code:'ES10_'+seed,name:'Vacuna ES10 '+seed,active:true,doses:[{doseNumber:1,minimumIntervalDays:0}]};await api(admin.context,'/api/vaccines','POST',vaccine,201);await api(admin.context,'/api/vaccines','POST',vaccine,409);
 await api(student.context,'/api/v1/session/logout','POST',undefined,204);assert.equal((await student.context.request.get(origin+'/api/me')).status(),401);
 assert(!requests.some(r=>r.status>=500));
 rmSync(artifacts+'/error.txt',{force:true});
 writeFileSync(artifacts+'/resultado.json',JSON.stringify({status:'PASS',results,requests,patientAndReportKeysPreserved:true,exportCsv:true,vaccineDuplicate409:true,logout401:true},null,2));
 console.log('PASS Contratos públicos, permisos cruzados, CSV, vacuna duplicada 409 y cierre de sesión 401');
}catch(error){writeFileSync(artifacts+'/error.txt',String(error.stack||error));throw error;}finally{await browser.close();}
