import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MedicalScheduleManager } from "@/components/medical-schedule-manager";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function MedicalSchedulePage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const professional = getClinicalDemoState().professionals.find((item) => item.fullName === session.name);
  if (!professional) return null;
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" clinicalRole={session.clinicalRole} active="availability" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-6xl p-5 sm:p-8"><MedicalScheduleManager doctorId={professional.id} isReviewDoctor={professional.role === "REVIEW_DOCTOR"} specialty={professional.specialty} /></div></main></div>;
}
