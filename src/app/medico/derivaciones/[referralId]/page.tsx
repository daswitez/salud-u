import { redirect } from "next/navigation";

import { requireClinicalRole } from "@/lib/demo-session";

export default async function MedicalReferralContextPage({ params }: { params: Promise<{ referralId: string }> }) {
  await params;
  await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");

  redirect("/medico/agenda");
}
