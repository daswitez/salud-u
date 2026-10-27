"use client";

import Link from "next/link";
import { EncounterAmendments } from "@/components/encounter-amendments";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, apiJson, type MedicalAppointment } from "@/lib/api/client";
import { ClinicalBackgroundSummary } from "@/components/clinical-background";
import { MedicalDocuments } from "@/components/medical-documents";
import { SpecialtySnapshot } from "@/components/medical-patient-record";
import { ClinicalHistoryDialog } from "@/components/clinical-history-dialog";
import { emptySpecialtyHistory, SpecialtyHistoryForm, type SpecialtyHistoryDraft } from "@/components/specialty-history-form";
import type { ClinicalBackgroundVersion } from "@/lib/clinical-background";
import { referralPriorityLabel } from "@/lib/referrals";

type Context = {
  encounter: { id: string; type: string; status: "DRAFT" | "CLOSED" | "VOIDED"; chiefComplaint: string | null; assessment: string | null; instructions: string | null; followUpText: string | null; specialtyHistory: Record<string, unknown> | null; specialtyHistoryVersion: number | null; specialtyHistoryId: string | null };
  patient: { id: string; fullName: string; carnet: string };
  appointment: { status: string };
  specialty: { id: string; code: string; name: string };
  template: { id: string; version: number; schema: Record<string, unknown> } | null;
  clinicalBackground: { current: ClinicalBackgroundVersion | null; encounter: ClinicalBackgroundVersion | null };
  diagnoses: { id: string; label: string }[];
};
type Source = { referralId: string; reason: string; comment: string; priority: keyof typeof referralPriorityLabel; sourceEncounter: { id: string; chiefComplaint: string | null; assessment: string | null }; diagnoses: string[]; documents: { id: string; fileName: string; documentType: string }[] };
const field = "mt-2 block w-full rounded-lg border border-divider bg-surface px-3 py-2.5";

