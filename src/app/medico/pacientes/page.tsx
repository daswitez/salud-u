import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";
import { PacientesClient } from "./pacientes-client";

export default async function MedicalPatientsPage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const state = getClinicalDemoState();
  const professional = state.professionals.find((item) => item.fullName === session.name);

  if (!professional) return null;

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="medico" active="patients" clinicalRole={session.clinicalRole} />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} />
        <div className="mx-auto max-w-6xl p-5 sm:p-8">
          <header className="mb-8">
            <p className="text-sm font-semibold tracking-wide text-primary">MIS PACIENTES</p>
            <h1 className="mt-1 text-3xl font-bold text-text-primary">Historias clínicas autorizadas</h1>
            <p className="mt-2 text-text-secondary">Listado y búsqueda de pacientes con atenciones o derivaciones relacionadas a tu cuenta.</p>
          </header>
          
          <PacientesClient doctorId={professional.id} doctorRole={professional.role} />
          
        </div>
      </main>
    </div>
  );
}
