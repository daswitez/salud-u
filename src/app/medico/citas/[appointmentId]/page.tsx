import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MedicalReviewWorkflow } from "@/components/medical-review-workflow";
import { MedicalEncounterEntry } from "@/components/medical-encounter-entry";
import { ReviewEncounterForm } from "@/components/review-encounter-form";
import { requireClinicalRole } from "@/lib/session";

export default async function MedicalAppointmentContextPage({ params, searchParams }: { params: Promise<{ appointmentId: string }>; searchParams: Promise<{ ficha?: string }> }) {
  const { appointmentId } = await params;
  const { ficha } = await searchParams;
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="patients" clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} /><div className="mx-auto max-w-5xl p-5 sm:p-8">{ficha === "1" ? session.clinicalRole === "REVIEW_DOCTOR" ? <ReviewEncounterForm key={appointmentId} appointmentId={appointmentId} /> : <MedicalReviewWorkflow appointmentId={appointmentId} /> : <MedicalEncounterEntry key={appointmentId} appointmentId={appointmentId} />}</div></main></div>;
}
