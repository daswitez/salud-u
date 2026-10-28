// VAC-HISTORIAL: ejecutar solo en la pila desechable de capturas.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.DEMO_PLAYWRIGHT || 'playwright');
const origin = 'http://127.0.0.1:3100';
const dest = process.env.DEMO_ARTIFACTS;
const password = readFileSync(process.env.DEMO_PASSWORD_FILE, 'utf8').trim();
const patient = 'd3000000-0000-4000-8000-000000000001';
const disclaimer = 'Este historial no reemplaza el carnet de vacunación oficial, que emite el Ministerio de Salud.';
mkdirSync(dest + '/figuras', { recursive: true }); mkdirSync(dest + '/crudo', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.DEMO_CHROMIUM });
const contexts = [], captures = []; let page;
async function login(email) {
 const context = await browser.newContext({ locale: 'es-BO', timezoneId: 'America/La_Paz', viewport: { width: 1440, height: 900 } }); contexts.push(context);
 const csrf = (await (await context.request.get(origin + '/api/v1/security/csrf')).json()).data;
 assert.equal((await context.request.post(origin + '/api/v1/auth/login', { headers: { [csrf.headerName]: csrf.token }, data: { email, password } })).status(), 200);
 return context;
}
async function screenshot(name, label) {
 await page.evaluate(() => document.fonts.ready); const png = await page.screenshot({ path: dest + '/figuras/' + name + '.png' });
 captures.push({ archivo: name + '.png', descripcion: label, ruta: new URL(page.url()).pathname, fecha: new Date().toISOString(), sha256: createHash('sha256').update(png).digest('hex') });
}
async function validate() {
 const section = page.getByRole('region', { name: 'Historial de vacunación' });
 await section.getByRole('heading', { name: 'Historial de vacunación' }).waitFor(); await section.getByText(disclaimer, { exact: true }).waitFor();
 await section.getByRole('cell', { name: 'HB-2026-018' }).waitFor();
 assert.equal(await section.getByRole('button', { name: /imprimir/i }).count(), 0);
 assert.equal(await section.getByRole('button', { name: 'Actualizar historial' }).count(), 1);
 const request = page.waitForResponse(r => new URL(r.url()).pathname === '/api/vaccination-card' && r.request().method() === 'GET');
 await section.getByRole('button', { name: 'Actualizar historial' }).click(); assert.equal((await request).status(), 200); await section.getByRole('cell', { name: 'HB-2026-018' }).waitFor();
 assert(!/Consultando historial…/.test(await section.innerText()));
}
try {
 const student = await login('estudiante@demo.invalid'), admin = await login('admin@demo.invalid');
 const current = (await (await student.request.get(origin + '/api/me/consents')).json()).data;
 if (current.pending) { const csrf = (await (await student.request.get(origin + '/api/v1/security/csrf')).json()).data; const r = await student.request.post(origin + '/api/me/consents', { headers: { [csrf.headerName]: csrf.token }, data: { termsVersion: current.terms.currentVersion, termsAccepted: true, researchVersion: current.research.currentVersion, researchAccepted: false } }); assert.equal(r.status(), 200); }
 page = await student.newPage(); await page.goto(origin + '/estudiante'); await page.getByRole('link', { name: 'Historial de vacunación' }).first().click(); await page.waitForURL('**/estudiante/vacunas'); await validate(); await page.evaluate(() => window.scrollTo(0, 0)); await screenshot('despues', 'Historial de vacunación del estudiante');
 page = await admin.newPage(); await page.goto(origin + '/administrativo/estudiantes/' + patient); await page.getByRole('link', { name: 'Ver historial de vacunación' }).click(); await page.waitForURL('**/carnet-vacunacion'); await validate(); await page.evaluate(() => window.scrollTo(0, 0)); await screenshot('figura-3.58', 'Historial de vacunación del paciente en Administración');
 const section = page.getByRole('region', { name: 'Historial de vacunación' }); await page.route('**/api/vaccination-card?*', route => route.abort('failed')); await section.getByRole('button', { name: 'Actualizar historial' }).click(); await section.getByRole('alert').filter({ hasText: 'problema de conexión' }).waitFor(); assert.equal(await section.getByRole('article').count(), 0); await page.unroute('**/api/vaccination-card?*'); await section.getByRole('button', { name: 'Reintentar historial' }).click(); await section.getByRole('cell', { name: 'HB-2026-018' }).waitFor();
 await page.reload(); await section.getByRole('cell', { name: 'HB-2026-018' }).waitFor(); await section.getByText(disclaimer, { exact: true }).waitFor();
 writeFileSync(dest + '/crudo/recorrido.json', JSON.stringify({ resultado: 'APROBADO', fecha: new Date().toISOString(), validaciones: ['estudiante y administración muestran el aviso', 'sin botón imprimir', 'actualización mediante API original', 'datos tras recargar', 'error y reintento'], capturas: captures }, null, 2) + '\n');
 console.log('PASS VAC-HISTORIAL: estudiante y administración, actualización y reintento');
} catch (error) { if (page) { await page.screenshot({ path: dest + '/crudo/error.png', fullPage: true }).catch(() => {}); writeFileSync(dest + '/crudo/error.txt', String(error) + '\n'); } throw error; }
finally { await Promise.all(contexts.map(c => c.close())); await browser.close(); }
