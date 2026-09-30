import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { ClinicalReportBuilder } from "@/components/clinical-report-builder";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function AdminReportsPage() {
  const session = await requireClinicalRole("ADMINISTRATIVE");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="reports" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-7xl p-5 sm:p-8"><ClinicalReportBuilder scope="administrative" /></div></main></div>;
}
