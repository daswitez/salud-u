import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { ResearchExport } from "@/components/research-export";
import { getSession } from "@/lib/session";

export default async function ResearchExportPage() {
  const session = await getSession();
  if (!session) redirect("/iniciar-sesion?error=session");
  if (!["ADMINISTRATIVE", "REPORTING_OFFICER"].includes(session.clinicalRole)) return <main className="mx-auto max-w-3xl space-y-5 p-8"><h1 className="text-3xl font-bold">Acceso restringido</h1><p role="alert">No tienes permiso para exportar datos de investigación.</p><Link href="/perfil" className="font-semibold text-primary">Volver a mi perfil</Link></main>;
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active={session.clinicalRole === "REPORTING_OFFICER" ? "research" : "reports"} clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-5xl p-5 sm:p-8"><Link href="/administrativo/reportes" className="text-sm font-semibold text-primary hover:underline">← Reportes</Link><div className="mt-6"><ResearchExport /></div></div></main></div>;
}
