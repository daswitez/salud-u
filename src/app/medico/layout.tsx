import { NotificationProvider } from "@/components/notification-provider";
import { requireClinicalRole } from "@/lib/session";

export default async function MedicalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  return <NotificationProvider key={session.id}>{children}</NotificationProvider>;
}
