// CAP-FIGURAS: solo pila desechable con datos ficticios, jamás la base operativa.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const { chromium } = await import(process.env.DEMO_PLAYWRIGHT || 'playwright');
const origin = process.env.DEMO_ORIGIN || 'http://127.0.0.1:3100';
assert.equal(origin, 'http://127.0.0.1:3100', 'Usar únicamente el frontend de la pila de capturas');
const password = readFileSync(process.env.DEMO_PASSWORD_FILE, 'utf8').trim();
const dest = process.env.DEMO_ARTIFACTS || '../../ENTREGAS_CODEX/CAP-FIGURAS';
mkdirSync(dest+'/figuras',{recursive:true}); mkdirSync(dest+'/crudo',{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.DEMO_CHROMIUM?{executablePath:process.env.DEMO_CHROMIUM}:{})});
const contexts=[],captures=[]; let page;
async function login(email){
 const c=await browser.newContext({locale:'es-BO',timezoneId:'America/La_Paz',viewport:{width:1440,height:900}});contexts.push(c);
 const csrf=(await (await c.request.get(origin+'/api/v1/security/csrf')).json()).data;
 const r=await c.request.post(origin+'/api/v1/auth/login',{headers:{[csrf.headerName]:csrf.token},data:{email,password}});
 assert.equal(r.status(),200,`Login de ${email}`); return c;
}
async function capture(id,description,fullPage=false){
 await page.locator('body').waitFor(); await page.evaluate(()=>document.fonts.ready);
 const text=await page.locator('body').innerText(); assert(!/Consultando tus citas…|Cargando sugerencias…|Cargando vacunas…/.test(text),'Quedó un estado de carga');
 const name=`figura-${id}.png`, png=await page.screenshot({path:dest+'/figuras/'+name,fullPage});
 captures.push({id,archivo:name,fecha:new Date().toISOString(),ruta:new URL(page.url()).pathname,sha256:createHash('sha256').update(png).digest('hex'),descripcion:description,datos:'sintéticos'});
 console.log('CAPTURA',id,description);
}
try{
 const admin=await login('admin@demo.invalid'),student=await login('estudiante@demo.invalid'),auditor=await login('auditor@demo.invalid'),reporter=await login('reportes@demo.invalid');
 const consent=(await (await student.request.get(origin+'/api/me/consents')).json()).data;
 if(consent.pending){const csrf=(await (await student.request.get(origin+'/api/v1/security/csrf')).json()).data;const saved=await student.request.post(origin+'/api/me/consents',{headers:{[csrf.headerName]:csrf.token},data:{termsVersion:consent.terms.currentVersion,termsAccepted:true,researchVersion:consent.research.currentVersion,researchAccepted:false}});assert.equal(saved.status(),200);}
 page=await student.newPage();await page.goto(origin+'/estudiante');
 await page.getByText('Dr. Carlos Méndez',{exact:true}).waitFor();await page.getByText('Confirmada',{exact:true}).waitFor();
 assert(!/lista de espera/i.test(await page.locator('body').innerText()));await capture('3.54','Portal del estudiante con próxima cita confirmada');
 assert.equal((await reporter.request.get(origin+'/api/reports/clinical?from=2026-11-01&to=2026-11-30')).status(),200);
 page=await auditor.newPage();await page.goto(origin+'/administrativo/auditoria');
 await page.getByRole('region',{name:'Eventos registrados',exact:true}).waitFor();await page.getByRole('table',{name:'Bitácora persistida'}).locator('tbody tr').first().waitFor();await page.evaluate(()=>window.scrollTo(0,270));await capture('3.55','Auditoría con eventos del entorno de demostración');
 page=await admin.newPage();await page.goto(origin+'/administrativo/vacunas');
 await page.getByRole('button',{name:'Editar Hepatitis B'}).waitFor();await page.getByRole('button',{name:'Editar Sarampión-Rubéola'}).waitFor();await page.evaluate(()=>window.scrollTo(0,580));await capture('3.57','Catálogo de vacunas y esquemas de dosis');
 page=await admin.newPage();await page.goto(origin+'/administrativo/estudiantes/d3000000-0000-4000-8000-000000000001/carnet-vacunacion');
 await page.getByRole('heading',{name:'Historial de vacunación'}).waitFor();await page.getByText('Este historial no reemplaza el carnet de vacunación oficial, que emite el Ministerio de Salud.',{exact:true}).waitFor();await page.getByRole('cell',{name:'HB-2026-018'}).waitFor();await capture('3.58','Historial de vacunación del paciente en Administración');
 page=await student.newPage();await page.goto(origin+'/estudiante/vacunas');await page.getByRole('cell',{name:'HB-2026-018'}).waitFor();await capture('3.58-carnet','Historial de vacunación del estudiante');
 page=await reporter.newPage();await page.goto(origin+'/administrativo/reportes');
 await page.getByRole('button',{name:'Aplicar filtros'}).waitFor();await page.getByLabel('Desde',{exact:true}).fill('2026-11-01');await page.getByLabel('Hasta',{exact:true}).fill('2026-11-30');
 await page.getByRole('combobox',{name:/Agrupar por/}).selectOption('specialty');
 const r=page.waitForResponse(r=>r.url().includes('/api/reports/clinical?')&&r.request().method()==='GET');await page.getByRole('button',{name:'Aplicar filtros'}).click();assert.equal((await r).status(),200);
 await page.getByRole('region',{name:'Resultado aplicado'}).getByText(/1 atención/).first().waitFor();await page.evaluate(()=>window.scrollTo(0,0));await capture('3.59','Constructor de reportes con agrupación y resultado',true);
 page=await admin.newPage();await page.goto(origin+'/administrativo/planificacion?date=2026-11-12');
 const card=page.locator('article[data-suggestion-id="d7000000-0000-4000-8000-000000000001"]');await card.waitFor();await card.getByText(/Capacidad de la jornada: 10 lugares/).waitFor();
 if (await card.getByRole('button',{name:'Aceptar',exact:true}).count()) { await card.getByRole('button',{name:'Aceptar',exact:true}).click(); await card.getByRole('button',{name:'Confirmar decisión'}).click(); } await card.getByText(/Decisión: Aceptada/).waitFor();await page.reload();await card.getByText(/Decisión: Aceptada/).waitFor();await capture('3.61','Sugerencia de la jornada explicada y decisión registrada');
 page=await student.newPage();await page.goto(origin+'/estudiante/avisos');await page.getByRole('heading',{name:'Mis avisos'}).waitFor();await page.locator('article[aria-label]').first().waitFor();await capture('3.62','Bandeja de avisos del estudiante');
 writeFileSync(dest+'/crudo/indice-capturas.json',JSON.stringify({origen:origin,viewport:'1440x900',capturas:captures},null,2)+'\n');console.log('PASS',captures.length,'capturas');
}catch(e){if(page){await page.screenshot({path:dest+'/crudo/error.png',fullPage:true}).catch(()=>{});writeFileSync(dest+'/crudo/error.txt',String(e)+'\n');}throw e;}finally{await Promise.all(contexts.map(c=>c.close()));await browser.close();}
