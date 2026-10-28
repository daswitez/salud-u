// F-04: jornada sintética, lógica O-04 real y decisiones O-06 por Next/Spring/PostgreSQL.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const { chromium } = await import(process.env.F04_PLAYWRIGHT || "playwright");
const origin = process.env.F04_ORIGIN || "http://127.0.0.1:3000";
const out = process.env.F04_ARTIFACTS || "../../ENTREGAS_CODEX/F-04";
assert(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
mkdirSync(out + "/crudo", { recursive: true }); mkdirSync(out + "/figuras", { recursive: true });
const backend = fileURLToPath(new URL("../../salud-u-backend/", import.meta.url));
const fixtureClasses = resolve(out, "crudo/classes");
mkdirSync(fixtureClasses, { recursive: true });
execFileSync("javac", ["-cp", backend + "/target/classes", "-d", fixtureClasses, "scripts/GenerarSugerenciasF04.java"]);
const sql = text => execFileSync("docker", ["compose", "-p", "salud-u-backend", "exec", "-T", "postgres", "sh", "-c", 'psql -X -Atq -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'], { cwd: backend, input: text, encoding: "utf8" }).trim();
const literal = text => "'" + String(text).replaceAll("'", "''") + "'";
const u = text => { assert.match(text, /^[0-9a-f-]{36}$/); return literal(text); };
const browser = await chromium.launch({ headless: true, ...(process.env.F04_CHROMIUM ? { executablePath: process.env.F04_CHROMIUM } : {}) });
const contexts = [], traffic = [], results = [];
const pass = value => { results.push(value); console.log("PASS " + value); };
async function context() { const c = await browser.newContext({ locale: "es-BO", timezoneId: "America/La_Paz", viewport: { width: 1366, height: 768 } }); contexts.push(c); c.on("request", req => traffic.push({ method: req.method(), path: new URL(req.url()).pathname })); return c; }
async function api(c, path, method = "GET", data, expected = 200) {
  const headers = {};
  if (method !== "GET") { const csrf = (await (await c.request.get(origin + "/api/v1/security/csrf")).json()).data; headers[csrf.headerName] = csrf.token; }
  const response = await c.request.fetch(origin + path, { method, data, headers });
  assert.equal(response.status(), expected, `${method} ${path}: ${await response.text()}`);
  return response.json();
}
async function login(c, email) { await api(c, "/api/v1/auth/login", "POST", { email, password: "SaludDemo2026!" }); }
async function axe(page) {
  await page.addScriptTag({ path: process.env.F04_AXE || "/tmp/salud-u-browser/node_modules/axe-core/axe.min.js" });
  const issues = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
  writeFileSync(out + "/crudo/axe.json", JSON.stringify(issues, null, 2)); assert.deepEqual(issues, []);
}
try {
  const admin = await context(); await login(admin, "admin.demo@salud-universitaria.test");
  const adminId = (await api(admin, "/api/me")).user.id;
  const seed = Date.now(), day = sql("SELECT d::date FROM generate_series((now() AT TIME ZONE 'America/La_Paz')::date+30,(now() AT TIME ZONE 'America/La_Paz')::date+365,interval '1 day') d WHERE extract(isodow FROM d) <= 5 AND NOT EXISTS (SELECT 1 FROM salud_u.sugerencia_agenda s WHERE s.fecha=d::date) ORDER BY d LIMIT 1;");
  assert.match(day, /^\d{4}-\d{2}-\d{2}$/);
  const specialty = randomUUID(), otherSpecialty = randomUUID();
  const doctors = Array.from({ length: 3 }, (_, i) => ({ principal: randomUUID(), staff: randomUUID(), name: `Médico sintético F04 ${seed} ${i+1}`, slots: Array.from({ length: 10 }, () => randomUUID()), source: i === 1 ? "INITIAL_VALUE" : "DOCTOR" }));
  const duplicate = { principal: randomUUID(), staff: randomUUID(), name: doctors[2].name };
  const suggestions = [];
  for (const [i, d] of doctors.entries()) {
    const args = ["-cp", backend + "/target/classes:" + fixtureClasses, "GenerarSugerenciasF04", day, d.staff, specialty, day + "T08:00:00-04:00", d.source, ...d.slots, ...(i === 0 ? [otherSpecialty] : [])];
    const output = execFileSync("java", args, { encoding: "utf8" }).trim();
    for (const line of output.split("\n")) {
      const [type, date, staff, area, raw, reason, expires] = line.split("\t");
      suggestions.push({ id: randomUUID(), type, date, staff: staff === "-" ? null : staff, specialty: area === "-" ? null : area, value: Buffer.from(raw, "base64").toString("utf8"), explanation: Buffer.from(reason, "base64").toString("utf8"), expires });
    }
  }
  assert.equal(suggestions.length, 8);
  let script = `BEGIN; INSERT INTO salud_u.especialidad(id,codigo,nombre) VALUES(${u(specialty)},${literal('F04-'+seed)},'Especialidad sintética F04'),(${u(otherSpecialty)},${literal('F04-OTRA-'+seed)},'Área sintética F04');\n`;
  for (const d of doctors) {
    script += `INSERT INTO salud_u.principal(id,correo,nombre_mostrado) VALUES(${u(d.principal)},${literal(d.principal+'@example.invalid')},${literal(d.name)});
      INSERT INTO salud_u.rol_principal(id_principal,codigo_rol) VALUES(${u(d.principal)},'MEDICO_REVISION');
      INSERT INTO salud_u.personal(id,id_principal,codigo_personal) VALUES(${u(d.staff)},${u(d.principal)},${literal('F04-'+d.staff)});\n`;
    for (const [i, slot] of d.slots.entries()) script += `INSERT INTO salud_u.cupo_disponibilidad(id,id_personal,inicia_a,termina_a,capacidad,estado,publicado_en,creado_por) VALUES(${u(slot)},${u(d.staff)},${literal(day+'T08:00:00-04:00')}::timestamptz+interval '${i*30} minutes',${literal(day+'T08:00:00-04:00')}::timestamptz+interval '${(i+1)*30} minutes',1,'PUBLICADO',now(),${u(adminId)});\n`;
  }
  script += `INSERT INTO salud_u.principal(id,correo,nombre_mostrado) VALUES(${u(duplicate.principal)},${literal(duplicate.principal+'@example.invalid')},${literal(duplicate.name)});
    INSERT INTO salud_u.rol_principal(id_principal,codigo_rol) VALUES(${u(duplicate.principal)},'MEDICO_REVISION');
    INSERT INTO salud_u.personal(id,id_principal,codigo_personal) VALUES(${u(duplicate.staff)},${u(duplicate.principal)},${literal('F04-'+duplicate.staff)});`;
  for (const s of suggestions) script += `INSERT INTO salud_u.sugerencia_agenda(id,tipo,fecha,id_personal,id_especialidad,valor_sugerido,explicacion,version_modelo,vence_en) VALUES(${u(s.id)},salud_u.desde_codigo_api('tipo_sugerencia',${literal(s.type)}),${literal(s.date)},${s.staff ? u(s.staff) : 'null'},${s.specialty ? u(s.specialty) : 'null'},${literal(s.value)}::jsonb,${literal(s.explanation)},'o04-v1',${literal(s.expires)});\n`;
  sql(script + "COMMIT;");
  const find = (type, staff) => suggestions.find(s => s.type === type && s.staff === staff);
  const dayA = find("DAY_SLOTS", doctors[0].staff), dayB = find("DAY_SLOTS", doctors[1].staff), dayC = find("DAY_SLOTS", doctors[2].staff);
  const overA = find("OVERBOOKING", doctors[0].staff), overB = find("OVERBOOKING", doctors[1].staff), overC = find("OVERBOOKING", doctors[2].staff);
  const list = await api(admin, `/api/scheduling/suggestions?date=${day}`);
  assert.equal(list.data.filter(s => suggestions.some(x => x.id === s.id)).length, 8);
  const page = await admin.newPage();
  let release; const delayed = new Promise(resolve => { release = resolve; });
  await page.route("**/api/scheduling/suggestions?date=*", async route => { await delayed; await route.continue(); });
  await page.goto(`${origin}/administrativo/planificacion?date=${day}`);
  await page.getByText("Cargando sugerencias…").waitFor(); release();
  const card = id => page.locator(`article[data-suggestion-id="${id}"]`);
  await card(dayA.id).waitFor(); await page.unroute("**/api/scheduling/suggestions?date=*");
  await card(dayA.id).getByText(/Fuente:.*Estimación aprendida del médico/).waitFor();
  await card(dayB.id).getByText(/Fuente:.*Valor inicial/).waitFor();
  await card(suggestions.find(s => s.type === "CAPACITY_ALERT" && s.specialty === specialty).id).getByRole("heading", { name: "Alerta: jornada adicional" }).waitFor();
  await card(suggestions.find(s => s.type === "CAPACITY_ALERT" && s.specialty === otherSpecialty).id).getByRole("heading", { name: "Alerta: liberar o reasignar horarios" }).waitFor();
  assert.equal(await card(dayA.id).getByRole("button", { name: "Modificar", exact: true }).count(), 0);
  pass("Carga y explicación real del modelo; fuente inicial/aprendida y alertas de exceso y defecto");
  const firstAlertId = await page.locator("article[data-suggestion-id]").first().getAttribute("data-suggestion-id");
  assert(suggestions.some(s => s.id === firstAlertId && s.type === "CAPACITY_ALERT"));
  await card(firstAlertId).getByRole("button", { name: "Aceptar", exact: true }).click();
  await card(firstAlertId).getByRole("button", { name: "Confirmar decisión", exact: true }).click();
  await card(firstAlertId).getByText(/Decisión: Aceptada/).waitFor();
  await page.reload(); await card(firstAlertId).getByText(/Decisión: Aceptada/).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: out + "/figuras/pantalla-alerta.png" });
  await axe(page);

  await card(dayA.id).getByRole("button", { name: "Aceptar", exact: true }).click();
  const pathA = `/api/scheduling/suggestions/${dayA.id}/decision`;
  const priorA = traffic.filter(request => request.path === pathA && request.method === "POST").length;
  await card(dayA.id).getByRole("button", { name: "Confirmar decisión", exact: true }).evaluate(element => { element.click(); element.click(); });
  await card(dayA.id).getByText(/Decisión: Aceptada/).waitFor();
  assert.equal(traffic.filter(request => request.path === pathA && request.method === "POST").length, priorA + 1);
  assert.equal(sql(`SELECT count(*) FROM salud_u.cupo_disponibilidad WHERE id_personal=${u(doctors[0].staff)} AND capacidad<>1;`), "0");
  await page.reload(); await card(dayA.id).getByText(/Decisión: Aceptada/).waitFor();
  assert.equal((await api(admin, `/api/scheduling/suggestions?date=${day}`)).data.find(s => s.id === dayA.id).status, "ACCEPTED");
  await card(dayA.id).evaluate(element => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 90));
  await page.screenshot({ path: out + "/figuras/figura-3.61.png" });
  pass("Aceptar jornada registra la decisión sin modificar cupos; explicación y decisión persisten al recargar");

  await card(dayB.id).getByRole("button", { name: "Rechazar", exact: true }).click();
  const reason = card(dayB.id).getByLabel("Motivo (obligatorio)");
  await card(dayB.id).getByRole("button", { name: "Confirmar decisión", exact: true }).click();
  assert(await reason.evaluate(element => element.validity.valueMissing));
  assert.equal(traffic.filter(request => request.path === `/api/scheduling/suggestions/${dayB.id}/decision` && request.method === "POST").length, 0);
  await reason.fill("Decisión sintética F04");
  let fail = true;
  await page.route(`**/api/scheduling/suggestions/${dayB.id}/decision`, route => fail ? route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false,"error":"Fallo simulado"}' }) : route.continue());
  await card(dayB.id).getByRole("button", { name: "Confirmar decisión", exact: true }).click();
  await card(dayB.id).getByRole("alert").getByText(/No pudimos comunicarnos/).waitFor(); assert.equal(await reason.inputValue(), "Decisión sintética F04");
  fail = false; await card(dayB.id).getByRole("button", { name: "Confirmar decisión", exact: true }).click();
  await card(dayB.id).getByText(/Decisión: Rechazada/).waitFor(); await page.unroute(`**/api/scheduling/suggestions/${dayB.id}/decision`);
  await page.reload(); await card(dayB.id).getByText("Motivo: Decisión sintética F04").waitFor();
  pass("Rechazo exige motivo, conserva el borrador tras fallo y persiste después de recargar");

  await card(overA.id).getByRole("button", { name: "Aceptar", exact: true }).click();
  await card(overA.id).getByRole("button", { name: "Confirmar decisión", exact: true }).click();
  await card(overA.id).getByText(/Decisión: Aceptada/).waitFor();
  assert.equal(sql(`SELECT capacidad FROM salud_u.cupo_disponibilidad WHERE id=${u(doctors[0].slots[9])};`), "2");
  await page.reload(); await card(overA.id).getByText(/Capacidad aplicada: 2/).waitFor();
  pass("Aceptar sobrecupo aplica una capacidad y refleja el valor persistido");

  await card(overB.id).getByRole("button", { name: "Modificar", exact: true }).click();
  await card(overB.id).getByText("Capacidad final por cupo").waitFor();
  const capInputs = card(overB.id).getByRole("spinbutton"); await capInputs.nth(0).waitFor();
  await page.waitForFunction(id => document.querySelector(`article[data-suggestion-id="${id}"] fieldset`) && !document.querySelector(`article[data-suggestion-id="${id}"] fieldset`).disabled, overB.id);
  assert.equal(await capInputs.count(), 10);
  await capInputs.nth(0).fill("2");
  await card(overB.id).getByLabel("Motivo (obligatorio)").fill("Usar el primer horario");
  await card(overB.id).getByRole("button", { name: "Confirmar decisión", exact: true }).click();
  await card(overB.id).getByRole("alert").getByText(/supera el 10 %/).waitFor();
  assert.equal(await card(overB.id).getByLabel("Motivo (obligatorio)").inputValue(), "Usar el primer horario");
  await capInputs.nth(9).fill("");
  await card(overB.id).getByRole("button", { name: "Confirmar decisión", exact: true }).click();
  await card(overB.id).getByText(/Decisión: Modificada/).waitFor();
  assert.equal(sql(`SELECT capacidad FROM salud_u.cupo_disponibilidad WHERE id=${u(doctors[1].slots[0])};`), "2");
  assert.equal(sql(`SELECT capacidad FROM salud_u.cupo_disponibilidad WHERE id=${u(doctors[1].slots[9])};`), "1");
  await page.reload(); await card(overB.id).getByText("Motivo: Usar el primer horario").waitFor();
  pass("Modificar permite elegir otro horario y capacidad, persiste el motivo y el valor aplicado");

  await card(overC.id).getByRole("button", { name: "Modificar", exact: true }).click();
  await card(overC.id).getByText(/No se pueden distinguir todos los horarios/).waitFor();
  assert.equal(await card(overC.id).getByRole("spinbutton").count(), 1);
  await card(overC.id).getByRole("button", { name: "Cancelar", exact: true }).click();
  pass("Nombres duplicados: se ofrecen solo los cupos sugeridos sin atribuir horarios ajenos");

  await card(dayC.id).getByRole("button", { name: "Aceptar", exact: true }).click();
  await api(admin, `/api/scheduling/suggestions/${dayC.id}/decision`, "POST", { decision: "REJECTED", reason: "Decisión concurrente" });
  await card(dayC.id).getByRole("button", { name: "Confirmar decisión", exact: true }).click();
  await card(dayC.id).getByRole("alert").waitFor();
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await card(dayC.id).getByText(/Decisión: Rechazada/).waitFor();
  pass("Una decisión concurrente produce conflicto y la actualización muestra la decisión verdadera");

  await page.getByLabel("Fecha de la jornada").fill("2099-12-31"); await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await page.getByRole("heading", { name: "No hay sugerencias para esta fecha" }).waitFor();
  await page.route("**/api/scheduling/suggestions?date=*", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false,"error":"Fallo simulado"}' }));
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await page.getByRole("alert").getByText(/No pudimos comunicarnos/).waitFor();
  assert.equal(await page.getByRole("heading", { name: "No hay sugerencias para esta fecha" }).count(), 0);
  await page.unroute("**/api/scheduling/suggestions?date=*"); await page.getByRole("button", { name: "Reintentar" }).click();
  await page.getByRole("heading", { name: "No hay sugerencias para esta fecha" }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 320, height: 844 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(origin + "/administrativo");
  await page.getByRole("navigation", { name: "Herramientas administrativas" }).getByRole("link", { name: /Sugerencias de agenda/ }).click();
  await page.getByRole("heading", { name: "Sugerencias de la jornada", exact: true }).waitFor();
  await page.getByRole("button", { name: "Actualizar", exact: true }).waitFor({ state: "visible" });
  await page.route("**/api/scheduling/suggestions?date=*", route => route.fulfill({ status: 401, contentType: "application/json", body: '{"ok":false,"error":"Sesión vencida"}' }));
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await page.getByRole("alert").getByRole("link", { name: "Iniciar sesión", exact: true }).waitFor();
  await page.unroute("**/api/scheduling/suggestions?date=*");
  pass("Fecha sin resultados, fallos recuperables y sesión vencida; sin desborde móvil");

  const reporterEmail = `f04.reportes.${seed}@salud-universitaria.test`;
  await api(admin, "/api/v1/admin/principals", "POST", { email: reporterEmail, displayName: "Reportes sintético F04", password: "SaludDemo2026!", roles: ["REPORTING_OFFICER"] }, 201);
  const reporter = await context(); await login(reporter, reporterEmail);
  await api(reporter, `/api/scheduling/suggestions?date=${day}`, "GET", undefined, 403);
  const denied = await reporter.newPage(); await denied.goto(origin + "/administrativo/planificacion"); await denied.getByRole("heading", { name: "Acceso restringido" }).waitFor();
  const anon = await context(); const anonymous = await anon.newPage(); await anonymous.goto(origin + "/administrativo/planificacion"); await anonymous.waitForURL(/\/iniciar-sesion/);
  pass("Acceso restringido al perfil autorizado; anónimo redirigido y Reportes recibe 403 en API");

  writeFileSync(out + "/crudo/recorrido.json", JSON.stringify({ status: "PASS", fecha: new Date().toISOString(), fechaJornada: day, results, suggestions: suggestions.map(({ id, type, staff }) => ({ id, type, staff })), traffic }, null, 2));
  console.log(`PASS F-04: ${results.length} grupos; Next/Spring/PostgreSQL reales; datos sintéticos`);
} catch (error) {
  for (const [i, c] of contexts.entries()) for (const [j, page] of c.pages().entries()) {
    await page.screenshot({ path: `${out}/crudo/fallo-${i}-${j}.png` }).catch(() => {});
    writeFileSync(`${out}/crudo/fallo-${i}-${j}.txt`, await page.locator("body").innerText().catch(() => ""));
  }
  writeFileSync(out + "/crudo/error.txt", String(error.stack || error)); throw error;
} finally { await Promise.all(contexts.map(c => c.close())); await browser.close(); }
