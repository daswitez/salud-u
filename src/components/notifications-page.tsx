import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationInbox } from "@/components/notification-inbox";
import { PageIntro } from "@/components/ux-primitives";
import { requireRole, type AppRole } from "@/lib/session";

export async function NotificationsPage({ role }: { role: AppRole }) {
  const session = await requireRole(role);
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role={role} clinicalRole={session.clinicalRole} active="notifications" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role={role} clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-4xl p-5 sm:p-8"><PageIntro eyebrow="TU BANDEJA" title="Mis avisos" description="Consulta las novedades y los recordatorios de tus citas. Solo tú puedes ver y marcar tus avisos." secondaryAction={{ href: "/perfil#notification-preferences-title", label: "Configurar recordatorios" }} /><NotificationInbox /></div></main></div>;
}
