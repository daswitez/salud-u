"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, apiJson } from "@/lib/api/client";
import { MedicalDocumentUploader, documentTypes } from "@/components/medical-document-uploader";

type Document = { id: string; documentType: string; filename: string; mimeType: string; sizeBytes: number; studyDate: string | null; description: string | null; uploadedAt: string };

export function MedicalDocuments({ patientId, encounterId, editable, onDocumentsChanged }: { patientId: string; encounterId: string; editable: boolean; onDocumentsChanged?: (documents: Document[]) => void }) {
  const [documents, setDocuments] = useState<Document[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [expired, setExpired] = useState(false); const [preview, setPreview] = useState<{ url: string; document: Document } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null); const feedback = useRef<HTMLParagraphElement>(null); const onChanged = useRef(onDocumentsChanged);
  const transfer = useRef<AbortController | null>(null);
  useEffect(() => () => transfer.current?.abort(), []);
  useEffect(() => { onChanged.current = onDocumentsChanged; }, [onDocumentsChanged]);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const data = await apiJson<Document[]>(`/api/medical/documents?encounterId=${encounterId}`); setDocuments(data); onChanged.current?.(data); setError(""); setExpired(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudieron consultar los documentos."); setExpired(reason instanceof ApiRequestError && reason.status === 401); }
    finally { setLoading(false); }
  }, [encounterId]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);
  useEffect(() => { if (error) feedback.current?.focus(); }, [error]);
  useEffect(() => { if (!preview) return; dialog.current?.showModal(); return () => URL.revokeObjectURL(preview.url); }, [preview]);
  async function retrieve(document: Document, action: "preview" | "download") {
    const controller = new AbortController(); transfer.current = controller;
    setBusy(true); setError(""); setExpired(false);
    try {
      const { url } = await apiJson<{ url: string }>(`/api/medical/documents/${document.id}/download`, { signal: controller.signal });
      const address = new URL(url, window.location.origin);
      if (address.origin !== window.location.origin || address.pathname !== `/api/medical/documents/${document.id}/content`) throw new Error("El enlace del archivo no es válido.");
      const response = await fetch(address, { credentials: "same-origin", cache: "no-store", referrerPolicy: "no-referrer", signal: controller.signal });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new ApiRequestError(typeof body?.error === "string" ? body.error : "El enlace expiró o el archivo no está disponible. Reintenta para obtener uno nuevo.", response.status); }
      const blob = await response.blob(); if (controller.signal.aborted) return; const objectUrl = URL.createObjectURL(blob);
      if (action === "preview") setPreview({ url: objectUrl, document });
      else { const link = window.document.createElement("a"); link.href = objectUrl; link.download = document.filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
    } catch (reason) { if (!controller.signal.aborted) { setError(reason instanceof ApiRequestError ? reason.message : "No se pudo recuperar el archivo. Reintenta para obtener un enlace nuevo."); setExpired(reason instanceof ApiRequestError && reason.status === 401); } }
    finally { transfer.current = null; setBusy(false); }
  }
  return <section aria-label="Documentos de la atención" aria-busy={loading || busy} className="space-y-4 rounded-xl border border-divider bg-surface p-5">
    <h2 className="text-lg font-bold">Documentos de la atención</h2>
    <p className="text-sm text-text-secondary">Cada acceso solicita un enlace privado de un uso, válido durante 60 segundos. Si expira, puedes volver a previsualizar o descargar.</p>
    <button type="button" disabled={loading || busy} onClick={() => void refresh()} className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary">Actualizar documentos</button>
    {error && <p role="alert" ref={feedback} tabIndex={-1} className="text-error">{error}</p>}
    {expired && <Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="block font-semibold text-primary">Iniciar sesión en otra pestaña y volver a documentos</Link>}
    {loading ? <p role="status">Cargando documentos…</p> : !documents.length && !error ? <p>No hay documentos disponibles para esta atención.</p> : <ul className="space-y-3">{documents.map(document => <li key={document.id} className="rounded-lg border border-divider p-4">
      <h3 className="font-semibold">{document.filename}</h3><p className="text-sm">{documentTypes.find(([code]) => code === document.documentType)?.[1] ?? document.documentType} · {(document.sizeBytes / 1024).toLocaleString("es-BO", { maximumFractionDigits: 1 })} KiB</p>
      <p className="text-sm">Fecha del estudio: {document.studyDate ?? "No registrada"}</p><p className="text-sm">{document.description ?? "Sin descripción"}</p>
      <div className="mt-3 flex gap-3"><button type="button" disabled={busy} onClick={() => void retrieve(document, "preview")} className="font-semibold text-primary">Previsualizar <span className="sr-only">{document.filename}</span></button><button type="button" disabled={busy} onClick={() => void retrieve(document, "download")} className="font-semibold text-primary">Descargar <span className="sr-only">{document.filename}</span></button></div>
    </li>)}</ul>}
    {busy && <p role="status">Recuperando archivo…</p>}
    {editable && <MedicalDocumentUploader patientId={patientId} encounterId={encounterId} onUploaded={() => { void refresh(); }} />}
    {preview && <dialog ref={dialog} aria-label={`Vista previa de ${preview.document.filename}`} onClose={() => setPreview(null)} className="fixed inset-0 m-auto w-[95vw] max-w-5xl rounded-xl bg-surface p-5 backdrop:bg-black/50">
      <div className="mb-4 flex justify-between gap-4"><h3 className="font-bold">{preview.document.filename}</h3><button type="button" autoFocus onClick={() => dialog.current?.close()} className="font-semibold text-primary">Cerrar vista previa</button></div>
      {preview.document.mimeType === "application/pdf" ? <iframe title={`Documento PDF ${preview.document.filename}`} src={preview.url} className="h-[70vh] w-full" /> : <div className="relative h-[70vh]"><Image unoptimized fill sizes="95vw" alt={`Documento clínico ${preview.document.filename}`} src={preview.url} className="object-contain" /></div>}
    </dialog>}
  </section>;
}
