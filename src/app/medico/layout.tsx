import { requireClinicalRole } from "@/lib/session";

export default async function MedicalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  return children;
}
