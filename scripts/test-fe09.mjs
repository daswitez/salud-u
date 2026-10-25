/* FE-09 browser regression against local synthetic seeds; see docs/evidencia-fe09.md. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.FE09_PLAYWRIGHT || "playwright");
const origin = process.env.FE09_ORIGIN || "http://127.0.0.1:3000";
const artifacts = process.env.FE09_ARTIFACTS || "/tmp/salud-u-fe09-evidence";
const password = process.env.FE09_PASSWORD || "SaludDemo2026!";

async function run() {
  assert(["127.0.0.1", "localhost"].includes(new URL(origin).hostname), "Local synthetic environment only");
  mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.FE09_CHROMIUM ? { executablePath: process.env.FE09_CHROMIUM } : {}) });
  const traffic = [], results = [], evidence = [], cleanup = [];
  let admin;
  async function api(context, path, method = "GET", data, expected = 200) {
    const headers = {};
    if (method !== "GET") {
      const response = await context.request.get(`${origin}/api/v1/security/csrf`);
      assert.equal(response.status(), 200);
      const csrf = (await response.json()).data;
      headers[csrf.headerName] = csrf.token;
    }
    const response = await context.request.fetch(`${origin}${path}`, { method, data, headers });
    const payload = await response.json();
    assert.equal(response.status(), expected, `${method} ${path}: ${JSON.stringify(payload)}`);
    return payload;
  }
  async function login(email) {
    const context = await browser.newContext({ locale: "es-BO", timezoneId: "America/La_Paz", viewport: { width: 1366, height: 900 } });
    await api(context, "/api/v1/auth/login", "POST", { email, password });
    context.on("request", request => traffic.push({ method: request.method(), url: request.url() }));
    return context;
  }
  async function ensureDoctor(email, role, staffCode) {
    let context;
    try { context = await login(email); }
    catch (error) {
      if (!error.message.includes("INVALID_CREDENTIALS")) throw error;
      await api(admin, "/api/v1/admin/principals", "POST", { email, displayName: `Profesional sintético ${staffCode}`, password, roles: [role] }, 201);
      context = await login(email);
    }
    const principal = (await api(context, "/api/me")).user;
    const staff = (await api(admin, "/api/v1/admin/staff", "POST", { principalId: principal.id, staffCode, active: true })).data;
    return { context, staffId: staff.id };
  }
  async function publish(doctor, specialtyId = null) {
    let start = Date.now() + 42 * 86400000;
    const existing = (await api(admin, "/api/availability-slots")).data;
    while (existing.some(slot => start < Date.parse(slot.endsAt) && start + 1800000 > Date.parse(slot.startsAt))) start += 3600000;
    return (await api(doctor, "/api/availability-slots", "POST", { startsAt: new Date(start).toISOString(), endsAt: new Date(start + 1800000).toISOString(), capacity: 1, specialtyId }, 201)).data.id;
  }
  async function schedule(student, slotId, specialtyId = null) {
    const own = (await api(student, "/api/appointment-requests")).data.find(item => item.patient);
    const body = specialtyId ? { patientId: own.patient.id, appointmentType: "SPECIALTY", specialtyId } : {};
    const requestId = (await api(specialtyId ? admin : student, "/api/appointment-requests", "POST", body, 201)).data.id;
    cleanup.push({ requestId, appointmentId: null });
    const appointmentId = (await api(admin, `/api/appointment-requests/${requestId}/assign`, "POST", { slotId })).data.appointmentId;
    cleanup.at(-1).appointmentId = appointmentId;
    return { requestId, appointmentId };
  }
  async function appointment(context, id) {
    return (await api(context, "/api/medical/appointments")).data.find(item => item.id === id);
  }
  async function release(item) {
    await api(admin, `/api/appointments/${item.appointmentId}/no-show`, "POST", { reason: "Fin de prueba FE09" });
    cleanup.splice(cleanup.findIndex(entry => entry.requestId === item.requestId), 1);
  }
  async function openWithKeyboard(page, id, label, expected) {
    const response = page.waitForResponse(response => response.url().endsWith(`/api/medical/appointments/${id}/start`) && response.request().method() === "POST");
    await page.getByRole("button", { name: label, exact: true }).focus();
    await page.keyboard.press("Enter");
    const result = await response;
    assert.equal(result.status(), expected);
    const payload = await result.json();
    await page.getByRole("link", { name: "Completar ficha", exact: true }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Completar ficha", exact: true }).getAttribute("href"), `/medico/citas/${id}?ficha=1`);
    return payload.data.encounterId;
  }
  try {
    admin = await login(process.env.FE09_ADMIN || "admin.demo@salud-universitaria.test");
    const student = await login(process.env.FE09_STUDENT || "estudiante.ana.demo@salud-universitaria.test");
    const doctor = await login(process.env.FE09_DOCTOR || "revision.ana.demo@salud-universitaria.test");
    const outsider = (await ensureDoctor("fe09.ajeno@salud-universitaria.test", "REVIEW_DOCTOR", "FE09-AJENO")).context;
    const specialtyDoctor = await ensureDoctor("fe09.especialista@salud-universitaria.test", "SPECIALIST", "FE09-ESPECIALISTA");
    let specialty = (await api(admin, "/api/v1/catalogs/SPECIALTY")).data.find(item => item.code === "FE09_TEST");
    if (!specialty) specialty = (await api(admin, "/api/v1/admin/catalogs/SPECIALTY", "POST", { code: "FE09_TEST", name: "Especialidad sintética FE09", active: true })).data;
    await api(admin, "/api/v1/admin/staff/specialties", "POST", { staffMemberId: specialtyDoctor.staffId, specialtyId: specialty.id, activeFrom: "2026-01-01", activeTo: null });

    const page = await doctor.newPage();
    await page.route("**/api/medical/appointments", route => route.abort("failed"));
    await page.goto(`${origin}/medico/agenda`);
    await page.locator('p[role="alert"]').waitFor();
    await page.getByRole("textbox", { name: "Buscar", exact: true }).fill("FE09-filtro-conservado");
    await page.unroute("**/api/medical/appointments");
    await page.getByRole("button", { name: "Reintentar carga", exact: true }).click();
    await page.getByText("No hay citas en esta vista", { exact: true }).waitFor();
    assert.equal(await page.getByRole("textbox", { name: "Buscar", exact: true }).inputValue(), "FE09-filtro-conservado");
    results.push("Agenda network error offers retry and preserves filters; no matches settles to an empty state");

    const slotId = await publish(doctor);
    const first = await schedule(student, slotId);
    await page.goto(`${origin}/medico/agenda`);
    const openLink = page.locator(`a[href="/medico/citas/${first.appointmentId}"]`);
    await openLink.waitFor();
    await openLink.click();
    const before = await appointment(doctor, first.appointmentId);
    assert.equal(before.encounter, null);
    assert.equal(typeof before.patient.registrationCode, "string");
    for (const key of ["birthDate", "phone", "email"]) assert(Object.hasOwn(before.patient, key));
    assert(Object.hasOwn(before, "checkedInAt") && Object.hasOwn(before, "specialtyCode"));
    const encounterId = await openWithKeyboard(page, first.appointmentId, "Iniciar cita", 201);
    await page.reload();
    await page.locator(`[data-encounter-id="${encounterId}"]`).waitFor();
    assert.equal(await openWithKeyboard(page, first.appointmentId, "Recuperar borrador", 200), encounterId);
    assert.equal((await appointment(doctor, first.appointmentId)).encounter.id, encounterId);
    await page.screenshot({ path: `${artifacts}/revision-borrador.png`, fullPage: true });
    evidence.push({ ...first, encounterId, type: "INITIAL" });
    results.push("Own SCHEDULED appointment opens with keyboard and 201; reload preserves UUID; explicit recovery returns 200 with the same draft");
    await api(outsider, `/api/medical/appointments/${first.appointmentId}/start`, "POST", {}, 404);
    await api(admin, `/api/medical/appointments/${first.appointmentId}/start`, "POST", {}, 403);
    await api(student, "/api/medical/appointments", "GET", undefined, 403);
    const otherPage = await outsider.newPage();
    await otherPage.goto(`${origin}/medico/agenda`);
    await otherPage.getByText("No hay citas en esta vista", { exact: true }).waitFor();
    await otherPage.goto(`${origin}/medico/citas/${first.appointmentId}`);
    await otherPage.getByText("No se encontró una cita asignada a tu cuenta.", { exact: true }).waitFor();
    assert.equal(await otherPage.getByRole("button", { name: "Iniciar cita", exact: true }).count(), 0);
    assert(!(await otherPage.locator("body").innerText()).includes(before.patient.carnet));
    results.push("Foreign doctor sees no appointment or patient identity and POST returns 404; nonmedical actors are rejected");
    await release(first);

    const second = await schedule(student, slotId);
    await api(admin, `/api/appointments/${second.appointmentId}/check-in`, "POST", {});
    await page.goto(`${origin}/medico/citas/${second.appointmentId}`);
    let committed;
    await page.route(`**/api/medical/appointments/${second.appointmentId}/start`, async route => {
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      committed = (await response.json()).data.encounterId;
      await route.abort("failed");
    }, { times: 1 });
    await page.getByRole("button", { name: "Iniciar cita", exact: true }).click();
    await page.locator('p[role="alert"]').waitFor();
    assert(committed);
    assert.equal(await page.getByRole("link", { name: "Completar ficha", exact: true }).count(), 0);
    const lost = await appointment(doctor, second.appointmentId);
    assert.equal(lost.encounter.id, committed);
    assert(lost.checkedInAt);
    await page.getByRole("button", { name: "Reintentar carga", exact: true }).click();
    assert.equal(await openWithKeyboard(page, second.appointmentId, "Recuperar borrador", 200), committed);
    evidence.push({ ...second, encounterId: committed, type: "INITIAL_RESPONSE_LOST" });
    results.push("Lost response after a committed CHECKED_IN opening shows recoverable error and recovers the persisted draft without duplication");
    await release(second);

    const stale = await schedule(student, slotId);
    await page.goto(`${origin}/medico/citas/${stale.appointmentId}`);
    await page.getByRole("button", { name: "Iniciar cita", exact: true }).waitFor();
    await release(stale);
    const conflict = page.waitForResponse(response => response.url().endsWith(`/api/medical/appointments/${stale.appointmentId}/start`));
    await page.getByRole("button", { name: "Iniciar cita", exact: true }).click();
    assert.equal((await conflict).status(), 409);
    await page.getByRole("alert").filter({ hasText: "Esta cita ya no puede iniciarse." }).waitFor();
    assert.equal((await appointment(doctor, stale.appointmentId)).encounter, null);
    await page.getByRole("button", { name: "Reintentar carga", exact: true }).click();
    await page.getByText("Esta cita ya no puede iniciarse.", { exact: true }).waitFor();
    results.push("Stale appointment becomes NO_SHOW: start returns real 409 and creates no draft; refresh removes the start action");

    const specialistSlot = await publish(specialtyDoctor.context, specialty.id);
    const specialized = await schedule(student, specialistSlot, specialty.id);
    const specialistPage = await specialtyDoctor.context.newPage();
    await specialistPage.goto(`${origin}/medico/citas/${specialized.appointmentId}`);
    await specialistPage.getByText(specialty.name, { exact: true }).waitFor();
    const specializedId = await openWithKeyboard(specialistPage, specialized.appointmentId, "Iniciar cita", 201);
    await specialistPage.reload();
    assert.equal(await openWithKeyboard(specialistPage, specialized.appointmentId, "Recuperar borrador", 200), specializedId);
    evidence.push({ ...specialized, encounterId: specializedId, type: "SPECIALTY" });
    await specialistPage.screenshot({ path: `${artifacts}/especialidad-borrador.png`, fullPage: true });
    results.push("Assigned specialist starts and recovers own direct specialty encounter through the same screen");
    await release(specialized);

    await page.goto(`${origin}/medico/citas/00000000-0000-4000-8000-000000000009`);
    await page.getByText("No se encontró una cita asignada a tu cuenta.", { exact: true }).waitFor();
    await page.goto(`${origin}/medico/agenda`);
    await doctor.clearCookies({ name: "SALUD_U_SESSION" });
    await page.reload();
    assert.equal(new URL(page.url()).pathname, "/iniciar-sesion");
    assert(!traffic.some(item => /supabase\.(co|com)|\/api\/health\/supabase/.test(item.url)));
    assert(!traffic.some(item => /\/api\/medical\/patients\//.test(item.url)), "UC-09 must not load the subsequent clinical-history workflow");
    results.push("Missing appointment and expired session have explicit states; no Supabase or clinical-history API request is made during UC-09");
    writeFileSync(`${artifacts}/resultado.json`, JSON.stringify({ status: "PASS", origin, results, evidence, traffic }, null, 2));
    console.log(JSON.stringify({ status: "PASS", results, evidence, artifacts }, null, 2));
  } catch (error) {
    for (const [index, context] of browser.contexts().entries()) {
      for (const [number, page] of context.pages().entries()) {
        await page.screenshot({ path: `${artifacts}/fallo-${index}-${number}.png`, fullPage: true }).catch(() => {});
        writeFileSync(`${artifacts}/fallo-${index}-${number}.txt`, await page.locator("body").innerText().catch(() => "No disponible"));
      }
    }
    throw error;
  } finally {
    for (const item of cleanup) {
      try {
        if (item.appointmentId) await api(admin, `/api/appointments/${item.appointmentId}/no-show`, "POST", { reason: "Limpieza FE09" });
        else await api(admin, `/api/appointment-requests/${item.requestId}`, "PATCH", { action: "cancel" });
      } catch { /* Keep test history; never alter pre-existing requests. */ }
    }
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
