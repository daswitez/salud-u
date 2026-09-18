import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState, getPatientClinicalSnapshot } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";
import type { ClinicalEncounter, ClinicalDocument, ReferralStatus, Specialty } from "@/lib/ui-contracts";
import { ClinicalDocumentUploader } from "@/components/clinical-document-uploader";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { ActiveAttentionBanner } from "@/components/active-attention-banner";

const specialtyLabels: Record<Specialty, string> = { DERMATOLOGY: "Dermatología", OPHTHALMOLOGY: "Oftalmología", INTERNAL_MEDICINE: "Medicina interna", UROLOGY: "Urología", GYNECOLOGY: "Ginecología" };
const referralLabels: Record<ReferralStatus, string> = { PENDING_ASSIGNMENT: "Pendiente de asignación", ASSIGNED: "Asignada", IN_PROGRESS: "En atención", RETURNED: "Devuelta", CLOSED: "Cerrada", CANCELLED: "Cancelada" };

const docTypeLabels: Record<string, { label: string; icon: string }> = {
  BLOOD_CHEMISTRY: { label: "Química sanguínea", icon: "🧪" },
  LAB_RESULT: { label: "Resultado de laboratorio", icon: "🔬" },
  RADIOGRAPH: { label: "Radiografía / Imagen", icon: "🩻" },
  PRESCRIPTION: { label: "Receta médica", icon: "💊" },
  CLINICAL_PHOTO: { label: "Foto clínica", icon: "📷" },
  REFERRAL_DOCUMENT: { label: "Documento de derivación", icon: "📋" },
  OTHER: { label: "Otro documento", icon: "📄" },
};

function age(birthDate?: string) {
  if (!birthDate) return "—";
  const today = new Date("2026-09-17T12:00:00");
  const birth = new Date(`${birthDate}T12:00:00`);
  let result = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) result -= 1;
  return String(result);
}

function encounterLabel(encounter: ClinicalEncounter) {
  return encounter.type === "INITIAL" ? "Revisión estudiantil" : encounter.specialty ? specialtyLabels[encounter.specialty] : "Atención especializada";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function docExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "—";
}

