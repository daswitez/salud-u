import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MedicalScheduleManager } from "@/components/medical-schedule-manager";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function MedicalSchedulePage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" clinicalRole={session.clinicalRole} active="availability" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-4xl p-5 sm:p-8"><MedicalScheduleManager isReviewDoctor={session.clinicalRole === "REVIEW_DOCTOR"} /></div></main></div>;
}
