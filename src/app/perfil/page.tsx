import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { ProfileForms } from "@/components/profile-forms";
import { SignOutButton } from "@/components/sign-out-button";
import { getSession } from "@/lib/session";

type ProfilePageProps = { searchParams: Promise<{ success?: string; error?: string; rol?: string }> };

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/iniciar-sesion?error=session");
  const success = params.success === "profile-updated" ? "Los cambios se guardaron. Inicia sesión nuevamente para continuar." : "";
  const roleLabel = session.clinicalRole === "REVIEW_DOCTOR" ? "Médico de revisión" : session.clinicalRole === "SPECIALIST" ? "Médico especialista" : session.role === "administrativo" ? "Administrativo" : "Estudiante";

  return <div className="min-h-screen bg-background md:flex"><AppSidebar role={session.role} clinicalRole={session.clinicalRole} active="profile" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role={session.role} clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><Link href={`/${session.role}`} className="inline-flex text-sm font-semibold text-primary hover:underline">← Volver a mi inicio</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-primary">PERFIL Y PREFERENCIAS</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">Mi cuenta</h1><p className="mt-2 text-text-secondary">Gestiona tus datos, avisos y seguridad de sesión.</p></header>{success && <p role="status" className="mt-6 rounded-lg border border-success bg-success-container px-4 py-3 text-sm font-medium text-success">{success}</p>}<ProfileForms name={session.name} email={session.email} /><section className="mt-5 rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 className="text-lg font-bold text-text-primary">Sesión</h2><p className="mt-1 text-sm text-text-secondary">Tu sesión actual corresponde a: <span className="font-semibold text-text-primary">{roleLabel}</span>.</p><SignOutButton /></section></div></main></div>;
}
