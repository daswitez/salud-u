import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState, getPatientClinicalSnapshot } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";
import { AppointmentActionController } from "@/components/appointment-action-controller";
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

export default async function MedicalAppointmentContextPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const state = getClinicalDemoState();
  const professional = state.professionals.find((item) => item.fullName === session.name);
  if (!professional) notFound();

  // Obtener la cita
  const appointment = state.appointments.find(a => a.id === appointmentId);
  if (!appointment || appointment.assignedDoctorId !== professional.id) notFound();

  // Obtener la info clínica del paciente
  const snapshot = getPatientClinicalSnapshot(appointment.patientId);
  if (!snapshot.patient) notFound();

  // Verificar si ya hay un encuentro creado (draft o closed) para esta cita
  const linkedEncounter = state.encounters.find(e => e.appointmentId === appointmentId);

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="medico" active="home" clinicalRole={session.clinicalRole} />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} />
        
        <div className="mx-auto max-w-5xl p-5 sm:p-8">
          <Link href="/medico" className="text-sm font-semibold text-primary hover:underline">← Volver al inicio</Link>
          
          <header className="mt-5 rounded-2xl border border-divider bg-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-primary">SALA DE CONSULTA</p>
                <h1 className="mt-1 text-3xl font-bold text-text-primary">Atención Médica en Curso</h1>
                <p className="mt-2 text-text-secondary">Contexto de la cita: {appointment.scheduledFor.replace("T", " a las ")} hrs.</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                appointment.status === "SCHEDULED" ? "bg-warning-container text-warning-700" :
                appointment.status === "ATTENDED" ? "bg-success-container text-success-700" :
                "bg-surface-secondary text-text-secondary"
              }`}>
                Estado: {appointment.status}
              </span>
            </div>
            
            <div className="mt-8 grid lg:grid-cols-2 gap-6">
              {/* Información del Paciente */}
              <div className="rounded-xl bg-surface-secondary p-5">
                <h2 className="font-bold text-text-primary mb-3">Perfil del Paciente</h2>
                <dl className="grid grid-cols-2 gap-y-3 text-sm">
                  <div><dt className="text-text-secondary">Nombre</dt><dd className="font-semibold text-text-primary">{snapshot.patient.fullName}</dd></div>
                  <div><dt className="text-text-secondary">Carnet / Cód</dt><dd className="font-semibold text-text-primary">{snapshot.patient.carnet} / {snapshot.patient.registrationCode}</dd></div>
                  <div><dt className="text-text-secondary">Edad</dt><dd className="font-semibold text-text-primary">{age(snapshot.patient.birthDate)} años</dd></div>
                  <div><dt className="text-text-secondary">Carrera</dt><dd className="font-semibold text-text-primary">{snapshot.patient.career}</dd></div>
                </dl>
              </div>

              {/* Acciones de la Cita */}
              <AppointmentActionController 
                appointment={appointment} 
                doctorId={professional.id} 
                encounterId={linkedEncounter?.id}
                encounterStatus={linkedEncounter?.status}
              />
            </div>
          </header>

          <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_350px]">
            {/* Visor de Historial Clínico en Pestañas */}
            <div className="min-w-0">
              <ClinicalChartViewer 
                snapshot={snapshot} 
                context={{ type: "REVIEW", appointmentId: appointment.id }} 
              />
            </div>

            {/* Panel de Documentos de la Cita Actual (Side) */}
            <aside className="space-y-6">
              <section className="rounded-2xl border border-divider bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-bold text-text-primary">Documentos de la Cita</h2>
                  {linkedEncounter && (
                    <ClinicalDocumentUploader patientId={snapshot.patient.id} uploadedBy={professional.id} encounterId={linkedEncounter.id} />
                  )}
                </div>
                {!linkedEncounter && <p className="text-xs text-text-secondary mb-4">Inicia la consulta para poder adjuntar documentos a esta cita.</p>}
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
