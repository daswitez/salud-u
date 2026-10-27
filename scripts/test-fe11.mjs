import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const { chromium } = await import(process.env.FE11_PLAYWRIGHT || "playwright");
const origin = process.env.FE11_ORIGIN || "http://127.0.0.1:3000";
const artifacts = process.env.FE11_ARTIFACTS || "/tmp/salud-u-fe11-evidence";
const password = process.env.FE11_PASSWORD || "SaludDemo2026!";
const sha = value => createHash("sha256").update(value).digest("hex");
function pdf() {
  const parts = ["%PDF-1.4\n"]; const positions = [0];
  const stream = "BT /F1 12 Tf 50 100 Td (Prueba FE11) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "<< /Length "+Buffer.byteLength(stream)+" >>\nstream\n"+stream+"\nendstream"];
  objects.forEach((value,i)=>{positions.push(Buffer.byteLength(parts.join("")));parts.push((i+1)+" 0 obj\n"+value+"\nendobj\n");});
  const xref=Buffer.byteLength(parts.join(""));parts.push("xref\n0 6\n0000000000 65535 f \n"+positions.slice(1).map(position=>String(position).padStart(10,"0")+" 00000 n \n").join("")+"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n");
  return Buffer.from(parts.join(""));
}
async function run() {
  assert(["127.0.0.1","localhost"].includes(new URL(origin).hostname)); mkdirSync(artifacts,{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.FE11_CHROMIUM?{executablePath:process.env.FE11_CHROMIUM}:{})});
  const traffic=[],results=[],checksums=[],cleanup=[];let admin;
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
    const response=await context.request.fetch(origin+path,{method,data,headers});const payload=response.status()===204?null:await response.json();assert.equal(response.status(),expected,method+" "+path+" "+JSON.stringify(payload));return payload;
  }
  async function signIn(context,email){await api(context,"/api/v1/auth/login","POST",{email,password});}
  async function forbiddenUpload(context,patientId,encounterId,bytes){
    const csrf=(await(await context.request.get(origin+"/api/v1/security/csrf")).json()).data;
    const response=await context.request.post(origin+"/api/medical/documents",{headers:{[csrf.headerName]:csrf.token},multipart:{patientId,encounterId,documentType:"OTHER",file:{name:"rechazado.pdf",mimeType:"application/pdf",buffer:bytes}}});
    assert.equal(response.status(),403);assert.equal(typeof(await response.json()).error,"string");
  }
  async function login(email){
    const context=await browser.newContext({locale:"es-BO",timezoneId:"America/La_Paz",viewport:{width:1366,height:1000}});
    await signIn(context,email);context.on("request",r=>{const url=new URL(r.url());if(url.searchParams.has("token"))url.searchParams.set("token","REDACTED");traffic.push({method:r.method(),url:url.href});});return context;
  }
  try {
    admin=await login("admin.demo@salud-universitaria.test");const doctor=await login("revision.ana.demo@salud-universitaria.test");const outsider=await login("fe09.ajeno@salud-universitaria.test");const student=await login("estudiante.ana.demo@salud-universitaria.test");const specialist=await login("fe09.especialista@salud-universitaria.test");
    const seed=Date.now();const career=(await api(admin,"/api/careers")).data[0];
    const patientId=(await api(admin,"/api/patients","POST",{fullName:"Paciente documentos FE11 "+seed,carnet:"FE11-"+seed,registrationCode:"REG-FE11-"+seed,birthDate:"2002-01-15",careerId:career.id,academicPeriod:"2026-II",enrollmentStart:"2026-01-01"},201)).data.id;
    async function fixture(actor,specialtyId=null){
      let starts=Date.now()+110*86400000;const slots=(await api(admin,"/api/availability-slots")).data;
      while(slots.some(s=>starts<Date.parse(s.endsAt)&&starts+1800000>Date.parse(s.startsAt)))starts+=3600000;
      const slotId=await publishSlot(actor,starts,{specialtyId});
      const requestId=(await api(admin,"/api/appointment-requests","POST",specialtyId?{patientId,appointmentType:"SPECIALTY",specialtyId}:{patientId},201)).data.id;
      const appointmentId=(await api(admin,"/api/appointment-requests/"+requestId+"/assign","POST",{slotId})).data.appointmentId;cleanup.push(appointmentId);
      const encounterId=(await api(actor,"/api/medical/appointments/"+appointmentId+"/start","POST",undefined,201)).data.encounterId;return {appointmentId,encounterId};
    }
    const first=await fixture(doctor);const endpoint="/api/medical/documents?encounterId="+first.encounterId;
    const page=await doctor.newPage();await page.goto(origin+"/medico/citas/"+first.appointmentId);await page.getByRole("link",{name:"Documentos de la atención",exact:true}).click();
    await page.getByText("No hay documentos disponibles para esta atención.",{exact:true}).waitFor();
    assert.deepEqual((await api(doctor,endpoint)).data,[]);
    const uploader=page.getByRole("region",{name:"Adjuntar documento",exact:true});const file=uploader.getByLabel("Archivo clínico",{exact:true});const description=uploader.getByLabel("Descripción (opcional)",{exact:true});
    await uploader.getByRole("button",{name:"Subir archivo",exact:true}).click();await uploader.getByRole("alert").filter({hasText:"Selecciona un archivo"}).waitFor();
    const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement("canvas");c.width=2;c.height=2;const ctx=c.getContext("2d");ctx.fillStyle="#00aaff";ctx.fillRect(0,0,2,2);return c.toDataURL("image/png").split(",")[1];}),"base64");
    async function upload(name,mime,buffer,type="OTHER",expected=201){
      await uploader.getByLabel("Tipo de documento",{exact:true}).selectOption(type);await file.setInputFiles({name,mimeType:mime,buffer});
      const response=page.waitForResponse(r=>r.url()===origin+"/api/medical/documents"&&r.request().method()==="POST");
      await uploader.getByRole("button",{name:"Subir archivo",exact:true}).focus();await page.keyboard.press("Enter");
      const r=await response;assert.equal(r.status(),expected);const body=await r.json();
      if(expected===201){assert(body.data.id);await page.getByRole("heading",{name,exact:true}).waitFor();checksums.push({id:body.data.id,sha256:sha(buffer),size:buffer.length,type});}
      else {await uploader.getByRole("alert").waitFor();assert.equal(await file.evaluate(input=>input.files[0].name),name);}
      return body;
    }
    await description.fill("Conservar descripción FE11");await upload("vacio.pdf","application/pdf",Buffer.alloc(0),"LAB_RESULT",400);
    assert.equal(await description.inputValue(),"Conservar descripción FE11");
    await upload("otro.txt","text/plain",Buffer.from("rechazar"),"OTHER",400);
    await upload("falso.pdf","application/pdf",Buffer.from("No es PDF"),"LAB_RESULT",400);
    assert.deepEqual((await api(doctor,endpoint)).data,[]);
    await uploader.getByLabel("Fecha del estudio (opcional)",{exact:true}).fill("2026-10-25");
    await page.route("**/api/medical/documents",route=>route.request().method()==="POST"?route.abort("failed"):route.continue(),{times:1});
    await file.setInputFiles({name:"privado.png",mimeType:"image/png",buffer:png});await uploader.getByRole("button",{name:"Subir archivo",exact:true}).click();await uploader.getByRole("alert").waitFor();
    assert.equal(await description.inputValue(),"Conservar descripción FE11");assert.equal(await file.evaluate(input=>input.files[0].name),"privado.png");
    const image=(await upload("privado.png","image/png",png,"CLINICAL_PHOTO")).data.id;
    results.push("Empty/MIME/signature errors and network failure keep file, metadata and focus; keyboard retry creates only one complete document");
    const expiring=(await api(doctor,"/api/medical/documents/"+image+"/download")).data.url;const issuedAt=Date.now();
    const previewButton=page.getByRole("button",{name:"Previsualizar privado.png",exact:true});
    await previewButton.click();const dialog=page.getByRole("dialog",{name:"Vista previa de privado.png",exact:true});await dialog.waitFor();
    const img=dialog.getByRole("img");await img.waitFor();assert(await img.evaluate(image=>image.complete&&image.naturalWidth===2));
    assert((await img.getAttribute("src")).startsWith("blob:"));await page.keyboard.press("Escape");await dialog.waitFor({state:"detached"});
    const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Descargar privado.png",exact:true}).click();const download=await downloadPromise;await download.saveAs(artifacts+"/privado.png");assert.equal(sha(readFileSync(artifacts+"/privado.png")),sha(png));
    const stored=(await api(doctor,endpoint)).data[0];assert.equal(stored.description,"Conservar descripción FE11");assert.equal(stored.studyDate,"2026-10-25");assert.equal(stored.mimeType,"image/png");
    await page.reload();await page.getByRole("heading",{name:"privado.png",exact:true}).waitFor();assert.equal((await api(doctor,endpoint)).data[0].id,image);
    const pdfBytes=pdf();await upload("quimica.pdf","application/pdf",pdfBytes,"BLOOD_CHEMISTRY");
    await page.getByRole("button",{name:"Previsualizar quimica.pdf",exact:true}).click();await page.getByRole("dialog",{name:"Vista previa de quimica.pdf",exact:true}).waitFor();assert((await page.locator('iframe[title="Documento PDF quimica.pdf"]').getAttribute("src")).startsWith("blob:"));await page.getByRole("button",{name:"Cerrar vista previa",exact:true}).click();
    for(const [mime,name,type] of [["image/jpeg","imagen.jpg","RADIOGRAPH"],["image/webp","imagen.webp","PRESCRIPTION"]]){
      const buffer=Buffer.from(await page.evaluate(mime=>{const canvas=document.createElement("canvas");canvas.width=2;canvas.height=2;return canvas.toDataURL(mime).split(",")[1];},mime),"base64");await upload(name,mime,buffer,type);
    }
    await upload("derivacion.pdf","application/pdf",pdfBytes,"REFERRAL_DOCUMENT");
    await upload("laboratorio.pdf","application/pdf",pdfBytes,"LAB_RESULT");
    const exact=Buffer.alloc(15*1024*1024,32);pdfBytes.copy(exact);await upload("limite-15MiB.pdf","application/pdf",exact);
    const ordered=(await api(doctor,endpoint)).data;const count=ordered.length;
    assert(ordered.every((item,index)=>index===0||Date.parse(ordered[index-1].uploadedAt)>=Date.parse(item.uploadedAt)));
    assert.equal(ordered.find(item=>item.filename==="quimica.pdf").studyDate,null);assert.equal(ordered.find(item=>item.filename==="quimica.pdf").description,null);
    await upload("excede.pdf","application/pdf",Buffer.alloc(15*1024*1024+1,32),"OTHER",413);assert.equal((await api(doctor,endpoint)).data.length,count);
    results.push("PDF/JPG/PNG/WEBP and all seven classifications persist; private image/PDF preview, byte-identical download, reload and exact 15 MiB through Next proxy work; over-limit is rejected");
    await api(outsider,endpoint,"GET",undefined,404);await api(student,endpoint,"GET",undefined,403);await api(admin,endpoint,"GET",undefined,403);
    await forbiddenUpload(outsider,patientId,first.encounterId,pdfBytes);await forbiddenUpload(student,patientId,first.encounterId,pdfBytes);
    await api(outsider,"/api/medical/documents/"+image+"/download","GET",undefined,404);await api(student,"/api/medical/documents/"+image+"/download","GET",undefined,403);
    const ownUrl=(await api(doctor,"/api/medical/documents/"+image+"/download")).data.url;
    assert.equal((await outsider.request.get(origin+ownUrl)).status(),404);const privateResponse=await doctor.request.get(origin+ownUrl);assert.equal(privateResponse.status(),200);assert(privateResponse.headers()["cache-control"].includes("no-store"));assert.equal(sha(await privateResponse.body()),sha(png));assert.equal((await doctor.request.get(origin+ownUrl)).status(),404);
    const foreignPage=await outsider.newPage();await foreignPage.goto(origin+"/medico/citas/"+first.appointmentId+"/documentos");await foreignPage.locator('p[role="alert"]').waitFor();assert(!(await foreignPage.locator("body").innerText()).includes("privado.png"));
    results.push("Foreign actor cannot list/sign/read or view metadata; student/admin denied; owner-bound token is single use and foreign attempt cannot consume owner's grant");
    await page.route("**/api/medical/documents/*/download",r=>r.abort("failed"),{times:1});
    await page.getByRole("button",{name:"Previsualizar privado.png",exact:true}).click();await page.getByRole("region",{name:"Documentos de la atención",exact:true}).getByRole("alert").filter({hasText:"No se pudo recuperar el archivo"}).waitFor();
    await page.getByRole("button",{name:"Previsualizar privado.png",exact:true}).click();await page.getByRole("dialog",{name:"Vista previa de privado.png",exact:true}).waitFor();await page.keyboard.press("Escape");
    await description.fill("Borrador sesión FE11");await file.setInputFiles({name:"sesion.pdf",mimeType:"application/pdf",buffer:pdfBytes});await api(doctor,"/api/v1/session/logout","POST",undefined,204);
    await uploader.getByRole("button",{name:"Subir archivo",exact:true}).click();await uploader.getByRole("link",{name:"Iniciar sesión en otra pestaña y reintentar",exact:true}).waitFor();assert.equal(await description.inputValue(),"Borrador sesión FE11");assert.equal(await file.evaluate(input=>input.files[0].name),"sesion.pdf");
    await signIn(doctor,"revision.ana.demo@salud-universitaria.test");await upload("sesion.pdf","application/pdf",pdfBytes);
    await description.fill("Respuesta perdida FE11");await file.setInputFiles({name:"respuesta-perdida.pdf",mimeType:"application/pdf",buffer:pdfBytes});
    let committedId;await page.route("**/api/medical/documents",async route=>{if(route.request().method()!=="POST")return route.continue();const response=await route.fetch();assert.equal(response.status(),201);committedId=(await response.json()).data.id;await route.abort("failed");},{times:1});
    await uploader.getByRole("button",{name:"Subir archivo",exact:true}).click();await uploader.getByRole("alert").filter({hasText:"No pudimos confirmar"}).waitFor();assert.equal(await description.inputValue(),"Respuesta perdida FE11");
    await page.getByRole("button",{name:"Actualizar documentos",exact:true}).click();await page.getByRole("heading",{name:"respuesta-perdida.pdf",exact:true}).waitFor();assert.equal((await api(doctor,endpoint)).data.filter(d=>d.id===committedId).length,1);
    results.push("Preview network retry gets a fresh grant; expired session preserves selected file and description; lost upload response is recovered by listing without resending");
    const specialty=(await api(admin,"/api/v1/catalogs/SPECIALTY")).data.find(s=>s.code==="FE09_TEST");assert(specialty);
    const specialized=await fixture(specialist,specialty.id);const specialistPage=await specialist.newPage();await specialistPage.goto(origin+"/medico/citas/"+specialized.appointmentId+"/documentos");
    await specialistPage.getByText("No hay documentos disponibles para esta atención.",{exact:true}).waitFor();await specialistPage.getByLabel("Archivo clínico",{exact:true}).setInputFiles({name:"especialista.pdf",mimeType:"application/pdf",buffer:pdfBytes});await specialistPage.getByRole("button",{name:"Subir archivo",exact:true}).click();await specialistPage.getByRole("heading",{name:"especialista.pdf",exact:true}).waitFor();await specialistPage.reload();await specialistPage.getByRole("heading",{name:"especialista.pdf",exact:true}).waitFor();await api(doctor,"/api/medical/documents?encounterId="+specialized.encounterId,"GET",undefined,404);
    const bg={versionEsquema:1,alergias:{estado:"DESCONOCIDO",elementos:[]},enfermedadesPersonales:{estado:"DESCONOCIDO",elementos:[]},cirugias:{estado:"DESCONOCIDO",elementos:[]},medicamentos:{estado:"DESCONOCIDO",elementos:[]},antecedentesFamiliares:{estado:"DESCONOCIDO",elementos:[]},habitos:{}};
    await api(doctor,"/api/medical/patients/"+patientId+"/clinical-background","PATCH",{data:bg,expectedVersion:0,changeReason:"Preparación cierre documentos FE11",encounterId:first.encounterId});
    await page.goto(origin+"/medico/citas/"+first.appointmentId+"?ficha=1");await page.getByRole("textbox",{name:/^Motivo de consulta/}).fill("Control con documentos FE11");await page.getByRole("textbox",{name:/^Evaluación clínica/}).fill("Documentos revisados");
    await page.getByLabel("Archivo clínico",{exact:true}).setInputFiles({name:"embebido.pdf",mimeType:"application/pdf",buffer:pdfBytes});await page.getByRole("button",{name:"Subir archivo",exact:true}).click();await page.getByRole("heading",{name:"embebido.pdf",exact:true}).waitFor();assert.equal(await page.getByRole("textbox",{name:/^Motivo de consulta/}).inputValue(),"Control con documentos FE11");
    await page.getByRole("combobox",{name:"Química sanguínea",exact:true}).selectOption("ATTACHED");await page.getByRole("button",{name:"Cerrar atención",exact:true}).click();await page.getByRole("heading",{name:"Atención cerrada",exact:true}).waitFor();cleanup.splice(cleanup.indexOf(first.appointmentId),1);
    assert.equal(await page.getByLabel("Archivo clínico",{exact:true}).count(),0);await page.reload();await page.getByRole("heading",{name:"privado.png",exact:true}).waitFor();await page.getByRole("button",{name:"Previsualizar privado.png",exact:true}).click();await page.getByRole("dialog",{name:"Vista previa de privado.png",exact:true}).waitFor();await page.keyboard.press("Escape");
    await page.screenshot({path:artifacts+"/documentos.png",fullPage:true});
    const closedCount=(await api(doctor,endpoint)).data.length;await forbiddenUpload(doctor,patientId,first.encounterId,pdfBytes);assert.equal((await api(doctor,endpoint)).data.length,closedCount);
    results.push("Assigned specialist uploads and reloads direct specialty documents; review cannot read them; ATTACHED closing uses available chemistry and closed encounter keeps documents read-only");
    while(Date.now()-issuedAt<60500)await new Promise(resolve=>setTimeout(resolve,Math.min(30000,60500-(Date.now()-issuedAt))));
    assert.equal((await doctor.request.get(origin+expiring)).status(),404);
    const renewed=(await api(doctor,"/api/medical/documents/"+image+"/download")).data.url;assert.equal((await doctor.request.get(origin+renewed)).status(),200);
    results.push("Real 60-second expiry is enforced; requesting a fresh authorized grant restores download");
    assert(!traffic.some(t=>/supabase\.(co|com)/.test(t.url)));assert(!traffic.some(t=>/\/api\/medical\/patients\/[^/?]+$/.test(t.url)));
    writeFileSync(artifacts+"/resultado.json",JSON.stringify({status:"PASS",results,patientId,encounter:first,specialized,checksums,traffic},null,2));console.log(JSON.stringify({status:"PASS",results,patientId,encounter:first,specialized,artifacts},null,2));
  } catch(error) {
    for(const [i,c] of browser.contexts().entries())for(const [j,p] of c.pages().entries()){await p.screenshot({path:artifacts+"/fallo-"+i+"-"+j+".png",fullPage:true}).catch(()=>{});writeFileSync(artifacts+"/fallo-"+i+"-"+j+".txt",await p.locator("body").innerText().catch(()=>""));}throw error;
  } finally {
    if(admin)for(const id of cleanup)try{await api(admin,"/api/appointments/"+id+"/no-show","POST",{reason:"Fin ensayo FE11"});}catch{/* Keep synthetic history. */}
    await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
