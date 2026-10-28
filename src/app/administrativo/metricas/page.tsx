import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SchedulingMetrics } from "@/components/scheduling-metrics";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function SchedulingMetricsPage() {
  const session = await getSession();
  if (!session) redirect("/iniciar-sesion?error=session");
  if (session.clinicalRole !== "ADMINISTRATIVE") return <main className="mx-auto max-w-3xl space-y-5 p-8"><h1 className="text-3xl font-bold">Acceso restringido</h1><p role="alert">Solo Administración puede consultar las métricas de la agenda.</p><Link href="/perfil" className="font-semibold text-primary">Volver a mi perfil</Link></main>;
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" clinicalRole={session.clinicalRole} active="metrics" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-7xl p-5 sm:p-8"><SchedulingMetrics /></div></main></div>;
}
