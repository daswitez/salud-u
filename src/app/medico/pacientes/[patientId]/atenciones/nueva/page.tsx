import { notFound } from "next/navigation";
import { requireClinicalRole } from "@/lib/demo-session";
import { getPatientClinicalSnapshot, getClinicalDemoState } from "@/lib/demo-clinical-store";
import { ClinicalForm } from "@/components/clinical-form";

export default async function NewPatientEncounterPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const state = getClinicalDemoState();
  const professional = state.professionals.find((item) => item.fullName === session.name);
  if (!professional) notFound();

  const snapshot = getPatientClinicalSnapshot(patientId);
  if (!snapshot.patient || !snapshot.history) notFound();

  return (
    <ClinicalForm 
      patientId={patientId}
      historyId={snapshot.history.id}
      doctorId={professional.id}
      doctorName={professional.fullName}
      clinicalRole={session.clinicalRole}
      snapshot={snapshot}
    />
  );
}
