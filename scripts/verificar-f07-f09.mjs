import { segundoFactor } from "./lib/segundo-factor.mjs";
// F-07 y F-09: solo contra la pila desechable de capturas (frontend 3100) con cuentas sintéticas @demo.invalid.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
const { chromium } = await import(process.env.DEMO_PLAYWRIGHT || 'playwright');
const origin = 'http://127.0.0.1:3100', password = readFileSync(process.env.DEMO_PASSWORD_FILE, 'utf8').trim();
const dest = process.env.DEMO_ARTIFACTS || '/tmp/salud-u-f07'; mkdirSync(dest, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.DEMO_CHROMIUM ? { executablePath: process.env.DEMO_CHROMIUM } : {}) });
const pass = (s) => console.log('PASS ' + s);
async function login(email) {
  const c = await browser.newContext({ locale: 'es-BO', timezoneId: 'America/La_Paz', viewport: { width: 1440, height: 900 } });
  const csrf = (await (await c.request.get(origin + '/api/v1/security/csrf')).json()).data;
  const r = await c.request.post(origin + '/api/v1/auth/login', { headers: { [csrf.headerName]: csrf.token }, data: { email, password } });
  assert.equal(r.status(), 200); await segundoFactor(c, origin, { email, password }, await r.json()); return c;
}
try {
  const admin = await login('admin@demo.invalid'), page = await admin.newPage();
  await page.goto(origin + '/administrativo/metricas?from=2026-10-01&to=2026-11-30');
  for (const name of ['Uso de la capacidad', 'Espera hasta la cita', 'Calidad del pronóstico', 'Aceptación de sugerencias', 'Avisos de la bandeja']) await page.getByRole('heading', { name }).waitFor();
  await page.getByText(/Período consultado: .*1 de octubre de 2026.* al .*30 de noviembre de 2026/).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Métricas de agenda' }).getAttribute('aria-current'), 'page');
  pass('Administración ve los cinco grupos de indicadores del período pedido y el menú marca «Métricas de agenda»');
  const r = page.waitForResponse((x) => x.url().includes('/api/scheduling/metrics?from=2026-11-01&to=2026-11-30'));
  await page.getByLabel('Desde').fill('2026-11-01'); await page.getByRole('button', { name: 'Consultar período' }).click(); assert.equal((await r).status(), 200); await page.waitForURL(/from=2026-11-01&to=2026-11-30/);
  await page.reload(); await page.getByText(/1 de noviembre de 2026/).first().waitFor();
  pass('El período elegido se consulta en Spring y se conserva en la URL al recargar');
  await page.getByLabel('Desde').fill('2026-12-01'); await page.getByRole('button', { name: 'Consultar período' }).click(); await page.getByRole('alert').getByText(/período válido/).waitFor();
  pass('Un período invertido se rechaza antes de llamar al backend');
  await page.goto(origin + '/administrativo/metricas?from=2026-10-01&to=2026-11-30'); await page.getByRole('heading', { name: 'Avisos de la bandeja' }).waitFor(); await page.screenshot({ path: dest + '/f07-metricas.png', fullPage: true });
  const doctor = await login('medico@demo.invalid');
  assert.equal((await doctor.request.get(origin + '/api/scheduling/metrics')).status(), 403);
  const dp = await doctor.newPage(); await dp.goto(origin + '/administrativo/metricas'); await dp.waitForURL(origin + '/medico');
  const reporter = await login('reportes@demo.invalid'); assert.equal((await reporter.request.get(origin + '/api/scheduling/metrics')).status(), 403);
  const rp = await reporter.newPage(); await rp.goto(origin + '/administrativo/metricas'); await rp.getByRole('heading', { name: 'Acceso restringido' }).waitFor();
  pass('Médico y Reportes reciben 403 del endpoint; el médico vuelve a su espacio y Reportes ve el acceso restringido');
  for (const path of ['/administrativo/capacidad', '/administrativo/incidencias', '/administrativo/lista-espera', '/estudiante/chequeo', '/estudiante/cola', '/estudiante/lista-espera', '/medico/cola', '/medico/check-in'])
    assert.equal((await admin.request.get(origin + path, { maxRedirects: 0 })).status(), 404, path);
  for (const path of ['/administrativo/planificacion', '/administrativo/check-in']) assert.equal((await admin.request.get(origin + path, { maxRedirects: 0 })).status(), 200, path);
  pass('F-09: las ocho redirecciones heredadas ya no existen (404); planificación y citas y asistencia siguen disponibles');
} finally { await browser.close(); }
