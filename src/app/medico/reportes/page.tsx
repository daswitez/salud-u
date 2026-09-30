import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { ClinicalReportBuilder } from "@/components/clinical-report-builder";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function MedicoReportsPage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="reports" clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-7xl p-5 sm:p-8"><ClinicalReportBuilder scope="medical" /></div></main></div>;
}
