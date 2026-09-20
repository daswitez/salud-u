import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MedicalDashboard } from "@/components/medical-dashboard";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function DoctorHomePage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const isSpecialist = session.clinicalRole === "SPECIALIST";
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" clinicalRole={session.clinicalRole} active="home" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-6xl p-5 sm:p-8"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-divider pb-5"><div><p className="text-sm font-semibold text-secondary">{isSpecialist ? "ATENCIÓN ESPECIALIZADA" : "REVISIÓN ESTUDIANTIL"}</p><h1 className="mt-1 text-2xl font-bold text-text-primary">Buen día, {session.name}</h1><p className="mt-1 text-sm text-text-secondary">Tu agenda y pacientes se cargan desde Supabase.</p></div><div className="flex flex-wrap gap-3"><Link href="/medico/pacientes" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:bg-primary-hover">Mis pacientes</Link><Link href="/medico/agenda" className="rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-primary-container">Ver agenda</Link></div></header><MedicalDashboard isSpecialist={isSpecialist} /></div></main></div>;
}
