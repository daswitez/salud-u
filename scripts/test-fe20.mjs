import { segundoFactor } from "./lib/segundo-factor.mjs";
// Local synthetic acceptance. Run test-fe19 first to prepare closed records, source and adendas.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.FE20_PLAYWRIGHT || "playwright");
const origin=process.env.FE20_ORIGIN||"http://localhost:3000", artifacts=process.env.FE20_ARTIFACTS||"/tmp/salud-u-fe20-evidence";
assert(["localhost","127.0.0.1"].includes(new URL(origin).hostname));mkdirSync(artifacts,{recursive:true});
const fixture=JSON.parse(readFileSync(process.env.FE20_FIXTURE||"/tmp/salud-u-fe19-evidence/resultado.json","utf8"));assert.equal(fixture.status,"PASS");const own=fixture.own;
const sql=query=>execFileSync("docker",["compose","exec","-T","postgres","sh","-c",'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'],{cwd:fileURLToPath(new URL("../../salud-u-backend/",import.meta.url)),input:query,encoding:"utf8"}).trim();
const uuid=id=>{assert.match(id,/^[0-9a-f-]{36}$/);return "'"+id+"'";};
const browser=await chromium.launch({headless:true,...(process.env.FE20_CHROMIUM?{executablePath:process.env.FE20_CHROMIUM}:{})});
const results=[],traffic=[],password=process.env.FE20_PASSWORD||"SaludDemo2026!";
const pass=message=>{results.push(message);console.log("PASS "+message);};
async function authenticate(c,email){const csrf=(await(await c.request.get(origin+"/api/v1/security/csrf")).json()).data;const r=await c.request.post(origin+"/api/v1/auth/login",{data:{email,password},headers:{[csrf.headerName]:csrf.token}});assert.equal(r.status(),200);await segundoFactor(c,origin,{email,password},await r.json());}
async function login(email){const c=await browser.newContext({locale:"es-BO",timezoneId:"America/La_Paz",viewport:{width:1366,height:1000},acceptDownloads:true});await authenticate(c,email);c.on("request",r=>traffic.push({method:r.method(),url:r.url()}));return c;}
async function json(c,path){const r=await c.request.get(origin+path);assert.equal(r.status(),200);return(await r.json()).data;}
const exportPath=id=>"/api/medical/encounters/"+id+"/export.docx";
function inspect(file){return JSON.parse(execFileSync("python3",["-c",`import zipfile,xml.etree.ElementTree as E,json,sys
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 root=E.fromstring(z.read('word/document.xml'))
 ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
 text='\\n'.join(''.join(p.itertext()) for p in root.findall('.//w:p',ns))
 heads=' '.join(z.read(n).decode() for n in z.namelist() if n.startswith('word/header') and n.endswith('.xml'))
 print(json.dumps({'text':text,'logos':sum(n.startswith('word/media/') for n in z.namelist()),'institution':'UAGRM' in heads,'files':len(z.namelist())}))`,file],{encoding:"utf8"}));}
