import { requireClinicalRole } from "@/lib/session";

export default async function AdministrativeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireClinicalRole("ADMINISTRATIVE", "REPORTING_OFFICER", "AUDITOR");
  return children;
}
