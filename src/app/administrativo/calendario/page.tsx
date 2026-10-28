import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SchedulingSetup } from "@/components/scheduling-setup";
import { getSession } from "@/lib/session";

export default async function AcademicSetupPage() {
  const session = await getSession();
  if (!session) redirect("/iniciar-sesion?error=session");
  if (session.clinicalRole !== "ADMINISTRATIVE") return <main className="mx-auto max-w-3xl space-y-5 p-8"><h1 className="text-3xl font-bold">Acceso restringido</h1><p role="alert">Solo Administración puede configurar el calendario y los valores iniciales.</p><Link href="/perfil" className="font-semibold text-primary">Volver a mi perfil</Link></main>;
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" clinicalRole={session.clinicalRole} active="academic-setup" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-7xl p-5 sm:p-8"><SchedulingSetup /></div></main></div>;
}
