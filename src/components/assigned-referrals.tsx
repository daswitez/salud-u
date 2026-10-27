"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, apiJson } from "@/lib/api/client";
import { referralPriorityLabel, referralStatusLabel } from "@/lib/referrals";

type Referral = {
  id: string; status: keyof typeof referralStatusLabel; priority: keyof typeof referralPriorityLabel;
  reason: string; comment: string; createdAt: string; assignedAt: string | null; requestedBy: string;
  patient: { id: string; fullName: string; carnet: string }; specialty: { id: string; name: string };
  followUpText: string | null; returnReason: string | null; resolvedAt: string | null; resolvedBy: string | null; returnedAt: string | null; returnedBy: string | null;
  appointment: { id: string; status: string; scheduledFor: string } | null; encounter: { id: string; status: string } | null;
  events: { id: string; from: keyof typeof referralStatusLabel | null; to: keyof typeof referralStatusLabel; reason: string | null; followUpText: string | null; actor: string; at: string }[];
};
const date = (value: string | null) => value ? new Date(value).toLocaleString("es-BO") : "—";

export function AssignedReferrals({ referralId }: { referralId?: string }) {
  const [items, setItems] = useState<Referral[]>([]), [detail, setDetail] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [expired, setExpired] = useState(false);
  const [action, setAction] = useState("RESOLVE"), [reason, setReason] = useState(""), [followUp, setFollowUp] = useState("");
  const feedback = useRef<HTMLDivElement>(null), submitting = useRef(false);
  const fail = (cause: unknown) => { setError(cause instanceof ApiRequestError ? cause.message : "No pudimos confirmar el cambio. Conservamos lo escrito; comprueba el estado antes de reintentar."); setExpired(cause instanceof ApiRequestError && cause.status === 401); };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (referralId) setDetail(await apiJson<Referral>(`/api/medical/assigned-referrals/${referralId}`));
      else setItems(await apiJson<Referral[]>("/api/medical/assigned-referrals"));
      setError(""); setExpired(false);
    } catch (cause) { fail(cause); } finally { setLoading(false); }
  }, [referralId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (error || notice) feedback.current?.focus(); }, [error, notice]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const protect = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm("Hay cambios sin guardar. ¿Quieres salir de la derivación?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", protect, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", protect, true); };
  }, [dirty]);
  async function checkState() {
    if (!referralId || submitting.current) return;
    setSaving(true);
    try {
      const stored = await apiJson<Referral>(`/api/medical/assigned-referrals/${referralId}`);
      setDetail(stored); setError(""); setExpired(false);
      if (!["ASSIGNED", "IN_PROGRESS"].includes(stored.status)) setDirty(false);
      setNotice(["CLOSED", "RETURNED"].includes(stored.status) ? "Se muestra el resultado guardado en la derivación." : "Estado actualizado. Se conserva el motivo y seguimiento que escribiste.");
    } catch (cause) { fail(cause); } finally { setSaving(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!detail || submitting.current) return;
    submitting.current = true; setSaving(true); setError(""); setNotice("");
    try {
      const expected = action === "RETURN" ? "RETURNED" : "CLOSED";
      const result = await apiJson<{ referralId: string; status: string }>(`/api/medical/referrals/${detail.id}`, { method: "PATCH", body: JSON.stringify({ action, reason: action === "RETURN" ? reason : null, followUpText: followUp }) });
      const stored = await apiJson<Referral>(`/api/medical/assigned-referrals/${detail.id}`);
      if (result.referralId !== detail.id || result.status !== expected || stored.status !== expected || (stored.followUpText ?? "") !== followUp.trim() || (action === "RETURN" && stored.returnReason !== reason.trim()) || !stored.events.some(e => e.to === expected) || (action === "RETURN" ? !stored.returnedAt || !stored.returnedBy : !stored.resolvedAt || !stored.resolvedBy)) throw new Error("Cambio no confirmado");
      setDetail(stored); setDirty(false); setExpired(false); setNotice(action === "RETURN" ? "Derivación devuelta con motivo y seguimiento guardados." : "Derivación resuelta con seguimiento guardado.");
    } catch (cause) { fail(cause); } finally { submitting.current = false; setSaving(false); }
  }
  const active = detail && ["ASSIGNED", "IN_PROGRESS"].includes(detail.status);
  return <section className="space-y-5" aria-busy={loading || saving}>
    <h1 className="text-3xl font-bold">{referralId ? "Gestionar derivación asignada" : "Derivaciones recibidas"}</h1>
    {referralId && <Link href="/medico/derivaciones" className="block font-semibold text-primary">Volver a derivaciones recibidas</Link>}
    <div ref={feedback} tabIndex={-1}>{error && <p role="alert" className="rounded-xl bg-error-container p-4 text-error">{error}</p>}{notice && <p role="status" className="rounded-xl bg-success-container p-4 text-success">{notice}</p>}</div>
    {expired && <Link target="_blank" rel="noopener" href="/iniciar-sesion?error=session" className="block font-semibold text-primary">Iniciar sesión en otra pestaña y conservar el formulario</Link>}
    {!referralId || !detail ? <button type="button" disabled={loading} onClick={() => void load()} className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Actualizar derivaciones recibidas</button> : <button type="button" disabled={saving} onClick={() => void checkState()} className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Comprobar estado de la derivación</button>}
    {loading ? <p role="status">Cargando derivaciones recibidas…</p> : referralId ? detail && <>
      <article className="space-y-4 rounded-xl border border-divider bg-surface p-5" data-referral-id={detail.id}>
        <h2 className="text-xl font-bold">{detail.patient.fullName}</h2><p>Carnet {detail.patient.carnet} · {detail.specialty.name} · {referralPriorityLabel[detail.priority]}</p>
        <p>Estado: <strong>{referralStatusLabel[detail.status]}</strong></p>
        <dl className="space-y-3"><div><dt>Motivo de derivación</dt><dd>{detail.reason}</dd></div><div><dt>Resumen remitido</dt><dd>{detail.comment}</dd></div><div><dt>Emisor</dt><dd>{detail.requestedBy}</dd></div><div><dt>Motivo de devolución guardado</dt><dd>{detail.returnReason ?? "Sin motivo de devolución."}</dd></div><div><dt>Seguimiento guardado</dt><dd>{detail.followUpText ?? "Sin seguimiento registrado."}</dd></div></dl>
        {detail.appointment ? <Link href={`/medico/citas/${detail.appointment.id}${detail.encounter ? "?ficha=1" : ""}`} className="block font-semibold text-primary">{detail.encounter?.status === "CLOSED" ? "Consultar atención especializada" : "Abrir atención especializada"}</Link> : <p>Sin cita asociada.</p>}
        {detail.resolvedAt && <p>Resuelta por {detail.resolvedBy ?? "—"} · {date(detail.resolvedAt)}</p>}{detail.returnedAt && <p>Devuelta por {detail.returnedBy ?? "—"} · {date(detail.returnedAt)}</p>}
      </article>
      {active && <form onSubmit={submit} onChange={() => setDirty(true)} className="space-y-4 rounded-xl border border-divider bg-surface p-5"><h2 className="text-xl font-bold">Resolver o devolver</h2><p>Para resolver, primero cierra la atención especializada. La devolución requiere un motivo.</p><fieldset disabled={saving} className="space-y-4">
        <label className="block">Acción<select className="mt-2 block w-full rounded-lg border border-divider bg-surface p-3" value={action} onChange={e => setAction(e.target.value)}><option value="RESOLVE">Resolver derivación</option><option value="RETURN">Devolver derivación</option></select></label>
        {action === "RETURN" && <label className="block">Motivo de devolución *<textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} className="mt-2 block w-full rounded-lg border border-divider bg-surface p-3" /></label>}
        <label className="block">Seguimiento<textarea maxLength={4000} value={followUp} onChange={e => setFollowUp(e.target.value)} className="mt-2 block w-full rounded-lg border border-divider bg-surface p-3" /></label>
        <button type="submit" className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary">{saving ? "Guardando…" : action === "RETURN" ? "Devolver derivación" : "Resolver derivación"}</button>
      </fieldset></form>}
      <section className="rounded-xl border border-divider bg-surface p-5"><h2 className="text-xl font-bold">Seguimiento de estados</h2>{detail.events.length ? <ol className="mt-4 space-y-4">{detail.events.map(e => <li key={e.id}><p className="font-semibold">{e.from ? `${referralStatusLabel[e.from]} → ` : ""}{referralStatusLabel[e.to]}</p><p>{e.actor} · {date(e.at)}</p>{e.reason && <p>Motivo: {e.reason}</p>}{e.followUpText && <p>Seguimiento: {e.followUpText}</p>}</li>)}</ol> : <p>Sin eventos registrados.</p>}</section>
    </> : items.length ? <ul className="space-y-4">{items.map(item => <li key={item.id} data-referral-id={item.id} className="space-y-3 rounded-xl border border-divider bg-surface p-5"><h2 className="font-bold">{item.patient.fullName}</h2><p>{item.specialty.name} · {referralPriorityLabel[item.priority]} · {referralStatusLabel[item.status]}</p><p>{item.reason}</p><p>Emitida: {date(item.createdAt)}</p><Link href={`/medico/derivaciones/${item.id}`} className="font-semibold text-primary">Gestionar derivación de {item.patient.fullName}</Link></li>)}</ul> : !error && <p>No hay derivaciones asignadas a tu cuenta.</p>}
  </section>;
}
