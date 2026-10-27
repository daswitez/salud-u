// FE-CORTE: recorrido integral estudiante → Administración → revisión → especialista → historia → vacunas → Reportes → Auditor.
// Local synthetic acceptance; no production data. Requires Next + Spring + PostgreSQL.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.FECORTE_PLAYWRIGHT||'playwright');
const origin=process.env.FECORTE_ORIGIN||'http://localhost:3000',artifacts=process.env.FECORTE_ARTIFACTS||'/tmp/salud-u-fecorte-evidence',seed=Date.now(),marker='FECORTE'+seed,password='SaludDemo2026!';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));mkdirSync(artifacts,{recursive:true});
const sql=q=>execFileSync('docker',['compose','exec','-T','postgres','sh','-c','psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'],{cwd:fileURLToPath(new URL('../../salud-u-backend/',import.meta.url)),input:q,encoding:'utf8'}).trim();
const uuid=s=>{assert.match(s,/^[0-9a-f-]{36}$/);return "'"+s+"'";};
const browser=await chromium.launch({headless:true,...(process.env.FECORTE_CHROMIUM?{executablePath:process.env.FECORTE_CHROMIUM}:{})}),traffic=[],results=[];const pass=s=>{results.push(s);console.log('PASS '+s);};
async function api(c,path,method='GET',data,status=200){const headers={};if(method!=='GET'){const t=(await(await c.request.get(origin+'/api/v1/security/csrf')).json()).data;headers[t.headerName]=t.token;}const r=await c.request.fetch(origin+path,{method,data,headers});const b=r.status()===204?null:await r.json();assert.equal(r.status(),status,method+' '+path+' '+JSON.stringify(b));return b;}
async function context(role){const c=await browser.newContext({locale:'es-BO',timezoneId:'America/La_Paz',viewport:{width:1366,height:900}});
 c.on('response',r=>{const u=new URL(r.url());traffic.push({role,method:r.request().method(),url:u.origin+u.pathname,status:r.status(),springRequestId:r.headers()['x-request-id']??null,type:r.request().resourceType()});});return c;}
