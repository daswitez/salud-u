"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClinicalBackgroundModal, ClinicalBackgroundSummary } from "@/components/clinical-background";
import { ApiRequestError, apiJson, type MedicalAppointment } from "@/lib/api/client";
import type { ClinicalBackgroundDraft, ClinicalBackgroundVersion } from "@/lib/clinical-background";

type Background = { current: ClinicalBackgroundVersion | null; encounter: ClinicalBackgroundVersion | null };

export function ClinicalBackgroundPanel({ patientId, encounterId, embedded = false, onSaved }: { patientId: string; encounterId?: string; embedded?: boolean; onSaved?: (version: ClinicalBackgroundVersion) => void }) {
  const url = `/api/medical/patients/${patientId}/clinical-background${encounterId ? `?encounterId=${encodeURIComponent(encounterId)}` : ""}`;
  const [data, setData] = useState<Background | null>(null);
  const [appointment, setAppointment] = useState<MedicalAppointment>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [initial, setInitial] = useState<ClinicalBackgroundVersion | null>(null);
  const [expected, setExpected] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState<ClinicalBackgroundVersion | null>(null);
  const [expired, setExpired] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);
  const editable = !encounterId || appointment?.encounter?.status === "DRAFT";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [background, appointments] = await Promise.all([
        apiJson<Background>(url), apiJson<MedicalAppointment[]>("/api/medical/appointments"),
      ]);
      setData(background);
      setAppointment(appointments.find(item => item.patient?.id === patientId && (!encounterId || item.encounter?.id === encounterId)));
      setError(""); setExpired(false);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "No pudimos conectarnos. Intenta nuevamente.");
      setExpired(cause instanceof ApiRequestError && cause.status === 401);
    } finally { setLoading(false); }
  }, [patientId, encounterId, url]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (!editing && (error || notice)) feedback.current?.focus(); }, [error, notice, editing]);

  function edit() {
    setInitial(data?.current ?? null); setExpected(data?.current?.versionNo ?? 0);
    setError(""); setNotice(""); setConflict(false); setLatest(null); setEditing(true);
  }

  async function save(draft: ClinicalBackgroundDraft, reason: string) {
    setSaving(true); setError(""); setNotice("");
    try {
      const version = await apiJson<ClinicalBackgroundVersion>(`/api/medical/patients/${patientId}/clinical-background`, {
        method: "PATCH", body: JSON.stringify({ data: draft, changeReason: reason, expectedVersion: expected, encounterId: encounterId ?? null }),
      });
      setData(previous => ({ current: version, encounter: encounterId ? version : previous?.encounter ?? null }));
      onSaved?.(version);
      setEditing(false); setNotice(`Antecedentes guardados. Versión ${version.versionNo}.`);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "No pudimos guardar. Conservamos lo que escribiste; puedes reintentar.");
      setConflict(cause instanceof ApiRequestError && cause.status === 409);
      setExpired(cause instanceof ApiRequestError && cause.status === 401);
    } finally { setSaving(false); }
  }

  async function compare() {
    setSaving(true);
    try {
      const fresh = await apiJson<Background>(url);
      setLatest(fresh.current); setData(fresh);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo consultar la versión vigente."); }
    finally { setSaving(false); }
  }

  const displayed = encounterId && !editable ? data?.encounter ?? null : data?.current ?? null;
  return <section className="space-y-5" aria-busy={loading || saving}>
    {!embedded && <><Link href={appointment ? `/medico/citas/${appointment.id}` : "/medico/agenda"} className="text-sm font-semibold text-primary hover:underline">← Volver a la atención</Link>
    <header><p className="text-sm font-semibold tracking-wide text-primary">ANTECEDENTES GLOBALES</p><h1 className="mt-2 text-3xl font-bold">{appointment?.patient?.fullName ?? "Antecedentes clínicos generales"}</h1><p className="mt-2 text-sm text-text-secondary">Cada actualización conserva autor, fecha y motivo en una nueva versión.</p></header></>}
    <div ref={feedback} tabIndex={-1}>{!editing && error && <p role="alert" className="rounded-xl bg-error-container p-4 text-error">{error}</p>}{notice && <p role="status" className="rounded-xl bg-success-container p-4 text-success">{notice}</p>}</div>
    {loading ? <p role="status">Cargando antecedentes…</p> : data && <>
      {encounterId && !editable && <p role="status" className="rounded-xl bg-surface-secondary p-4">Antecedentes asociados a esta atención en modo de consulta.</p>}
      <ClinicalBackgroundSummary version={displayed} onEdit={editable && !expired ? edit : undefined} />
      {displayed && <dl className="grid gap-3 rounded-xl border border-divider p-4 text-sm sm:grid-cols-2"><div><dt>Registrado por</dt><dd>{displayed.recordedBy ?? "—"}</dd></div><div><dt>Motivo de actualización</dt><dd>{displayed.changeReason}</dd></div></dl>}
    </>}
    {!editing && error && <button type="button" disabled={loading} onClick={() => void load()} className="rounded-lg border border-primary px-4 py-2 text-primary">Reintentar carga</button>}
    {expired && <Link href="/iniciar-sesion?error=session" className="block text-sm font-semibold text-primary">Volver a iniciar sesión</Link>}
    {editing && <ClinicalBackgroundModal open initial={initial} saving={saving} error={error} required={false}
      onClose={() => { if (!saving) setEditing(false); }} onSave={save} conflict={conflict} latest={latest} onCompare={() => void compare()}
      onUseLatest={() => { if (latest) { setExpected(latest.versionNo); setConflict(false); setLatest(null); setError(""); } }} />}
  </section>;
}
