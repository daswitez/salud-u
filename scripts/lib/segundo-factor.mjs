// SEG-2FA para los scripts E2E: completa el segundo factor de las cuentas que lo exigen (médico de revisión y especialista).
// La primera vez activa el factor con un secreto sintético que entrega el propio backend y lo guarda solo en un archivo
// temporal local (fuera del repositorio), junto con el último paso usado, para no repetir un código (anti-repetición).
// Solo para bases de demostración o de prueba: nunca contra datos reales.
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STATE = process.env.SALUD_U_E2E_TOTP_FILE || join(tmpdir(), "salud-u-e2e-totp.json");
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function load() { try { return existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {}; } catch { return {}; } }
function save(key, value) { const all = load(); all[key] = { ...all[key], ...value }; writeFileSync(STATE, JSON.stringify(all, null, 2), { mode: 0o600 }); }
const keyOf = (origin, email) => `${new URL(origin).origin}|${email.toLowerCase()}`;

function decode(secret) {
  let buffer = 0, bits = 0; const out = [];
  for (const c of secret.replace(/[\s=]/g, "").toUpperCase()) { buffer = (buffer << 5) | BASE32.indexOf(c); bits += 5; if (bits >= 8) { out.push((buffer >> (bits - 8)) & 0xff); bits -= 8; } }
  return Buffer.from(out);
}

/** Código RFC 6238 (HMAC-SHA1, 6 dígitos, 30 s) del paso dado. */
export function totp(secret, step) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const hash = createHmac("sha1", decode(secret)).update(counter).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

/** Código de un paso posterior al último usado y dentro de la ventana (±1) del servidor; espera si hace falta. */
export async function nextCode(origin, email, secret) {
  const key = keyOf(origin, email);
  for (;;) {
    const current = Math.floor(Date.now() / 30000), last = load()[key]?.lastStep ?? -Infinity;
    // El paso actual o el siguiente siguen dentro de la ventana aunque el reloj avance durante la petición.
    const step = Math.max(current, last + 1);
    if (step <= current + 1) {
      save(key, { secret, lastStep: step });
      return totp(secret, step);
    }
    await sleep(30000 - (Date.now() % 30000) + 200);
  }
}

function requester(context) { return context.request ?? context; }
async function post(context, origin, path, data) {
  const http = requester(context);
  const csrf = (await (await http.get(origin + "/api/v1/security/csrf")).json()).data;
  const response = await http.post(origin + path, { headers: { [csrf.headerName]: csrf.token }, data });
  const body = response.status() === 204 ? null : await response.json().catch(() => null);
  if (response.status() !== 200) throw new Error(`${path} respondió ${response.status()}: ${JSON.stringify(body?.error ?? body)}`);
  return body;
}

/**
 * Restablece el segundo factor directamente en una base local de pruebas cuando se perdió el secreto sintético.
 * Solo si SALUD_U_E2E_PSQL apunta a esa base, por ejemplo "docker exec -i salud-u-capturas-postgres-1 psql -U salud_u_migrator -d salud_u".
 */
function resetLocally(email) {
  const command = process.env.SALUD_U_E2E_PSQL;
  if (!command) return false;
  const [program, ...args] = command.split(" ").filter(Boolean);
  const literal = "'" + email.replace(/'/g, "''") + "'";
  const sql = `update salud_u.segundo_factor_principal s set secreto_cifrado=null, activado_en=null, ultimo_paso_usado=null, cantidad_intentos_fallidos=0, bloqueado_hasta=null, actualizado_en=now() from salud_u.principal p where p.id=s.id_principal and lower(p.correo)=lower(${literal});`
    + ` update salud_u.codigo_recuperacion_principal c set usado_en=now() from salud_u.principal p where p.id=c.id_principal and c.usado_en is null and lower(p.correo)=lower(${literal});`;
  execFileSync(program, [...args, "-v", "ON_ERROR_STOP=1", "-q", "-c", sql], { stdio: ["ignore", "ignore", "inherit"] });
  return true;
}

/**
 * Completa el segundo factor tras POST /api/v1/auth/login. {@code loginBody} es la respuesta del login; si no pide segundo
 * factor (roles sin 2FA) se devuelve tal cual. Sirve con un BrowserContext de Playwright o con un APIRequestContext.
 */
export async function segundoFactor(context, origin, credentials, loginBody) {
  const data = loginBody?.data ?? loginBody;
  if (!data?.secondFactorRequired) return loginBody;
  const { email, password } = credentials;
  const key = keyOf(origin, email);
  if (data.enrollmentRequired) {
    const { secret } = (await post(context, origin, "/api/v1/auth/second-factor/enrollment")).data;
    save(key, { secret, lastStep: null });
    return post(context, origin, "/api/v1/auth/second-factor/enrollment/confirm", { code: await nextCode(origin, email, secret) });
  }
  const secret = load()[key]?.secret;
  if (!secret) {
    if (!password || !resetLocally(email)) {
      throw new Error(`No hay secreto sintético guardado para ${email} en ${STATE}. Restablece su segundo factor desde Administración `
        + "(Organización institucional → Restablecer segundo factor) o define SALUD_U_E2E_PSQL contra la base local de pruebas.");
    }
    return segundoFactor(context, origin, credentials, await post(context, origin, "/api/v1/auth/login", { email, password }));
  }
  return post(context, origin, "/api/v1/auth/second-factor", { code: await nextCode(origin, email, secret) });
}

/** Igual que {@link segundoFactor}, pero para un ingreso por la pantalla /iniciar-sesion ya enviado con la contraseña. */
export async function segundoFactorEnPagina(page, origin, email) {
  const enrollment = page.getByRole("button", { name: "Mostrar código QR" });
  const code = page.getByLabel("Código de verificación");
  const appeared = await Promise.race([
    enrollment.waitFor({ timeout: 15000 }).then(() => "activar"),
    code.waitFor({ timeout: 15000 }).then(() => "verificar"),
    page.waitForURL(url => !new URL(url).pathname.startsWith("/iniciar-sesion"), { timeout: 15000 }).then(() => "sin-2fa"),
  ]).catch(() => "sin-2fa");
  if (appeared === "sin-2fa") return;
  const key = keyOf(origin, email);
  if (appeared === "activar") {
    await enrollment.click();
    const secret = (await page.locator("code").first().innerText()).replace(/\s/g, "");
    save(key, { secret, lastStep: null });
    await code.fill(await nextCode(origin, email, secret));
    await page.getByRole("button", { name: "Activar y continuar" }).click();
    await page.getByRole("button", { name: "Ya los guardé" }).click();
  } else {
    const secret = load()[key]?.secret;
    if (!secret) throw new Error(`No hay secreto sintético guardado para ${email} en ${STATE}; restablece su segundo factor desde Administración.`);
    await code.fill(await nextCode(origin, email, secret));
    await page.getByRole("button", { name: "Verificar e ingresar" }).click();
  }
  await page.waitForURL(url => !new URL(url).pathname.startsWith("/iniciar-sesion"));
}
