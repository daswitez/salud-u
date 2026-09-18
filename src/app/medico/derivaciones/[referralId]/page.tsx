import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState, getPatientClinicalSnapshot } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";
import { ReferralActionController } from "@/components/referral-action-controller";
import { ClinicalDocumentUploader } from "@/components/clinical-document-uploader";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { ClinicalChartViewer } from "@/components/clinical-chart-viewer";

function age(birthDate?: string) { 
  if (!birthDate) return "—"; 
  const today = new Date("2026-09-17T12:00:00"); 
  const birth = new Date(`${birthDate}T12:00:00`); 
  let result = today.getFullYear() - birth.getFullYear(); 
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) result -= 1; 
  return String(result); 
}

const specialtyLabels = { DERMATOLOGY: "Dermatología", OPHTHALMOLOGY: "Oftalmología", INTERNAL_MEDICINE: "Medicina interna", UROLOGY: "Urología", GYNECOLOGY: "Ginecología" };

export default async function MedicalReferralContextPage({ params }: { params: Promise<{ referralId: string }> }) {
  const { referralId } = await params;
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const state = getClinicalDemoState();
  const professional = state.professionals.find((item) => item.fullName === session.name);
  if (!professional) notFound();

  // Obtener la derivación
  const referral = state.referrals.find(r => r.id === referralId);
  if (!referral) notFound();
  
  // Validar permisos (el emisor o el especialista)
  if (referral.requestedBy !== professional.id && referral.specialty !== professional.specialty) notFound();

  // Obtener la info clínica del paciente
  const snapshot = getPatientClinicalSnapshot(referral.patientId);
  if (!snapshot.patient) notFound();

  // Buscar el encuentro origen (donde se creó la derivación)
  const sourceEncounter = snapshot.encounters.find(e => e.id === referral.sourceEncounterId);
  const sourceDiagnoses = sourceEncounter ? snapshot.diagnoses.filter(d => d.encounterId === sourceEncounter.id) : [];
  
  // Buscar si ya hay un encuentro creado (draft o closed) como respuesta a esta derivación
  // En nuestro sistema demo, asumimos que si hay un encuentro del especialista *después* de la derivación, está ligado.
  // Idealmente la BD tendría referral.targetEncounterId.
  const targetEncounter = snapshot.encounters.find(e => e.doctorId === professional.id && e.specialty === referral.specialty && e.occurredAt >= referral.createdAt);

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="medico" active="referrals" clinicalRole={session.clinicalRole} />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} />
        
        <div className="mx-auto max-w-5xl p-5 sm:p-8">
          <Link href="/medico/derivaciones" className="text-sm font-semibold text-primary hover:underline">← Volver a derivaciones</Link>
          
          <header className="mt-5 rounded-2xl border border-divider bg-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-primary">SALA DE ESPECIALIDAD</p>
                <h1 className="mt-1 text-3xl font-bold text-text-primary">Atención por Derivación</h1>
                <p className="mt-2 text-text-secondary">Especialidad: {specialtyLabels[referral.specialty]}</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                referral.status === "ASSIGNED" ? "bg-warning-container text-warning-700" :
                referral.status === "CLOSED" ? "bg-success-container text-success-700" :
                "bg-surface-secondary text-text-secondary"
              }`}>
                Estado: {referral.status}
              </span>
            </div>
            
            <div className="mt-8 grid lg:grid-cols-2 gap-6">
              {/* Información del Paciente y Motivo */}
              <div className="flex flex-col gap-4">
                <div className="rounded-xl bg-surface-secondary p-5">
                  <h2 className="font-bold text-text-primary mb-3">Perfil del Paciente</h2>
                  <dl className="grid grid-cols-2 gap-y-3 text-sm">
                    <div><dt className="text-text-secondary">Nombre</dt><dd className="font-semibold text-text-primary">{snapshot.patient.fullName}</dd></div>
                    <div><dt className="text-text-secondary">Edad</dt><dd className="font-semibold text-text-primary">{age(snapshot.patient.birthDate)} años</dd></div>
                  </dl>
                </div>

                <div className="rounded-xl border border-warning-200 bg-warning-50 p-5">
                  <h2 className="font-bold text-warning-900 mb-2">Motivo de la Derivación</h2>
                  <p className="text-sm font-semibold text-warning-900">{referral.reason}</p>
                  <p className="mt-2 text-sm italic text-warning-800">"{referral.commentForSpecialist}"</p>
                  
                  {sourceDiagnoses.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-warning-200">
                      <p className="text-xs font-semibold uppercase text-warning-700 mb-2">Diagnósticos Previos</p>
                      <ul className="list-disc pl-4 text-sm text-warning-900">
                        {sourceDiagnoses.map(d => <li key={d.id}>{d.label} {d.code && `(${d.code})`}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones de la Derivación */}
              <ReferralActionController 
                referral={referral} 
                doctorId={professional.id} 
                encounterId={targetEncounter?.id}
                encounterStatus={targetEncounter?.status}
              />
            </div>
          </header>

          <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_350px]">
            {/* Visor de Historial Clínico en Pestañas */}
            <div className="min-w-0">
              <ClinicalChartViewer 
                snapshot={snapshot} 
                context={{ 
                  type: "SPECIALTY", 
                  referral, 
                  sourceEncounter: state.encounters.find(e => e.id === referral.sourceEncounterId) || {},
                  sourceDiagnoses 
                }} 
              />
            </div>

            {/* Panel de Documentos de la Cita Actual (Side) */}
            <aside className="space-y-6">
              <section className="rounded-2xl border border-divider bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-bold text-text-primary">Documentos de la Cita</h2>
                  {targetEncounter && (
                    <ClinicalDocumentUploader patientId={snapshot.patient.id} uploadedBy={professional.id} encounterId={targetEncounter.id} />
                  )}
                </div>
                {!targetEncounter && <p className="text-xs text-text-secondary mb-4">Inicia la especialidad para adjuntar documentos.</p>}
                <div className="space-y-3">
                  {snapshot.documents.map((document) => (
                    <div key={document.id} className="flex justify-between items-center rounded-lg border border-divider p-3">
                      <div>
                        <p className="font-semibold text-text-primary">{document.fileName}</p>
                        <p className="mt-1 text-xs text-text-secondary">{document.type.replaceAll("_", " ")} · {document.tags.join(", ") || "Sin etiquetas"}</p>
                      </div>
                      <DeleteDocumentButton documentId={document.id} />
                    </div>
                  ))}
                  {!snapshot.documents.length && <p className="text-sm text-text-secondary">No hay adjuntos disponibles.</p>}
                </div>
              </section>
            </aside>
          </div>

        </div>
      </main>
    </div>
  );
}
