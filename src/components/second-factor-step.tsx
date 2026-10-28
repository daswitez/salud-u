"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { QrCode } from "@/components/qr-code";
import { ApiRequestError, apiJson } from "@/lib/api/client";
import type { AppRole } from "@/lib/session";

type SessionResult = { user: { role: AppRole }; recoveryCodes?: string[] };
type Enrollment = { otpauthUri: string; secret: string };

const input = "mt-2 min-h-12 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary-100 disabled:cursor-wait disabled:opacity-70";
const primary = "min-h-12 w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-on-primary shadow-sm transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70";
const link = "text-sm font-semibold text-primary underline-offset-2 hover:underline";

/**
 * SEG-2FA: segundo paso del ingreso. Con {@code enrollment} la cuenta todavía no activó el segundo factor: se muestra el
 * QR (dibujado aquí, sin servicios externos), se confirma con el primer código y se entregan los códigos de recuperación.
 */
export function SecondFactorStep({ enrollment, email, onRestart }: { enrollment: boolean; email: string; onRestart: (notice?: string) => void }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [setup, setSetup] = useState<Enrollment | null>(null);
  const [issued, setIssued] = useState<{ codes: string[]; role: AppRole } | null>(null);

  function enter(role: AppRole) {
    router.replace(`/${role}`);
    router.refresh();
  }

  function failure(error: unknown) {
    if (!(error instanceof ApiRequestError)) return setMessage("No pudimos conectarnos. Revisa tu red e inténtalo nuevamente.");
    if (error.code === "SECOND_FACTOR_CHALLENGE_INVALID") return onRestart(error.message);
    setMessage(error.message);
  }

  async function startEnrollment() {
    setBusy(true);
    setMessage(null);
    try {
      setSetup(await apiJson<Enrollment>("/api/v1/auth/second-factor/enrollment", { method: "POST" }));
    } catch (error) {
      failure(error);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const value = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    const usingRecovery = !enrollment && recoveryMode;
    if (usingRecovery ? value.replace(/[\s-]/g, "").length < 24 : !/^\d{6}$/.test(value)) {
      setMessage(usingRecovery ? "Escribe el código de recuperación completo." : "Escribe los 6 dígitos que muestra la aplicación.");
      return;
    }
    setBusy(true);
    try {
      const url = enrollment ? "/api/v1/auth/second-factor/enrollment/confirm" : "/api/v1/auth/second-factor";
      const result = await apiJson<SessionResult>(url, { method: "POST", body: JSON.stringify(usingRecovery ? { recoveryCode: value } : { code: value }) });
      if (result.recoveryCodes?.length) setIssued({ codes: result.recoveryCodes, role: result.user.role });
      else enter(result.user.role);
    } catch (error) {
      failure(error);
    } finally {
      setBusy(false);
    }
  }

  const alert = message && <p role="alert" className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm font-semibold text-error">{message}</p>;

  if (issued) {
    return <section className="mt-7 space-y-5" aria-labelledby="codigos-titulo">
      <div><h2 id="codigos-titulo" className="text-lg font-bold text-text-primary">Códigos de recuperación</h2>
        <p className="mt-1 text-sm text-text-secondary">Si pierdes el celular, cada código te deja ingresar una sola vez. Solo se muestran ahora: descárgalos o anótalos y guárdalos fuera del celular.</p></div>
      <ol className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-surface-secondary p-4 font-mono text-sm sm:grid-cols-2">
        {issued.codes.map((code) => <li key={code} className="tracking-wide text-text-primary">{code}</li>)}
      </ol>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => downloadRecoveryCodes(email, issued.codes)} className="min-h-12 flex-1 rounded-xl border border-primary px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary-container">Descargar</button>
        <button type="button" onClick={() => enter(issued.role)} className={`${primary} flex-1`}>Ya los guardé</button>
      </div>
    </section>;
  }

  if (enrollment && !setup) {
    return <section className="mt-7 space-y-5" aria-labelledby="activar-titulo">
      {alert}
      <div><h2 id="activar-titulo" className="text-lg font-bold text-text-primary">Activa la verificación en dos pasos</h2>
        <p className="mt-1 text-sm text-text-secondary">Tu cuenta tiene acceso a historias clínicas. Además de la contraseña, cada ingreso pedirá un código de 6 dígitos de una aplicación de autenticación (Google Authenticator, Microsoft Authenticator o FreeOTP).</p></div>
      <button type="button" disabled={busy} onClick={() => void startEnrollment()} className={primary}>{busy ? "Preparando…" : "Mostrar código QR"}</button>
      <button type="button" onClick={() => onRestart()} className={link}>Volver al ingreso</button>
    </section>;
  }

  return <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
    {alert}
    {setup ? <>
      <div><h2 className="text-lg font-bold text-text-primary">Escanea el código QR</h2>
        <p className="mt-1 text-sm text-text-secondary">En la aplicación de autenticación elige «Agregar cuenta» y escanea el código. Este código se muestra una sola vez.</p></div>
      <div className="flex justify-center rounded-xl border border-border bg-white p-4"><QrCode value={setup.otpauthUri} label="Código QR para la aplicación de autenticación" /></div>
      <div className="text-sm text-text-secondary">¿No puedes escanear? Escribe esta clave en la aplicación (tipo «basada en tiempo»):
        <code className="mt-2 block break-all rounded-lg bg-surface-secondary px-3 py-2 font-mono text-sm tracking-wider text-text-primary">{setup.secret.match(/.{1,4}/g)?.join(" ")}</code></div>
    </> : <div><h2 className="text-lg font-bold text-text-primary">Verificación en dos pasos</h2>
      <p className="mt-1 text-sm text-text-secondary">{recoveryMode ? "Escribe uno de tus códigos de recuperación. Cada código sirve una sola vez." : "Abre tu aplicación de autenticación y escribe el código de Salud-U."}</p></div>}
    {recoveryMode && !enrollment
      ? <label className="block text-sm font-bold text-text-secondary">Código de recuperación<input key="recovery" required name="code" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" disabled={busy} className={`${input} font-mono uppercase`} /></label>
      : <label className="block text-sm font-bold text-text-secondary">Código de verificación<input key="totp" required name="code" type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" placeholder="000000" disabled={busy} autoFocus className={`${input} font-mono text-lg tracking-[0.4em]`} /></label>}
    <button type="submit" disabled={busy} className={primary}>{busy ? "Verificando…" : enrollment ? "Activar y continuar" : "Verificar e ingresar"}</button>
    <div className="flex flex-wrap items-center justify-between gap-3">
      {!enrollment && <button type="button" onClick={() => { setRecoveryMode(!recoveryMode); setMessage(null); }} className={link}>{recoveryMode ? "Usar el código de la aplicación" : "Usar un código de recuperación"}</button>}
      <button type="button" onClick={() => onRestart()} className={link}>Volver al ingreso</button>
    </div>
  </form>;
}

/** Archivo de texto generado en el navegador; los códigos no vuelven a pedirse al servidor. */
export function downloadRecoveryCodes(email: string, codes: string[]) {
  const text = `Salud-U · códigos de recuperación de ${email}\nCada código sirve una sola vez. Guárdalos fuera del celular.\n\n${codes.join("\n")}\n`;
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "salud-u-codigos-recuperacion.txt";
  anchor.click();
  URL.revokeObjectURL(url);
}
