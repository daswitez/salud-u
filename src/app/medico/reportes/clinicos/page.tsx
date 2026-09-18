import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";
import { AdvancedReportsClient } from "@/app/administrativo/reportes/clinicos/advanced-reports-client";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function MedicoAdvancedClinicalReportsPage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const state = getClinicalDemoState();
  const professional = state.professionals.find((p) => p.fullName === session.name);
  if (!professional) notFound();

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="medico" active="reports" clinicalRole={session.clinicalRole} />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} />
        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          <div className="mb-6 flex gap-4">
            <Link href="/medico/reportes" className="text-sm font-semibold text-text-secondary hover:text-primary">Reportes rápidos</Link>
            <span className="text-text-disabled">/</span>
            <span className="text-sm font-bold text-primary">Reportes clínicos avanzados</span>
          </div>
          <AdvancedReportsClient 
            state={state} 
            userName={session.name} 
            fixedDoctorId={professional.id}
          />
        </div>
      </main>
    </div>
  );
}
