"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiRequestError } from "@/lib/api/client";
import { downloadClinicalRecordWord } from "@/lib/clinical-word-export";

export function ClinicalWordDownload({ encounterId }: { encounterId: string }) {
  const [purpose, setPurpose] = useState("Consulta clínica autorizada"), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [expired, setExpired] = useState(false), [done, setDone] = useState(false);
  const request = useRef<AbortController | null>(null), feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (error) feedback.current?.focus(); }, [error]);
  async function download(event: React.FormEvent) {
    event.preventDefault(); if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(""); setExpired(false); setDone(false);
    try { await downloadClinicalRecordWord(encounterId, purpose, controller.signal); if (!controller.signal.aborted) setDone(true); }
    catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "No se pudo descargar el Word por un problema de conexión. Puedes reintentar.");
      setExpired(cause instanceof ApiRequestError && cause.status === 401);
    } finally { if (!controller.signal.aborted) setBusy(false); request.current = null; }
  }
  return <section aria-label="Exportar ficha Word" className="my-4 rounded-xl border border-divider p-4" aria-busy={busy}>
    <form onSubmit={event => void download(event)} className="space-y-3">
      <label className="block">Finalidad de la exportación *<input required maxLength={500} value={purpose} onChange={event => { setPurpose(event.target.value); setDone(false); }} className="mt-2 block w-full rounded-lg border border-divider bg-surface p-3" /></label>
      <p className="text-sm text-text-secondary">Descarga la versión cerrada y sus correcciones guardadas, separadas del registro original. Los cambios sin guardar no se incluyen.</p>
      <button type="submit" disabled={busy} className="rounded-lg border border-primary px-3 py-2 font-semibold text-primary">{busy ? "Generando Word…" : "Descargar ficha Word"}</button>
    </form>
    {error && <p ref={feedback} tabIndex={-1} role="alert" className="mt-3 text-error">{error}</p>}
    {expired && <Link target="_blank" rel="noopener" href="/iniciar-sesion?error=session" className="mt-3 block font-semibold text-primary">Iniciar sesión en otra pestaña y conservar la finalidad</Link>}
    {done && <p role="status" className="mt-3">Archivo Word preparado. Revisa las descargas del navegador.</p>}
  </section>;
}
