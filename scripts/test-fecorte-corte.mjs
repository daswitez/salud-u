import { segundoFactor } from "./lib/segundo-factor.mjs";
// FE-CORTE: pruebas de corte y recuperación con Spring y PostgreSQL reales (RNF-07, RNF-08 y escrituras sin partir).
// Detiene y reinicia los contenedores locales de salud-u-backend; sólo datos sintéticos y origen localhost.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.FECORTE_PLAYWRIGHT||'playwright');
const origin=process.env.FECORTE_ORIGIN||'http://localhost:3000',artifacts=process.env.FECORTE_ARTIFACTS||'/tmp/salud-u-fecorte-corte-evidence',seed=Date.now(),marker='FECORTE'+seed,password='SaludDemo2026!';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));mkdirSync(artifacts,{recursive:true});
const backendDir=fileURLToPath(new URL('../../salud-u-backend/',import.meta.url)),backendHealth='http://127.0.0.1:8080/actuator/health/readiness';
const compose=(...args)=>execFileSync('docker',['compose',...args],{cwd:backendDir,encoding:'utf8',stdio:['pipe','pipe','pipe']});
const sql=q=>execFileSync('docker',['compose','exec','-T','postgres','sh','-c','psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'],{cwd:backendDir,input:q,encoding:'utf8'}).trim();
const uuid=s=>{assert.match(s,/^[0-9a-f-]{36}$/);return "'"+s+"'";};
const readiness=async()=>{try{const r=await fetch(backendHealth);return r.status;}catch{return 0;}};
async function waitReady(){for(let i=0;i<90;i++){if(await readiness()===200)return;await new Promise(r=>setTimeout(r,1000));}throw new Error('Spring no volvió a readiness UP');}
const browser=await chromium.launch({headless:true,...(process.env.FECORTE_CHROMIUM?{executablePath:process.env.FECORTE_CHROMIUM}:{})}),results=[],timings={};const pass=s=>{results.push(s);console.log('PASS '+s);};
async function api(c,path,method='GET',data,status=200){const headers={};if(method!=='GET'){const t=(await(await c.request.get(origin+'/api/v1/security/csrf')).json()).data;headers[t.headerName]=t.token;}const r=await c.request.fetch(origin+path,{method,data,headers});const b=r.status()===204?null:await r.json().catch(()=>null);if(status!==null)assert.equal(r.status(),status,method+' '+path+' '+JSON.stringify(b));return status===null?{status:r.status(),body:b}:b;}
async function login(email){const c=await browser.newContext({locale:'es-BO',timezoneId:'America/La_Paz',viewport:{width:1366,height:900}});await segundoFactor(c, origin, {email,password}, await api(c, "/api/v1/auth/login", "POST", {email,password}));return c;}
const pdf=Buffer.from('%PDF-1.7\nFECORTE corte\n%%EOF\n');
try{
 const student=await login('estudiante.ana.demo@salud-universitaria.test'),admin=await login('admin.demo@salud-universitaria.test'),doctor=await login('revision.ana.demo@salud-universitaria.test');
 const me=(await api(student,'/api/me')).user,patientId=sql(`SELECT id FROM salud_u.paciente WHERE id_principal=${uuid(me.id)};`);
 async function fixture(){
  const requestId=(await api(student,'/api/appointment-requests','POST',{},201)).data.id;
  const last=Number(sql('SELECT coalesce(extract(epoch from max(termina_a))*1000,0) FROM salud_u.cupo_disponibilidad;')),time=Math.max(Date.now()+240*86400000,last+3600000);
  const slotId=(await api(doctor,'/api/availability-slots','POST',{specialtyId:null,startsAt:new Date(time).toISOString(),endsAt:new Date(time+1800000).toISOString(),capacity:1},201)).data.id;
  const appointmentId=(await api(admin,'/api/appointment-requests/'+requestId+'/assign','POST',{slotId})).data.appointmentId;
  const encounterId=(await api(doctor,'/api/medical/appointments/'+appointmentId+'/start','POST',undefined,201)).data.encounterId;
  const current=(await api(doctor,'/api/medical/patients/'+patientId+'/clinical-background')).data?.current;
  const bg={versionEsquema:1,alergias:{estado:'DESCONOCIDO',elementos:[]},enfermedadesPersonales:{estado:'DESCONOCIDO',elementos:[]},cirugias:{estado:'DESCONOCIDO',elementos:[]},medicamentos:{estado:'DESCONOCIDO',elementos:[]},antecedentesFamiliares:{estado:'DESCONOCIDO',elementos:[]},habitos:{}};
  await api(doctor,'/api/medical/patients/'+patientId+'/clinical-background','PATCH',{data:current?.data??bg,expectedVersion:current?.versionNo??0,changeReason:'Corte '+marker,encounterId});
  return {appointmentId,encounterId};
 }
 const state=encounterId=>sql(`SELECT e.estado||'/'||c.estado||'/'||(SELECT count(*) FROM salud_u.diagnostico_encuentro d WHERE d.id_encuentro=e.id)||'/'||(SELECT count(*) FROM salud_u.documento_clinico x WHERE x.id_encuentro=e.id) FROM salud_u.encuentro_clinico e JOIN salud_u.cita c ON c.id=e.id_cita WHERE e.id=${uuid(encounterId)};`);
 const page=await doctor.newPage();
 const motivo=()=>page.getByRole('textbox',{name:/^Motivo de consulta/}),evaluacion=()=>page.getByRole('textbox',{name:/^Evaluación clínica/});
 async function openForm(item,label){await page.goto(origin+'/medico/citas/'+item.appointmentId+'?ficha=1');await motivo().fill('Motivo '+label+' '+marker);await evaluacion().fill('Evaluación '+label+' '+marker);}
 async function assertDraftKept(label){assert.equal(await motivo().inputValue(),'Motivo '+label+' '+marker);assert.equal(await evaluacion().inputValue(),'Evaluación '+label+' '+marker);assert(page.url().includes('ficha=1'));}

 // 1. RNF-08: historia autorizada en diálogo durante la atención, sin perder lo escrito.
 const first=await fixture();await openForm(first,'corte Spring');const url=page.url();
 await page.getByRole('button',{name:'Ver historia clínica',exact:true}).click();const history=page.getByRole('dialog',{name:/^Historia de /});await history.waitFor();
 const previous=history.locator('details');await previous.first().waitFor();const total=await previous.count();assert(total>=1);
 await history.getByRole('textbox',{name:'Buscar en la historia'}).fill('Motivo revisión FECORTE');await history.getByRole('button',{name:'Buscar',exact:true}).click();
 await history.getByRole('heading',{name:/^Atenciones previas \(\d+\)$/}).waitFor();await page.waitForFunction(n=>document.querySelectorAll('dialog details').length<=n,total);
 await previous.first().locator('summary').click();await previous.first().getByText('Diagnósticos',{exact:true}).waitFor();
 assert.equal(await history.getByText(first.encounterId).count(),0);
 await page.keyboard.press('Escape');await history.waitFor({state:'hidden'});assert.equal(page.url(),url);await assertDraftKept('corte Spring');
 pass(`RNF-08: el médico abre la historia autorizada (${total} atenciones previas, búsqueda en Spring) en un diálogo sobre la ficha y vuelve con lo escrito intacto, sin cambiar de URL`);

 // 2. Spring detenido: el cierre falla sin perder el borrador ni partir la escritura; al volver, se recupera con la misma sesión.
 let t=Date.now();compose('stop','backend');
 await page.getByRole('button',{name:'Cerrar atención',exact:true}).click();await page.getByRole('alert').first().waitFor();await assertDraftKept('corte Spring');
 await page.getByRole('button',{name:'Comprobar estado de la atención',exact:true}).waitFor();
 await page.getByRole('button',{name:'Ver historia clínica',exact:true}).click();await history.getByRole('alert').waitFor();await history.getByRole('button',{name:'Reintentar',exact:true}).waitFor();await page.keyboard.press('Escape');
 assert.equal(state(first.encounterId),'DRAFT/SCHEDULED/0/0');
 const agenda=await doctor.newPage();await agenda.goto(origin+'/medico/agenda');await agenda.getByRole('heading',{name:'No pudimos cargar esta pantalla',exact:true}).waitFor();assert(!agenda.url().includes('iniciar-sesion'),'la caída no se presenta como sesión vencida');
 compose('start','backend');await waitReady();timings.springRestartMs=Date.now()-t;
 await agenda.getByRole('button',{name:'Reintentar',exact:true}).click();await agenda.getByRole('heading',{name:'No pudimos cargar esta pantalla'}).waitFor({state:'detached'});assert(agenda.url().endsWith('/medico/agenda'));await agenda.close();
 await page.getByRole('button',{name:'Comprobar estado de la atención',exact:true}).click();await page.getByText('La atención sigue en borrador. Se conserva lo que escribiste.').waitFor();await assertDraftKept('corte Spring');
 await page.getByRole('button',{name:'Cerrar atención',exact:true}).click();await page.getByRole('heading',{name:'Atención cerrada',exact:true}).waitFor();
 assert.equal(state(first.encounterId),'CLOSED/ATTENDED/0/0');
 pass(`RNF-07 con Spring detenido: el cierre y la historia muestran error recuperable y navegar a otra pantalla ofrece reintentar (no inicio de sesión); el borrador queda en pantalla y la base sin cambios; tras reiniciar Spring (${Math.round(timings.springRestartMs/1000)} s) la misma sesión comprueba el estado y cierra una sola vez`);

 // 3. PostgreSQL detenido: lecturas/escrituras fallan sin filas ni archivos huérfanos; Spring se reconecta sin reiniciarse.
 const second=await fixture();await openForm(second,'corte PostgreSQL');
 const uploader=page.getByRole('region',{name:'Documentos de la atención'});
 const csrf=(await(await admin.request.get(origin+'/api/v1/security/csrf')).json()).data;
 t=Date.now();compose('stop','postgres');
 timings.readinessWithoutDatabase=await readiness();
 await page.getByLabel('Archivo clínico',{exact:true}).setInputFiles({name:'corte.pdf',mimeType:'application/pdf',buffer:pdf});let failedAt=Date.now();await page.getByRole('button',{name:'Subir archivo',exact:true}).click();await uploader.getByRole('alert').waitFor();timings.uploadErrorWithoutDatabaseMs=Date.now()-failedAt;assert(timings.uploadErrorWithoutDatabaseMs<10000,'error de carga sin base en '+timings.uploadErrorWithoutDatabaseMs+' ms');
 await page.getByRole('button',{name:'Cerrar atención',exact:true}).click();await page.getByRole('button',{name:'Comprobar estado de la atención',exact:true}).waitFor();await assertDraftKept('corte PostgreSQL');
 const catalog=await admin.request.post(origin+'/api/v1/admin/catalogs/SPECIALTY',{data:{code:'FECORTE_PG_'+seed,name:'Área corte '+marker,active:true},headers:{[csrf.headerName]:csrf.token}});timings.adminWriteWithoutDatabase=catalog.status();assert.equal(catalog.status(),503,'escritura administrativa sin base');assert.equal(catalog.headers()['x-error-code'],'SERVICE_UNAVAILABLE');
 assert.equal(await page.getByRole('link',{name:/Iniciar sesión en otra pestaña/}).count(),0,'una caída de la base no se presenta como sesión vencida');
 compose('start','postgres');await waitReady();timings.postgresRecoveryMs=Date.now()-t;
 assert.equal(state(second.encounterId),'DRAFT/SCHEDULED/0/0');assert.equal(sql(`SELECT count(*) FROM salud_u.especialidad WHERE codigo='FECORTE_PG_${seed}';`),'0');
 await page.getByRole('button',{name:'Subir archivo',exact:true}).click();await uploader.getByRole('heading',{name:'corte.pdf',exact:true}).waitFor();await assertDraftKept('corte PostgreSQL');
 await page.getByRole('button',{name:'Cerrar atención',exact:true}).click();await page.getByRole('heading',{name:'Atención cerrada',exact:true}).waitFor();
 assert.equal(state(second.encounterId),'CLOSED/ATTENDED/0/1');
 await api(admin,'/api/v1/admin/catalogs/SPECIALTY','POST',{code:'FECORTE_PG_'+seed,name:'Área corte '+marker,active:true});assert.equal(sql(`SELECT count(*) FROM salud_u.especialidad WHERE codigo='FECORTE_PG_${seed}';`),'1');
 pass(`PostgreSQL detenido: readiness ${timings.readinessWithoutDatabase}, Spring responde 503 (no 401) y conserva la cookie, error visible en ${(timings.uploadErrorWithoutDatabaseMs/1000).toFixed(1)} s; carga de archivo, cierre y alta de catálogo fallan sin dejar filas ni archivos; Spring se reconecta solo (${Math.round(timings.postgresRecoveryMs/1000)} s), la sesión sigue válida y los reintentos escriben una vez`);

 // 4. Archivos y metadatos conciliados después de los cortes.
 const reconciliation=JSON.parse(execFileSync(fileURLToPath(new URL('../../salud-u-backend/scripts/reconcile-documents.sh',import.meta.url)),{env:{...process.env,SALUDU_PROJECT:'salud-u-backend'},encoding:'utf8'}));
 assert.equal(reconciliation.estado,'CONCILIADO');
 pass(`Conciliación de documentos tras los cortes: ${reconciliation.filasDisponibles} filas y ${reconciliation.archivos} archivos con checksum idéntico; sin huérfanos, temporales ni cargas a medias`);

 // 5. Reinicio de Next: no guarda estado propio; la sesión sigue en Spring.
 if(process.env.FECORTE_RESTART_NEXT){t=Date.now();execFileSync(process.env.FECORTE_RESTART_NEXT,{stdio:'ignore'});for(let i=0;i<60;i++){try{if((await fetch(origin+'/iniciar-sesion')).ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}timings.nextRestartMs=Date.now()-t;
  await page.goto(origin+'/medico/agenda');await page.getByRole('heading',{level:1}).first().waitFor();assert(!page.url().includes('iniciar-sesion'));
  pass(`Reinicio de Next (${Math.round(timings.nextRestartMs/1000)} s): la sesión del médico sigue válida porque vive en Spring/PostgreSQL`);}
 writeFileSync(artifacts+'/resultado.json',JSON.stringify({status:'PASS',results,timings,marker},null,2));
}catch(error){
 writeFileSync(artifacts+'/error.txt',String(error?.stack||error));throw error;
}finally{
 try{compose('start','postgres');compose('start','backend');await waitReady();}catch(error){console.error('No se pudo restaurar la pila: '+error);}
 await browser.close();
}
