import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MedicalPatientRecord } from "@/components/medical-patient-record";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function PatientClinicalRecordPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="patients" clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} /><div className="mx-auto max-w-7xl p-5 sm:p-8"><MedicalPatientRecord patientId={patientId} clinicalRole={session.clinicalRole as "REVIEW_DOCTOR" | "SPECIALIST"} /></div></main></div>;
}
