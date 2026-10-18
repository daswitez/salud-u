import { requireClinicalRole } from "@/lib/session";

export default async function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireClinicalRole("STUDENT");
  return children;
}
