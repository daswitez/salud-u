// FE-CORTE: RNF-09 (teclado, foco, etiquetas y contraste con axe-core WCAG 2.1 A/AA) y RNF-10 (navegadores y resoluciones de escritorio).
// Recorre las pantallas esenciales de cada rol con Next en producción + Spring/PostgreSQL locales; sólo datos sintéticos.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const playwright=await import(process.env.FECORTE_PLAYWRIGHT||'playwright');
const origin=process.env.FECORTE_ORIGIN||'http://localhost:3000',artifacts=process.env.FECORTE_ARTIFACTS||'/tmp/salud-u-fecorte-a11y-evidence',seed=Date.now(),password='SaludDemo2026!';
const axeSource=readFileSync(process.env.FECORTE_AXE||'/tmp/salud-u-browser/node_modules/axe-core/axe.min.js','utf8');
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));mkdirSync(artifacts,{recursive:true});
const sql=q=>execFileSync('docker',['compose','exec','-T','postgres','sh','-c','psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'],{cwd:fileURLToPath(new URL('../../salud-u-backend/',import.meta.url)),input:q,encoding:'utf8'}).trim();
const browsers={chromium:{launch:()=>playwright.chromium.launch({headless:true,...(process.env.FECORTE_CHROMIUM?{executablePath:process.env.FECORTE_CHROMIUM}:{})})},firefox:{launch:()=>playwright.firefox.launch({headless:true})}};
const viewports=[[1024,768],[1366,768],[1920,1080]],results=[],report={axe:[],keyboard:[],layout:[]};const pass=s=>{results.push(s);console.log('PASS '+s);};
let browser=await browsers.chromium.launch();
async function api(c,path,method='GET',data,status=200){const headers={};if(method!=='GET'){const t=(await(await c.request.get(origin+'/api/v1/security/csrf')).json()).data;headers[t.headerName]=t.token;}const r=await c.request.fetch(origin+path,{method,data,headers});const b=r.status()===204?null:await r.json();assert.equal(r.status(),status,method+' '+path+' '+JSON.stringify(b));return b;}
async function context(email,viewport=[1366,768]){const c=await browser.newContext({locale:'es-BO',timezoneId:'America/La_Paz',viewport:{width:viewport[0],height:viewport[1]}});await api(c,'/api/v1/auth/login','POST',{email,password});return c;}
try{
 const admin=await context('admin.demo@salud-universitaria.test');
 const principal=async(label,roles)=>{const email='fecorte.'+label+'.'+seed+'@salud-universitaria.test';await api(admin,'/api/v1/admin/principals','POST',{email,displayName:label+' FECORTE '+seed,password,roles},201);return email;};
 const emails={STUDENT:'estudiante.ana.demo@salud-universitaria.test',ADMINISTRATIVE:'admin.demo@salud-universitaria.test',REVIEW_DOCTOR:'revision.ana.demo@salud-universitaria.test',SPECIALIST:'fe09.especialista@salud-universitaria.test',REPORTING_OFFICER:await principal('reportes',['REPORTING_OFFICER']),AUDITOR:await principal('auditor',['AUDITOR'])};
 const student=await context(emails.STUDENT),doctor=await context(emails.REVIEW_DOCTOR),me=(await api(student,'/api/me')).user;
 const patientId=sql(`SELECT id FROM salud_u.paciente WHERE id_principal='${me.id}';`);
 // Ficha de revisión en borrador para evaluar la pantalla más extensa del médico.
 const requestId=(await api(student,'/api/appointment-requests','POST',{},201)).data.id,last=Number(sql('SELECT coalesce(extract(epoch from max(termina_a))*1000,0) FROM salud_u.cupo_disponibilidad;')),time=Math.max(Date.now()+240*86400000,last+3600000);
 const slotId=(await api(doctor,'/api/availability-slots','POST',{specialtyId:null,startsAt:new Date(time).toISOString(),endsAt:new Date(time+1800000).toISOString(),capacity:1},201)).data.id;
 const appointmentId=(await api(admin,'/api/appointment-requests/'+requestId+'/assign','POST',{slotId})).data.appointmentId,encounterId=(await api(doctor,'/api/medical/appointments/'+appointmentId+'/start','POST',undefined,201)).data.encounterId;
 await Promise.all([student,doctor,admin].map(c=>c.close()));
 const screens=[
  ['ANÓNIMO',null,'/iniciar-sesion'],
  ['STUDENT','estudiante','/estudiante'],['STUDENT','estudiante','/estudiante/buscar'],['STUDENT','estudiante','/estudiante/citas'],['STUDENT','estudiante','/estudiante/vacunas'],['STUDENT','estudiante','/perfil'],
  ['ADMINISTRATIVE','admin','/administrativo'],['ADMINISTRATIVE','admin','/administrativo/estudiantes'],['ADMINISTRATIVE','admin','/administrativo/estudiantes/'+patientId],['ADMINISTRATIVE','admin','/administrativo/check-in'],['ADMINISTRATIVE','admin','/administrativo/derivaciones'],['ADMINISTRATIVE','admin','/administrativo/personal-medico'],['ADMINISTRATIVE','admin','/administrativo/vacunas'],
  ['REVIEW_DOCTOR','médico','/medico'],['REVIEW_DOCTOR','médico','/medico/agenda'],['REVIEW_DOCTOR','médico','/medico/pacientes/'+patientId],['REVIEW_DOCTOR','médico','/medico/citas/'+appointmentId+'?ficha=1'],
  ['SPECIALIST','especialista','/medico/derivaciones'],['SPECIALIST','especialista','/medico/horarios'],
  ['REPORTING_OFFICER','reportes','/administrativo/reportes'],['REPORTING_OFFICER','reportes','/administrativo/reportes/cumplimiento'],['REPORTING_OFFICER','reportes','/administrativo/reportes/vacunacion'],['REPORTING_OFFICER','reportes','/administrativo/reportes/investigacion'],
  ['AUDITOR','auditor','/administrativo/auditoria'],
 ];
 const settle=async page=>{await page.waitForLoadState('networkidle');await page.waitForFunction(()=>!document.querySelector('[aria-busy="true"]')&&![...document.querySelectorAll('[role="status"]')].some(e=>/Cargando/.test(e.textContent||'')),null,{timeout:20000}).catch(()=>{});};
 const sessions={};const sessionFor=async role=>role==='ANÓNIMO'?browser.newContext({locale:'es-BO',viewport:{width:1366,height:768}}):(sessions[role]??=await context(emails[role]));

 // RNF-09: axe-core WCAG 2.1 A/AA y recorrido con teclado (foco visible, sin trampas ni pérdida al body).
 for(const [role,label,path] of screens){
  const c=await sessionFor(role),page=await c.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(origin+path);await settle(page);assert(!page.url().includes('/iniciar-sesion')||role==='ANÓNIMO',path+' redirigió a inicio de sesión');
  await page.addScriptTag({content:axeSource});
  const axe=await page.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']});return r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.slice(0,5).map(n=>n.target.join(' ')+' :: '+(n.failureSummary||'').split('\n').slice(1,2).join(''))}));});
  report.axe.push({role,path,violations:axe});
  await page.locator('body').click({position:{x:2,y:2}});const focus=[];
  for(let i=0;i<30;i++){await page.keyboard.press('Tab');focus.push(await page.evaluate(()=>{const e=document.activeElement;if(!e||e===document.body)return {tag:'BODY'};const pick=()=>{const s=getComputedStyle(e);return [s.outlineStyle,s.outlineWidth,s.outlineColor,s.boxShadow,s.borderColor,s.backgroundColor,s.textDecorationLine].join('|');};const focused=pick(),s=getComputedStyle(e),ring=(s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0)||(s.boxShadow&&s.boxShadow!=='none');e.blur();const blurred=pick();e.focus({preventScroll:true});const visible=ring||focused!==blurred;const r=e.getBoundingClientRect();return {tag:e.tagName,name:(e.getAttribute('aria-label')||e.textContent||e.getAttribute('name')||'').trim().slice(0,40),visible,onScreen:r.width>0&&r.height>0};}));}
  // Al pasar el último control el foco sale un paso a la interfaz del navegador (BODY) y vuelve al inicio; dos seguidos indican pérdida real.
  const lost=focus[0].tag==='BODY'?1:focus.filter((f,i)=>i&&f.tag==='BODY'&&focus[i-1].tag==='BODY').length,invisible=focus.filter(f=>f.tag!=='BODY'&&(!f.visible||!f.onScreen));
  report.keyboard.push({role,path,steps:focus.length,lostToBody:lost,withoutVisibleFocus:invisible});
  report.layout.push({browser:'chromium',viewport:'1366x768',role,path,pageErrors:errors});
  await page.screenshot({path:`${artifacts}/${(label??'anonimo')}-${path.replace(/[^a-z0-9]+/gi,'_').slice(0,60)}.png`,fullPage:false});
  await page.close();
 }
 const axeFailures=report.axe.filter(r=>r.violations.length),focusFailures=report.keyboard.filter(r=>r.withoutVisibleFocus.length||r.lostToBody);
 writeFileSync(artifacts+'/rnf09.json',JSON.stringify({axe:report.axe,keyboard:report.keyboard},null,2));
 assert.deepEqual(axeFailures.map(r=>r.path+': '+r.violations.map(v=>v.id+'('+v.impact+')').join(',')),[],'axe WCAG 2.1 A/AA');
 assert.deepEqual(focusFailures.map(r=>r.path+': '+JSON.stringify(r.withoutVisibleFocus.slice(0,3))+' perdido='+r.lostToBody),[],'foco visible con teclado');
 pass(`RNF-09: ${screens.length} pantallas de 7 perfiles sin violaciones axe-core WCAG 2.1 A/AA (etiquetas, nombres accesibles, contraste, estructura) y con foco visible en 30 tabulaciones sin perderse`);

 // RNF-10: Chromium y Firefox en tres resoluciones de escritorio; sin desborde horizontal ni errores de script.
 for(const [name,engine] of Object.entries(browsers)){
  await browser.close();browser=await engine.launch();for(const key of Object.keys(sessions))delete sessions[key];
  for(const viewport of viewports){
   for(const [role,,path] of screens){
    const c=role==='ANÓNIMO'?await browser.newContext({locale:'es-BO',viewport:{width:viewport[0],height:viewport[1]}}):await context(emails[role],viewport),page=await c.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(origin+path);await settle(page);
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-window.innerWidth,heading:!!document.querySelector('h1, h2'),title:document.title}));
    // A 1024 px aparecen regiones con desplazamiento horizontal: deben seguir siendo operables con teclado.
    const axeViolations=name==='chromium'&&viewport[0]===1024?await page.addScriptTag({content:axeSource}).then(()=>page.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']})).violations.map(v=>v.id))):[];
    report.layout.push({browser:name,viewport:viewport.join('x'),role,path,...layout,axeViolations,pageErrors:errors});
    if(path==='/medico/citas/'+appointmentId+'?ficha=1'||path==='/administrativo/reportes/cumplimiento')await page.screenshot({path:`${artifacts}/${name}-${viewport.join('x')}-${path.split('/')[2]}.png`});
    await c.close();
   }
  }
 }
 writeFileSync(artifacts+'/rnf10.json',JSON.stringify(report.layout,null,2));
 const layoutFailures=report.layout.filter(r=>(r.overflow??0)>1||r.heading===false||r.pageErrors.length||r.axeViolations?.length);
 assert.deepEqual(layoutFailures.map(r=>`${r.browser} ${r.viewport} ${r.path} overflow=${r.overflow} heading=${r.heading} axe=${r.axeViolations??''} errors=${r.pageErrors.join('|').slice(0,200)}`),[],'RNF-10');
 pass(`RNF-10: ${screens.length} pantallas en Chromium y Firefox a ${viewports.map(v=>v.join('×')).join(', ')} sin desborde horizontal, con encabezado, sin errores de script y sin violaciones axe a 1024 px (${report.layout.length} cargas)`);
 // Cierra la atención de prueba para no dejar citas activas del estudiante en la base compartida.
 const closer=await context(emails.REVIEW_DOCTOR),current=(await api(closer,'/api/medical/patients/'+patientId+'/clinical-background')).data?.current;
 const bg={versionEsquema:1,alergias:{estado:'DESCONOCIDO',elementos:[]},enfermedadesPersonales:{estado:'DESCONOCIDO',elementos:[]},cirugias:{estado:'DESCONOCIDO',elementos:[]},medicamentos:{estado:'DESCONOCIDO',elementos:[]},antecedentesFamiliares:{estado:'DESCONOCIDO',elementos:[]},habitos:{}};
 await api(closer,'/api/medical/patients/'+patientId+'/clinical-background','PATCH',{data:current?.data??bg,expectedVersion:current?.versionNo??0,changeReason:'Accesibilidad FECORTE '+seed,encounterId});
 await api(closer,'/api/medical/encounters/'+encounterId+'/finalize','POST',{chiefComplaint:'Control accesibilidad FECORTE '+seed,assessment:'Sin hallazgos',diagnosisText:'',reviewHistory:{}});await closer.close();
 writeFileSync(artifacts+'/resultado.json',JSON.stringify({status:'PASS',results,webkit:'no ejecutado: faltan dependencias del sistema (libevent-2.1-7t64, libavif16, libmanette-0.2-0) que requieren sudo'},null,2));
}catch(error){writeFileSync(artifacts+'/error.txt',String(error?.stack||error));writeFileSync(artifacts+'/parcial.json',JSON.stringify(report,null,2));throw error;}
finally{await browser.close();}