async function login(role,email){const c=await context(role);await api(c,'/api/v1/auth/login','POST',{email,password});return c;}
const today=sql(`SELECT (now() AT TIME ZONE 'America/La_Paz')::date;`);
try{
 // 1. Estudiante entra por el formulario real y solicita revisión desde su inicio.
 const student=await context('STUDENT'),sp=await student.newPage();await sp.goto(origin+'/iniciar-sesion');
 await sp.getByLabel(/Correo/i).fill('estudiante.ana.demo@salud-universitaria.test');await sp.getByLabel(/Contraseña/i).fill(password);await sp.getByRole('button',{name:/Iniciar sesión|Ingresar/}).click();await sp.waitForURL('**/estudiante');
 const me=(await api(student,'/api/me')).user,patientId=sql(`SELECT id FROM salud_u.paciente WHERE id_principal=${uuid(me.id)};`);
 await sp.getByRole('heading',{level:1,name:'Hola, '+me.name.split(' ')[0]}).waitFor();assert.equal(await sp.getByText(/Daniela|Valeria Mendoza|Chequeo médico Tipo A/).count(),0);
 await sp.getByRole('link',{name:/Solicitar cita de revisión/}).first().click();await sp.waitForURL('**/estudiante/buscar');await sp.getByRole('link',{name:'Solicitar cita de revisión'}).click();await sp.waitForURL('**/estudiante/reservar');
 const created=sp.waitForResponse(r=>r.url()===origin+'/api/appointment-requests'&&r.request().method()==='POST');await sp.getByRole('button',{name:'Registrar solicitud'}).click();const createdResponse=await created;assert.equal(createdResponse.status(),201);const requestId=(await createdResponse.json()).data.id;
 await sp.goto(origin+'/estudiante');await sp.getByText(/solicitud\(es\) esperando que Administración asigne un cupo/).waitFor();
 pass('Estudiante inicia sesión por el formulario, ve su nombre real (sin datos de ejemplo) y registra una solicitud de revisión desde la navegación; el inicio refleja la solicitud pendiente desde Spring');

 // 2. Médico publica cupo y Administración asigna; el estudiante ve la cita confirmada.
 const admin=await login('ADMINISTRATIVE','admin.demo@salud-universitaria.test'),doctor=await login('REVIEW_DOCTOR','revision.ana.demo@salud-universitaria.test'),doctorUser=(await api(doctor,'/api/me')).user;
 const slot=async(c,specialtyId=null)=>{const last=Number(sql('SELECT coalesce(extract(epoch from max(termina_a))*1000,0) FROM salud_u.cupo_disponibilidad;')),time=Math.max(Date.now()+240*86400000,last+3600000);return (await api(c,'/api/availability-slots','POST',{specialtyId,startsAt:new Date(time).toISOString(),endsAt:new Date(time+1800000).toISOString(),capacity:1},201)).data.id;};
 const appointmentId=(await api(admin,'/api/appointment-requests/'+requestId+'/assign','POST',{slotId:await slot(doctor)})).data.appointmentId;
 await sp.goto(origin+'/estudiante/citas');const card=sp.locator('article').filter({has:sp.locator(`a[href="/estudiante/citas/${requestId}"]`)});await card.getByText('Cita confirmada').waitFor();await card.getByText(doctorUser.name).waitFor();
 pass('Médico publica disponibilidad, Administración asigna el cupo y el estudiante ve la cita confirmada con su médico al recargar');

 // 3. Revisión: el médico inicia la cita desde su pantalla, cierra la atención y deriva.
 const specialtyCode='FECORTE_'+seed,specialty=(await api(admin,'/api/v1/admin/catalogs/SPECIALTY','POST',{code:specialtyCode,name:'Área '+marker,active:true})).data;
 const dp=await doctor.newPage();await dp.goto(origin+'/medico/citas/'+appointmentId);const started=dp.waitForResponse(r=>r.url().endsWith('/'+appointmentId+'/start')&&r.headers()['x-error-code']!=='CSRF_INVALID');await dp.getByRole('button',{name:'Iniciar cita',exact:true}).click();const startedResponse=await started;assert.equal(startedResponse.status(),201);const reviewEncounter=(await startedResponse.json()).data.encounterId;
 const background=(await api(doctor,'/api/medical/patients/'+patientId+'/clinical-background')).data?.current,version=background?.versionNo??0;
 const bg={versionEsquema:1,alergias:{estado:'DESCONOCIDO',elementos:[]},enfermedadesPersonales:{estado:'DESCONOCIDO',elementos:[]},cirugias:{estado:'DESCONOCIDO',elementos:[]},medicamentos:{estado:'DESCONOCIDO',elementos:[]},antecedentesFamiliares:{estado:'DESCONOCIDO',elementos:[]},habitos:{}};
 await api(doctor,'/api/medical/patients/'+patientId+'/clinical-background','PATCH',{data:background?.data??bg,expectedVersion:version,changeReason:'Revisión '+marker,encounterId:reviewEncounter});
 const referralId=(await api(doctor,'/api/medical/encounters/'+reviewEncounter+'/finalize','POST',{chiefComplaint:'Motivo revisión '+marker,assessment:'Evaluación revisión '+marker,diagnosisText:'Diagnóstico revisión '+marker,reviewHistory:{},referralSpecialtyId:specialty.id,referralReason:'Derivación '+marker,referralComment:'Resumen '+marker,referralPriority:'ROUTINE'})).data.referralId;
 await dp.reload();await dp.getByText(/Atención cerrada|Cerrada|CLOSED/).first().waitFor();
 assert.equal(sql(`SELECT e.estado||'/'||c.estado FROM salud_u.encuentro_clinico e JOIN salud_u.cita c ON c.id=e.id_cita WHERE e.id=${uuid(reviewEncounter)};`),'CLOSED/ATTENDED');
 pass('Médico de revisión inicia la cita desde su pantalla y cierra la atención con derivación; encuentro CLOSED y cita ATTENDED de forma atómica');

 // 4. Administración agenda la derivación con el especialista; el especialista la atiende.
 const special=await login('SPECIALIST','fe09.especialista@salud-universitaria.test'),specialUser=(await api(special,'/api/me')).user;
 const staff=(await api(admin,'/api/v1/admin/staff','POST',{principalId:specialUser.id,staffCode:'FE09-ESPECIALISTA',active:true})).data;await api(admin,'/api/v1/admin/staff/specialties','POST',{staffMemberId:staff.id,specialtyId:specialty.id,activeFrom:'2026-01-01',activeTo:null});
 sql(`INSERT INTO salud_u.plantilla_ficha_especialidad(id_especialidad,numero_version,esquema) VALUES(${uuid(specialty.id)},1,'{}');`);
 const ap=await admin.newPage();await ap.goto(origin+'/administrativo/derivaciones');await ap.getByText('Derivación '+marker).first().waitFor();
 const referralRequest=(await api(admin,'/api/appointment-requests','POST',{patientId,appointmentType:'REFERRAL',specialtyId:null,referralId},201)).data.id;
 const specialtyAppointment=(await api(admin,'/api/appointment-requests/'+referralRequest+'/assign','POST',{slotId:await slot(special,specialty.id)})).data.appointmentId;
 const xp=await special.newPage();await xp.goto(origin+'/medico/derivaciones');await xp.getByText('Derivación '+marker).first().waitFor();
 await xp.goto(origin+'/medico/citas/'+specialtyAppointment);const xs=xp.waitForResponse(r=>r.url().endsWith('/'+specialtyAppointment+'/start')&&r.headers()['x-error-code']!=='CSRF_INVALID');await xp.getByRole('button',{name:'Iniciar cita',exact:true}).click();const xsr=await xs;assert.equal(xsr.status(),201);const specialtyEncounter=(await xsr.json()).data.encounterId;
 await api(special,'/api/medical/encounters/'+specialtyEncounter+'/finalize','POST',{chiefComplaint:'Motivo especialidad '+marker,assessment:'Evaluación especialidad '+marker,diagnosisText:'Diagnóstico especialidad '+marker,instructions:'Indicaciones '+marker,followUpText:'Seguimiento '+marker,specialtyHistory:{codigoEspecialidad:specialtyCode,antecedentesPersonales:{patologicos:'Antecedente '+marker}}});
 pass('Administración ve la derivación en su bandeja y la agenda; el especialista la ve en su bandeja, inicia la cita desde pantalla y cierra la atención de especialidad');

 // 5. Historia longitudinal visible para ambos profesionales tras recargar.
 for(const [c,label] of [[special,'especialidad'],[doctor,'revisión']]){const hp=await c.newPage();await hp.goto(origin+'/medico/pacientes/'+patientId);await hp.getByRole('button',{name:new RegExp('Motivo '+label+' '+marker)}).click({timeout:30000});const ficha=hp.getByRole('dialog',{name:'Ficha clínica autorizada'});await ficha.getByText('Diagnóstico '+label+' '+marker).waitFor({timeout:30000});await hp.keyboard.press('Escape');await ficha.waitFor({state:'hidden'});}
 pass('Historia del paciente muestra las atenciones cerradas a los profesionales autorizados (revisión y especialidad) desde Spring');

 // 6. Vacunación: Administración registra dosis y el estudiante la ve en su carnet.
 const staffDoctor=sql(`SELECT pe.id FROM salud_u.personal pe WHERE pe.activo AND pe.id_principal=${uuid(doctorUser.id)};`);
 const vaccine=(await api(admin,'/api/vaccines','POST',{code:marker+'-V',name:'Vacuna '+marker,active:true,doses:[{doseNumber:1,minimumIntervalDays:0}]},201)).data.id;
 await api(admin,'/api/vaccinations','POST',{patientId,vaccineId:vaccine,doseNumber:1,appliedOn:today,lot:'LOT-'+marker,applicatorStaffId:staffDoctor},201);
 await sp.goto(origin+'/estudiante');await sp.getByRole('link',{name:/Mi carnet de vacunación/}).first().click();await sp.waitForURL('**/estudiante/vacunas');await sp.getByRole('cell',{name:'LOT-'+marker,exact:true}).waitFor();
 pass('Administración registra una dosis y el estudiante la ve en su carnet (lote y estado) navegando desde su inicio');

 // 7. Reportes y Auditoría reflejan el recorrido.
 const reporter=await login('REPORTING_OFFICER',(await (async()=>{const email='fecorte.reportes.'+seed+'@salud-universitaria.test';await api(admin,'/api/v1/admin/principals','POST',{email,displayName:'Reportes FECORTE '+seed,password,roles:['REPORTING_OFFICER']},201);return email;})()));
 const report=(await api(reporter,`/api/reports/clinical?from=${today}&to=${today}&search=${marker}`)).data;const rows=report.rows??report.data??report;assert(JSON.stringify(rows).includes('Diagnóstico revisión '+marker)&&JSON.stringify(rows).includes('Diagnóstico especialidad '+marker),'reporte clínico con ambas atenciones');
 const rp=await reporter.newPage();await rp.goto(origin+'/administrativo/reportes');await rp.waitForLoadState('networkidle');await rp.getByRole('link',{name:/Cumplimiento/}).first().click();await rp.waitForURL('**/reportes/cumplimiento');await rp.getByRole('region',{name:'Resultado de cumplimiento'}).waitFor();
 const auditor=await login('AUDITOR',(await (async()=>{const email='fecorte.auditor.'+seed+'@salud-universitaria.test';await api(admin,'/api/v1/admin/principals','POST',{email,displayName:'Auditor FECORTE '+seed,password,roles:['AUDITOR']},201);return email;})()));
 const audit=await api(auditor,`/api/audit-events?from=${today}&to=${today}&limit=500`);const ids=JSON.stringify(audit);for(const id of [reviewEncounter,specialtyEncounter,referralId])assert(ids.includes(id),'auditoría contiene '+id);
 const aup=await auditor.newPage();await aup.goto(origin+'/administrativo/auditoria');await aup.getByRole('heading',{level:1}).waitFor();await aup.locator('table, [role="table"]').first().waitFor();
 pass('Reportes encuentra ambas atenciones por período/contenido y navega a cumplimiento; Auditor ve cierres y derivación del recorrido en la auditoría');

 // 8. Red: todo /api/** respondido por Spring (X-Request-Id), mismo origen, sin Supabase ni API serverless.
 const apiTraffic=traffic.filter(t=>t.url.startsWith(origin+'/api/'));assert(apiTraffic.length>30);const notSpring=apiTraffic.filter(t=>!t.springRequestId);assert.deepEqual(notSpring,[]);
 const foreign=traffic.filter(t=>!t.url.startsWith(origin)&&!t.url.startsWith('data:')&&!t.url.startsWith('blob:'));assert.deepEqual(foreign,[]);assert(!traffic.some(t=>/supabase/i.test(t.url)));
 await sp.screenshot({path:artifacts+'/estudiante-carnet.png',fullPage:true});await xp.screenshot({path:artifacts+'/especialista.png',fullPage:true});
 pass(`Registro de red: ${apiTraffic.length} respuestas /api/** con X-Request-Id de Spring, ninguna generada por Next; sin orígenes externos ni Supabase`);
 if(existsSync(artifacts+'/error.txt'))unlinkSync(artifacts+'/error.txt');
 writeFileSync(artifacts+'/recorrido.json',JSON.stringify({status:'PASS',results,patientId,requestId,appointmentId,reviewEncounter,referralId,specialtyAppointment,specialtyEncounter,apiResponses:apiTraffic.length,traffic},null,2));
}catch(e){for(const [i,c] of browser.contexts().entries())for(const [j,p] of c.pages().entries()){writeFileSync(artifacts+`/fallo-${i}-${j}.txt`,p.url()+'\n'+await p.locator('body').innerText().catch(()=>''));}writeFileSync(artifacts+'/error.txt',String(e.stack||e));throw e;}finally{await browser.close();}
