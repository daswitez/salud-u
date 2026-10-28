import { NotificationProvider } from "@/components/notification-provider";
import { getSession, hasClinicalAuthority } from "@/lib/session";
import { redirect } from "next/navigation";
import { SessionNameProvider } from "@/components/session-name";

export default async function AdministrativeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/iniciar-sesion?error=session");
  if (!["ADMINISTRATIVE", "REPORTING_OFFICER", "AUDITOR"].includes(session.clinicalRole) && !await hasClinicalAuthority("AUDITOR")) redirect(`/${session.role}`);
  return <NotificationProvider key={session.id}><SessionNameProvider name={session.name}>{children}</SessionNameProvider></NotificationProvider>;
}
