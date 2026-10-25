import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { ClinicalBackgroundPanel } from "@/components/clinical-background-panel";
import { requireClinicalRole } from "@/lib/session";

export default async function ClinicalBackgroundPage({ params, searchParams }: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ encounterId?: string }>;
}) {
  const { patientId } = await params;
  const { encounterId } = await searchParams;
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="patients" clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-5xl p-5 sm:p-8"><ClinicalBackgroundPanel key={`${patientId}-${encounterId ?? "global"}`} patientId={patientId} encounterId={encounterId} /></div></main></div>;
}
