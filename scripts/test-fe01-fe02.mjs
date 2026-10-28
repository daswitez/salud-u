import { segundoFactor } from "./lib/segundo-factor.mjs";
// F-01/F-02: Next de producción + Spring/PostgreSQL. Solo cuentas y datos sintéticos locales.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.FE01_PLAYWRIGHT || "playwright");
const origin = process.env.FE01_ORIGIN || "http://127.0.0.1:3000";
const artifacts = process.env.FE01_ARTIFACTS || "/tmp/salud-u-fe01-fe02-evidence";
const record = result => { results.push(result); console.log("PASS " + result); };
const password = "SaludDemo2026!", seed = Date.now(), contexts = [], results = [], traffic = [];
assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
mkdirSync(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.FE01_CHROMIUM ? { executablePath: process.env.FE01_CHROMIUM } : {}) });
const sql = query => execFileSync("docker", ["compose", "exec", "-T", "postgres", "sh", "-c", 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atq'], {
  cwd: fileURLToPath(new URL("../../salud-u-backend/", import.meta.url)), input: query, encoding: "utf8",
}).trim();
const uuid = id => { assert.match(id, /^[0-9a-f-]{36}$/); return "'" + id + "'"; };
async function context() {
  const ctx = await browser.newContext({ locale: "es-BO", timezoneId: "America/La_Paz", viewport: { width: 1366, height: 900 } });
  contexts.push(ctx); ctx.on("request", request => traffic.push({ method: request.method(), path: new URL(request.url()).pathname }));
  return ctx;
}
async function api(ctx, path, method = "GET", data, expected = 200) {
  const headers = {};
  if (method !== "GET") {
    const csrf = (await (await ctx.request.get(origin + "/api/v1/security/csrf")).json()).data;
    headers[csrf.headerName] = csrf.token;
  }
  const response = await ctx.request.fetch(origin + path, { method, data, headers });
  assert.equal(response.status(), expected, `${method} ${path}: ${await response.text()}`);
  return response.json();
}
async function login(ctx, email) { await segundoFactor(ctx, origin, { email, password }, await api(ctx, "/api/v1/auth/login", "POST", { email, password })); }
async function waitCount(page, count) { await page.getByRole("link", { name: `Abrir avisos. ${count} sin leer`, exact: true }).waitFor(); }
async function axe(page, label) {
  await page.addScriptTag({ path: process.env.FE01_AXE || "/tmp/salud-u-browser/node_modules/axe-core/axe.min.js" });
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
  writeFileSync(`${artifacts}/axe-${label}.json`, JSON.stringify(violations, null, 2));
  assert.deepEqual(violations, [], `Accesibilidad ${label}`);
}

