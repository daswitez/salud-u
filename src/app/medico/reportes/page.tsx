import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";
import { ReportsView } from "@/components/reports-view";
import { notFound } from "next/navigation";

export default async function MedicoReportsPage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const state = getClinicalDemoState();
  const professional = state.professionals.find((p) => p.fullName === session.name);
  if (!professional) notFound();

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="medico" active="reports" clinicalRole={session.clinicalRole} />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} />
        <div className="mx-auto max-w-6xl p-5 sm:p-8">
          <ReportsView 
            role="CLINICAL" 
            doctorId={professional.id} 
            isSpecialist={session.clinicalRole === "SPECIALIST"} 
            state={state} 
          />
        </div>
      </main>
    </div>
  );
}
