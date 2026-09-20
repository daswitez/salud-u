import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MedicalReviewWorkflow } from "@/components/medical-review-workflow";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function MedicalAppointmentContextPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const session = await requireClinicalRole("REVIEW_DOCTOR");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="patients" clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} /><div className="mx-auto max-w-5xl p-5 sm:p-8"><MedicalReviewWorkflow appointmentId={appointmentId} /></div></main></div>;
}
