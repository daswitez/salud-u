import { redirect } from "next/navigation";

import { requireClinicalRole } from "@/lib/demo-session";

export default async function MedicalInitialHistoryPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");

  // La ficha actual incluye el cuestionario inicial con los permisos clínicos vigentes.
  redirect(`/medico/pacientes/${patientId}`);
}
