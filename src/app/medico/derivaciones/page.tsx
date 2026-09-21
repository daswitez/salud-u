import { redirect } from "next/navigation";

import { requireClinicalRole } from "@/lib/demo-session";

export default async function MedicalReferralsPage() {
  await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");

  // La derivación se atiende desde la cita especializada asignada.
  redirect("/medico/agenda");
}
