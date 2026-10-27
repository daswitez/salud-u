import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { VaccinationCard } from "@/components/vaccination-card";
import { requireClinicalRole } from "@/lib/session";

export default async function StudentVaccinationPage() {
  const session = await requireClinicalRole("STUDENT");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="estudiante" active="vaccines" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="estudiante" name={session.name} /><div className="mx-auto max-w-5xl p-5 sm:p-8"><VaccinationCard /></div></main></div>;
}
