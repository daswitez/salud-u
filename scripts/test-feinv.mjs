// Local synthetic acceptance; no production data. Requires Next + Spring + PostgreSQL.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync,unlinkSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
const {chromium}=await import(process.env.FEINV_PLAYWRIGHT||'playwright');
const origin=process.env.FEINV_ORIGIN||'http://localhost:3000',artifacts=process.env.FEINV_ARTIFACTS||'/tmp/salud-u-feinv-evidence',seed=Date.now(),marker='FEINV-'+seed,password='SaludDemo2026!';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));mkdirSync(artifacts,{recursive:true});
const sql=q=>execFileSync('docker',['compose','exec','-T','postgres','sh','-c','psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'],{cwd:fileURLToPath(new URL('../../salud-u-backend/',import.meta.url)),input:q,encoding:'utf8'}).trim();
const uuid=s=>{assert.match(s,/^[0-9a-f-]{36}$/);return "'"+s+"'";};
// Lee el ZIP/XLSX descargado sin ejecutar nada de su contenido: devuelve cada entrada como texto.
const unzip=path=>JSON.parse(execFileSync('python3',['-I','-c','import sys,json,zipfile\nz=zipfile.ZipFile(sys.argv[1])\nprint(json.dumps({n:z.read(n).decode("utf-8") for n in z.namelist()}))',path],{encoding:'utf8'}));
const csvRows=text=>text.replace(/^﻿/,'').trim().split('\n').map(line=>line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).filter(c=>c!=='').map(c=>c.replace(/,$/,'').replace(/^"|"$/g,'').replace(/""/g,'"')));
const browser=await chromium.launch({headless:true,...(process.env.FEINV_CHROMIUM?{executablePath:process.env.FEINV_CHROMIUM}:{})}),traffic=[],results=[];const pass=s=>{results.push(s);console.log('PASS '+s);};
async function api(c,path,method='GET',data,status=200){const headers={};if(method!=='GET'){const t=(await(await c.request.get(origin+'/api/v1/security/csrf')).json()).data;headers[t.headerName]=t.token;}const r=await c.request.fetch(origin+path,{method,data,headers});const type=r.headers()['content-type']||'';const b=r.status()===204?null:type.includes('json')?await r.json():await r.body();assert.equal(r.status(),status,method+' '+path+' '+(type.includes('json')?JSON.stringify(b):type));return b;}
async function signIn(c,email){await api(c,'/api/v1/auth/login','POST',{email,password});}
async function login(email){const c=await browser.newContext({locale:'es-BO',timezoneId:'America/La_Paz',viewport:{width:1440,height:1100},acceptDownloads:true});await signIn(c,email);c.on('request',r=>traffic.push({method:r.method(),url:r.url(),body:r.method()==='POST'&&r.url().includes('/api/research/')?r.postData():undefined}));return c;}
try{
 const adminEmail='admin.demo@salud-universitaria.test',admin=await login(adminEmail),doctor=await login('revision.ana.demo@salud-universitaria.test');
 const adminUser=(await api(admin,'/api/me')).user,doctorUser=(await api(doctor,'/api/me')).user;
 async function principal(label,roles){const email='feinv.'+label+'.'+seed+'@salud-universitaria.test',id=(await api(admin,'/api/v1/admin/principals','POST',{email,displayName:label+' FEINV '+seed,password,roles},201)).data.id;return {email,id,context:await login(email)};}
 const reporter=await principal('reportes',['REPORTING_OFFICER']),otherReporter=await principal('reportes2',['REPORTING_OFFICER']),student=await principal('estudiante',['STUDENT']),auditor=await principal('auditor',['AUDITOR']);
 const careerCode=marker.replace('-','_'),career=(await api(admin,'/api/v1/admin/catalogs/CAREER','POST',{code:careerCode,name:'Carrera '+marker,active:true})).data.id,period='2026-'+seed;
 const staff=sql(`SELECT pe.id FROM salud_u.personal pe WHERE pe.activo AND pe.id_principal=${uuid(doctorUser.id)};`),today=sql(`SELECT (now() AT TIME ZONE 'America/La_Paz')::date;`),from=sql(`SELECT ((now() AT TIME ZONE 'America/La_Paz')::date - 7);`);
 const [a,b]=[randomUUID(),randomUUID()],code=n=>marker.replace('-','')+n,secretDiagnosis='Diagnostico reservado '+marker;
 sql(`INSERT INTO salud_u.paciente(id,carnet,carnet_normalizado,codigo_registro,codigo_registro_normalizado,nombres,apellidos,fecha_nacimiento,email,creado_por,actualizado_por) VALUES
  (${uuid(a)},'${code('A')}','${code('A')}','REG-${code('A')}','REG${code('A')}','Nombre${seed}','ApellidoA${seed}',current_date - interval '22 years','a${seed}@example.invalid',${uuid(adminUser.id)},${uuid(adminUser.id)}),
  (${uuid(b)},'${code('B')}','${code('B')}','REG-${code('B')}','REG${code('B')}','NombreB${seed}','ApellidoB${seed}',NULL,NULL,${uuid(adminUser.id)},${uuid(adminUser.id)});
 INSERT INTO salud_u.inscripcion_academica(id_paciente,id_carrera,periodo_academico,iniciado_en,estado) VALUES (${uuid(a)},${uuid(career)},'${period}',current_date-30,'ACTIVE'),(${uuid(b)},${uuid(career)},'${period}',current_date-30,'ACTIVE');`);
 for(const [patient,diagnoses] of [[a,2],[b,0]]){const slot=randomUUID(),appointment=randomUUID(),encounter=randomUUID();sql(`INSERT INTO salud_u.cupo_disponibilidad(id,id_personal,inicia_a,termina_a,capacidad,estado,publicado_en,creado_por) VALUES (${uuid(slot)},${uuid(staff)},now()-interval '2 days',now()-interval '2 days'+interval '30 minutes',1,'CLOSED',now()-interval '3 days',${uuid(doctorUser.id)});
  INSERT INTO salud_u.cita(id,id_paciente,id_cupo,tipo_cita,estado,id_personal_asignado,programada_para) VALUES (${uuid(appointment)},${uuid(patient)},${uuid(slot)},'INITIAL','ATTENDED',${uuid(staff)},now()-interval '2 days');
  INSERT INTO salud_u.encuentro_clinico(id,id_cita,id_paciente,id_personal,tipo_encuentro,estado,cerrado_en,cerrado_por) VALUES (${uuid(encounter)},${uuid(appointment)},${uuid(patient)},${uuid(staff)},'INITIAL','CLOSED',now()-interval '2 days',${uuid(doctorUser.id)});
  ${Array.from({length:diagnoses},()=>`INSERT INTO salud_u.diagnostico_encuentro(id_encuentro,texto_libre,creado_por) VALUES (${uuid(encounter)},'${secretDiagnosis}',${uuid(doctorUser.id)});`).join('\n')}`);}
 const vaccine=(await api(admin,'/api/vaccines','POST',{code:marker+'-V',name:'Vacuna '+marker,active:true,doses:[{doseNumber:1,minimumIntervalDays:0}]},201)).data.id;
 await api(admin,'/api/vaccinations','POST',{patientId:b,vaccineId:vaccine,doseNumber:1,appliedOn:today,lot:'LOT-'+seed,applicatorStaffId:staff},201);
 const forbidden=[code('A'),code('B'),'REG-'+code('A'),'Nombre'+seed,'ApellidoA'+seed,'ApellidoB'+seed,'a'+seed+'@example.invalid',secretDiagnosis,a,b,'LOT-'+seed];
 const columns=['research_pseudonym','encounter_month','age_band','career_code','academic_period','encounter_type','specialty_code','diagnosis_count','vaccination_dose_count'],month=today.slice(0,7);

 const rp=await reporter.context.newPage(),downloads=[];rp.on('download',d=>downloads.push(d));
 await rp.goto(origin+'/administrativo/reportes/cumplimiento');await rp.waitForLoadState('networkidle');await rp.getByRole('link',{name:/Exportación para investigación/}).first().click();await rp.waitForURL('**/reportes/investigacion');
 const section=rp.getByRole('region',{name:'Exportación para investigación'}),form=rp.getByRole('form',{name:'Solicitud de exportación'}),alert=section.locator('p[role="alert"]'),result=rp.getByRole('region',{name:'Resultado de la exportación'});
 await section.getByRole('region',{name:'Modo de exportación'}).getByText('No requiere aprobación previa',{exact:false}).waitFor();
 const purpose='Estudio de demanda estudiantil '+seed,purposeBox=form.getByRole('textbox',{name:'Finalidad de la exportación'});
 await form.getByRole('combobox',{name:/^Carrera/}).locator(`option[value="${career}"]`).waitFor({state:'attached'});
 await purposeBox.fill(purpose);await form.getByLabel('Atenciones desde').fill(from);await form.getByLabel('Atenciones hasta').fill(today);await form.getByRole('combobox',{name:/^Carrera/}).selectOption(career);
 const exportOnce=async(expected)=>{const response=rp.waitForResponse(r=>r.url()===origin+'/api/research/exports'&&r.request().method()==='POST'),download=rp.waitForEvent('download');await form.getByRole('button',{name:'Exportar y descargar',exact:true}).focus();await rp.keyboard.press('Enter');const [res,file]=await Promise.all([response,download]);assert.equal(res.status(),200);const target=artifacts+'/'+file.suggestedFilename();await file.saveAs(target);const bytes=readFileSync(target);assert.equal(createHash('sha256').update(bytes).digest('hex'),res.headers()['x-content-sha256']);await result.getByText('Finalidad confirmada por el servidor.',{exact:false}).waitFor();if(expected!==undefined)assert.equal(Number(res.headers()['x-export-row-count']),expected);return {headers:res.headers(),body:JSON.parse(res.request().postData()),path:target,id:res.headers()['x-export-id']};};
 const csv=await exportOnce(2);
 assert.deepEqual(csv.body,{purpose,filters:{from,to:today,careerId:career},format:'CSV'});assert.match(csv.path,/investigacion-[0-9a-f-]{36}\.zip$/);
 const zip=unzip(csv.path);assert.deepEqual(Object.keys(zip).sort(),['dictionary.csv','research-data.csv']);const data=csvRows(zip['research-data.csv']),dictionary=csvRows(zip['dictionary.csv']);
 assert.deepEqual(data[0],columns);assert.equal(data.length,3);assert.deepEqual(dictionary.slice(1).map(r=>r[0]),columns);assert(dictionary.slice(1).every(r=>r[1].length>20));
 const rows=data.slice(1).map(r=>Object.fromEntries(columns.map((c,i)=>[c,r[i]])));
 for(const r of rows){assert.match(r.research_pseudonym,/^R-[0-9A-F]{20}$/);assert.equal(r.encounter_month.slice(0,7),sql(`SELECT to_char(((now()-interval '2 days') AT TIME ZONE 'America/La_Paz')::date,'YYYY-MM');`));assert.match(r.encounter_month,/-01$/);assert.equal(r.career_code,careerCode);assert.equal(r.academic_period,period);assert.equal(r.encounter_type,'INITIAL');}
 assert.deepEqual(rows.map(r=>[r.age_band,r.diagnosis_count,r.vaccination_dose_count]).sort(),[['20_24','2','0'],['UNKNOWN','0','1']]);
 const everything=Object.values(zip).join('\n');for(const value of forbidden)assert(!everything.includes(value),'identificador excluido presente: '+value);assert(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(everything));
 const constancy=result.getByRole('definition');await constancy.filter({hasText:purpose}).waitFor();await constancy.filter({hasText:'Carrera: Carrera '+marker}).waitFor();await constancy.filter({hasText:'CSV · 2 atención(es)'}).waitFor();await constancy.filter({hasText:'MONTHLY-V1 · mes '+month}).waitFor();
 const stored=sql(`SELECT finalidad||'|'||formato||'|'||cantidad_filas||'|'||checksum_sha256||'|'||mes_politica||'|'||(filtros->>'careerId') FROM salud_u.exportacion_investigacion WHERE id=${uuid(csv.id)} AND id_solicitante=${uuid(reporter.id)};`);
 assert.equal(stored,[purpose,'CSV',2,csv.headers['x-content-sha256'],month,career].join('|'));
 assert.equal(sql(`SELECT count(*) FROM salud_u.evento_auditoria WHERE accion='RESEARCH_EXPORT_COMPLETED' AND id_recurso=${uuid(csv.id)} AND id_actor=${uuid(reporter.id)} AND detalles->>'purpose'=$$${purpose}$$;`),'1');
 await rp.reload();await constancy.filter({hasText:purpose}).waitFor();assert.equal(await form.getByRole('combobox',{name:/^Carrera/}).inputValue(),career);assert.equal(await form.getByLabel('Atenciones desde').inputValue(),from);assert(new URL(rp.url()).searchParams.get('exportId')===csv.id);
 pass('Reportes llega desde la navegación, ve el modo seudonimizado sin aprobación previa, envía finalidad/filtros/formato con teclado y descarga ZIP íntegro (SHA-256) con datos y diccionario; columnas permitidas, edad en rangos, mes, sin carnet/registro/nombres/correo/UUID/diagnóstico/lote; constancia confirmada y persistida tras recargar');

 await form.getByRole('radio',{name:/Excel \(XLSX\)/}).check();await form.getByRole('combobox',{name:/^Vacuna recibida/}).selectOption(vaccine);await purposeBox.fill(purpose+' XLSX');
 const xlsx=await exportOnce(1);assert.deepEqual(xlsx.body.filters,{from,to:today,careerId:career,vaccineId:vaccine});assert.equal(xlsx.body.format,'XLSX');
 const book=unzip(xlsx.path);assert.match(book['xl/workbook.xml'],/name="Research data"/);assert.match(book['xl/workbook.xml'],/name="Dictionary"/);const workbookText=Object.values(book).join('\n');
 for(const c of columns)assert(workbookText.includes('>'+c+'<'),c);for(const value of forbidden)assert(!workbookText.includes(value),'identificador excluido presente: '+value);
 const csvPseudonymB=rows.find(r=>r.vaccination_dose_count==='1').research_pseudonym;assert(workbookText.includes(csvPseudonymB),'el seudónimo se mantiene dentro del mes');
 assert.equal(new URL(rp.url()).searchParams.get('format'),'XLSX');assert.equal(new URL(rp.url()).searchParams.get('vaccineId'),vaccine);
 pass('Exportación XLSX filtrada por vacuna: hojas Research data y Dictionary, sólo columnas permitidas, mismo seudónimo dentro del mes (política MONTHLY-V1), formato y selección en la URL');

 const before=downloads.length,keep=async()=>{assert.equal(await purposeBox.inputValue(),purpose+' XLSX');assert.equal(await form.getByRole('combobox',{name:/^Carrera/}).inputValue(),career);assert.equal(await form.getByRole('combobox',{name:/^Vacuna recibida/}).inputValue(),vaccine);assert.equal(downloads.length,before);};
 const submit=async()=>{await form.getByRole('button',{name:'Exportar y descargar',exact:true}).focus();await rp.keyboard.press('Enter');};
 const posts=()=>traffic.filter(t=>t.method==='POST'&&t.url===origin+'/api/research/exports').length;
 await purposeBox.fill('  ');const sentBefore=posts();await submit();await alert.filter({hasText:'Indica la finalidad'}).waitFor();assert(await purposeBox.evaluate(n=>n===document.activeElement));assert.equal(await purposeBox.getAttribute('aria-invalid'),'true');assert.equal(posts(),sentBefore);
 await purposeBox.fill(purpose+' XLSX');await form.getByLabel('Atenciones desde').fill(today);await form.getByLabel('Atenciones hasta').fill(from);await submit();await alert.filter({hasText:'Revisa los filtros'}).waitFor();assert(await alert.evaluate(n=>n===document.activeElement));assert.equal(await result.count(),0);await keep();
 await form.getByLabel('Atenciones desde').fill(from);await form.getByLabel('Atenciones hasta').fill(today);
 for(const [mode,text] of [['network','problema de conexión'],['server','Error recuperable FEINV'],['truncated','incompleto o no es válido']]){await rp.route('**/api/research/exports',async r=>{if(mode==='network')return r.abort('failed');if(mode==='server')return r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'Error recuperable FEINV'})});const real=await r.fetch(),body=await real.body();await r.fulfill({response:real,body:body.subarray(0,body.length-40)});});await submit();await alert.filter({hasText:text}).waitFor();assert.equal(await result.count(),0);await keep();await rp.unroute('**/api/research/exports');}
 await api(reporter.context,'/api/v1/session/logout','POST',undefined,204);await submit();await alert.filter({hasText:'Tu sesión expiró.'}).waitFor();await rp.getByRole('link',{name:'Iniciar sesión en otra pestaña y conservar la solicitud'}).waitFor();await keep();
 await signIn(reporter.context,reporter.email);const recovered=await exportOnce(1);assert.equal(recovered.body.purpose,purpose+' XLSX');
 pass('Finalidad vacía (sin solicitud), rango inválido (400 de Spring), red, servidor, archivo truncado y sesión vencida muestran el error con foco, no descargan ningún archivo, conservan finalidad/filtros/formato y se recuperan al reintentar');

 for(const c of [student.context,doctor,auditor.context]){await api(c,'/api/research/exports','POST',{purpose:'Intento ajeno',filters:{},format:'CSV'},403);await api(c,'/api/research/exports/'+csv.id,'GET',undefined,403);}
 await api(otherReporter.context,'/api/research/exports/'+csv.id,'GET',undefined,404);await api(reporter.context,'/api/research/exports','POST',{purpose:'Filtro desconocido',filters:{patientId:a},format:'CSV'},400);
 const anon=await browser.newContext();assert.equal((await anon.request.post(origin+'/api/research/exports',{data:{purpose:'x',filters:{},format:'CSV'}})).status(),403);assert.equal((await anon.request.get(origin+'/api/research/exports/'+csv.id)).status(),401);
 const restricted=await auditor.context.newPage();await restricted.goto(origin+'/administrativo/reportes/investigacion');await restricted.getByText('No tienes permiso para exportar datos de investigación.',{exact:true}).waitFor();
 for(const c of [student.context,doctor]){const blocked=await c.newPage();await blocked.goto(origin+'/administrativo/reportes/investigacion');await blocked.waitForURL(u=>!u.pathname.startsWith('/administrativo'));}
 const ap=await admin.newPage();await ap.goto(origin+'/administrativo/reportes');await ap.waitForLoadState('networkidle');await ap.getByRole('link',{name:'Exportar datos seudonimizados para investigación →'}).click();await ap.getByRole('region',{name:'Modo de exportación'}).waitFor();
 assert.equal(sql(`SELECT count(*) FROM salud_u.exportacion_investigacion WHERE finalidad='Intento ajeno';`),'0');
 pass('Estudiante, médico y Auditor reciben 403 al exportar o leer constancias (Auditor ve acceso restringido; estudiante y médico salen del área administrativa); otro Reportes no ve constancias ajenas (404); filtro desconocido 400; anónimo rechazado; Administración llega desde Reportes');

 const researchTraffic=traffic.filter(t=>t.url.includes('/api/research/'));assert(researchTraffic.length>0&&researchTraffic.every(t=>t.url.startsWith(origin+'/api/')));assert(!traffic.some(t=>/supabase/i.test(t.url)));
 // CSV, XLSX, el truncado en tránsito (Spring sí lo generó completo y lo registró) y el reintento; validación, red, 500 y sesión no registran.
 assert.equal(sql(`SELECT count(*) FROM salud_u.exportacion_investigacion WHERE id_solicitante=${uuid(reporter.id)};`),'4');
 await rp.screenshot({path:artifacts+'/investigacion.png',fullPage:true});
 pass('Procedencia sólo para archivos que Spring generó completos (4: CSV, XLSX, el truncado en tránsito y el reintento); validación, red, servidor y sesión no la registran; tráfico al mismo origen hacia Spring y sin llamadas Supabase');
 if(existsSync(artifacts+'/error.txt'))unlinkSync(artifacts+'/error.txt');writeFileSync(artifacts+'/resultado.json',JSON.stringify({status:'PASS',results,career,period,patients:[a,b],exports:{csv:csv.id,xlsx:xlsx.id,recovered:recovered.id},rows,traffic:researchTraffic},null,2));
}catch(e){for(const [i,c] of browser.contexts().entries())for(const [j,p] of c.pages().entries()){writeFileSync(artifacts+`/fallo-${i}-${j}.txt`,p.url()+'\n'+await p.locator('body').innerText().catch(()=>''));}writeFileSync(artifacts+'/error.txt',String(e.stack||e));throw e;}finally{await browser.close();}
