"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { EmergencyContactFields } from "@/components/emergency-contact-fields";
import { apiJson } from "@/lib/api/client";
import { emptyContact, type EmergencyContact } from "@/lib/emergency-contact";

export function MyEmergencyContact() {
  const [contact, setContact] = useState<EmergencyContact>(emptyContact);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try { const data = await apiJson<EmergencyContact | null>("/api/me/emergency-contact", { signal }); if (!signal?.aborted) { setContact(data ?? emptyContact()); setLoaded(true); } }
    catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar el contacto."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => void load(controller.signal), 0); return () => { window.clearTimeout(timer); controller.abort(); }; }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try { const data = await apiJson<EmergencyContact>("/api/me/emergency-contact", { method: "PUT", body: JSON.stringify(contact) }); setContact(data); setNotice("Contacto de emergencia guardado."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el contacto."); }
    finally { setSaving(false); }
  }
  return <section aria-labelledby="my-emergency-title" className="mt-5 rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 id="my-emergency-title" className="text-lg font-bold">Contacto de emergencia</h2><p className="mt-1 text-sm text-text-secondary">Opcional. Indica a quién podemos contactar en una emergencia.</p>
    {loading ? <p role="status" className="mt-4">Cargando contacto…</p> : error ? <div role="alert" className="mt-4 text-error">{error} <button type="button" onClick={() => void load()} className="font-semibold underline">Reintentar</button></div> : null}
    {!loading && loaded && <form onSubmit={save} className="mt-5 space-y-4"><EmergencyContactFields value={contact} onChange={value => { setContact(value); setNotice(""); }} /><p role="status" className="text-sm text-success">{notice}</p><button disabled={saving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? "Guardando…" : "Guardar contacto de emergencia"}</button></form>}
  </section>;
}
