import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { ClinicalIntakeEditor } from "@/components/clinical-intake-editor";
import { getClinicalDemoState, getPatientClinicalSnapshot } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function MedicalInitialHistoryPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const state = getClinicalDemoState();
  const professional = state.professionals.find((item) => item.fullName === session.name);
  const snapshot = getPatientClinicalSnapshot(patientId);
  if (!snapshot.patient || !professional) notFound();
  const related = snapshot.encounters.some((item) => item.doctorId === professional.id) || snapshot.referrals.some((item) => item.requestedBy === professional.id || item.assignedDoctorId === professional.id) || snapshot.appointments.some((item) => item.assignedDoctorId === professional.id);
  if (!related) notFound();
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="patients" clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} /><div className="mx-auto max-w-5xl p-5 sm:p-8"><Link href={"/medico/pacientes/" + patientId} className="text-sm font-semibold text-primary hover:underline">← Ficha de paciente</Link><div className="mt-6"><ClinicalIntakeEditor patientId={patientId} actorId={professional.id} /></div></div></main></div>;
}
