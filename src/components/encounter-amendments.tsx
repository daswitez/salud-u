"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, apiJson } from "@/lib/api/client";
import { formatAppointmentTime } from "@/components/medical-appointments";

type Amendment = { id: string; amendmentNo: number; reason: string; content: string; createdAt: string; createdBy: string; createdByName: string; clientRequestId: string | null };
type Data = { canAdd: boolean; items: Amendment[] };

export function EncounterAmendments({ encounterId, onDirtyChange }: { encounterId: string; onDirtyChange?: (dirty: boolean) => void }) {
  const [data, setData] = useState<Data | null>(null), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [reason, setReason] = useState(""), [content, setContent] = useState(""), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [expired, setExpired] = useState(false);
  const requestId = useRef<string | null>(null), submitting = useRef(false), feedback = useRef<HTMLDivElement>(null), dirtyCallback = useRef(onDirtyChange);
  const url = `/api/medical/encounters/${encounterId}/amendments`;
  useEffect(() => { dirtyCallback.current = onDirtyChange; }, [onDirtyChange]);
  useEffect(() => { const callback=dirtyCallback.current; callback?.(dirty); return () => callback?.(false); }, [dirty]);
  useEffect(() => { if (error || notice) feedback.current?.focus(); }, [error, notice]);
  const fail = useCallback((cause: unknown, fallback: string) => {
    setError(cause instanceof ApiRequestError ? cause.message : fallback); setExpired(cause instanceof ApiRequestError && cause.status === 401);
    if(cause instanceof ApiRequestError && [401,403,404].includes(cause.status)) setData(null);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await apiJson<Data>(url)); setError(""); setExpired(false); }
    catch (cause) { fail(cause,"No se pudieron consultar las adendas. Reintenta la consulta."); }
    finally { setLoading(false); }
  }, [url, fail]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const protect = (event: MouseEvent) => {
      if(event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if(!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const next = new URL(link.href,window.location.href);
      if(next.pathname === window.location.pathname && next.search === window.location.search) return;
      if(!window.confirm("Hay una adenda sin guardar. ¿Quieres salir y descartar lo escrito?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload",warn); document.addEventListener("click",protect,true);
    return () => { window.removeEventListener("beforeunload",warn); document.removeEventListener("click",protect,true); };
  }, [dirty]);
  function resetDraft() { setReason(""); setContent(""); setDirty(false); requestId.current=null; }
  async function checkState() {
    if(submitting.current) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const stored = await apiJson<Data>(url); setData(stored); setExpired(false);
      const found = requestId.current ? stored.items.find(a => a.clientRequestId === requestId.current) : null;
      if(found) {
        if(found.reason === reason.trim() && found.content === content.trim()) { resetDraft(); setNotice(`La adenda ${found.amendmentNo} quedó guardada. Se muestra el contenido persistido.`); }
        else { requestId.current=null; setNotice(`La adenda ${found.amendmentNo} del envío anterior quedó guardada. Se conservan tus cambios para una nueva adenda.`); }
      }
      else setNotice("Adendas actualizadas. Se conserva lo que escribiste.");
    } catch(cause) { fail(cause,"No se pudo comprobar el estado. Se conserva lo escrito."); }
    finally { setSaving(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if(submitting.current) return;
    submitting.current=true; setSaving(true); setError(""); setNotice("");
    try {
      requestId.current ??= crypto.randomUUID();
      const result = await apiJson<{id: string; amendmentNo: number; createdAt: string; createdBy: string}>(url,{method:"POST",body:JSON.stringify({reason,content,clientRequestId:requestId.current})});
      const stored = await apiJson<Data>(url), saved = stored.items.find(a => a.id === result.id);
      if(!saved || saved.clientRequestId !== requestId.current || saved.amendmentNo !== result.amendmentNo || saved.createdBy !== result.createdBy || Date.parse(saved.createdAt) !== Date.parse(result.createdAt) || saved.reason !== reason.trim() || saved.content !== content.trim()) throw new Error("Adenda no confirmada");
      setData(stored); resetDraft(); setExpired(false); setNotice(`Adenda ${saved.amendmentNo} guardada. La atención original permanece intacta.`);
    } catch(cause) { fail(cause,"No pudimos confirmar la adenda. Conservamos lo escrito; comprueba su estado antes de reintentar."); }
    finally {submitting.current=false;setSaving(false);}
  }
  return <section aria-label="Correcciones auditables" aria-busy={loading || saving} className="mt-6 space-y-4 rounded-xl border border-divider bg-surface p-5">
    <h2 className="text-xl font-bold">Correcciones auditables</h2><p>Las adendas se agregan al registro sin reemplazar la atención cerrada. Cada una conserva motivo, autor y fecha.</p>
    <div ref={feedback} tabIndex={-1}>{error && <p role="alert" className="rounded-xl bg-error-container p-3 text-error">{error}</p>}{notice && <p role="status" className="rounded-xl bg-success-container p-3 text-success">{notice}</p>}</div>
    <button type="button" disabled={saving || loading} onClick={() => void checkState()} className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Comprobar adendas guardadas</button>
    {expired && <Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="block font-semibold text-primary">Iniciar sesión en otra pestaña y conservar la adenda</Link>}
    {loading ? <p role="status">Cargando adendas…</p> : data && <>
      {data.items.length ? <ol className="space-y-4">{data.items.map(a => <li key={a.id} data-amendment-id={a.id} className="space-y-2 rounded-lg border border-divider p-4"><h3 className="font-bold">Adenda {a.amendmentNo}</h3><p>{a.createdByName} · {formatAppointmentTime(a.createdAt)}</p><dl><dt className="font-semibold">Motivo</dt><dd className="whitespace-pre-wrap">{a.reason}</dd><dt className="mt-2 font-semibold">Corrección</dt><dd className="whitespace-pre-wrap">{a.content}</dd></dl></li>)}</ol> : <p>No hay adendas registradas.</p>}
      {data.canAdd ? <form onSubmit={submit} onChange={() => {setDirty(true);setNotice("");}} className="space-y-4"><h3 className="font-bold">Añadir una adenda</h3><fieldset disabled={saving} className="space-y-4"><label className="block">Motivo de corrección *<textarea required maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} className="mt-2 block w-full rounded-lg border border-divider bg-surface p-3" /></label><label className="block">Contenido de la corrección *<textarea required maxLength={8000} rows={4} value={content} onChange={e=>setContent(e.target.value)} className="mt-2 block w-full rounded-lg border border-divider bg-surface p-3" /></label><button type="submit" className="rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary">{saving ? "Guardando…" : "Guardar adenda"}</button></fieldset></form> : <p>Consulta de adendas. Solo el autor autorizado de la atención puede agregar una corrección.</p>}
    </>}
  </section>;
}
