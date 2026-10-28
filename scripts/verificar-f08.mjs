// F-08: ejecutar únicamente con la pila desechable de capturas y datos ficticios.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.DEMO_PLAYWRIGHT || 'playwright');
const origin = 'http://127.0.0.1:3100';
const password = readFileSync(process.env.DEMO_PASSWORD_FILE, 'utf8').trim();
const dest = process.env.DEMO_ARTIFACTS || '../../ENTREGAS_CODEX/F-08';
mkdirSync(dest + '/crudo', {recursive:true}); mkdirSync(dest + '/figuras', {recursive:true});
const patientId = 'd3000000-0000-4000-8000-000000000001';
const browser = await chromium.launch({headless:true, executablePath:process.env.DEMO_CHROMIUM});
const contexts=[]; const captures=[]; let page;
async function login(email) {
 const context=await browser.newContext({locale:'es-BO',timezoneId:'America/La_Paz',viewport:{width:1440,height:900}});contexts.push(context);
 const csrf=(await (await context.request.get(origin+'/api/v1/security/csrf')).json()).data;
 const response=await context.request.post(origin+'/api/v1/auth/login',{headers:{[csrf.headerName]:csrf.token},data:{email,password}});assert.equal(response.status(),200); return context;
}
async function capture(name, description) {
 await page.evaluate(()=>document.fonts.ready);
 const bytes=await page.screenshot({path:`${dest}/figuras/${name}.png`});
 captures.push({archivo:`figuras/${name}.png`,descripcion:description,ruta:new URL(page.url()).pathname,fecha:new Date().toISOString(),sha256:createHash('sha256').update(bytes).digest('hex'),datos:'sintéticos'});
}
async function fillContact(name,relationship,phone) {
 await page.getByLabel('Nombre completo del contacto').fill(name);
 await page.getByLabel('Parentesco').selectOption(relationship);
 await page.getByLabel('Teléfono del contacto').fill(phone);
}
try {
 const admin=await login('admin@demo.invalid'), student=await login('estudiante@demo.invalid'), doctor=await login('medico@demo.invalid');
 page=await admin.newPage(); await page.goto(`${origin}/administrativo/estudiantes/${patientId}`);
 await page.getByRole('heading',{name:'Datos administrativos'}).waitFor();
 await page.getByLabel('Sexo (opcional)').selectOption('FEMALE');
 if (!await page.getByLabel('Registrar contacto de emergencia').isChecked()) await page.getByLabel('Registrar contacto de emergencia').check();
 await fillContact('María Rojas','PARENT','70123456');
 const saved=page.waitForResponse(r=>r.url().endsWith(`/api/patients/${patientId}`)&&r.request().method()==='PATCH');
 await page.getByRole('button',{name:'Guardar datos administrativos'}).click(); const saveResponse=await saved;
 assert.equal(saveResponse.status(),200);assert.equal(saveResponse.request().postDataJSON().sex,'FEMALE');
 await page.getByRole('status').filter({hasText:'Datos administrativos actualizados'}).waitFor();await page.reload();
 await page.getByLabel('Nombre completo del contacto').waitFor();assert.equal(await page.getByLabel('Nombre completo del contacto').inputValue(),'María Rojas');assert.equal(await page.getByLabel('Sexo (opcional)').inputValue(),'FEMALE');
 await page.getByRole('button',{name:'Quitar contacto'}).click();
 const removed=page.waitForResponse(r=>r.url().endsWith(`/api/patients/${patientId}`)&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Guardar datos administrativos'}).click();const removeResponse=await removed;
 assert.equal(removeResponse.status(),200);assert.equal(removeResponse.request().postDataJSON().emergencyContact,null);
 await page.getByRole('status').filter({hasText:'Datos administrativos actualizados'}).waitFor(); await page.reload(); await page.getByLabel('Registrar contacto de emergencia').waitFor();assert.equal(await page.getByLabel('Registrar contacto de emergencia').isChecked(),false);
 const nullContact=await (await student.request.get(origin+'/api/me/emergency-contact')).json();assert.equal(nullContact.data,null);
 page=await student.newPage();await page.goto(origin+'/perfil');await page.getByRole('heading',{name:'Contacto de emergencia'}).waitFor();await page.getByLabel('Nombre completo del contacto').waitFor();
 await fillContact('Lucía Rojas','SIBLING','71234567');
 const studentSaved=page.waitForResponse(r=>r.url().endsWith('/api/me/emergency-contact')&&r.request().method()==='PUT');await page.getByRole('button',{name:'Guardar contacto de emergencia'}).click();assert.equal((await studentSaved).status(),200);
 await page.getByText('Contacto de emergencia guardado.').waitFor();await page.reload();await page.getByLabel('Nombre completo del contacto').waitFor();assert.equal(await page.getByLabel('Nombre completo del contacto').inputValue(),'Lucía Rojas');
 await page.getByRole('heading',{name:'Contacto de emergencia'}).scrollIntoViewIfNeeded();await capture('pantalla-perfil-contacto','Contacto de emergencia en el perfil del estudiante');
 page=await doctor.newPage();await page.goto(`${origin}/medico/pacientes/${patientId}`);const medical=page.getByRole('region',{name:'Contacto de emergencia'});await medical.getByText(/Lucía Rojas/).waitFor();assert.match(await medical.innerText(),/71234567/);assert.equal(await medical.locator('input,select,button').count(),0);await medical.scrollIntoViewIfNeeded();await capture('pantalla-ficha-medica-contacto','Contacto de emergencia de solo lectura en ficha médica');
 page=await admin.newPage();await page.goto(`${origin}/administrativo/estudiantes/${patientId}`);await page.getByLabel('Nombre completo del contacto').waitFor();assert.equal(await page.getByLabel('Nombre completo del contacto').inputValue(),'Lucía Rojas');
 await page.getByRole('button',{name:'Quitar contacto'}).scrollIntoViewIfNeeded();await page.evaluate(() => window.scrollBy(0, -300));await capture('pantalla-administracion-contacto','Sexo y contacto de emergencia en registro administrativo');
 page=await admin.newPage();await page.goto(origin+'/administrativo/estudiantes/nuevo');await page.getByLabel('Sexo (opcional)').waitFor();await page.getByLabel('Registrar contacto de emergencia').check();await fillContact('Contacto de Prueba','OTHER','70000001');
 assert.equal(await page.getByLabel('Nombre completo del contacto').inputValue(),'Contacto de Prueba');
 const suffix=String(Date.now()).slice(-7); await page.getByLabel('Nombre completo',{exact:true}).fill('Gabriela Salazar'); await page.getByLabel('Número de carnet').fill(suffix);await page.getByLabel('Código de registro').fill('F08'+suffix);await page.getByLabel('Fecha de nacimiento').fill('2002-03-12');
 const careerOptions=await page.getByLabel('Carrera').locator('option').all();assert(careerOptions.length>1);await page.getByLabel('Carrera').selectOption({index:1});await page.getByLabel('Sexo (opcional)').selectOption('MALE');
 await page.getByLabel('Acepto los términos de uso').check();await page.getByLabel('No',{exact:true}).check();
 const created=page.waitForResponse(r=>r.url().endsWith('/api/patients')&&r.request().method()==='POST');await page.getByRole('button',{name:'Guardar registro administrativo'}).click();const createResponse=await created;assert.equal(createResponse.status(),201);const createBody=createResponse.request().postDataJSON();assert.equal(createBody.sex,'MALE');assert.equal(createBody.emergencyContact.fullName,'Contacto de Prueba');
 await page.waitForURL(/\/administrativo\/estudiantes\/[0-9a-f-]+$/);await page.getByLabel('Nombre completo del contacto').waitFor();assert.equal(await page.getByLabel('Nombre completo del contacto').inputValue(),'Contacto de Prueba');
 await page.goto(origin+'/administrativo/estudiantes/nuevo');await page.getByLabel('Carrera').waitFor();const second=String(Date.now()).slice(-7);await page.getByLabel('Nombre completo',{exact:true}).fill('Elena Salazar');await page.getByLabel('Número de carnet').fill(second);await page.getByLabel('Código de registro').fill('F09'+second);await page.getByLabel('Fecha de nacimiento').fill('2001-04-13');await page.getByLabel('Carrera').selectOption({index:1});
 await page.getByLabel('Acepto los términos de uso').check();await page.getByLabel('No',{exact:true}).check();
 const createdOptional=page.waitForResponse(r=>r.url().endsWith('/api/patients')&&r.request().method()==='POST');await page.getByRole('button',{name:'Guardar registro administrativo'}).click();const optionalResponse=await createdOptional;assert.equal(optionalResponse.status(),201);const optionalBody=optionalResponse.request().postDataJSON();assert(!Object.hasOwn(optionalBody,'sex'));assert(!Object.hasOwn(optionalBody,'emergencyContact'));
 await page.waitForURL(/\/administrativo\/estudiantes\/[0-9a-f-]+$/);await page.getByLabel('Sexo (opcional)').waitFor();assert.equal(await page.getByLabel('Sexo (opcional)').inputValue(),'');assert.equal(await page.getByLabel('Registrar contacto de emergencia').isChecked(),false);

 writeFileSync(dest+'/crudo/recorrido.json',JSON.stringify({resultado:'APROBADO',fecha:new Date().toISOString(),validaciones:['PATCH con sexo y contacto','persistencia tras recargar','PATCH emergencyContact null y eliminación','GET sin contacto','PUT del estudiante y persistencia','lectura médica sin controles de edición','alta persiste sexo y contacto opcionales','alta sin sexo ni contacto'],capturas:captures},null,2)+'\n');console.log('PASS F-08:',captures.length,'capturas y recorrido persistido');
} catch(error) { if(page) { await page.screenshot({path:dest+'/crudo/error.png',fullPage:true}).catch(()=>{}); writeFileSync(dest+'/crudo/error.txt',String(error)+'\n'); } throw error; }
finally { await Promise.all(contexts.map(c=>c.close())); await browser.close(); }
