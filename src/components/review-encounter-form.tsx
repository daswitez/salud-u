"use client";

import Link from "next/link";
import { EncounterAmendments } from "@/components/encounter-amendments";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClinicalBackgroundPanel } from "@/components/clinical-background-panel";
import { ClinicalBackgroundSummary } from "@/components/clinical-background";
import { ClinicalHistoryDialog } from "@/components/clinical-history-dialog";
import { ReviewHistoryForm } from "@/components/review-history-form";
import { MedicalDocuments } from "@/components/medical-documents";
import { appointmentStatusLabel } from "@/components/medical-appointments";
import { EmittedReferralSummary } from "@/components/emitted-referrals";
import type { EmittedReferral } from "@/lib/referrals";
import { ReviewSnapshot } from "@/components/medical-patient-record";
import { ApiRequestError, apiJson, type MedicalAppointment } from "@/lib/api/client";
import { clinicalBackgroundToLegacy, type ClinicalBackgroundVersion } from "@/lib/clinical-background";
import { emptyReviewHistory, reviewHistoryToDraft, type ReviewHistoryDraft } from "@/lib/review-history";

type Context = {
  encounter: { id: string; status: "DRAFT" | "CLOSED" | "VOIDED"; type: string; chiefComplaint: string | null; assessment: string | null; instructions: string | null; followUpText: string | null; bloodChemistryStatus: string | null; reviewHistory: Record<string, unknown> | null; reviewHistoryVersion: number | null };
  patient: { id: string; fullName: string; carnet: string; birthDate: string | null };
  appointment: { id: string; status: MedicalAppointment["status"]; scheduledFor: string };
  clinicalBackground: { current: ClinicalBackgroundVersion | null; encounter: ClinicalBackgroundVersion | null };
  diagnoses: { id: string; label: string }[];
  measurements: { code: string; value: number; unit: string }[];
  documents: { id: string; type: string; filename: string }[];
  referral: EmittedReferral | null;
};
const field = "mt-2 block w-full rounded-lg border border-divider bg-surface px-3 py-2.5";
const measurementLabels: Record<string, string> = { PRESION_SISTOLICA: "Presión sistólica", PRESION_DIASTOLICA: "Presión diastólica", FRECUENCIA_CARDIACA: "Frecuencia cardíaca", FRECUENCIA_RESPIRATORIA: "Frecuencia respiratoria", TEMPERATURA: "Temperatura", SATURACION_OXIGENO: "Saturación de oxígeno", PESO: "Peso", TALLA: "Talla", IMC: "IMC" };