export function SpecialtyEncounterForm({ appointmentId }: { appointmentId: string }) {
  const [context, setContext] = useState<Context | null>(null), [source, setSource] = useState<Source | null>(null);
  const [history, setHistory] = useState(() => emptySpecialtyHistory(""));
  const [chief, setChief] = useState(""), [assessment, setAssessment] = useState(""), [diagnosis, setDiagnosis] = useState("");
  const [instructions, setInstructions] = useState(""), [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [expired, setExpired] = useState(false);
  const [sourceError, setSourceError] = useState(""), [sourceLoading, setSourceLoading] = useState(true);
  const closing = useRef(false), feedback = useRef<HTMLDivElement>(null);
  const fail = (cause: unknown) => {
    setError(cause instanceof ApiRequestError ? cause.message : "No pudimos confirmar la operación. Se conserva lo escrito; comprueba el estado antes de reintentar.");
    setExpired(cause instanceof ApiRequestError && cause.status === 401);
  };
  const loadSource = useCallback(async (id: string) => {
    setSourceLoading(true); setSourceError("");
    try { setSource(await apiJson<Source | null>(`/api/medical/encounters/${id}/source-context`)); }
    catch (cause) { setSourceError(cause instanceof Error ? cause.message : "No se pudo cargar el contexto remitido."); }
    finally { setSourceLoading(false); }
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const appointment = await apiJson<MedicalAppointment>(`/api/medical/appointments/${appointmentId}`);
      if (appointment.appointmentType !== "SPECIALTY" || !appointment.encounter) throw new Error("Inicia o recupera la atención desde la agenda antes de completar la ficha.");
      const data = await apiJson<Context>(`/api/medical/encounters/${appointment.encounter.id}`);
      setContext(data); setHistory(emptySpecialtyHistory(data.specialty.code)); setChief(data.encounter.chiefComplaint ?? ""); setAssessment(data.encounter.assessment ?? "");
      setDiagnosis(data.diagnoses[0]?.label ?? ""); setInstructions(data.encounter.instructions ?? ""); setFollowUp(data.encounter.followUpText ?? "");
      setError(""); setExpired(false); void loadSource(data.encounter.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la ficha."); setExpired(cause instanceof ApiRequestError && cause.status === 401); }
    finally { setLoading(false); }
  }, [appointmentId, loadSource]);
  useEffect(() => { const task = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(task); }, [load]);
  useEffect(() => { if (error || notice || sourceError) feedback.current?.focus(); }, [error, notice, sourceError]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const protect = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm("Hay cambios sin guardar. ¿Quieres salir de la ficha?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", protect, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", protect, true); };
  }, [dirty]);

  async function checkState() {
    if (!context || closing.current) return;
    setSaving(true);
    try {
      const data = await apiJson<Context>(`/api/medical/encounters/${context.encounter.id}`);
      if (data.encounter.status === "CLOSED") confirmClosure(data);
      setContext(data); setError(""); setExpired(false);
      if (data.encounter.status !== "DRAFT") setDirty(false);
      setNotice(data.encounter.status === "CLOSED" ? "Atención cerrada. Se muestran los datos guardados." : "Estado y plantilla actualizados. Se conserva lo escrito.");
    } catch (cause) { fail(cause); } finally { setSaving(false); }
  }
  async function finalize(event: React.FormEvent) {
    event.preventDefault(); if (!context?.template || closing.current) return;
    closing.current = true; setSaving(true); setError(""); setNotice("");
    try {
      const result = await apiJson<{ encounterId: string; specialtyHistoryId: string; specialtyHistoryVersion: number }>(`/api/medical/encounters/${context.encounter.id}/finalize`, { method: "POST", body: JSON.stringify({ chiefComplaint: chief, assessment, diagnosisText: diagnosis, instructions, followUpText: followUp, specialtyHistory: history, templateId: context.template.id }) });
      const stored = await apiJson<Context>(`/api/medical/encounters/${context.encounter.id}`);
      confirmClosure(stored);
      if (result.encounterId !== stored.encounter.id || result.specialtyHistoryId !== stored.encounter.specialtyHistoryId || result.specialtyHistoryVersion !== stored.encounter.specialtyHistoryVersion || stored.template?.id !== context.template.id) throw new Error("Cierre no confirmado");
      setContext(stored); setDirty(false); setExpired(false); setNotice("Ficha de especialidad guardada y atención cerrada.");
    } catch (cause) { fail(cause); } finally { closing.current = false; setSaving(false); }
  }
  function update(next: SpecialtyHistoryDraft) { setHistory(next); setDirty(true); }
  const background = context?.encounter.status === "DRAFT" ? context.clinicalBackground.encounter ?? context.clinicalBackground.current : context?.clinicalBackground.encounter;
  return <section className="space-y-5" aria-busy={loading || saving}>
    <Link href={`/medico/citas/${appointmentId}`} className="font-semibold text-primary">← Volver a la cita</Link>
    <div ref={feedback} tabIndex={-1}>{error && <p role="alert" className="rounded-xl bg-error-container p-4 text-error">{error}</p>}{notice && <p role="status" className="rounded-xl bg-success-container p-4 text-success">{notice}</p>}{sourceError && <p role="alert" className="rounded-xl bg-error-container p-4 text-error">{sourceError}</p>}</div>
    {loading ? <p role="status">Cargando ficha de especialidad…</p> : !context ? <button onClick={() => void load()} className="font-semibold text-primary">Reintentar carga</button> : <>
      <header><p className="font-semibold text-primary">FICHA DE ESPECIALIDAD · {context.specialty.name}</p><h1 className="mt-2 text-3xl font-bold">{context.patient.fullName}</h1><p>Carnet {context.patient.carnet}</p></header>
      <p>Plantilla: <strong>{context.template ? `Versión ${context.template.version}` : "Sin plantilla activa"}</strong></p>
      <section aria-label="Contexto remitido" className="space-y-3 rounded-xl border border-divider bg-surface p-5"><h2 className="text-xl font-bold">Contexto de origen</h2>
        {sourceLoading ? <p role="status">Cargando contexto remitido…</p> : sourceError ? <button type="button" onClick={() => void loadSource(context.encounter.id)} className="font-semibold text-primary">Reintentar contexto de origen</button> : source ? <>
          <p>Prioridad: {referralPriorityLabel[source.priority]}</p><dl><dt>Motivo de derivación</dt><dd>{source.reason}</dd><dt>Resumen remitido</dt><dd>{source.comment}</dd><dt>Motivo de revisión</dt><dd>{source.sourceEncounter.chiefComplaint ?? "—"}</dd><dt>Evaluación de revisión</dt><dd>{source.sourceEncounter.assessment ?? "—"}</dd></dl>
          <Link href={`/medico/derivaciones/${source.referralId}`} className="block font-semibold text-primary">Gestionar derivación y seguimiento</Link>
          <p>{source.diagnoses.length ? source.diagnoses.join(" · ") : "Sin diagnósticos compartidos."}</p>
          <p>{source.documents.length ? `${source.documents.length} documento(s) compartido(s)` : "Sin documentos compartidos."}</p>
          {source.documents.length > 0 && <MedicalDocuments patientId={context.patient.id} encounterId={source.sourceEncounter.id} editable={false} />}
        </> : <p>Atención directa: no tiene ficha de origen remitida.</p>}
      </section>
      {background ? <ClinicalBackgroundSummary version={background} compact /> : <p>Sin antecedentes generales vinculados a esta atención.</p>}
      <Link target="_blank" rel="noopener" prefetch={false} href={`/medico/pacientes/${context.patient.id}/antecedentes?encounterId=${context.encounter.id}`} className="block font-semibold text-primary">Consultar antecedentes generales en otra pestaña</Link>
      <MedicalDocuments patientId={context.patient.id} encounterId={context.encounter.id} editable={context.encounter.status === "DRAFT"} />
      {context.encounter.status !== "DRAFT" ? <article className="space-y-4 rounded-xl border border-divider bg-surface p-6">
        <h2 className="text-xl font-bold">{context.encounter.status === "CLOSED" ? "Atención cerrada" : "Encuentro anulado"}</h2><p>Estado de la cita: {context.appointment.status === "ATTENDED" ? "Atendida" : context.appointment.status}</p>
        <p>Versión de ficha: {context.encounter.specialtyHistoryVersion ?? "—"}</p><p>Ficha de consulta. Se conserva la plantilla utilizada al cerrar.</p>
        <dl className="space-y-3"><div><dt>Motivo de consulta</dt><dd>{context.encounter.chiefComplaint ?? "—"}</dd></div><div><dt>Evaluación clínica</dt><dd>{context.encounter.assessment ?? "—"}</dd></div><div><dt>Diagnósticos</dt><dd>{context.diagnoses.map(item => item.label).join(" · ") || "Sin diagnósticos registrados."}</dd></div><div><dt>Plan y tratamiento</dt><dd>{context.encounter.instructions ?? "—"}</dd></div><div><dt>Seguimiento</dt><dd>{context.encounter.followUpText ?? "—"}</dd></div></dl>
        <SpecialtySnapshot data={context.encounter.specialtyHistory} /><Link href="/medico/agenda?vista=atendidas" className="block font-semibold text-primary">Ver atenciones realizadas</Link>
        {context.encounter.status === "CLOSED" && <EncounterAmendments encounterId={context.encounter.id} />}
      </article> : <>
        <ClinicalHistoryDialog patientId={context.patient.id} currentEncounterId={context.encounter.id} />
        <p>Los cambios se guardan al cerrar. La ficha quedará de consulta y la cita se marcará como atendida.</p>
        {!context.template && <p role="alert">No hay una plantilla activa para esta especialidad. Puedes conservar el borrador y actualizar la plantilla.</p>}
        <form onSubmit={finalize} onChange={() => setDirty(true)} className="space-y-5"><fieldset disabled={saving} className="space-y-5">
          <label className="block font-semibold">Motivo de consulta *<textarea required maxLength={4000} className={field} value={chief} onChange={e => setChief(e.target.value)} /></label>
          <SpecialtyHistoryForm value={history} onChange={update} />
          <label className="block font-semibold">Evaluación clínica *<textarea required maxLength={8000} className={field} value={assessment} onChange={e => setAssessment(e.target.value)} /></label>
          <label className="block font-semibold">Diagnóstico principal<input maxLength={2000} className={field} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} /></label>
          <label className="block font-semibold">Plan y tratamiento<textarea maxLength={8000} className={field} value={instructions} onChange={e => setInstructions(e.target.value)} /></label>
          <label className="block font-semibold">Seguimiento<input maxLength={4000} className={field} value={followUp} onChange={e => setFollowUp(e.target.value)} /></label>
          <button type="submit" disabled={!context.template} className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-50">{saving ? "Guardando…" : "Cerrar atención de especialidad"}</button>
        </fieldset></form>
      </>}
      {(error || context.encounter.status === "DRAFT") && <button type="button" disabled={saving} onClick={() => void checkState()} className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Comprobar estado y actualizar plantilla</button>}
    </>}
    {expired && <Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="block font-semibold text-primary">Iniciar sesión en otra pestaña y volver a esta ficha</Link>}
  </section>;
}
function confirmClosure(data: Context) {
  if (data.encounter.status !== "CLOSED" || data.appointment.status !== "ATTENDED" || !data.encounter.specialtyHistory || !data.encounter.specialtyHistoryVersion || !data.encounter.specialtyHistoryId || !data.template) throw new Error("Cierre incompleto");
}
