"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, apiJson } from "@/lib/api/client";
import { type EmittedReferral, type EmittedReferralItem, referralPriorityLabel, referralStatusLabel } from "@/lib/referrals";

export function EmittedReferralSummary({ referral, showSource = false, detailLink = true }: { referral: EmittedReferral; showSource?: boolean; detailLink?: boolean }) {
  return <section aria-label="Derivación emitida" className="space-y-4 rounded-xl border border-divider bg-surface p-5">
    <h2 className="text-xl font-bold">Derivación emitida</h2>
    <dl className="grid gap-3 sm:grid-cols-2"><div><dt>Especialidad</dt><dd className="font-semibold">{referral.specialty.name}</dd></div><div><dt>Prioridad</dt><dd>{referralPriorityLabel[referral.priority]}</dd></div><div><dt>Estado</dt><dd>{referralStatusLabel[referral.status]}</dd></div><div><dt>Fecha de emisión</dt><dd>{new Date(referral.createdAt).toLocaleString("es-BO")}</dd></div><div><dt>Motivo de derivación</dt><dd className="whitespace-pre-wrap">{referral.reason}</dd></div><div><dt>Resumen para el especialista</dt><dd className="whitespace-pre-wrap">{referral.comment}</dd></div></dl>
    {showSource && <section className="space-y-2"><h3 className="font-bold">Contexto de revisión</h3><p>Versión de ficha: {referral.source.reviewHistoryVersion ?? "—"}</p><dl><dt>Motivo de consulta</dt><dd>{referral.source.chiefComplaint ?? "No registrado"}</dd><dt>Evaluación clínica</dt><dd>{referral.source.assessment ?? "No registrada"}</dd><dt>Indicaciones</dt><dd>{referral.source.instructions ?? "Sin indicaciones registradas"}</dd><dt>Seguimiento</dt><dd>{referral.source.followUpText ?? "Sin seguimiento registrado"}</dd></dl></section>}
    <section><h3 className="font-bold">Diagnósticos compartidos</h3>{referral.diagnoses.length ? <ul>{referral.diagnoses.map(item => <li key={item.id}>{item.label}</li>)}</ul> : <p>Sin diagnósticos compartidos.</p>}</section>
    <section><h3 className="font-bold">Documentos compartidos</h3>{referral.documents.length ? <ul>{referral.documents.map(item => <li key={item.id}>{item.filename}</li>)}</ul> : <p>Sin documentos compartidos.</p>}</section>
    <div className="flex flex-wrap gap-4">{detailLink && <Link href={`/medico/derivaciones/${referral.id}`} className="font-semibold text-primary">Consultar derivación</Link>}{showSource && <><Link href={`/medico/citas/${referral.source.appointmentId}?ficha=1`} className="font-semibold text-primary">Ver ficha de origen</Link><Link href={`/medico/citas/${referral.source.appointmentId}/documentos`} className="font-semibold text-primary">Ver documentos de origen</Link></>}</div>
  </section>;
}

export function EmittedReferrals({ referralId }: { referralId?: string }) {
  const [items, setItems] = useState<EmittedReferralItem[]>([]); const [detail, setDetail] = useState<EmittedReferral | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [expired, setExpired] = useState(false); const feedback = useRef<HTMLParagraphElement>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (referralId) setDetail(await apiJson<EmittedReferral>(`/api/medical/referrals/${referralId}`));
      else setItems(await apiJson<EmittedReferralItem[]>("/api/medical/referrals"));
      setExpired(false);
    } catch (reason) { setError(reason instanceof ApiRequestError ? reason.message : "No se pudieron consultar las derivaciones. Reintenta la consulta."); setExpired(reason instanceof ApiRequestError && reason.status === 401); }
    finally { setLoading(false); }
  }, [referralId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (error) feedback.current?.focus(); }, [error]);
  return <section className="space-y-5" aria-busy={loading}>
    <h1 className="text-3xl font-bold">{referralId ? "Detalle de derivación" : "Derivaciones emitidas"}</h1>
    {referralId && <Link href="/medico/derivaciones" className="block font-semibold text-primary">Volver a derivaciones emitidas</Link>}
    <button type="button" disabled={loading} onClick={() => void load()} className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Actualizar derivaciones</button>
    {error && <p ref={feedback} tabIndex={-1} role="alert" className="text-error">{error}</p>}
    {expired && <Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="block font-semibold text-primary">Iniciar sesión en otra pestaña y reintentar</Link>}
    {loading ? <p role="status">Cargando derivaciones…</p> : error ? null : referralId ? detail && <><p>{detail.patient.fullName} · Carnet {detail.patient.carnet}</p><EmittedReferralSummary referral={detail} showSource detailLink={false} /></> : items.length ? <ul className="space-y-4">{items.map(item => <li key={item.id} className="space-y-2 rounded-xl border border-divider bg-surface p-5"><h2 className="font-bold">{item.patient.fullName}</h2><p>{item.specialty.name} · {referralPriorityLabel[item.priority]} · {referralStatusLabel[item.status]}</p><p>{item.reason}</p><p className="text-sm">Emitida: {new Date(item.createdAt).toLocaleString("es-BO")} · Diagnósticos: {item.diagnosisCount} · Documentos: {item.documentCount}</p><Link href={`/medico/derivaciones/${item.id}`} className="font-semibold text-primary">Consultar derivación de {item.patient.fullName}</Link></li>)}</ul> : <p>No hay derivaciones emitidas por tu cuenta.</p>}
  </section>;
}
