import { requireClinicalRole } from "@/lib/demo-session";

export default async function AdministrativeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireClinicalRole("ADMINISTRATIVE");
  return children;
}
