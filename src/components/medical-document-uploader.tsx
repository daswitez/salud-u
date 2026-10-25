"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ApiRequestError, apiJson } from "@/lib/api/client";

export const documentTypes = [
  ["BLOOD_CHEMISTRY", "Química sanguínea"], ["LAB_RESULT", "Resultado de laboratorio"], ["RADIOGRAPH", "Radiografía / imagen"],
  ["PRESCRIPTION", "Receta médica"], ["CLINICAL_PHOTO", "Fotografía clínica"], ["REFERRAL_DOCUMENT", "Documento de derivación"], ["OTHER", "Otro archivo"],
] as const;

export function MedicalDocumentUploader({ patientId, encounterId, fixedType, compact = false, onUploaded }: { patientId: string; encounterId: string; fixedType?: string; compact?: boolean; onUploaded?: (documentType: string) => void }) {
  const id = useId(); const input = useRef<HTMLInputElement>(null); const feedback = useRef<HTMLParagraphElement>(null);
  const [documentType, setDocumentType] = useState(fixedType ?? "OTHER"); const [description, setDescription] = useState(""); const [studyDate, setStudyDate] = useState("");
  const [message, setMessage] = useState(""); const [error, setError] = useState(false); const [expired, setExpired] = useState(false); const [loading, setLoading] = useState(false);
  useEffect(() => { if (message) feedback.current?.focus(); }, [message]);
  async function upload() {
    const file = input.current?.files?.[0]; if (!file) { setError(true); setMessage("Selecciona un archivo primero."); return; }
    setLoading(true); setMessage(""); setError(false); setExpired(false);
    const form = new FormData(); form.set("file", file); form.set("patientId", patientId); form.set("encounterId", encounterId); form.set("documentType", fixedType ?? documentType); form.set("description", description); form.set("studyDate", studyDate);
    try {
      await apiJson<{ id: string }>("/api/medical/documents", { method: "POST", body: form });
      if (input.current) input.current.value = ""; setDescription(""); setStudyDate(""); setMessage("Archivo almacenado de forma segura."); onUploaded?.(fixedType ?? documentType);
    } catch (reason) {
      setError(true); setExpired(reason instanceof ApiRequestError && reason.status === 401);
      setMessage(reason instanceof ApiRequestError ? reason.message : "No pudimos confirmar la carga. Conservamos el archivo y sus datos; actualiza la lista antes de reintentar para comprobar si se guardó.");
    } finally { setLoading(false); }
  }
  const field = "mt-1 block w-full rounded-lg border border-divider bg-surface px-3 py-2 text-sm";
  return <section aria-label="Adjuntar documento" aria-busy={loading} className={`rounded-xl border border-divider bg-surface-secondary ${compact ? "p-4" : "p-5"}`}>
    <h3 className="font-bold">{fixedType === "BLOOD_CHEMISTRY" ? "Adjuntar química sanguínea" : "Adjuntar archivo clínico"}</h3>
    <p id={`${id}-help`} className="mt-1 text-xs text-text-secondary">PDF, JPG, PNG o WEBP · máximo 15 MiB · acceso privado.</p>
    <fieldset disabled={loading} className="mt-4 grid gap-3">
      {!fixedType && <div><label htmlFor={`${id}-type`} className="text-sm">Tipo de documento</label><select id={`${id}-type`} value={documentType} onChange={event => setDocumentType(event.target.value)} className={field}>{documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}
      <label className="text-sm" htmlFor={`${id}-file`}>Archivo clínico</label><input id={`${id}-file`} aria-describedby={`${id}-help`} ref={input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="w-full text-sm" />
      <label className="text-sm">Descripción (opcional)<input value={description} maxLength={1000} onChange={event => setDescription(event.target.value)} className={field} /></label>
      <label className="text-sm">Fecha del estudio (opcional)<input type="date" value={studyDate} onChange={event => setStudyDate(event.target.value)} className={field} /></label>
      <button type="button" onClick={() => void upload()} className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-on-primary">{loading ? "Subiendo…" : "Subir archivo"}</button>
    </fieldset>
    {message && <p ref={feedback} tabIndex={-1} role={error ? "alert" : "status"} className={`mt-3 text-sm ${error ? "text-error" : "text-success"}`}>{message}</p>}
    {expired && <Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="mt-3 block font-semibold text-primary">Iniciar sesión en otra pestaña y reintentar</Link>}
  </section>;
}