export function ReviewEncounterForm({ appointmentId }: { appointmentId: string }) {
  const [context, setContext] = useState<Context | null>(null);
  const [history, setHistory] = useState<ReviewHistoryDraft>(() => structuredClone(emptyReviewHistory));
  const [chief, setChief] = useState(""); const [assessment, setAssessment] = useState(""); const [diagnosis, setDiagnosis] = useState("");
  const [blood, setBlood] = useState("NOT_PRESENTED");
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(false); const [specialtiesError, setSpecialtiesError] = useState("");
  const [referral, setReferral] = useState({ specialtyId: "", reason: "", comment: "", priority: "ROUTINE" });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [expired, setExpired] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const specialtiesFeedback = useRef<HTMLParagraphElement>(null);
  const refreshSpecialties = useCallback(async () => {
    setSpecialtiesLoading(true); setSpecialtiesError("");
    try { setSpecialties(await apiJson<{ id: string; name: string }[]>("/api/specialties")); }
    catch (cause) { setSpecialtiesError(cause instanceof ApiRequestError ? cause.message : "No se pudieron cargar las especialidades. Reintenta sin salir de la ficha."); }
    finally { setSpecialtiesLoading(false); }
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const appointment = await apiJson<MedicalAppointment>(`/api/medical/appointments/${appointmentId}`);
      if (appointment.appointmentType !== "INITIAL" || !appointment.encounter) throw new Error("Inicia o recupera la atención desde la agenda antes de completar la ficha.");
      const data = await apiJson<Context>(`/api/medical/encounters/${appointment.encounter.id}`);
      setContext(data); setChief(data.encounter.chiefComplaint ?? ""); setAssessment(data.encounter.assessment ?? "");
      setDiagnosis(data.diagnoses[0]?.label ?? ""); setBlood(data.encounter.bloodChemistryStatus ?? "NOT_PRESENTED");
      const draft = reviewHistoryToDraft(data.encounter.reviewHistory);
      const background = data.clinicalBackground.encounter ?? data.clinicalBackground.current;
      if (!data.encounter.reviewHistory && background) Object.assign(draft, clinicalBackgroundToLegacy(background.data));
      setHistory(draft); setError(""); setExpired(false);
      if (data.encounter.status === "DRAFT") void refreshSpecialties();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la ficha.");
      setExpired(cause instanceof ApiRequestError && cause.status === 401);
    } finally { setLoading(false); }
  }, [appointmentId, refreshSpecialties]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (error || notice) feedback.current?.focus(); }, [error, notice]);
  useEffect(() => { if (history.conduct.referral && specialtiesError) specialtiesFeedback.current?.focus(); }, [history.conduct.referral, specialtiesError]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const protectNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (!window.confirm("Hay cambios sin guardar. ¿Quieres salir de la ficha?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", protectNavigation, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", protectNavigation, true); };
  }, [dirty]);

  async function checkState() {
    if (!context) return;
    setSaving(true);
    try {
      const data = await apiJson<Context>(`/api/medical/encounters/${context.encounter.id}`);
      if (data.encounter.status === "CLOSED") requireConfirmedClosure(data);
      setContext(data); setError(""); setExpired(false);
      if (data.encounter.status === "CLOSED") { setDirty(false); setNotice("La atención está cerrada. Se muestran los datos que quedaron guardados."); }
      else if (data.encounter.status === "DRAFT") setNotice("La atención sigue en borrador. Se conserva lo que escribiste.");
      else setNotice("El encuentro está anulado. Se muestra en modo de consulta.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo comprobar el estado."); setExpired(cause instanceof ApiRequestError && cause.status === 401); }
    finally { setSaving(false); }
  }
  async function finalize(event: React.FormEvent) {
    event.preventDefault(); if (!context || closing.current) return;
    closing.current = true;
    setSaving(true); setError(""); setNotice(""); setExpired(false);
    try {
      const result = await apiJson<{ encounterId: string; referralId: string | null; reviewHistoryVersion: number }>(`/api/medical/encounters/${context.encounter.id}/finalize`, { method: "POST", body: JSON.stringify({
        chiefComplaint: chief, assessment, diagnosisText: diagnosis, reviewHistory: history,
        instructions: history.observations, followUpText: history.conduct.medicalFollowUp ? "Control médico" : null,
        bloodChemistryStatus: blood,
        referralSpecialtyId: history.conduct.referral ? referral.specialtyId : null,
        referralReason: history.conduct.referral ? referral.reason : null,
        referralComment: history.conduct.referral ? referral.comment : null, referralPriority: referral.priority,
      }) });
      const persisted = await apiJson<Context>(`/api/medical/encounters/${context.encounter.id}`);
      requireConfirmedClosure(persisted);
      if ((history.conduct.referral && !result.referralId) || (persisted.referral?.id ?? null) !== result.referralId) throw new Error("No se pudo confirmar la derivación emitida.");
      setContext(persisted); setDirty(false); setNotice(result.referralId ? "Ficha de revisión guardada, atención cerrada y derivación emitida." : "Ficha de revisión guardada y atención cerrada.");
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "No pudimos confirmar el guardado. Conservamos lo que escribiste; comprueba el estado antes de reintentar.");
      setExpired(cause instanceof ApiRequestError && cause.status === 401);
    } finally { closing.current = false; setSaving(false); }
  }
  function update(next: ReviewHistoryDraft) { setHistory(next); setDirty(true); }
  return <section className="space-y-5" aria-busy={loading || saving}>
    <Link href={`/medico/citas/${appointmentId}`} className="text-sm font-semibold text-primary">← Volver a la cita</Link>
    <div ref={feedback} tabIndex={-1}>{error && <p role="alert" className="rounded-xl bg-error-container p-4 text-error">{error}</p>}{notice && <p role="status" className="rounded-xl bg-success-container p-4 text-success">{notice}</p>}</div>
    {loading ? <p role="status">Cargando ficha de revisión…</p> : !context ? <button type="button" onClick={() => void load()} className="rounded-lg border border-primary px-4 py-2">Reintentar carga</button> : <>
      <header><p className="text-sm font-semibold text-primary">FICHA DE REVISIÓN</p><h1 className="mt-2 text-3xl font-bold">{context.patient.fullName}</h1><p className="mt-2 text-sm">Carnet {context.patient.carnet}</p></header>
      <p>Estado de la cita: <strong>{appointmentStatusLabel(context.appointment.status)}</strong></p>
      <MedicalDocuments patientId={context.patient.id} encounterId={context.encounter.id} editable={context.encounter.status === "DRAFT"} onDocumentsChanged={documents => setContext(previous => previous ? { ...previous, documents: documents.map(document => ({ id: document.id, type: document.documentType, filename: document.filename })) } : previous)} />
      {context.encounter.status !== "DRAFT" ? <article className="space-y-5 rounded-2xl border border-divider bg-surface p-6">
        <h2 className="text-xl font-bold">{context.encounter.status === "CLOSED" ? "Atención cerrada" : "Encuentro anulado"}</h2>
        <p>Versión de ficha: {context.encounter.reviewHistoryVersion ?? "—"}</p>
        {context.referral ? <EmittedReferralSummary referral={context.referral} /> : <p>Sin derivación emitida.</p>}
        {context.encounter.status === "CLOSED" && <><p>Ficha de consulta. Sus datos se conservan como quedaron al cerrar la atención.</p><Link href="/medico/agenda?vista=atendidas" className="block font-semibold text-primary">Ver atenciones realizadas</Link></>}
        <dl className="space-y-3"><div><dt>Motivo de consulta</dt><dd>{context.encounter.chiefComplaint ?? "—"}</dd></div><div><dt>Evaluación clínica</dt><dd>{context.encounter.assessment ?? "—"}</dd></div><div><dt>Diagnósticos</dt><dd>{context.diagnoses.map(item => item.label).join(" · ") || "Sin diagnósticos registrados."}</dd></div><div><dt>Indicaciones</dt><dd>{context.encounter.instructions ?? "—"}</dd></div></dl>
        <ClinicalBackgroundSummary version={context.clinicalBackground.encounter} compact />
        <ReviewSnapshot data={context.encounter.reviewHistory} hideGeneral={Boolean(context.clinicalBackground.encounter)} />
        <h3 className="font-bold">Mediciones registradas</h3><dl className="grid gap-2 sm:grid-cols-2">{context.measurements.map(item => <div key={item.code}><dt>{measurementLabels[item.code] ?? item.code}</dt><dd>{item.value} {item.unit}</dd></div>)}</dl>
        {context.encounter.status === "CLOSED" && <EncounterAmendments encounterId={context.encounter.id} />}
      </article> : <>
        <ClinicalBackgroundPanel embedded patientId={context.patient.id} encounterId={context.encounter.id} onSaved={version => { setContext(previous => previous ? { ...previous, clinicalBackground: { current: version, encounter: version } } : previous); setHistory(previous => ({ ...previous, ...clinicalBackgroundToLegacy(version.data) })); }} />
        <ClinicalHistoryDialog patientId={context.patient.id} currentEncounterId={context.encounter.id} />
        <p className="text-sm text-text-secondary">Los cambios de esta ficha se guardan al cerrar la atención. Al cerrar, la ficha quedará de consulta y la cita se marcará como atendida. Si sales antes, se te avisará para evitar perderlos.</p>
        <form onSubmit={finalize} onChange={() => setDirty(true)} className="space-y-6">
          <fieldset disabled={saving} className="space-y-6">
            <label className="block font-semibold">Motivo de consulta *<textarea required maxLength={4000} value={chief} onChange={event => setChief(event.target.value)} className={field} /></label>
            <ReviewHistoryForm value={history} onChange={update} patientName={context.patient.fullName} birthDate={context.patient.birthDate} scheduledFor={context.appointment.scheduledFor} />
            <label className="block font-semibold">Evaluación clínica *<textarea required maxLength={8000} value={assessment} onChange={event => setAssessment(event.target.value)} className={field} /></label>
            <label className="block font-semibold">Diagnóstico principal<input maxLength={2000} value={diagnosis} onChange={event => setDiagnosis(event.target.value)} className={field} /></label>
            <label className="block font-semibold">Química sanguínea<select value={blood} onChange={event => setBlood(event.target.value)} className={field}><option value="NOT_PRESENTED">No presentada</option><option value="PENDING">Pendiente</option><option value="ATTACHED" disabled={!context.documents.some(item => item.type === "BLOOD_CHEMISTRY")}>Adjunta</option></select></label>
            {history.conduct.referral && <section className="space-y-4 rounded-xl border border-divider p-5"><h2 className="font-bold">Derivación a especialidad</h2>
              <p>Se emitirá junto con el cierre. Se comparte el contexto de revisión, los diagnósticos y todos los documentos disponibles de esta atención.</p>
              <div><h3 className="font-semibold">Diagnóstico que se compartirá</h3><p>{diagnosis.trim() || "Sin diagnóstico adicional."}</p><h3 className="mt-2 font-semibold">Documentos que se compartirán</h3>{context.documents.length ? <ul>{context.documents.map(document => <li key={document.id}>{document.filename}</li>)}</ul> : <p>No hay documentos disponibles en esta atención.</p>}</div>
              {specialtiesLoading && <p role="status">Cargando especialidades…</p>}
              {specialtiesError && <p ref={specialtiesFeedback} tabIndex={-1} role="alert" className="text-error">{specialtiesError}</p>}
              {!specialtiesLoading && !specialtiesError && !specialties.length && <p>No hay especialidades activas disponibles.</p>}
              <button type="button" disabled={specialtiesLoading} onClick={() => void refreshSpecialties()} className="font-semibold text-primary">Actualizar especialidades</button>
              <label className="block">Especialidad *<select required value={referral.specialtyId} onChange={event => setReferral({ ...referral, specialtyId: event.target.value })} className={field}><option value="">Seleccionar…</option>{specialties.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="block">Motivo de derivación *<textarea required maxLength={2000} value={referral.reason} onChange={event => setReferral({ ...referral, reason: event.target.value })} className={field} /></label>
              <label className="block">Resumen para el especialista *<textarea required maxLength={4000} value={referral.comment} onChange={event => setReferral({ ...referral, comment: event.target.value })} className={field} /></label>
              <label className="block">Prioridad<select value={referral.priority} onChange={event => setReferral({ ...referral, priority: event.target.value })} className={field}><option value="ROUTINE">Rutinaria</option><option value="PRIORITY">Prioritaria</option><option value="URGENT">Urgente</option></select></label>
            </section>}
            <button type="submit" className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary">{saving ? "Guardando…" : history.conduct.referral ? "Cerrar y emitir derivación" : "Cerrar atención"}</button>
          </fieldset>
        </form>
      </>}
      {error && <button type="button" disabled={saving} onClick={() => void checkState()} className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Comprobar estado de la atención</button>}
    </>}
    {expired && <Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="block font-semibold text-primary">Iniciar sesión en otra pestaña y volver a esta ficha</Link>}
  </section>;
}

function requireConfirmedClosure(data: Context) {
  if (data.encounter.status !== "CLOSED" || data.appointment.status !== "ATTENDED" || !data.encounter.reviewHistory || !data.encounter.reviewHistoryVersion) {
    throw new Error("No pudimos confirmar el cierre completo. Se conserva lo escrito; comprueba el estado antes de reintentar.");
  }
}
