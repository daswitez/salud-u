// F-03: solo datos sintéticos; Next/Spring/PostgreSQL reales y capturas reproducibles.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.F03_PLAYWRIGHT || "playwright");
const origin = process.env.F03_ORIGIN || "http://127.0.0.1:3000";
const out = process.env.F03_ARTIFACTS || "../../ENTREGAS_CODEX/F-03";
assert(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
mkdirSync(out + "/crudo", { recursive: true }); mkdirSync(out + "/figuras", { recursive: true });
const backend = fileURLToPath(new URL("../../salud-u-backend/", import.meta.url));
const sql = query => execFileSync("docker", ["compose", "-p", "salud-u-backend", "exec", "-T", "postgres", "sh", "-c", 'psql -X -Atq -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'], { cwd: backend, input: query, encoding: "utf8" }).trim();
const uuid = id => { assert.match(id, /^[0-9a-f-]{36}$/); return "'" + id + "'"; };
const browser = await chromium.launch({ headless: true, ...(process.env.F03_CHROMIUM ? { executablePath: process.env.F03_CHROMIUM } : {}) });
const contexts = [], traffic = [], results = [];
const pass = text => { results.push(text); console.log("PASS " + text); };
async function context() {
  const c = await browser.newContext({ locale: "es-BO", timezoneId: "America/La_Paz", viewport: { width: 1440, height: 900 } }); contexts.push(c);
  c.on("request", request => traffic.push({ method: request.method(), path: new URL(request.url()).pathname })); return c;
}
async function api(c, path, method = "GET", data, expected = 200) {
  const headers = {};
  if (method !== "GET") { const csrf = (await (await c.request.get(origin + "/api/v1/security/csrf")).json()).data; headers[csrf.headerName] = csrf.token; }
  const response = await c.request.fetch(origin + path, { method, headers, data });
  assert.equal(response.status(), expected, `${method} ${path}: ${await response.text()}`);
  return response.json();
}
async function login(c, email) { await api(c, "/api/v1/auth/login", "POST", { email, password: "SaludDemo2026!" }); }
async function axe(page, name) {
  await page.addScriptTag({ path: process.env.F03_AXE || "/tmp/salud-u-browser/node_modules/axe-core/axe.min.js" });
  const issues = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
  writeFileSync(out + `/crudo/axe-${name}.json`, JSON.stringify(issues, null, 2)); assert.deepEqual(issues, []);
}
try {
  const admin = await context(); await login(admin, "admin.demo@salud-universitaria.test");
  const seed = Date.now().toString();
  const areaBefore = sql("SELECT md5(coalesce(string_agg(to_jsonb(v)::text,'' ORDER BY id),'')) FROM salud_u.valor_inicial_agenda v WHERE id_especialidad IS NULL;");
  async function specialty(suffix) {
    return (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: `F03_${seed}_${suffix}`, name: `F03 ${seed} Especialidad sintética ${suffix}`, active: true })).data;
  }
  const a = await specialty("A"), b = await specialty("B");
  const year = sql("SELECT extract(year FROM d)::int FROM generate_series(date '2100-01-01',date '2400-01-01',interval '1 year') d WHERE NOT EXISTS (SELECT 1 FROM salud_u.periodo_academico p WHERE daterange(p.fecha_inicio,p.fecha_fin,'[]') && daterange(d::date,d::date+360,'[]')) ORDER BY d LIMIT 1;");
  assert.match(year, /^\d{4}$/);
  const page = await admin.newPage();
  let release; const delayed = new Promise(resolve => { release = resolve; });
  await page.route("**/api/academic-periods", async route => { if (route.request().method() === "GET") { await delayed; await route.continue(); } else await route.continue(); });
  await page.goto(origin + "/administrativo/calendario");
  await page.getByText("Cargando períodos…").waitFor(); release();
  const calendar = page.getByRole("region", { name: "Calendario académico", exact: true });
  const periodForm = calendar.getByRole("form", { name: "Registrar período académico", exact: true });
  const name = periodForm.getByLabel("Nombre", { exact: true }), type = periodForm.getByLabel("Tipo de período", { exact: true });
  const start = periodForm.getByLabel("Fecha de inicio", { exact: true }), end = periodForm.getByLabel("Fecha de fin", { exact: true });
  await periodForm.getByRole("button", { name: "Registrar período", exact: true }).waitFor();
  await page.unroute("**/api/academic-periods");
  const periods = [
    ["Inicio", "SEMESTER_START", `${year}-02-01`, `${year}-02-14`],
    ["Normal", "CLASSES", `${year}-02-15`, `${year}-06-30`],
    ["Exámenes", "EXAMS", `${year}-07-01`, `${year}-07-14`],
    ["Vacaciones", "VACATION", `${year}-07-15`, `${year}-08-15`],
  ];
  for (const [label, kind, from, to] of periods) {
    await name.fill(`F03 ${seed} ${label}`); await type.selectOption(kind); await start.fill(from); await end.fill(to);
    const response = page.waitForResponse(r => r.url().endsWith("/api/academic-periods") && r.request().method() === "POST");
    await periodForm.getByRole("button", { name: "Registrar período", exact: true }).click(); assert.equal((await response).status(), 201);
    await periodForm.getByText("Período registrado.").waitFor();
  }
  await page.reload(); await calendar.getByLabel("Buscar período").fill(`F03 ${seed}`);
  assert.equal(await calendar.locator("tbody tr").count(), 4);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: out + "/figuras/pantalla-calendario-academico.png" }); await axe(page, "calendario");
  pass("Cuatro tipos de período creados por UI, sin solapes y persistentes tras recarga");

  await name.fill(`F03 ${seed} Solapado`); await type.selectOption("EXAMS"); await start.fill(`${year}-02-14`); await end.fill(`${year}-02-16`);
  const conflict = page.waitForResponse(r => r.url().endsWith("/api/academic-periods") && r.request().method() === "POST");
  await periodForm.getByRole("button", { name: "Registrar período", exact: true }).click(); assert.equal((await conflict).status(), 409);
  await periodForm.getByRole("alert").getByText(/superpone/).waitFor(); assert.equal(await name.inputValue(), `F03 ${seed} Solapado`);
  await start.fill(`${year}-10-05`); await end.fill(`${year}-10-04`);
  await periodForm.getByRole("button", { name: "Registrar período", exact: true }).click();
  await periodForm.getByRole("alert").getByText(/fechas válidas/).waitFor();
  pass("Solape inclusivo 409 y fechas invertidas; formulario conservado sin crear filas parciales");

  await page.getByRole("button", { name: "Valores iniciales", exact: true }).click();
  const values = page.getByRole("region", { name: "Valores iniciales de la agenda", exact: true });
  const scope = values.getByRole("combobox", { name: "Especialidad", exact: true }); await scope.waitFor(); await scope.selectOption(a.id);
  const group = label => values.getByRole("group", { name: label, exact: true });
  const attendance = label => group(label).getByRole("spinbutton", { name: `Asistencia esperada (%) · ${label}`, exact: true });
  const demand = label => group(label).getByRole("spinbutton", { name: `Demanda diaria esperada · ${label}`, exact: true });
  const weight = label => group(label).getByRole("spinbutton", { name: `Peso en citas · ${label}`, exact: true });
  const checkbox = label => group(label).getByRole("checkbox", { name: `Seleccionar ${label} para guardar`, exact: true });
  await group("Clases (normal)").getByText("Predeterminado · aún no guardado").waitFor();
  assert.equal(await attendance("Clases (normal)").inputValue(), "80"); assert.equal(await demand("Clases (normal)").inputValue(), "");
  assert.equal(sql(`SELECT count(*) FROM salud_u.valor_inicial_agenda WHERE id_especialidad=${uuid(a.id)};`), "0");
  await attendance("Clases (normal)").fill("72.5"); await demand("Clases (normal)").fill("15.25"); await weight("Clases (normal)").fill("12");
  await attendance("Exámenes").fill("65"); assert(await checkbox("Clases (normal)").isChecked()); assert(await checkbox("Exámenes").isChecked());
  await scope.selectOption(b.id); await attendance("Vacaciones").fill("0");
  await scope.selectOption(a.id); assert.equal(await attendance("Clases (normal)").inputValue(), "72.5");
  await page.getByRole("button", { name: "Calendario académico", exact: true }).click();
  assert.equal(await name.inputValue(), `F03 ${seed} Solapado`);
  await page.getByRole("button", { name: "Valores iniciales", exact: true }).click();
  const save = values.getByRole("button", { name: "Guardar valores seleccionados", exact: true });
  const countBefore = traffic.filter(r => r.method === "PUT" && r.path === "/api/scheduling/initial-values").length;
  await save.click(); await values.getByRole("alert").getByText(/asistencia debe ser mayor/).waitFor();
  assert.equal(await scope.inputValue(), b.id); assert.equal(traffic.filter(r => r.method === "PUT" && r.path === "/api/scheduling/initial-values").length, countBefore);
  await checkbox("Vacaciones").uncheck(); await scope.selectOption(a.id);
  assert.equal(await attendance("Clases (normal)").inputValue(), "72.5");
  pass("Predeterminados identificados sin escritura; borradores entre especialidades y pestañas, validación de fila fuera de vista");

  let fail = true;
  await page.route("**/api/scheduling/initial-values", route => route.request().method() === "PUT" && fail ? route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false,"error":"Fallo simulado"}' }) : route.continue());
  await save.click(); await values.getByRole("alert").getByText(/No pudimos comunicarnos/).waitFor();
  assert.equal(await attendance("Clases (normal)").inputValue(), "72.5"); assert(await checkbox("Exámenes").isChecked());
  assert.equal(sql(`SELECT count(*) FROM salud_u.valor_inicial_agenda WHERE id_especialidad=${uuid(a.id)};`), "0");
  fail = false; const put = page.waitForResponse(r => r.url().endsWith("/api/scheduling/initial-values") && r.request().method() === "PUT");
  await save.click(); const response = await put; assert.equal(response.status(), 200);
  assert.deepEqual(response.request().postDataJSON().values, [
    { specialtyId: a.id, periodType: "CLASSES", expectedAttendance: 0.725, expectedDailyDemand: 15.25, appointmentWeight: 12 },
    { specialtyId: a.id, periodType: "EXAMS", expectedAttendance: 0.65, expectedDailyDemand: null, appointmentWeight: 10 },
  ]);
  await values.getByRole("status").filter({ hasText: "Se guardaron 2 filas." }).waitFor(); await page.unroute("**/api/scheduling/initial-values");
  await page.reload(); await page.getByRole("button", { name: "Valores iniciales", exact: true }).click(); await scope.waitFor(); await scope.selectOption(a.id);
  assert.equal(await attendance("Clases (normal)").inputValue(), "72.5"); assert.equal(await demand("Clases (normal)").inputValue(), "15.25");
  assert.equal(await attendance("Exámenes").inputValue(), "65"); assert.equal(await demand("Exámenes").inputValue(), "");
  await group("Clases (normal)").getByText("Configurado", { exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: out + "/figuras/pantalla-valores-iniciales.png" }); await axe(page, "valores");
  pass("PUT por lote con porcentaje convertido a proporción, demanda numérica/null, rollback ante error y persistencia real");

  await checkbox("Vacaciones").check();
  const defaultPut = page.waitForResponse(r => r.url().endsWith("/api/scheduling/initial-values") && r.request().method() === "PUT");
  await save.click(); assert.equal((await defaultPut).status(), 200);
  await group("Vacaciones").getByText("Configurado", { exact: true }).waitFor();
  assert.equal(sql(`SELECT count(*) FROM salud_u.valor_inicial_agenda WHERE id_especialidad=${uuid(a.id)};`), "3");
  assert.equal(sql("SELECT md5(coalesce(string_agg(to_jsonb(v)::text,'' ORDER BY id),'')) FROM salud_u.valor_inicial_agenda v WHERE id_especialidad IS NULL;"), areaBefore);
  await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { id: a.id, code: a.code, name: a.name, active: false });
  await page.reload(); await page.getByRole("button", { name: "Valores iniciales", exact: true }).click(); await scope.waitFor(); await scope.selectOption(a.id);
  await values.getByText(/especialidad está inactiva/).waitFor(); assert(await attendance("Clases (normal)").isDisabled());
  assert.equal(await attendance("Clases (normal)").inputValue(), "72.5");
  pass("Confirmación explícita de predeterminado, área sin cambios y especialidad inactiva en solo lectura");

  await scope.selectOption(b.id); await attendance("Clases (normal)").fill("85"); await page.getByRole("button", { name: "Calendario académico", exact: true }).click();
  await page.getByRole("button", { name: "Valores iniciales", exact: true }).click(); assert.equal(await attendance("Clases (normal)").inputValue(), "85");
  await checkbox("Clases (normal)").uncheck(); assert.equal(await attendance("Clases (normal)").inputValue(), "80");
  await page.setViewportSize({ width: 390, height: 844 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 320, height: 844 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(origin + "/administrativo"); await page.getByRole("navigation", { name: "Herramientas administrativas" }).getByRole("link", { name: /Calendario y valores iniciales/ }).click();
  await page.getByRole("heading", { name: "Calendario académico y valores iniciales", exact: true }).waitFor();
  pass("Descartar una fila restablece sus valores; vistas móviles y acceso desde inicio");

  const reporterEmail = `f03.reportes.${seed}@salud-universitaria.test`;
  await api(admin, "/api/v1/admin/principals", "POST", { email: reporterEmail, displayName: "Reportes sintético F03", password: "SaludDemo2026!", roles: ["REPORTING_OFFICER"] }, 201);
  const reporter = await context(); await login(reporter, reporterEmail); await api(reporter, "/api/academic-periods", "GET", undefined, 403); await api(reporter, "/api/scheduling/initial-values", "GET", undefined, 403);
  const denied = await reporter.newPage(); await denied.goto(origin + "/administrativo/calendario"); await denied.getByRole("heading", { name: "Acceso restringido" }).waitFor();
  const anon = await context(), anonymous = await anon.newPage(); await anonymous.goto(origin + "/administrativo/calendario"); await anonymous.waitForURL(/\/iniciar-sesion/);
  pass("Solo Administración accede; Reportes recibe 403 y anónimo inicia sesión");
  assert(!traffic.some(r => /supabase/i.test(r.path)));
  writeFileSync(out + "/crudo/recorrido.json", JSON.stringify({ status: "PASS", fecha: new Date().toISOString(), year, results, specialties: [a.id, b.id], traffic }, null, 2));
  console.log(`PASS F-03: ${results.length} grupos; Next/Spring/PostgreSQL reales; datos sintéticos`);
} catch (error) {
  for (const [i, c] of contexts.entries()) for (const [j, page] of c.pages().entries()) {
    await page.screenshot({ path: `${out}/crudo/fallo-${i}-${j}.png` }).catch(() => {});
    writeFileSync(`${out}/crudo/fallo-${i}-${j}.txt`, await page.locator("body").innerText().catch(() => ""));
  }
  writeFileSync(out + "/crudo/error.txt", String(error.stack || error)); throw error;
} finally { await Promise.all(contexts.map(c => c.close())); await browser.close(); }
