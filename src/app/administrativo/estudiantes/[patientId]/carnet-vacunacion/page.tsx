import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { VaccinationCard } from "@/components/vaccination-card";
import { getSession } from "@/lib/session";

export default async function AdministrativeVaccinationCardPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const session = await getSession();
  if (!session) redirect("/iniciar-sesion?error=session");
  if (session.clinicalRole !== "ADMINISTRATIVE") return <main className="mx-auto max-w-3xl space-y-5 p-8"><h1 className="text-3xl font-bold">Acceso restringido</h1><p role="alert">No tienes permiso para consultar carnets de vacunación.</p><Link href="/perfil" className="font-semibold text-primary">Volver a mi perfil</Link></main>;
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="students" clinicalRole="ADMINISTRATIVE" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole="ADMINISTRATIVE" name={session.name} /><div className="mx-auto max-w-5xl p-5 sm:p-8"><Link href={`/administrativo/estudiantes/${patientId}`} className="text-sm font-semibold text-primary hover:underline print:hidden">← Ficha del estudiante</Link><div className="mt-6"><VaccinationCard patientId={patientId} /></div></div></main></div>;
}