export default async function PatientClinicalRecordPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const state = getClinicalDemoState();
  const professional = state.professionals.find((item) => item.fullName === session.name);
  if (!professional) notFound();
  const snapshot = getPatientClinicalSnapshot(patientId);
  if (!snapshot.patient) notFound();

  const isRelated = snapshot.encounters.some((item) => item.doctorId === professional.id) || snapshot.referrals.some((item) => item.requestedBy === professional.id || item.assignedDoctorId === professional.id) || snapshot.appointments.some((item) => item.assignedDoctorId === professional.id);

  if (!isRelated) return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="medico" active="patients" clinicalRole={session.clinicalRole} />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} />
        <div className="mx-auto max-w-3xl p-5 sm:p-8">
          <Link href="/medico" className="text-sm font-semibold text-primary hover:underline">← Inicio médico</Link>
          <section className="mt-6 rounded-2xl border border-error-container bg-error-container p-6">
            <p className="text-sm font-semibold text-error">ACCESO DENEGADO</p>
            <h1 className="mt-2 text-2xl font-bold text-text-primary">No tienes relación asistencial con este paciente</h1>
            <p className="mt-2 leading-6 text-text-secondary">La ficha clínica solo se habilita cuando existe una atención, una cita asignada o una derivación vinculada a tu cuenta.</p>
          </section>
        </div>
      </main>
    </div>
  );

  const lastEncounter = snapshot.encounters[0];
  const activeReferral = snapshot.referrals.find((item) => ["PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS"].includes(item.status));
  const diagnosesByEncounter = new Map(snapshot.encounters.map((encounter) => [encounter.id, snapshot.diagnoses.filter((diagnosis) => diagnosis.encounterId === encounter.id)]));
  const documentsByEncounter = new Map(snapshot.encounters.map((encounter) => [encounter.id, snapshot.documents.filter((doc) => doc.encounterId === encounter.id)]));
  const professionalById = new Map(state.professionals.map((item) => [item.id, item.fullName]));

  // Buscar si hay cita o derivación pendiente para ESTE profesional
  const pendingAppointment = snapshot.appointments.find(a => a.assignedDoctorId === professional.id && a.status === "SCHEDULED");
  const pendingReferralDoc = snapshot.referrals.find(r => (r.assignedDoctorId === professional.id || r.specialty === professional.specialty) && r.status === "ASSIGNED");

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="medico" active="patients" clinicalRole={session.clinicalRole} />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} />
        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          <Link href="/medico/pacientes" className="text-sm font-semibold text-primary hover:underline mb-6 inline-block">← Mis pacientes</Link>

          {(pendingAppointment || pendingReferralDoc) && (
            <div className="mb-6">
              <ActiveAttentionBanner
                patientId={patientId}
                doctorId={professional.id}
                appointment={pendingAppointment}
                referral={pendingReferralDoc}
              />
            </div>
          )}

          {/* === ENCABEZADO DEL PACIENTE === */}
          <header className="rounded-2xl border border-divider bg-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-primary">HISTORIA CLÍNICA</p>
                <h1 className="mt-1 text-3xl font-bold text-text-primary">{snapshot.patient.fullName}</h1>
                <p className="mt-2 text-text-secondary">Carnet {snapshot.patient.carnet} · Código {snapshot.patient.registrationCode}</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${activeReferral ? "bg-warning-container text-warning" : "bg-success-container text-success"}`}>
                {activeReferral ? referralLabels[activeReferral.status] : "Sin derivación activa"}
              </span>
            </div>
            <dl className="mt-6 grid gap-4 border-t border-divider pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-text-secondary">Edad</dt><dd className="mt-1 font-semibold text-text-primary">{age(snapshot.patient.birthDate)} años</dd></div>
              <div><dt className="text-text-secondary">Carrera</dt><dd className="mt-1 font-semibold text-text-primary">{snapshot.patient.career}</dd></div>
              <div><dt className="text-text-secondary">Última atención</dt><dd className="mt-1 font-semibold text-text-primary">{lastEncounter ? lastEncounter.occurredAt.split("T")[0] : "Sin atención"}</dd></div>
              <div><dt className="text-text-secondary">Historia</dt><dd className="mt-1 font-semibold text-text-primary">{snapshot.history?.id ?? "No disponible"}</dd></div>
            </dl>
          </header>

          {/* === CONTENIDO PRINCIPAL (2 COLUMNAS) === */}
          <div className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">

            {/* --- COLUMNA IZQUIERDA: Historial de Atenciones --- */}
            <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Historial de Atenciones</h2>
                  <p className="mt-1 text-sm text-text-secondary">Consultas registradas en esta historia clínica.</p>
                </div>
                <Link href={`/medico/pacientes/${patientId}/atenciones/nueva`} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Nueva evolución</Link>
              </div>

              <div className="mt-6 space-y-4">
                {snapshot.encounters.map((encounter) => {
                  const encounterDocs = documentsByEncounter.get(encounter.id) || [];
                  return (
                    <article key={encounter.id} className="rounded-xl border border-divider p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-text-primary">{encounterLabel(encounter)}</p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {encounter.occurredAt.split("T")[0]} {encounter.occurredAt.split("T")[1]?.substring(0, 5)} · {professionalById.get(encounter.doctorId) ?? "Profesional"}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${encounter.status === "CLOSED" ? "bg-success-container text-success" : "bg-warning-container text-warning"}`}>
                          {encounter.status === "CLOSED" ? "Cerrada · solo lectura" : "Borrador"}
                        </span>
                      </div>

                      <p className="mt-4 text-sm font-semibold text-text-primary">{encounter.chiefComplaint}</p>

                      {/* Diagnósticos */}
                      {diagnosesByEncounter.get(encounter.id)?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {diagnosesByEncounter.get(encounter.id)!.map((diagnosis) => (
                            <span key={diagnosis.id} className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs text-text-secondary">{diagnosis.label}</span>
                          ))}
                        </div>
                      ) : null}

                      {/* Documentos vinculados a ESTA atención */}
                      {encounterDocs.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-divider pt-3">
                          {encounterDocs.map((doc) => {
                            const meta = docTypeLabels[doc.type] || docTypeLabels.OTHER;
                            return (
                              <span key={doc.id} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary-900 border border-primary-200">
                                <span>{meta.icon}</span>
                                <span>{meta.label}</span>
                                <span className="text-primary-400">·</span>
                                <span className="text-primary-600">{docExtension(doc.fileName)}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Acciones */}
                      {encounter.status === "CLOSED" && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Link href={`/medico/pacientes/${patientId}?accion=adenda&atencion=${encounter.id}`} className="text-sm font-semibold text-primary hover:underline">Crear adenda</Link>
                          <Link href={`/medico/pacientes/${patientId}/atenciones/nueva?origen=${encounter.id}`} className="text-sm font-semibold text-primary hover:underline">Nueva evolución</Link>
                        </div>
                      )}
                    </article>
                  );
                })}
                {!snapshot.encounters.length && <p className="py-8 text-sm text-text-secondary">No hay atenciones clínicas registradas.</p>}
              </div>
            </section>

            {/* --- COLUMNA DERECHA: Aside --- */}
            <aside className="space-y-6">

              {/* Diagnósticos y mediciones */}
              <section className="rounded-2xl border border-divider bg-surface p-5">
                <h2 className="text-lg font-bold text-text-primary">Diagnósticos y mediciones</h2>
                <div className="mt-4 space-y-3">
                  {snapshot.diagnoses.map((diagnosis) => (
                    <div key={diagnosis.id} className="rounded-lg bg-surface-secondary p-3">
                      <p className="font-semibold text-text-primary">{diagnosis.label}</p>
                      <p className="mt-1 text-xs text-text-secondary">{diagnosis.code ?? "Sin código"}</p>
                    </div>
                  ))}
                  {snapshot.measurements.map((measurement) => (
                    <div key={measurement.id} className="flex items-center justify-between rounded-lg border border-divider p-3 text-sm">
                      <span className="text-text-secondary">{measurement.type === "WEIGHT" ? "Peso" : measurement.type}</span>
                      <span className="font-bold text-text-primary">{measurement.value} {measurement.unit}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* === ESTUDIOS Y DOCUMENTOS (REESTRUCTURADO) === */}
              <section className="rounded-2xl border border-divider bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-text-primary">Estudios y Documentos ({snapshot.documents.length})</h2>
                  <ClinicalDocumentUploader patientId={patientId} uploadedBy={professional.id} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {snapshot.documents.map((document) => {
                    const meta = docTypeLabels[document.type] || docTypeLabels.OTHER;
                    return (
                      <div key={document.id} className="group relative rounded-xl border border-divider bg-surface-secondary p-3.5 hover:border-primary/30 hover:shadow-sm transition-all">
                        {/* Botón de eliminar */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DeleteDocumentButton documentId={document.id} />
                        </div>

                        {/* Ícono grande */}
                        <div className="text-3xl mb-2">{meta.icon}</div>

                        {/* Tipo legible */}
                        <p className="font-semibold text-text-primary text-sm leading-tight">{meta.label}</p>

                        {/* Formato y tamaño */}
                        <p className="mt-1 text-xs text-text-secondary">
                          {docExtension(document.fileName)} · {formatFileSize(document.sizeBytes)}
                        </p>

                        {/* Fecha del estudio */}
                        {document.studyDate && (
                          <p className="mt-1 text-xs text-text-tertiary">Estudio: {document.studyDate}</p>
                        )}

                        {/* Tags */}
                        {document.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {document.tags.map((tag) => (
                              <span key={tag} className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {!snapshot.documents.length && <p className="mt-4 text-sm text-text-secondary">No hay estudios adjuntos disponibles.</p>}
              </section>

              {/* Derivaciones */}
              <section className="rounded-2xl border border-divider bg-surface p-5">
                <h2 className="text-lg font-bold text-text-primary">Derivaciones</h2>
                <div className="mt-4 space-y-3">
                  {snapshot.referrals.map((referral) => (
                    <div key={referral.id} className="rounded-lg bg-surface-secondary p-3">
                      <p className="font-semibold text-text-primary">{specialtyLabels[referral.specialty]}</p>
                      <p className="mt-1 text-sm text-text-secondary">{referral.reason}</p>
                      <p className="mt-2 text-xs font-semibold text-primary">{referralLabels[referral.status]}</p>
                    </div>
                  ))}
                  {!snapshot.referrals.length && <p className="text-sm text-text-secondary">No hay derivaciones registradas.</p>}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
