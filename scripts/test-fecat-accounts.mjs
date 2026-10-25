/* Read-only regression for the FE-CAT account-list defect. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.FECAT_PLAYWRIGHT || "playwright");
const origin = process.env.FECAT_ORIGIN || "http://127.0.0.1:3000";
const artifacts = process.env.FECAT_ARTIFACTS || "/tmp/salud-u-fecat-accounts-evidence";

async function run() {
  assert(["127.0.0.1", "localhost"].includes(new URL(origin).hostname), "Local test environment only");
  mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.FECAT_CHROMIUM ? { executablePath: process.env.FECAT_CHROMIUM } : {}) });
  const traffic = [];
  async function login(email) {
    const context = await browser.newContext({ locale: "es-BO", viewport: { width: 1366, height: 900 } });
    const csrf = (await (await context.request.get(`${origin}/api/v1/security/csrf`)).json()).data;
    const response = await context.request.post(`${origin}/api/v1/auth/login`, {
      data: { email, password: process.env.FECAT_PASSWORD || "SaludDemo2026!" },
      headers: { [csrf.headerName]: csrf.token },
    });
    assert.equal(response.status(), 200);
    context.on("request", request => traffic.push({ method: request.method(), url: request.url() }));
    return context;
  }
  try {
    const email = process.env.FECAT_ADMIN || "admin.demo@salud-universitaria.test";
    const admin = await login(email);
    const response = await admin.request.get(`${origin}/api/v1/admin/principals`);
    assert.equal(response.status(), 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert(Array.isArray(payload.data) && payload.data.length);
    for (const account of payload.data) {
      assert(Array.isArray(account.roles));
      assert(account.roles.every(role => typeof role === "string"));
      assert.equal(typeof account.active, "boolean");
      assert(!Object.hasOwn(account, "password") && !Object.hasOwn(account, "hash_contrasena"));
    }
    const page = await admin.newPage();
    await page.goto(`${origin}/administrativo/personal-medico`);
    const card = page.locator("article").filter({ hasText: email });
    await card.waitFor();
    assert((await card.innerText()).includes("ADMINISTRATIVE"));
    assert.equal(await page.locator('p[role="alert"]').count(), 0);
    await page.reload();
    await card.waitFor();
    assert.equal((await admin.request.get(`${origin}/api/me`)).status(), 200);
    await page.screenshot({ path: `${artifacts}/cuentas.png`, fullPage: true });
    const student = await login(process.env.FECAT_STUDENT || "estudiante.ana.demo@salud-universitaria.test");
    const forbidden = await student.request.get(`${origin}/api/v1/admin/principals`);
    assert.equal(forbidden.status(), 403);
    assert.equal((await forbidden.json()).error.code, "FORBIDDEN");
    const anonymous = await browser.newContext();
    assert.equal((await anonymous.request.get(`${origin}/api/v1/admin/principals`)).status(), 401);
    assert(!traffic.some(item => /supabase\.(co|com)/.test(item.url)));
    const result = { status: "PASS", accounts: payload.data.length, adminList: 200, adminIdentityAfterReload: 200, student: 403, anonymous: 401, traffic };
    writeFileSync(`${artifacts}/resultado.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ ...result, traffic: undefined, artifacts }, null, 2));
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