try {
  const admin = await context(); await login(admin, process.env.FE01_ADMIN || "admin.demo@salud-universitaria.test");
  const adminId = (await api(admin, "/api/me")).user.id;
  async function user(label, role) {
    const email = `fe01.${label}.${seed}@salud-universitaria.test`;
    const principal = (await api(admin, "/api/v1/admin/principals", "POST", { email, displayName: `Ensayo F01 ${label}`, password, roles: [role] }, 201)).data;
    const ctx = await context(); await login(ctx, email); return { id: principal.id, ctx };
  }
  const owner = await user("estudiante", "STUDENT"), other = await user("otro", "STUDENT");
  const roles = [
    ["medico", await user("revision", "REVIEW_DOCTOR")],
    ["medico", await user("especialista", "SPECIALIST")],
    ["administrativo", await user("administracion", "ADMINISTRATIVE")],
    ["administrativo", await user("reportes", "REPORTING_OFFICER")],
    ["administrativo", await user("auditoria", "AUDITOR")],
  ];

  // Los avisos operativos se generan por el trigger real. Los dos recordatorios se siembran
  // explícitamente para probar su presentación; no se evalúa aquí el programador de N-03/O-03.
  sql(`BEGIN;
    SELECT set_config('salud_u.id_actor',${uuid(adminId)},true);
    SELECT set_config('salud_u.roles_actor','ADMINISTRATIVO',true);
    CREATE TEMP TABLE fe01 AS SELECT gen_random_uuid() paciente,
      (SELECT pe.id FROM salud_u.personal pe JOIN salud_u.rol_principal r ON r.id_principal=pe.id_principal WHERE pe.activo AND r.revocado_en IS NULL AND r.codigo_rol='MEDICO_REVISION' ORDER BY pe.id LIMIT 1) profesional;
    INSERT INTO salud_u.paciente(id,id_principal,carnet,carnet_normalizado,codigo_registro,codigo_registro_normalizado,nombres,apellidos,creado_por,actualizado_por)
      SELECT paciente,${uuid(owner.id)},'F01-'||paciente,'F01'||paciente,'REG-'||paciente,'REG'||paciente,'Ensayo','F01',${uuid(adminId)},${uuid(adminId)} FROM fe01;
    CREATE TEMP TABLE fe01_cupos AS SELECT gen_random_uuid() cupo,gen_random_uuid() cita,n,
      (SELECT greatest(coalesce(max(termina_a),now()),now())+interval '1 day' FROM salud_u.cupo_disponibilidad)+n*interval '1 hour' inicio FROM generate_series(1,23) n;
    INSERT INTO salud_u.cupo_disponibilidad(id,id_personal,inicia_a,termina_a,capacidad,estado,publicado_en,creado_por)
      SELECT c.cupo,f.profesional,c.inicio,c.inicio+interval '30 minutes',1,'PUBLICADO',now(),${uuid(adminId)} FROM fe01_cupos c CROSS JOIN fe01 f;
    INSERT INTO salud_u.cita(id,id_paciente,id_cupo,id_personal_asignado,tipo_cita,estado,programada_para)
      SELECT c.cita,f.paciente,c.cupo,f.profesional,'INICIAL','PROGRAMADA',c.inicio FROM fe01_cupos c CROSS JOIN fe01 f;
    UPDATE salud_u.cita SET programada_para=programada_para+interval '1 day' WHERE id=(SELECT cita FROM fe01_cupos WHERE n=2);
    UPDATE salud_u.cita SET estado='CANCELADA' WHERE id=(SELECT cita FROM fe01_cupos WHERE n=3);
    UPDATE salud_u.cita SET estado='AUSENTE' WHERE id=(SELECT cita FROM fe01_cupos WHERE n=4);
    INSERT INTO salud_u.notificacion(id_destinatario,id_cita,tipo_evento,asunto,mensaje,fecha_objetivo)
      SELECT ${uuid(owner.id)},c.cita,t.codigo,t.asunto,'Ensayo sintético: recuerda tu cita.',(c.inicio AT TIME ZONE 'America/La_Paz')::date
      FROM fe01_cupos c CROSS JOIN (VALUES('RECORDATORIO_CITA','Recordatorio de cita'),('RECORDATORIO_REFORZADO','Tu cita es hoy')) t(codigo,asunto) WHERE c.n=1;
    COMMIT;`);
  const initial = await api(owner.ctx, "/api/notifications?limit=100");
  assert.equal(initial.data.length, 28); assert.equal(initial.unreadCount, 28);
  const page = await owner.ctx.newPage();
  await page.goto(origin + "/estudiante"); await waitCount(page, 28);
  await page.getByRole("link", { name: "Abrir avisos. 28 sin leer", exact: true }).click();
  await page.getByRole("heading", { name: "Mis avisos", exact: true }).waitFor();
  await page.locator("article[aria-label]").first().waitFor();
  assert.equal(await page.locator("article[aria-label]").count(), 20);
  await page.getByRole("button", { name: "Cargar más avisos", exact: true }).click();
  await page.locator("article[aria-label]").nth(27).waitFor();
  assert.equal(await page.locator("article[aria-label]").count(), 28);
  assert.equal(await page.getByRole("button", { name: "Cargar más avisos", exact: true }).count(), 0);
  for (const label of ["Cita asignada", "Cita cancelada", "Ausencia registrada", "Cita reprogramada", "Recordatorio de cita", "Recordatorio adicional"])
    assert(await page.locator("article[aria-label]").getByText(label, { exact: true }).count(), label);
  const firstArticle = page.locator("article[aria-label]").first();
  const readResponse = page.waitForResponse(r => r.url().includes("/read") && r.request().method() === "PATCH");
  const readRequestsBefore = traffic.filter(r => r.method === "PATCH" && r.path.endsWith("/read")).length;
  await firstArticle.getByRole("button", { name: /Marcar como leído/ }).evaluate(button => { button.click(); button.click(); });
  const marked = (await (await readResponse).json()).data;
  await firstArticle.getByText("Leído", { exact: true }).waitFor(); await waitCount(page, 27);
  assert.equal(marked.status, "READ");
  assert.equal(traffic.filter(r => r.method === "PATCH" && r.path.endsWith("/read")).length, readRequestsBefore + 1);
  await page.reload(); await waitCount(page, 27);
  const persisted = (await api(owner.ctx, "/api/notifications?limit=100")).data.find(n => n.id === marked.id);
  assert.equal(persisted.readAt, marked.readAt);
  await page.screenshot({ path: artifacts + "/bandeja-escritorio.png", fullPage: true }); await axe(page, "bandeja");
  record("Bandeja propia: acceso por campana, 28 avisos, cursor sin duplicados, seis eventos, lectura persistente y contador");

  await api(owner.ctx, `/api/notifications/${initial.data.find(n => n.id !== marked.id).id}/read`, "PATCH");
  await page.evaluate(() => window.dispatchEvent(new Event("focus"))); await waitCount(page, 26);
  const missing = await api(other.ctx, "/api/notifications/00000000-0000-4000-8000-000000000001/read", "PATCH", undefined, 404);
  assert.deepEqual(await api(other.ctx, `/api/notifications/${marked.id}/read`, "PATCH", undefined, 404), missing);
  const emptyPage = await other.ctx.newPage(); await emptyPage.goto(origin + "/estudiante/avisos");
  await emptyPage.getByRole("heading", { name: "Todavía no tienes avisos" }).waitFor(); await waitCount(emptyPage, 0);
  await emptyPage.goto(origin + "/medico/avisos"); await emptyPage.waitForURL(origin + "/estudiante");
  for (const [space, account] of roles) {
    const rolePage = await account.ctx.newPage(); await rolePage.goto(`${origin}/${space}/avisos`);
    await rolePage.getByRole("heading", { name: "Todavía no tienes avisos" }).waitFor(); await waitCount(rolePage, 0);
    await rolePage.goto(origin + "/perfil"); await rolePage.getByRole("heading", { name: "Preferencias de avisos", exact: true }).waitFor();
    await rolePage.getByRole("checkbox", { name: "Recibir recordatorios de citas", exact: true }).waitFor();
    await rolePage.close();
  }
  const anon = await context(), anonPage = await anon.newPage();
  for (const path of ["/estudiante/avisos", "/medico/avisos", "/administrativo/avisos", "/perfil"]) {
    await anonPage.goto(origin + path); assert(new URL(anonPage.url()).pathname === "/iniciar-sesion");
  }
  record("Seis roles, vacío propio, rutas protegidas, aislamiento y 404 sin fuga; contador actualiza al volver a la pestaña");

  let releaseLoad;
  const heldLoad = new Promise(resolve => { releaseLoad = resolve; });
  await page.route("**/api/notifications?limit=20", async route => { await heldLoad; await route.continue(); });
  await page.reload(); await page.getByRole("status").filter({ hasText: "Cargando avisos…" }).waitFor();
  assert(await page.getByRole("button", { name: "Actualizar bandeja", exact: true }).isDisabled());
  releaseLoad(); await page.locator("article[aria-label]").first().waitFor(); await page.unroute("**/api/notifications?limit=20");
  let failInbox = true;
  await page.route("**/api/notifications?limit=20", route => failInbox ? route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false,"error":"Fallo de ensayo"}' }) : route.continue());
  await page.reload(); await page.getByRole("alert").getByText(/No pudimos comunicarnos/).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Todavía no tienes avisos" }).count(), 0);
  failInbox = false; await page.getByRole("button", { name: "Reintentar consulta" }).click(); await page.locator("article[aria-label]").first().waitFor();
  await page.unroute("**/api/notifications?limit=20");
  await page.route("**/api/notifications?limit=1", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false,"error":"Fallo de ensayo"}' }));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("link", { name: "Abrir avisos. No se pudo actualizar el contador", exact: true }).waitFor();
  await page.unroute("**/api/notifications?limit=1");
  await page.evaluate(() => window.dispatchEvent(new Event("focus"))); await waitCount(page, 26);
  await page.route("**/api/notifications/*/read", route => route.fulfill({ status: 404, contentType: "application/json", body: '{"ok":false,"error":"Notificación no encontrada."}' }));
  await page.getByRole("button", { name: /Marcar como leído/ }).first().click();
  await page.getByRole("alert").getByText(/Este aviso ya no está disponible/).waitFor(); await waitCount(page, 26);
  await page.unroute("**/api/notifications/*/read");
  await page.getByRole("button", { name: "Actualizar bandeja", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Bandeja actualizada." }).waitFor();
  record("Error de consulta no se presenta como vacío; reintento, 404 al leer y fallo/recuperación del contador");

  assert.equal(sql(`SELECT count(*) FROM salud_u.preferencia_notificacion WHERE id_principal=${uuid(owner.id)};`), "0");
  await page.goto(origin + "/perfil");
  const ordinary = page.getByRole("checkbox", { name: "Recibir recordatorios de citas", exact: true });
  const reinforced = page.getByRole("checkbox", { name: "Permitir un recordatorio adicional", exact: true });
  await ordinary.waitFor(); assert(await ordinary.isChecked()); assert(await reinforced.isChecked());
  assert.equal(sql(`SELECT count(*) FROM salud_u.preferencia_notificacion WHERE id_principal=${uuid(owner.id)};`), "0");
  await ordinary.uncheck();
  const save = page.getByRole("button", { name: "Guardar preferencias de avisos", exact: true });
  const savedResponse = page.waitForResponse(r => r.url().endsWith("/api/me/notification-preferences") && r.request().method() === "PUT");
  const putsBefore = traffic.filter(r => r.method === "PUT" && r.path === "/api/me/notification-preferences").length;
  await save.evaluate(button => { button.click(); button.click(); }); const response = await savedResponse;
  assert.equal(response.status(), 200); assert.deepEqual(response.request().postDataJSON(), { receiveReminders: false, reinforcedReminder: true });
  await page.getByRole("status").filter({ hasText: "Preferencias de avisos guardadas." }).waitFor();
  assert.equal(traffic.filter(r => r.method === "PUT" && r.path === "/api/me/notification-preferences").length, putsBefore + 1);
  await page.reload(); await ordinary.waitFor(); assert.equal(await ordinary.isChecked(), false); assert.equal(await reinforced.isChecked(), true);
  assert.equal((await api(other.ctx, "/api/me/notification-preferences")).data.receiveReminders, true);

  let failSave = true;
  await page.route("**/api/me/notification-preferences", route => route.request().method() === "PUT" && failSave
    ? route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false,"error":"Fallo de ensayo"}' }) : route.continue());
  await ordinary.check(); await reinforced.uncheck(); await save.click();
  await page.getByRole("alert").getByText(/No pudimos comunicarnos/).waitFor(); assert(await ordinary.isChecked()); assert.equal(await reinforced.isChecked(), false);
  failSave = false; await save.click(); await page.getByRole("status").filter({ hasText: "Preferencias de avisos guardadas." }).waitFor();
  await page.unroute("**/api/me/notification-preferences");
  await page.reload(); await ordinary.waitFor(); assert(await ordinary.isChecked()); assert.equal(await reinforced.isChecked(), false);
  await page.screenshot({ path: artifacts + "/preferencias-escritorio.png", fullPage: true }); await axe(page, "perfil");
  record("Preferencias: GET sin escritura, dos booleanos propios, persistencia real, independencia de credenciales y borrador conservado tras fallo");

  await page.route("**/api/me/notification-preferences", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false,"error":"Fallo de ensayo"}' }));
  await page.reload(); await page.getByRole("button", { name: "Reintentar preferencias" }).waitFor(); assert.equal(await ordinary.count(), 0);
  await page.unroute("**/api/me/notification-preferences"); await page.getByRole("button", { name: "Reintentar preferencias" }).click(); await ordinary.waitFor();
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: artifacts + "/preferencias-movil.png", fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(origin + "/estudiante/avisos"); await waitCount(page, 26);
  await page.locator("article[aria-label]").first().waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole("link", { name: "Abrir avisos. 26 sin leer", exact: true }).focus();
  assert(await page.getByRole("link", { name: "Abrir avisos. 26 sin leer", exact: true }).evaluate(element => element === document.activeElement));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: artifacts + "/bandeja-movil.png", fullPage: true }); await axe(page, "bandeja-movil");
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Bandeja sin desborde a ${width}`);
    await page.goto(origin + "/perfil"); await ordinary.waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Perfil sin desborde a ${width}`);
    await page.goto(origin + "/estudiante/avisos"); await page.locator("article[aria-label]").first().waitFor();
  }
  await page.route("**/api/notifications?limit=20", route => route.fulfill({ status: 401, contentType: "application/json", body: '{"ok":false,"error":"Sesión vencida"}' }));
  await page.reload(); await page.getByRole("alert").getByRole("link", { name: "Iniciar sesión", exact: true }).waitFor();
  record("Carga fallida de preferencias recuperable, sesión vencida, móvil sin desborde, teclado y axe WCAG A/AA");
  assert(!traffic.some(r => /supabase/i.test(r.path)));
  assert.equal(await page.evaluate(() => Object.keys(localStorage).filter(k => /notific|avisos|waitlist/i.test(k)).length), 0);
  assert(!readFileSync(fileURLToPath(new URL("../src/lib/session.ts", import.meta.url)), "utf8").includes("notifications"));
  rmSync(artifacts + "/error.txt", { force: true });
  writeFileSync(artifacts + "/resultado.json", JSON.stringify({ status: "PASS", origin, results, owner: owner.id, notificationCount: 28, browser: "Chromium", trafficCount: traffic.length }, null, 2));
  writeFileSync(artifacts + "/red.json", JSON.stringify(traffic, null, 2));
  console.log("PASS F01/F02: " + results.length + " grupos; Next/Spring/PostgreSQL reales");
} catch (error) {
  for (const [i, ctx] of contexts.entries()) for (const [j, page] of ctx.pages().entries()) {
    await page.screenshot({ path: `${artifacts}/error-${i}-${j}.png`, fullPage: true }).catch(() => {});
    writeFileSync(`${artifacts}/error-${i}-${j}.txt`, await page.locator("body").innerText().catch(() => ""));
  }
  writeFileSync(artifacts + "/error.txt", error.stack || String(error)); throw error;
} finally { await Promise.all(contexts.map(ctx => ctx.close())); await browser.close(); }
