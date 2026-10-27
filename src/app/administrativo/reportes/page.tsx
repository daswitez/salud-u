import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { ClinicalReportBuilder } from "@/components/clinical-report-builder";
import { requireClinicalRole } from "@/lib/session";

export default async function AdminReportsPage() {
  const session = await requireClinicalRole("ADMINISTRATIVE", "REPORTING_OFFICER");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="reports" clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-7xl p-5 sm:p-8"><Link href="/administrativo/reportes/cumplimiento" className="mb-5 block font-semibold text-primary">Consultar cumplimiento institucional →</Link><Link href="/administrativo/reportes/vacunacion" className="mb-5 block font-semibold text-primary">Consultar cobertura de vacunación →</Link><Link href="/administrativo/reportes/investigacion" className="mb-5 block font-semibold text-primary">Exportar datos seudonimizados para investigación →</Link><ClinicalReportBuilder scope="administrative" /></div></main></div>;
}