async function open(c,id){const page=await c.newPage();await page.goto(origin+"/medico/pacientes/"+own.patientId);await page.locator('[data-history-encounter-id="'+id+'"]').click();const panel=page.getByRole("region",{name:"Exportar ficha Word",exact:true});await panel.waitFor();return {page,panel};}
async function download(page,panel,name){const received=page.waitForEvent("download");await panel.getByRole("button",{name:"Descargar ficha Word",exact:true}).focus();await page.keyboard.press("Enter");const d=await received;assert.equal(await d.failure(),null);assert.match(d.suggestedFilename(),/^ficha-clinica-[0-9a-f-]+\.docx$/);const path=artifacts+"/"+name+".docx";await d.saveAs(path);await panel.getByRole("status").waitFor();return inspect(path);}
function graph(){return sql("SELECT md5(jsonb_build_object('e',(SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM salud_u.encuentro_clinico e WHERE id_paciente="+uuid(own.patientId)+"),'f',(SELECT jsonb_agg(to_jsonb(f) ORDER BY f.id) FROM salud_u.version_ficha_especialidad f JOIN salud_u.encuentro_clinico e ON e.id=f.id_encuentro WHERE e.id_paciente="+uuid(own.patientId)+"),'a',(SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM salud_u.adenda_encuentro_clinico a JOIN salud_u.encuentro_clinico e ON e.id=a.id_encuentro WHERE e.id_paciente="+uuid(own.patientId)+"))::text);");}
try{
 const before=graph(),special=await login("fe09.especialista@salud-universitaria.test"),review=await login("revision.ana.demo@salud-universitaria.test");
 const history=await json(special,"/api/medical/patients/"+own.patientId),amendments=(await json(special,"/api/medical/encounters/"+own.encounterId+"/amendments")).items;
 const {page,panel}=await open(special,own.encounterId);const purpose=panel.getByRole("textbox",{name:"Finalidad de la exportación *",exact:true});
 const pending=page.getByRole("region",{name:"Correcciones auditables",exact:true});await pending.getByRole("textbox",{name:"Motivo de corrección *",exact:true}).fill("BORRADOR_NO_EXPORTABLE_FE20");await pending.getByRole("textbox",{name:"Contenido de la corrección *",exact:true}).fill("Texto pendiente no guardado");
 await purpose.fill("Continuidad clínica FE20");const file=await download(page,panel,"especialidad");
 assert.equal(file.logos,2);assert(file.institution);const encounter=history.encounters.find(e=>e.id===own.encounterId);
 for(const value of [history.patient.fullName,history.patient.carnet,history.patient.registrationCode,encounter.chief_complaint,encounter.assessment,encounter.instructions,encounter.follow_up_text,encounter.template.id,"Versión de plantilla: "+encounter.template.version,"Continuidad clínica FE20","Correcciones auditables"]){if(value)assert(file.text.includes(value),value);}
 function clinicalStrings(value){if(typeof value==="string")return /[a-záéíóúñ]/.test(value)?[value]:[];if(value&&typeof value==="object")return Object.values(value).flatMap(clinicalStrings);return [];}
 for(const text of clinicalStrings(encounter.specialtyHistory))assert(file.text.includes(text),"Campo de ficha omitido: "+text);
 for(const d of history.diagnoses.filter(d=>d.encounter_id===own.encounterId))assert(file.text.includes(d.label));
 let at=0;for(const a of amendments){const index=file.text.indexOf("Adenda "+a.amendmentNo,at);assert(index>=at);at=index;for(const text of [a.reason,a.content,a.createdByName,a.createdBy])assert(file.text.includes(text),text);}
 for(const forbidden of ["SECRETO_AREA_B_FE19","DIAGNOSTICO_SECRETO_B","REVISION_NO_REMITIDA_FE19","ALERGIA_ACTUAL_FE19","BORRADOR_NO_EXPORTABLE_FE20"])assert(!file.text.includes(forbidden),forbidden);
 assert.equal(await pending.getByRole("textbox",{name:"Motivo de corrección *",exact:true}).inputValue(),"BORRADOR_NO_EXPORTABLE_FE20");
 pass("Word íntegro reabre, conserva identidad institucional/versión/plantilla/datos/orden y adendas con actor/fecha, excluye otras áreas, antecedentes posteriores y borrador sin guardar");
 const path="**"+exportPath(own.encounterId)+"?*";let downloads=0;page.on("download",()=>downloads++);
 async function failure(handler,message){await page.route(path,handler);await panel.getByRole("button",{name:"Descargar ficha Word",exact:true}).click();await panel.getByRole("alert").waitFor();if(message)assert((await panel.getByRole("alert").innerText()).includes(message));assert.equal(await purpose.inputValue(),"Continuidad clínica FE20");assert.equal(await panel.getByRole("status").count(),0);assert.equal(downloads,0);assert.equal(await pending.getByRole("textbox",{name:"Motivo de corrección *",exact:true}).inputValue(),"BORRADOR_NO_EXPORTABLE_FE20");await page.unroute(path);}
 await purpose.fill("");await panel.getByRole("button",{name:"Descargar ficha Word",exact:true}).click();assert.equal(await purpose.evaluate(e=>e.validity.valueMissing),true);await purpose.fill("Continuidad clínica FE20");
 await failure(route=>route.abort("failed"),"conexión");
 await failure(route=>route.fulfill({status:401,contentType:"application/json",body:JSON.stringify({ok:false,error:"Sesión caducada FE20"})}),"Sesión caducada");await panel.getByRole("link",{name:"Iniciar sesión en otra pestaña y conservar la finalidad"}).waitFor();
 await failure(route=>route.fulfill({status:403,contentType:"application/json",body:JSON.stringify({ok:false,error:{code:"DENIED",message:"Permiso denegado FE20"}})}),"Permiso denegado");
 await failure(route=>route.fulfill({status:500,contentType:"application/json",body:JSON.stringify({ok:false,error:"No se pudo generar el Word. Puedes reintentar la descarga."})}),"reintentar");
 await failure(route=>route.fulfill({status:200,contentType:"text/html",body:"error proxy"}),"válido");
 await failure(route=>route.fulfill({status:200,contentType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",body:Buffer.from([80,75,3,4,0,0])}),"incompleta");
 const retry=await download(page,panel,"reintento");assert(retry.text.includes("Continuidad clínica FE20"));
 const csrfLogout=(await(await special.request.get(origin+"/api/v1/security/csrf")).json()).data;
 assert.equal((await special.request.post(origin+"/api/v1/session/logout",{headers:{[csrfLogout.headerName]:csrfLogout.token}})).status(),204);
 const expiredResponse=page.waitForResponse(r=>r.url().includes(exportPath(own.encounterId))&&r.status()===401);await panel.getByRole("button",{name:"Descargar ficha Word"}).click();await expiredResponse;await panel.getByRole("link",{name:"Iniciar sesión en otra pestaña y conservar la finalidad"}).waitFor();assert.equal(await purpose.inputValue(),"Continuidad clínica FE20");assert.equal(await pending.getByRole("textbox",{name:"Motivo de corrección *",exact:true}).inputValue(),"BORRADOR_NO_EXPORTABLE_FE20");
 await authenticate(special,"fe09.especialista@salud-universitaria.test");await download(page,panel,"sesion-recuperada");
 pass("Validación, red, sesión, permiso, fallo servidor y archivo incompleto no descargan ni anuncian éxito; conservan finalidad y adenda; recuperación descarga correctamente");
 const {page:sourcePage,panel:sourcePanel}=await open(special,own.sourceEncounterId);await sourcePanel.getByRole("textbox",{name:"Finalidad de la exportación *"}).fill("Consulta del origen FE20");const source=await download(sourcePage,sourcePanel,"origen-remitido");assert(source.text.includes("Historia clínica de revisión médica"));assert(source.text.includes("Origen remitido FE19"));assert(source.text.includes("Corrección de origen FE19"));assert(!source.text.includes("AREA_A_FE19"));
 const {page:reviewPage,panel:reviewPanel}=await open(review,own.sourceEncounterId);const reviewFile=await download(reviewPage,reviewPanel,"revision");assert(reviewFile.text.includes("Historia clínica de revisión médica"));
 const reviewHistory=await json(review,"/api/medical/patients/"+own.patientId);const emptyEncounter=reviewHistory.encounters.find(e=>e.id!==own.sourceEncounterId&&e.status==="CLOSED");assert(emptyEncounter);
 const {page:emptyPage,panel:emptyPanel}=await open(review,emptyEncounter.id);const emptyFile=await download(emptyPage,emptyPanel,"sin-adendas");assert(emptyFile.text.includes("Sin correcciones registradas."));assert(!emptyFile.text.includes("Corrección de origen FE19"));
 const peerEmail=sql("SELECT p.email FROM salud_u.principal p JOIN salud_u.personal s ON s.id_principal=p.id JOIN salud_u.especialidad_personal ep ON ep.id_personal=s.id WHERE ep.id_especialidad="+uuid(own.area.id)+" AND p.email LIKE 'fe19.para.%' LIMIT 1;");assert(peerEmail);const peer=await login(peerEmail);const allowed=await peer.request.get(origin+exportPath(own.encounterId));assert.equal(allowed.status(),200);writeFileSync(artifacts+"/colega.docx",await allowed.body());assert(inspect(artifacts+"/colega.docx").text.includes(amendments[0].content));
 for(const [email,code] of [["admin.demo@salud-universitaria.test",403],["estudiante.ana.demo@salud-universitaria.test",403],["fe09.ajeno@salud-universitaria.test",404]]){const c=await login(email);const r=await c.request.get(origin+exportPath(own.encounterId));assert.equal(r.status(),code);const b=await r.json();assert.equal(typeof b.error,"string");assert(!JSON.stringify(b).includes(history.patient.fullName));}
 const otherAreaEmail=sql("SELECT email FROM salud_u.principal WHERE email LIKE 'fe19.areab.%' ORDER BY creado_en DESC LIMIT 1;");const b=await login(otherAreaEmail);assert.equal((await b.request.get(origin+exportPath(own.encounterId))).status(),404);
 const anonymous=await browser.newContext();assert.equal((await anonymous.request.get(origin+exportPath(own.encounterId))).status(),401);
 for(const value of [" ","x".repeat(501)])assert.equal((await special.request.get(origin+exportPath(own.encounterId)+"?"+new URLSearchParams({purpose:value}))).status(),400);
 const draft=sql("SELECT id FROM salud_u.encuentro_clinico WHERE estado='DRAFT' ORDER BY ocurrido_en DESC LIMIT 1;");assert(draft);assert.equal((await special.request.get(origin+exportPath(draft))).status(),404);
 assert.equal((await special.request.get(origin+exportPath("00000000-0000-0000-0000-000000000001"))).status(),404);
 pass("Revisión, especialidad, colega autorizado y origen remitido descargan; ajeno, otra área, administración, estudiante, anónimo, borrador e inexistente rechazados sin datos clínicos");
 await page.reload();await page.locator('[data-history-encounter-id="'+own.encounterId+'"]').click();await page.getByRole("region",{name:"Exportar ficha Word"}).waitFor();const reloaded=await json(special,"/api/medical/encounters/"+own.encounterId+"/amendments");assert.equal(reloaded.items.length,amendments.length);assert.equal(before,graph());
 const audits=JSON.parse(sql("SELECT coalesce(jsonb_agg(jsonb_build_object('actor',id_actor,'recurso',id_recurso,'detalle',detalles,'accion',accion)), '[]') FROM salud_u.evento_auditoria WHERE accion='FICHA_WORD_EXPORTADA' AND id_recurso IN ("+uuid(own.encounterId)+","+uuid(own.sourceEncounterId)+");"));assert(audits.length>=5);assert(audits.every(a=>a.detalle.formato==="DOCX"&&typeof a.detalle.finalidad==="string"));assert(audits.some(a=>a.detalle.finalidad==="Continuidad clínica FE20"));const actorId=(await(await special.request.get(origin+"/api/me")).json()).user.id;assert(audits.filter(a=>a.detalle.finalidad==="Continuidad clínica FE20"||a.detalle.finalidad==="Consulta del origen FE20").every(a=>a.actor===actorId));assert(new Set(audits.map(a=>a.actor)).size>=3);assert(audits.every(a=>!JSON.stringify(a).includes("Corrección auditable")));
 assert(!traffic.some(r=>/supabase|supabase\.co/i.test(r.url)));await page.screenshot({path:artifacts+"/exportacion-word.png",fullPage:true});
 pass("Recarga mantiene clínica/adendas originales; exportaciones auditadas por actor/finalidad/versión y sin contenido clínico; ninguna llamada Supabase");
 writeFileSync(artifacts+"/resultado.json",JSON.stringify({status:"PASS",results,own,graphHash:before,audits,traffic,files:["especialidad.docx","reintento.docx","sesion-recuperada.docx","origen-remitido.docx","revision.docx","sin-adendas.docx","colega.docx"]},null,2));
}catch(error){writeFileSync(artifacts+"/error.txt",String(error.stack||error));throw error;}finally{await browser.close();}
