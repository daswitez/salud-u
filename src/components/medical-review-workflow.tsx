"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { appointmentStatusClass, appointmentStatusLabel, formatAppointmentTime } from "@/components/medical-appointments";
import { MedicalDocumentUploader } from "@/components/medical-document-uploader";
import type { PatientRecord } from "@/components/medical-patient-record";
import { ReviewHistoryForm } from "@/components/review-history-form";
import { apiJson, type MedicalAppointment } from "@/lib/api/client";
import { emptyReviewHistory, type ReviewHistoryDraft } from "@/lib/review-history";

type Specialty = { id: string; name: string };

export function MedicalReviewWorkflow({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<MedicalAppointment | null>(null);
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [stage, setStage] = useState<"ready" | "active" | "form">("ready");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [assessment, setAssessment] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [followUpText, setFollowUpText] = useState("");
  const [specialtyHistory, setSpecialtyHistory] = useState("");
  const [bloodChemistryStatus, setBloodChemistryStatus] = useState("NOT_PRESENTED");
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryDraft>(emptyReviewHistory);
  const [referralSpecialtyId, setReferralSpecialtyId] = useState("");
  const [referralReason, setReferralReason] = useState("");
  const [referralComment, setReferralComment] = useState("");
  const [referralPriority, setReferralPriority] = useState("ROUTINE");

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
        const existing = patientRecord.encounters.find((item) => item.appointment_id === appointmentId);
        if (existing?.status === "DRAFT") {
          setEncounterId(existing.id);
          setStage("active");
          setChiefComplaint(existing.chief_complaint === "Pendiente de entrevista clínica." ? "" : existing.chief_complaint);
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

  async function start() {
    setSaving(true);
    setError("");
    try {
      const data = await apiJson<{ encounterId: string }>(`/api/medical/appointments/${appointmentId}/start`, { method: "POST" });
      setEncounterId(data.encounterId);
      setStage("active");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar la cita.");
    } finally {
      setSaving(false);
    }
  }

  async function showForm() {
    setStage("form");
    if (!isReview || specialties.length) return;
    try {
      setSpecialties(await apiJson<Specialty[]>("/api/specialties"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar especialidades.");
    }
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
          specialtyHistory,
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
    {error && <p className="mt-5 rounded-lg bg-error-container p-4 text-sm text-error">{error}</p>}
    {closed ? <section className="mt-7 rounded-2xl bg-success-container p-6"><h2 className="font-bold text-success">Esta cita ya fue atendida</h2><p className="mt-2 text-sm text-text-secondary">La ficha se conserva como una versión inmutable asociada a esta fecha.</p></section>
      : stage === "ready" ? <section className="mt-7 rounded-2xl border border-primary-200 bg-primary-container p-6"><h2 className="text-xl font-bold text-text-primary">1. Iniciar cita</h2><p className="mt-2 max-w-2xl text-sm text-text-secondary">Se abrirá un borrador clínico para esta cita; aún no modificará ninguna ficha previa.</p><button onClick={start} disabled={saving} className="mt-5 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-50">{saving ? "Iniciando…" : "Iniciar cita"}</button></section>
        : stage === "active" ? <section className="mt-7 rounded-2xl border border-warning-container bg-warning-container p-6"><h2 className="text-xl font-bold text-text-primary">2. Cita en curso</h2><p className="mt-2 text-sm text-text-secondary">Completa la ficha de esta atención y adjunta sus exámenes o imágenes antes de cerrarla.</p><button onClick={showForm} className="mt-5 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary">Completar y cerrar cita</button></section>
          : <form onSubmit={finalize} className="mt-7 space-y-6">
            {isReview ? <>
              <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><p className="text-sm font-semibold tracking-wide text-primary">2. MOTIVO DE CONSULTA</p><label className="mt-4 block"><span className="text-sm font-semibold text-text-primary">Motivo de consulta *</span><textarea required value={chiefComplaint} onChange={(event) => setChiefComplaint(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label></section>
              <ReviewHistoryForm value={reviewHistory} onChange={setReviewHistory} patientName={record.patient.fullName} birthDate={record.patient.birthDate} scheduledFor={appointment.scheduledFor} />
              <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><p className="text-sm font-semibold tracking-wide text-primary">8. EVALUACIÓN / IMPRESIÓN DIAGNÓSTICA</p><label className="mt-4 block"><span className="text-sm font-semibold text-text-primary">Evaluación clínica *</span><textarea required value={assessment} onChange={(event) => setAssessment(event.target.value)} rows={5} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label><label className="mt-5 block"><span className="text-sm font-semibold text-text-primary">Diagnóstico principal</span><input value={diagnosisText} onChange={(event) => setDiagnosisText(event.target.value)} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label></section>
              <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 className="text-lg font-bold text-text-primary">Archivos de esta atención</h2><p className="mt-1 text-sm text-text-secondary">Los documentos y fotos quedan vinculados únicamente a esta ficha.</p><div className="mt-5 grid gap-5 lg:grid-cols-2"><div><label className="text-sm font-semibold text-text-primary">Química sanguínea<select value={bloodChemistryStatus} onChange={(event) => setBloodChemistryStatus(event.target.value)} className="mt-2 block w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary"><option value="NOT_PRESENTED">No presentada</option><option value="PENDING">Pendiente</option><option value="ATTACHED">Adjunta</option></select></label><MedicalDocumentUploader patientId={record.patient.id} encounterId={encounterId!} fixedType="BLOOD_CHEMISTRY" compact onUploaded={() => setBloodChemistryStatus("ATTACHED")} /></div><MedicalDocumentUploader patientId={record.patient.id} encounterId={encounterId!} /></div></section>
              {referralSelected && <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><p className="text-sm font-semibold tracking-wide text-primary">DERIVACIÓN A ESPECIALIDAD</p><p className="mt-1 text-sm text-text-secondary">Al cerrar, el informe y todos los adjuntos de esta ficha quedan congelados para el especialista.</p><div className="mt-5 grid gap-5 md:grid-cols-2"><label><span className="text-sm font-semibold text-text-primary">Especialidad *</span><select required value={referralSpecialtyId} onChange={(event) => setReferralSpecialtyId(event.target.value)} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary"><option value="">Seleccionar…</option>{specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}</select></label><label><span className="text-sm font-semibold text-text-primary">Prioridad *</span><select value={referralPriority} onChange={(event) => setReferralPriority(event.target.value)} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary"><option value="ROUTINE">Rutinaria</option><option value="PRIORITY">Prioritaria</option><option value="URGENT">Urgente</option></select></label></div><label className="mt-5 block"><span className="text-sm font-semibold text-text-primary">Motivo de derivación *</span><textarea required value={referralReason} onChange={(event) => setReferralReason(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label><label className="mt-5 block"><span className="text-sm font-semibold text-text-primary">Resumen para el especialista *</span><textarea required value={referralComment} onChange={(event) => setReferralComment(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label></section>}
            </> : <SpecialtyDraft chiefComplaint={chiefComplaint} assessment={assessment} diagnosisText={diagnosisText} instructions={instructions} followUpText={followUpText} specialtyHistory={specialtyHistory} onChiefComplaint={setChiefComplaint} onAssessment={setAssessment} onDiagnosis={setDiagnosisText} onInstructions={setInstructions} onFollowUp={setFollowUpText} onHistory={setSpecialtyHistory} patientId={record.patient.id} encounterId={encounterId!} />}
            <div className="flex flex-wrap justify-end gap-3"><Link href={`/medico/pacientes/${record.patient.id}`} className="rounded-lg border border-divider px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-secondary">Cancelar</Link><button disabled={saving} className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-50">{saving ? "Guardando…" : referralSelected ? "Cerrar atención y enviar derivación" : "Cerrar atención"}</button></div>
          </form>}
  </>;
}

function SpecialtyDraft({ chiefComplaint, assessment, diagnosisText, instructions, followUpText, specialtyHistory, onChiefComplaint, onAssessment, onDiagnosis, onInstructions, onFollowUp, onHistory, patientId, encounterId }: { chiefComplaint: string; assessment: string; diagnosisText: string; instructions: string; followUpText: string; specialtyHistory: string; onChiefComplaint: (value: string) => void; onAssessment: (value: string) => void; onDiagnosis: (value: string) => void; onInstructions: (value: string) => void; onFollowUp: (value: string) => void; onHistory: (value: string) => void; patientId: string; encounterId: string }) {
  const field = "mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 outline-none focus:border-primary";
  return <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><p className="text-sm font-semibold tracking-wide text-primary">REGISTRO PROVISIONAL DE ESPECIALIDAD</p><p className="mt-1 text-sm text-text-secondary">La ficha específica de cada especialidad se definirá con su formulario. Esta evolución ya queda versionada por cita.</p><div className="mt-6 grid gap-5"><label><span className="text-sm font-semibold text-text-primary">Motivo de consulta *</span><textarea required value={chiefComplaint} onChange={(event) => onChiefComplaint(event.target.value)} rows={3} className={field} /></label><label><span className="text-sm font-semibold text-text-primary">Evaluación clínica *</span><textarea required value={assessment} onChange={(event) => onAssessment(event.target.value)} rows={5} className={field} /></label><label><span className="text-sm font-semibold text-text-primary">Diagnóstico principal</span><input value={diagnosisText} onChange={(event) => onDiagnosis(event.target.value)} className={field} /></label><label><span className="text-sm font-semibold text-text-primary">Resumen evolutivo</span><textarea value={specialtyHistory} onChange={(event) => onHistory(event.target.value)} rows={4} className={field} /></label><label><span className="text-sm font-semibold text-text-primary">Indicaciones</span><textarea value={instructions} onChange={(event) => onInstructions(event.target.value)} rows={3} className={field} /></label><label><span className="text-sm font-semibold text-text-primary">Seguimiento sugerido</span><input value={followUpText} onChange={(event) => onFollowUp(event.target.value)} className={field} /></label><MedicalDocumentUploader patientId={patientId} encounterId={encounterId} /></div></section>;
}
