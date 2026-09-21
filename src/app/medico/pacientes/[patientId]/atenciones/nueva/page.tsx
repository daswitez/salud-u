import { redirect } from "next/navigation";

import { requireClinicalRole } from "@/lib/demo-session";

export default async function NewPatientEncounterPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");

  // Las atenciones sólo se abren desde una cita asignada, nunca como borrador local.
  redirect(`/medico/pacientes/${patientId}`);
}
