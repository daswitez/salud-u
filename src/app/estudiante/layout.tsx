import { StudentConsentGate } from "@/components/student-consent-gate";
import { NotificationProvider } from "@/components/notification-provider";
import { SessionNameProvider } from "@/components/session-name";
import { requireClinicalRole } from "@/lib/session";

export default async function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireClinicalRole("STUDENT");
  return <NotificationProvider key={session.id}><SessionNameProvider name={session.name}><StudentConsentGate>{children}</StudentConsentGate></SessionNameProvider></NotificationProvider>;
}
