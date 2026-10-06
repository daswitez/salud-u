"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { appointmentStatusClass, appointmentStatusLabel, formatAppointmentTime } from "@/components/medical-appointments";
import { ClinicalBackgroundModal, ClinicalBackgroundSummary } from "@/components/clinical-background";
import { MedicalDocumentUploader } from "@/components/medical-document-uploader";
import { ReviewSnapshot, SpecialtySnapshot, type PatientRecord } from "@/components/medical-patient-record";
import { ReviewHistoryForm } from "@/components/review-history-form";
import { emptySpecialtyHistory, SpecialtyHistoryForm, type SpecialtyHistoryDraft } from "@/components/specialty-history-form";
import { apiJson, type MedicalAppointment } from "@/lib/api/client";
import { clinicalBackgroundToLegacy, type ClinicalBackgroundDraft, type ClinicalBackgroundVersion } from "@/lib/clinical-background";
import { emptyReviewHistory, type ReviewHistoryDraft } from "@/lib/review-history";

type Specialty = { id: string; name: string };

export function MedicalReviewWorkflow({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<MedicalAppointment | null>(null);
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [stage, setStage] = useState<"ready" | "form">("ready");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [assessment, setAssessment] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [followUpText, setFollowUpText] = useState("");
  const [specialtyHistory, setSpecialtyHistory] = useState<SpecialtyHistoryDraft>(emptySpecialtyHistory("GENERAL"));
  const [bloodChemistryStatus, setBloodChemistryStatus] = useState("NOT_PRESENTED");
  const [hasBloodChemistry, setHasBloodChemistry] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryDraft>(emptyReviewHistory);
  const [referralSpecialtyId, setReferralSpecialtyId] = useState("");
  const [referralReason, setReferralReason] = useState("");
  const [referralComment, setReferralComment] = useState("");
  const [referralPriority, setReferralPriority] = useState("ROUTINE");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [clinicalBackground, setClinicalBackground] = useState<ClinicalBackgroundVersion | null>(null);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [backgroundSaving, setBackgroundSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const appointments = await apiJson<MedicalAppointment[]>("/api/medical/appointments");
        const current = appointments.find((item) => item.id === appointmentId);
        if (!current?.patient) throw new Error("No se encontró una cita asignada a tu cuenta.");
        const patientRecord = await apiJson<PatientRecord>(`/api/medical/patients/${current.patient.id}`);
        if (!active) return;
        setAppointment(current);
        setRecord(patientRecord);
        if (current.appointmentType === "INITIAL") setSpecialties(await apiJson<Specialty[]>("/api/specialties"));
        const existing = patientRecord.encounters.find((item) => item.appointment_id === appointmentId);
        const background = existing?.clinicalBackground ?? patientRecord.clinicalBackground;
        setClinicalBackground(background);
        applyClinicalBackground(background?.data ?? null, current.specialtyCode ?? "GENERAL", setReviewHistory, setSpecialtyHistory);
        if (existing?.status === "DRAFT") {
          setEncounterId(existing.id);
          setStage("form");
          setChiefComplaint(existing.chief_complaint === "Pendiente de entrevista clínica." ? "" : existing.chief_complaint);
          setHasBloodChemistry(patientRecord.documents.some((document) => document.encounter_id === existing.id && document.document_type_code === "BLOOD_CHEMISTRY"));
          if (!background) setBackgroundOpen(true);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "No se pudo abrir la cita.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [appointmentId]);

  const isReview = appointment?.appointmentType === "INITIAL";
  const referralSelected = reviewHistory.conduct.referral;

  async function loadSpecialties() {
    if (!isReview || specialties.length) return;
    try { setSpecialties(await apiJson<Specialty[]>("/api/specialties")); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudieron cargar especialidades."); }
  }

  async function start() {
    setSaving(true);
    setError("");
    try {
      const data = await apiJson<{ encounterId: string }>(`/api/medical/appointments/${appointmentId}/start`, { method: "POST" });
      setEncounterId(data.encounterId);
      setHasBloodChemistry(false);
      setBloodChemistryStatus("NOT_PRESENTED");
      setStage("form");
      await loadSpecialties();
      if (!clinicalBackground) setBackgroundOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar la cita.");
    } finally {
      setSaving(false);
    }
  }

  async function saveClinicalBackground(data: ClinicalBackgroundDraft, changeReason: string) {
    if (!record || !encounterId) return;
    setBackgroundSaving(true); setError("");
    try {
      const version = await apiJson<ClinicalBackgroundVersion>(`/api/medical/patients/${record.patient.id}/clinical-background`, { method: "PATCH", body: JSON.stringify({ data, changeReason, encounterId, expectedVersion: clinicalBackground?.versionNo ?? 0 }) });
      setClinicalBackground(version);
      setRecord({ ...record, clinicalBackground: version });
      applyClinicalBackground(version.data, appointment?.specialtyCode ?? "GENERAL", setReviewHistory, setSpecialtyHistory);
      setBackgroundOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudieron guardar los antecedentes generales."); }
    finally { setBackgroundSaving(false); }
  }

  async function finalize(event: React.FormEvent) {
    event.preventDefault();
    if (!encounterId || !appointment || !record) return;
    setSaving(true);
    setError("");
    try {
      await apiJson(`/api/medical/encounters/${encounterId}/finalize`, {
        method: "POST",
        body: JSON.stringify({
          chiefComplaint,
          assessment,
          diagnosisText,
          instructions: isReview ? reviewHistory.observations : instructions,
          followUpText: isReview ? (reviewHistory.conduct.medicalFollowUp ? "Control médico" : null) : followUpText,
          specialtyHistory: isReview ? null : specialtyHistory,
          bloodChemistryStatus,
          reviewHistory: isReview ? reviewHistory : null,
          referralSpecialtyId: isReview && referralSelected ? referralSpecialtyId : null,
          referralReason: isReview && referralSelected ? referralReason : null,
          referralComment: isReview && referralSelected ? referralComment : null,
          referralPriority,
        }),
      });
      router.push(`/medico/pacientes/${record.patient.id}?actualizada=1`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo finalizar la atención.");
    } finally {
      setSaving(false);
    }
  }

  function changeBloodChemistryStatus(nextStatus: string) {
    if (nextStatus === "ATTACHED" && !hasBloodChemistry) {
      setError("Primero sube la química sanguínea con el botón “Subir archivo”. Elegir el archivo no lo adjunta todavía.");
      return;
    }
    setError("");
    setBloodChemistryStatus(nextStatus);
  }

  if (loading) return <p className="py-16 text-center text-sm text-text-secondary">Cargando cita y ficha clínica…</p>;
  if (!appointment || !record) return <p className="rounded-xl bg-error-container p-5 text-error">{error || "No se encontró la cita."}</p>;
  const closed = appointment.status === "ATTENDED" || record.encounters.some((item) => item.appointment_id === appointmentId && item.status === "CLOSED");
  const title = isReview ? "CITA DE REVISIÓN" : appointment.appointmentType === "REFERRAL" ? "CITA POR DERIVACIÓN" : "CITA DE ESPECIALIDAD";

  return <>
    <Link href={`/medico/pacientes/${record.patient.id}`} className="text-sm font-semibold text-primary hover:underline">← Ficha del paciente</Link>
    <header className="mt-5 rounded-2xl border border-divider bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-semibold tracking-wide text-primary">{title}</p><h1 className="mt-1 text-3xl font-bold text-text-primary">{record.patient.fullName}</h1><p className="mt-2 text-text-secondary">{formatAppointmentTime(appointment.scheduledFor)} · CI {record.patient.carnet}</p></div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${appointmentStatusClass(closed ? "ATTENDED" : appointment.status)}`}>{appointmentStatusLabel(closed ? "ATTENDED" : appointment.status)}</span>
      </div>
      <div className="mt-6 grid gap-4 border-t border-divider pt-5 text-sm md:grid-cols-2">
        <p><span className="block text-text-secondary">Atenciones previas</span><span className="font-semibold text-text-primary">{record.encounters.filter((item) => item.status === "CLOSED").length} registrada(s)</span></p>
        <p><span className="block text-text-secondary">Archivos de la ficha actual</span><span className="font-semibold text-text-primary">Se adjuntan a esta cita y no se mezclarán con otras.</span></p>
      </div>
    </header>
    <ClinicalHistoryAccess record={record} open={historyOpen} onOpen={() => setHistoryOpen(true)} onClose={() => setHistoryOpen(false)} />
    {error && <p className="mt-5 rounded-lg bg-error-container p-4 text-sm text-error">{error}</p>}
    {stage === "form" && <div className="mt-7"><ClinicalBackgroundSummary version={clinicalBackground} onEdit={() => setBackgroundOpen(true)} /></div>}
    {closed ? <section className="mt-7 rounded-2xl bg-success-container p-6"><h2 className="font-bold text-success">Esta cita ya fue atendida</h2><p className="mt-2 text-sm text-text-secondary">La ficha se conserva como una versión inmutable asociada a esta fecha.</p></section>
      : stage === "ready" ? <section className="mt-7 rounded-2xl border border-primary-200 bg-primary-container p-6"><h2 className="text-xl font-bold text-text-primary">1. Iniciar cita</h2><p className="mt-2 max-w-2xl text-sm text-text-secondary">Se abrirá un borrador clínico para esta cita; aún no modificará ninguna ficha previa.</p><button onClick={start} disabled={saving} className="mt-5 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-50">{saving ? "Iniciando…" : "Iniciar cita"}</button></section>
        : <form onSubmit={finalize} className="mt-7 space-y-6">
            {isReview ? <>
              <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><p className="text-sm font-semibold tracking-wide text-primary">2. MOTIVO DE CONSULTA</p><label className="mt-4 block"><span className="text-sm font-semibold text-text-primary">Motivo de consulta *</span><textarea required value={chiefComplaint} onChange={(event) => setChiefComplaint(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label></section>
              <ReviewHistoryForm value={reviewHistory} onChange={setReviewHistory} patientName={record.patient.fullName} birthDate={record.patient.birthDate} scheduledFor={appointment.scheduledFor} />
              <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><p className="text-sm font-semibold tracking-wide text-primary">8. EVALUACIÓN / IMPRESIÓN DIAGNÓSTICA</p><label className="mt-4 block"><span className="text-sm font-semibold text-text-primary">Evaluación clínica *</span><textarea required value={assessment} onChange={(event) => setAssessment(event.target.value)} rows={5} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label><label className="mt-5 block"><span className="text-sm font-semibold text-text-primary">Diagnóstico principal</span><input value={diagnosisText} onChange={(event) => setDiagnosisText(event.target.value)} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label></section>
              <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 className="text-lg font-bold text-text-primary">Archivos de esta atención</h2><p className="mt-1 text-sm text-text-secondary">Los documentos y fotos quedan vinculados únicamente a esta ficha.</p><div className="mt-5 grid gap-5 lg:grid-cols-2"><div><label className="text-sm font-semibold text-text-primary">Química sanguínea<select value={bloodChemistryStatus} onChange={(event) => changeBloodChemistryStatus(event.target.value)} className="mt-2 block w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary"><option value="NOT_PRESENTED">No presentada</option><option value="PENDING">Pendiente</option><option value="ATTACHED" disabled={!hasBloodChemistry}>Adjunta</option></select></label><p className={`mt-2 text-xs font-medium ${hasBloodChemistry ? "text-success" : "text-text-secondary"}`}>{hasBloodChemistry ? "Química sanguínea subida y vinculada a esta atención." : "Para marcarla como adjunta, selecciona el archivo y pulsa “Subir archivo”."}</p><MedicalDocumentUploader patientId={record.patient.id} encounterId={encounterId!} fixedType="BLOOD_CHEMISTRY" compact onUploaded={() => { setHasBloodChemistry(true); setBloodChemistryStatus("ATTACHED"); setError(""); }} /></div><MedicalDocumentUploader patientId={record.patient.id} encounterId={encounterId!} /></div></section>
              {referralSelected && <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><p className="text-sm font-semibold tracking-wide text-primary">DERIVACIÓN A ESPECIALIDAD</p><p className="mt-1 text-sm text-text-secondary">Al cerrar, el informe y todos los adjuntos de esta ficha quedan congelados para el especialista.</p><div className="mt-5 grid gap-5 md:grid-cols-2"><label><span className="text-sm font-semibold text-text-primary">Especialidad *</span><select required value={referralSpecialtyId} onChange={(event) => setReferralSpecialtyId(event.target.value)} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary"><option value="">Seleccionar…</option>{specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}</select></label><label><span className="text-sm font-semibold text-text-primary">Prioridad *</span><select value={referralPriority} onChange={(event) => setReferralPriority(event.target.value)} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary"><option value="ROUTINE">Rutinaria</option><option value="PRIORITY">Prioritaria</option><option value="URGENT">Urgente</option></select></label></div><label className="mt-5 block"><span className="text-sm font-semibold text-text-primary">Motivo de derivación *</span><textarea required value={referralReason} onChange={(event) => setReferralReason(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label><label className="mt-5 block"><span className="text-sm font-semibold text-text-primary">Resumen para el especialista *</span><textarea required value={referralComment} onChange={(event) => setReferralComment(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label></section>}
            </> : <SpecialtyDraft chiefComplaint={chiefComplaint} assessment={assessment} diagnosisText={diagnosisText} instructions={instructions} followUpText={followUpText} specialtyHistory={specialtyHistory} onChiefComplaint={setChiefComplaint} onAssessment={setAssessment} onDiagnosis={setDiagnosisText} onInstructions={setInstructions} onFollowUp={setFollowUpText} onHistory={setSpecialtyHistory} patientId={record.patient.id} encounterId={encounterId!} />}
            <div className="flex flex-wrap justify-end gap-3"><Link href={`/medico/pacientes/${record.patient.id}`} className="rounded-lg border border-divider px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-secondary">Cancelar</Link><button disabled={saving} className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-50">{saving ? "Guardando…" : referralSelected ? "Cerrar atención y enviar derivación" : "Cerrar atención"}</button></div>
          </form>}
    <ClinicalBackgroundModal key={`${backgroundOpen}-${clinicalBackground?.id ?? "new"}`} open={backgroundOpen} initial={clinicalBackground} saving={backgroundSaving} error={error} required={!clinicalBackground} onClose={() => setBackgroundOpen(false)} onSave={saveClinicalBackground} />
  </>;
}

function applyClinicalBackground(
  background: ClinicalBackgroundDraft | null,
  specialtyCode: string,
  setReview: React.Dispatch<React.SetStateAction<ReviewHistoryDraft>>,
  setSpecialty: React.Dispatch<React.SetStateAction<SpecialtyHistoryDraft>>,
) {
  const specialty = emptySpecialtyHistory(specialtyCode);
  if (!background) { setSpecialty(specialty); return; }
  const legacy = clinicalBackgroundToLegacy(background);
  setReview((current) => ({ ...current, personalHistory: legacy.personalHistory, habits: legacy.habits }));
  setSpecialty({
    ...specialty,
    personalHistory: {
      pathological: legacy.personalHistory.pathological,
      surgical: legacy.personalHistory.surgical,
      allergic: legacy.personalHistory.allergic,
      family: legacy.personalHistory.familyRelevant,
    },
  });
}

function ClinicalHistoryAccess({ record, open, onOpen, onClose }: { record: PatientRecord; open: boolean; onOpen: () => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const closedEncounters = record.encounters.filter((item) => item.status === "CLOSED");
  const visibleEncounters = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es-BO");
    return closedEncounters.filter((encounter) => {
      const encounterDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date(encounter.occurred_at));
      if (from && encounterDate < from) return false;
      if (to && encounterDate > to) return false;
      if (!term) return true;
      const diagnoses = record.diagnoses.filter((item) => item.encounter_id === encounter.id).map((item) => item.label);
      return JSON.stringify({ encounter, diagnoses }).toLocaleLowerCase("es-BO").includes(term);
    });
  }, [closedEncounters, from, record.diagnoses, search, to]);
  return <>
    <button type="button" onClick={onOpen} className="fixed bottom-5 right-5 z-40 rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-lg transition hover:bg-primary-hover focus:outline-none focus:ring-4 focus:ring-primary-container" aria-haspopup="dialog" aria-expanded={open}>Historia clínica <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">{closedEncounters.length}</span></button>
    {open && <div className="fixed inset-0 z-50 bg-black/40" role="presentation" onMouseDown={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="clinical-history-title" onMouseDown={(event) => event.stopPropagation()} className="ml-auto flex h-full w-full max-w-2xl flex-col bg-surface shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-divider p-5 sm:p-6"><div><p className="text-sm font-semibold tracking-wide text-primary">REFERENCIA CLÍNICA</p><h2 id="clinical-history-title" className="mt-1 text-2xl font-bold text-text-primary">Historia de {record.patient.fullName}</h2><p className="mt-1 text-sm text-text-secondary">Consulta esta información sin salir de la cita; el formulario actual conserva lo que ya escribiste.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-xl text-text-secondary hover:bg-surface-secondary" aria-label="Cerrar historia clínica">×</button></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6"><ClinicalBackgroundSummary version={record.clinicalBackground} compact />
          <section className="mt-6"><div className="flex items-baseline justify-between gap-4"><h3 className="text-lg font-bold text-text-primary">Atenciones previas</h3><span className="text-sm text-text-secondary">{visibleEncounters.length} de {closedEncounters.length}</span></div><div className="mt-3 rounded-xl border border-divider bg-surface-secondary p-4"><label><span className="text-sm font-semibold text-text-primary">Buscar en la historia</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Síntoma, diagnóstico, alergia, indicación…" className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" /></label><div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="text-sm font-semibold text-text-primary">Desde</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" /></label><label><span className="text-sm font-semibold text-text-primary">Hasta</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" /></label></div>{(search || from || to) && <button type="button" onClick={() => { setSearch(""); setFrom(""); setTo(""); }} className="mt-3 text-sm font-semibold text-primary hover:underline">Limpiar filtros</button>}</div><div className="mt-3 space-y-3">{visibleEncounters.map((encounter, index) => { const diagnoses = record.diagnoses.filter((item) => item.encounter_id === encounter.id); const documents = record.documents.filter((item) => item.encounter_id === encounter.id); return <details key={encounter.id} open={index === 0} className="rounded-xl border border-divider bg-surface"><summary className="cursor-pointer list-none p-4 hover:bg-surface-secondary"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-text-primary">{encounter.encounter_type === "INITIAL" ? "Revisión médica" : encounter.specialty ?? "Especialidad"}</p>{encounter.accessReason === "REFERRAL_SOURCE" && <span className="rounded-full bg-primary-container px-2.5 py-1 text-xs font-semibold text-primary">Origen de la derivación</span>}</div><p className="mt-1 text-sm text-text-secondary">{formatAppointmentTime(encounter.occurred_at)} · {encounter.chief_complaint}</p></summary><div className="border-t border-divider p-4">{encounter.clinicalBackground && <ClinicalBackgroundSummary version={encounter.clinicalBackground} compact />}<h4 className="mt-4 font-semibold text-text-primary">Evaluación</h4><p className="mt-1 text-sm text-text-secondary">{encounter.assessment || "Sin observaciones."}</p>{diagnoses.length > 0 && <><h4 className="mt-4 font-semibold text-text-primary">Diagnósticos</h4><p className="mt-1 text-sm text-text-secondary">{diagnoses.map((item) => item.label).join(" · ")}</p></>}{encounter.instructions && <><h4 className="mt-4 font-semibold text-text-primary">Indicaciones</h4><p className="mt-1 text-sm text-text-secondary">{encounter.instructions}</p></>}{encounter.follow_up_text && <><h4 className="mt-4 font-semibold text-text-primary">Control médico</h4><p className="mt-1 text-sm text-text-secondary">{encounter.follow_up_text}</p></>}{encounter.encounter_type === "INITIAL" ? <ReviewSnapshot data={encounter.reviewHistory} hideGeneral={Boolean(encounter.clinicalBackground)} /> : <SpecialtySnapshot data={encounter.specialtyHistory} hideGeneral={Boolean(encounter.clinicalBackground)} />}{documents.length > 0 && <p className="mt-5 text-sm font-semibold text-primary">{documents.length} archivo(s) asociado(s) a esta atención</p>}</div></details>; })}{!visibleEncounters.length && <p className="rounded-xl border border-dashed border-divider p-6 text-center text-sm text-text-secondary">No hay atenciones que coincidan con estos filtros.</p>}</div></section>
        </div>
      </aside>
    </div>}
  </>;
}

function SpecialtyDraft({ chiefComplaint, assessment, diagnosisText, instructions, followUpText, specialtyHistory, onChiefComplaint, onAssessment, onDiagnosis, onInstructions, onFollowUp, onHistory, patientId, encounterId }: { chiefComplaint: string; assessment: string; diagnosisText: string; instructions: string; followUpText: string; specialtyHistory: SpecialtyHistoryDraft; onChiefComplaint: (value: string) => void; onAssessment: (value: string) => void; onDiagnosis: (value: string) => void; onInstructions: (value: string) => void; onFollowUp: (value: string) => void; onHistory: (value: SpecialtyHistoryDraft) => void; patientId: string; encounterId: string }) {
  const field = "mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary";
  return <><section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><p className="text-sm font-semibold tracking-wide text-primary">EVOLUCIÓN DE ESPECIALIDAD</p><div className="mt-6 grid gap-5"><label><span className="text-sm font-semibold text-text-primary">Motivo de consulta *</span><textarea required value={chiefComplaint} onChange={(event) => onChiefComplaint(event.target.value)} rows={3} className={field} /></label><label><span className="text-sm font-semibold text-text-primary">Impresión diagnóstica *</span><textarea required value={assessment} onChange={(event) => onAssessment(event.target.value)} rows={5} className={field} /></label><label><span className="text-sm font-semibold text-text-primary">Diagnóstico principal</span><input value={diagnosisText} onChange={(event) => onDiagnosis(event.target.value)} className={field} /></label></div></section><SpecialtyHistoryForm value={specialtyHistory} onChange={onHistory} /><section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><div className="grid gap-5"><label><span className="text-sm font-semibold text-text-primary">Plan y tratamiento</span><textarea value={instructions} onChange={(event) => onInstructions(event.target.value)} rows={3} className={field} /></label><label><span className="text-sm font-semibold text-text-primary">Fecha / indicación de control médico</span><input value={followUpText} onChange={(event) => onFollowUp(event.target.value)} className={field} /></label><MedicalDocumentUploader patientId={patientId} encounterId={encounterId} /></div></section></>;
}
