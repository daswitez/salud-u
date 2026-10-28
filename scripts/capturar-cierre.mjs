import { segundoFactor } from "./lib/segundo-factor.mjs";
// C-03: capturas reales contra Next/Spring; no genera ni sustituye pantallas pendientes.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.CIERRE_PLAYWRIGHT || "playwright");
const origin = process.env.CIERRE_ORIGIN || "http://127.0.0.1:3000";
const dest = process.env.CIERRE_CAPTURAS || "docs/evaluacion/cierre-20261027/figuras";
const recorrido = JSON.parse(readFileSync(process.env.CIERRE_RECORRIDO || "/tmp/cierre-recorrido/recorrido.json", "utf8"));
assert.equal(recorrido.status, "PASS");
assert(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
mkdirSync(dest, { recursive: true });
rmSync(dest + "/indice.json", { force: true });
const sql = query => execFileSync("docker", ["compose", "exec", "-T", "postgres", "sh", "-c", 'psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'], { cwd: fileURLToPath(new URL("../../salud-u-backend/", import.meta.url)), input: query, encoding: "utf8" }).trim();
const browser = await chromium.launch({ headless: true, ...(process.env.CIERRE_CHROMIUM ? { executablePath: process.env.CIERRE_CHROMIUM } : {}) });
const capturas = [], contexts = [];
async function api(ctx, path, method = "GET", data, status = 200) {
  const headers = {};
  if (method !== "GET") { const csrf = (await (await ctx.request.get(origin + "/api/v1/security/csrf")).json()).data; headers[csrf.headerName] = csrf.token; }
  const response = await ctx.request.fetch(origin + path, { method, data, headers });
  assert.equal(response.status(), status, await response.text()); return response.json();
}
async function login(email) {
  const ctx = await browser.newContext({ locale: "es-BO", timezoneId: "America/La_Paz", viewport: { width: 1440, height: 1050 } }); contexts.push(ctx);
  await segundoFactor(ctx, origin, { email, password: "SaludDemo2026!" }, await api(ctx, "/api/v1/auth/login", "POST", { email, password: "SaludDemo2026!" })); return ctx;
}
async function capture(page, id, file, description, locator) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const png = locator ? await locator.screenshot({ path: `${dest}/${file}` }) : await page.screenshot({ path: `${dest}/${file}`, fullPage: id === "3.59" });
  capturas.push({ id, fecha: new Date().toISOString(), ruta: new URL(page.url()).pathname, archivo: file, descripcion: description, sha256: createHash("sha256").update(png).digest("hex"), estado: "CAPTURADA", datos: "sintéticos" });
}
try {
  const admin = await login("admin.demo@salud-universitaria.test"), student = await login("estudiante.ana.demo@salud-universitaria.test");
  const reporter = await login(sql("SELECT correo FROM salud_u.principal WHERE correo LIKE 'fecorte.reportes.%@salud-universitaria.test' ORDER BY creado_en DESC,id DESC LIMIT 1;"));
  const auditor = await login(sql("SELECT correo FROM salud_u.principal WHERE correo LIKE 'fecorte.auditor.%@salud-universitaria.test' ORDER BY creado_en DESC,id DESC LIMIT 1;"));
  const sp = await student.newPage(); await sp.goto(origin + "/estudiante");
  await sp.getByRole("link", { name: /Historial de vacunación/ }).first().waitFor();
  assert(!/lista de espera/i.test(await sp.locator("body").innerText()));
  await capture(sp, "3.54", "figura-3.54.png", "Portal actual del estudiante: citas, solicitudes y acceso a avisos; sin lista de espera. Actualizar el pie antiguo de la figura.");

  const ap = await auditor.newPage(); await ap.goto(origin + "/administrativo/auditoria");
  await ap.getByRole("region", { name: "Eventos registrados" }).waitFor();
  await capture(ap, "3.55", "figura-3.55.png", "Consulta de auditoría de accesos y exportaciones, con la sesión Auditor.");

  const catalog = await admin.newPage(); await catalog.goto(origin + "/administrativo/vacunas");
  await catalog.getByRole("heading", { name: "Vacunas y esquemas de dosis", exact: true }).waitFor();
  await catalog.getByRole("button", { name: /Editar/ }).first().waitFor();
  await capture(catalog, "3.57", "figura-3.57.png", "Catálogo real de vacunas y esquema de dosis.");

  const dose = await admin.newPage(); await dose.goto(origin + "/administrativo/estudiantes/" + recorrido.patientId);
  const doseForm = dose.getByRole("form", { name: "Registrar dosis aplicada", exact: true }); await doseForm.waitFor();
  await capture(dose, "3.58", "figura-3.58-registro.png", "Formulario de registro de dosis aplicada en la ficha administrativa.", doseForm);
  await sp.goto(origin + "/estudiante/vacunas");
  await sp.getByRole("cell", { name: /LOT-FECORTE/ }).first().waitFor();
  await capture(sp, "3.58-complemento", "figura-3.58-carnet.png", "Carnet propio con la dosis registrada por el recorrido de C-03.");

  const rp = await reporter.newPage(); await rp.goto(origin + "/administrativo/reportes");
  await rp.getByRole("button", { name: "Aplicar filtros", exact: true }).waitFor();
  await rp.getByRole("region", { name: /Resultado/ }).first().waitFor();
  assert.match(recorrido.reviewEncounter, /^[0-9a-f-]{36}$/);
  const diagnosis = sql("SELECT texto_libre FROM salud_u.diagnostico_encuentro WHERE id_encuentro='" + recorrido.reviewEncounter + "'::uuid ORDER BY creado_en LIMIT 1;");
  const marker = diagnosis.match(/FECORTE\d+/)?.[0]; assert(marker);
  await rp.getByLabel("Buscar en la atención", { exact: true }).fill(marker);
  await rp.getByRole("combobox", { name: /^Agrupar por/ }).selectOption("specialty");
  const filtered = rp.waitForResponse(r => r.url().includes("/api/reports/clinical?") && r.request().method() === "GET");
  await rp.getByRole("button", { name: "Aplicar filtros", exact: true }).click(); assert.equal((await filtered).status(), 200);
  await rp.getByRole("region", { name: "Resultado aplicado", exact: true }).waitFor();
  await capture(rp, "3.59", "figura-3.59.png", "Constructor real de reportes: filtros, columnas, agrupación y exportación.");

  const research = await reporter.newPage(); await research.goto(origin + "/administrativo/reportes/investigacion");
  await research.getByRole("heading", { level: 1 }).waitFor();
  await research.getByLabel("Finalidad de la exportación", { exact: true }).waitFor();
  await capture(research, "3.59-complemento", "figura-3.59-investigacion.png", "La exportación seudonimizada está en su pantalla propia de investigación; no hay un selector de modo nominal/seudonimizado en el constructor clínico.");

  // La captura de F-04 se conserva en ENTREGAS_CODEX; este recorrido verifica la pantalla.
  const planning = await admin.newPage(); await planning.goto(origin + "/administrativo/planificacion");
  assert.equal(new URL(planning.url()).pathname, "/administrativo/planificacion");
  await planning.getByRole("heading", { name: "Sugerencias de la jornada", exact: true }).waitFor();
  capturas.push({ id: "3.61", fecha: new Date().toISOString(), estado: "CAPTURA_EN_ENTREGA_F04", ruta: "/administrativo/planificacion", descripcion: "La captura con decisión persistida se registra en ENTREGAS_CODEX/F-04/figuras/figura-3.61.png." });

  await sp.goto(origin + "/estudiante/avisos");
  await sp.getByRole("heading", { name: "Mis avisos", exact: true }).waitFor();
  await sp.locator("article[aria-label]").first().waitFor();
  await capture(sp, "3.62", "figura-3.62.png", "Bandeja real del estudiante, contador y lectura propia.");
  writeFileSync(dest + "/indice.json", JSON.stringify({ origen: origin, navegador: "Chromium", resolucion: "1440x1050", documento: "MSD-Documento proyecto de grado Ver.1.10 u.docx", capturas }, null, 2));
  console.log("C03: " + capturas.filter(c => c.estado === "CAPTURADA").length + " capturas reales; Figura 3.61 disponible en la entrega F-04");
} finally { await Promise.all(contexts.map(ctx => ctx.close())); await browser.close(); }
