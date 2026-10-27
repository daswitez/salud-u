import { SessionNameProvider } from "@/components/session-name";
import { requireClinicalRole } from "@/lib/session";

export default async function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireClinicalRole("STUDENT");
  return <SessionNameProvider name={session.name}>{children}</SessionNameProvider>;
}
