import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MedicalPatientList } from "@/components/medical-patient-list";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function MedicalPatientsPage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="patients" clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} /><div className="mx-auto max-w-6xl p-5 sm:p-8"><header className="mb-8"><p className="text-sm font-semibold tracking-wide text-primary">MIS PACIENTES</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Pacientes con citas asignadas</h1><p className="mt-2 text-text-secondary">Aparecen automáticamente cuando una solicitud se asigna a uno de tus cupos.</p></header><MedicalPatientList /></div></main></div>;
}
