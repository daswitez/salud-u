/* Run against local synthetic seeds. See docs/evidencia-fe08.md. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.FE08_PLAYWRIGHT || "playwright");

const origin = process.env.FE08_ORIGIN || "http://127.0.0.1:3000";
const artifacts = process.env.FE08_ARTIFACTS || "/tmp/salud-u-fe08-evidence";
const password = process.env.FE08_PASSWORD || "SaludDemo2026!";
const run = async () => {
  assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Use only the local synthetic environment");
  mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.FE08_CHROMIUM ? { executablePath: process.env.FE08_CHROMIUM } : {}),
  });
  const contexts = [];
  const traffic = [];
  const results = [];
  const pendingCleanup = new Set();
  let student;
  async function api(context, path, method = "GET", data, expected = 200) {
    const headers = {};
    if (method !== "GET") {
      const response = await context.request.get(`${origin}/api/v1/security/csrf`);
      assert.equal(response.status(), 200);
      const csrf = (await response.json()).data;
      headers[csrf.headerName] = csrf.token;
    }
    const response = await context.request.fetch(`${origin}${path}`, { method, headers, data });
    const body = await response.json();
    assert.equal(response.status(), expected, `${method} ${path}: ${JSON.stringify(body)}`);
    return body;
  }
  async function login(email) {
    const context = await browser.newContext({ locale: "es-BO", timezoneId: "America/La_Paz", viewport: { width: 1366, height: 900 } });
    contexts.push(context);
    await api(context, "/api/v1/auth/login", "POST", { email, password });
    context.on("request", request => traffic.push({ method: request.method(), url: request.url() }));
    return context;
  }
  async function request() {
    const id = (await api(student, "/api/appointment-requests", "POST", {}, 201)).data.id;
    pendingCleanup.add(id);
    return id;
  }
  async function row(context, id) {
    return (await api(context, "/api/appointment-requests")).data.find(item => item.id === id);
  }
  async function eventually(predicate, description) {
    for (let i = 0; i < 50; i++) {
      if (await predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.fail(description);
  }
  try {
    const admin = await login(process.env.FE08_ADMIN || "admin.demo@salud-universitaria.test");
    student = await login(process.env.FE08_STUDENT || "estudiante.ana.demo@salud-universitaria.test");
    const doctor = await login(process.env.FE08_DOCTOR || "revision.ana.demo@salud-universitaria.test");
    const page = await admin.newPage();
    const studentPage = await student.newPage();
    const slotStart = new Date(Date.now() + 35 * 86400000);
    slotStart.setUTCSeconds(0, 0);
    const slotId = (await api(doctor, "/api/availability-slots", "POST", {
      startsAt: slotStart.toISOString(), endsAt: new Date(+slotStart + 1800000).toISOString(), capacity: 1,
    }, 201)).data.id;
    async function booked() {
      const slot = (await api(admin, "/api/availability-slots")).data.find(item => item.id === slotId);
      assert(slot, "The synthetic slot must be returned by the published availability API");
      return slot.bookedCount;
    }
    async function assign(id) {
      const appointmentId = (await api(admin, `/api/appointment-requests/${id}/assign`, "POST", { slotId })).data.appointmentId;
      assert.equal(await booked(), 1);
      return appointmentId;
    }

    const pending = await request();
    await studentPage.goto(`${origin}/estudiante/citas/${pending}`);
    await studentPage.getByLabel("Motivo de cancelación (opcional)").fill("Prueba FE08: cancelar pendiente");
    await studentPage.getByRole("button", { name: "Cancelar solicitud", exact: true }).focus();
    await studentPage.keyboard.press("Enter");
    await studentPage.getByRole("heading", { name: "Solicitud cancelada", exact: true }).waitFor();
    await studentPage.reload();
    await studentPage.getByText("Motivo: Prueba FE08: cancelar pendiente", { exact: true }).waitFor();
    pendingCleanup.delete(pending);
    results.push("Student cancels own pending request with keyboard; reason persists after reload");

    const scheduled = await request();
    const appointment = await assign(scheduled);
    await page.goto(`${origin}/administrativo/check-in`);
    let card = page.locator(`[data-request-id="${scheduled}"]`);
    await card.getByRole("button", { name: "Registrar ingreso" }).waitFor();
    await page.route(`**/api/appointments/${appointment}/check-in`, route => route.abort("failed"), { times: 1 });
    await card.getByRole("button", { name: "Registrar ingreso" }).click();
    await page.getByRole("alert").waitFor();
    assert.equal((await row(student, scheduled)).appointment.status, "SCHEDULED");
    assert.equal(await page.getByText("Ingreso registrado.", { exact: true }).count(), 0);
    await card.getByRole("button", { name: "Registrar ingreso" }).focus();
    await page.keyboard.press("Enter");
    await page.getByText("Ingreso registrado.", { exact: true }).waitFor();
    await page.reload();
    card = page.locator(`[data-request-id="${scheduled}"]`);
    await card.getByText("Ingresó", { exact: true }).waitFor();
    assert((await row(student, scheduled)).appointment.checked_in_at);
    await api(student, `/api/appointment-requests/${scheduled}`, "PATCH", { action: "cancel" }, 409);
    await api(admin, `/api/appointments/${appointment}/check-in`, "POST", {}, 409);
    await api(student, `/api/appointments/${appointment}/check-in`, "POST", {}, 403);
    await api(student, `/api/appointments/${appointment}/no-show`, "POST", {}, 403);
    await card.getByRole("button", { name: "No asistió" }).click();
    await page.getByText("Inasistencia registrada.", { exact: true }).waitFor();
    await page.reload();
    await page.locator(`[data-request-id="${scheduled}"]`).getByText("No asistió", { exact: true }).waitFor();
    assert.equal(await booked(), 0);
    await api(admin, `/api/appointments/${appointment}/no-show`, "POST", {}, 409);
    assert.equal(await booked(), 0);
    pendingCleanup.delete(scheduled);
    results.push("Network error retains SCHEDULED and allows keyboard retry; CHECKED_IN timestamp persists; NO_SHOW releases slot once; student attendance rejected");
    await page.screenshot({ path: `${artifacts}/administrativo.png`, fullPage: true });

    const assigned = await request();
    await assign(assigned);
    await studentPage.goto(`${origin}/estudiante/citas/${assigned}`);
    await studentPage.getByLabel("Motivo de cancelación (opcional)").fill("Prueba FE08: conservar borrador");
    await studentPage.route(`**/api/appointment-requests/${assigned}`, route => route.abort("failed"), { times: 1 });
    await studentPage.getByRole("button", { name: "Cancelar solicitud", exact: true }).click();
    await studentPage.getByRole("alert").waitFor();
    assert.equal(await studentPage.getByLabel("Motivo de cancelación (opcional)").inputValue(), "Prueba FE08: conservar borrador");
    assert.equal((await row(student, assigned)).status, "ASSIGNED");
    await studentPage.getByRole("button", { name: "Cancelar solicitud", exact: true }).click();
    await studentPage.getByRole("heading", { name: "Solicitud cancelada", exact: true }).waitFor();
    await studentPage.reload();
    await studentPage.getByText("Motivo: Prueba FE08: conservar borrador", { exact: true }).waitFor();
    assert.equal((await row(student, assigned)).appointment.status, "CANCELLED");
    assert((await row(student, assigned)).appointment.cancelled_at);
    assert.equal(await booked(), 0);
    await api(student, `/api/appointment-requests/${assigned}`, "PATCH", { action: "cancel" });
    assert.equal(await booked(), 0);
    pendingCleanup.delete(assigned);
    results.push("Assigned SCHEDULED cancellation works from screen; network error preserves reason; repeated cancellation is idempotent");
    await studentPage.screenshot({ path: `${artifacts}/estudiante.png`, fullPage: true });

    const stale = await request();
    const staleAppointment = await assign(stale);
    await page.reload();
    const staleCard = page.locator(`[data-request-id="${stale}"]`);
    await staleCard.getByRole("button", { name: "Registrar ingreso" }).waitFor();
    await api(admin, `/api/appointments/${staleAppointment}/no-show`, "POST", { reason: "Prueba FE08: concurrencia" });
    await staleCard.getByRole("button", { name: "Registrar ingreso" }).click();
    await page.getByRole("alert").filter({ hasText: "La cita no puede registrar ingreso." }).waitFor();
    await page.getByRole("button", { name: "Reintentar carga" }).click();
    await staleCard.getByText("No asistió", { exact: true }).waitFor();
    assert.equal(await page.getByText("Ingreso registrado.", { exact: true }).count(), 0);
    assert.equal(await booked(), 0);
    pendingCleanup.delete(stale);
    results.push("Stale screen receives real 409, shows no false success and refreshes without losing session");

    const patients = (await api(admin, "/api/patients")).data;
    const ownPatient = (await row(student, assigned)).patient.id;
    const otherPatient = patients.find(patient => patient.id !== ownPatient);
    assert(otherPatient, "A second synthetic patient is required for the ownership test");
    const other = (await api(admin, "/api/appointment-requests", "POST", { patientId: otherPatient.id }, 201)).data.id;
    try {
      await api(student, `/api/appointment-requests/${other}`, "PATCH", { action: "cancel" }, 404);
      assert.equal((await row(admin, other)).status, "PENDING");
    } finally {
      await api(admin, `/api/appointment-requests/${other}`, "PATCH", { action: "cancel" });
    }
    results.push("Foreign request cancellation returns 404 and leaves request unchanged");

    await studentPage.goto(`${origin}/estudiante/citas/00000000-0000-4000-8000-000000000008`);
    await studentPage.getByRole("heading", { name: "Solicitud no encontrada.", exact: true }).waitFor();
    const anonymous = await browser.newContext();
    contexts.push(anonymous);
    const anonymousPage = await anonymous.newPage();
    await anonymousPage.goto(`${origin}/administrativo/check-in`);
    assert(new URL(anonymousPage.url()).pathname === "/iniciar-sesion");
    results.push("Missing authorized record has a settled empty state; absent session redirects to login");
    await eventually(async () => traffic.some(item => item.url.endsWith(`/api/appointments/${appointment}/check-in`)), "Missing browser attendance request");
    assert(!traffic.some(item => /supabase\.(co|com)|\/api\/health\/supabase/.test(item.url)), "Unexpected Supabase browser traffic");
    writeFileSync(`${artifacts}/resultado.json`, JSON.stringify({ origin, results, traffic, requestIds: [pending, scheduled, assigned, stale] }, null, 2));
    console.log(JSON.stringify({ status: "PASS", results, artifacts }, null, 2));
  } finally {
    // Keep history, but release synthetic reservations when an assertion fails.
    for (const id of pendingCleanup) {
      try { await api(student, `/api/appointment-requests/${id}`, "PATCH", { action: "cancel" }); } catch { /* CHECKED_IN/NO_SHOW cannot be cancelled. */ }
    }
    await browser.close();
  }
};
run().catch(error => { console.error(error); process.exitCode = 1; });
