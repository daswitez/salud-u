import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function DoctorTeleconsultationPage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" clinicalRole={session.clinicalRole} active="tele" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-3xl p-5 sm:p-8"><Link href="/medico" className="text-sm font-semibold text-primary hover:underline">← Inicio médico</Link><section className="mt-6 rounded-2xl border border-divider bg-surface p-6 sm:p-8"><p className="text-sm font-semibold tracking-wide text-secondary">MÓDULO FUTURO</p><h1 className="mt-2 text-3xl font-bold text-text-primary">Teleconsulta</h1><p className="mt-4 leading-7 text-text-secondary">La teleconsulta se mantiene visible como una capacidad futura, pero su proceso clínico, consentimiento, acceso, registro y seguridad aún no están definidos. Por eso no se habilitan salas ni acciones de atención desde esta versión.</p><p className="mt-5 rounded-xl bg-info-container p-4 text-sm leading-6 text-info">Cuando se defina el flujo, deberá integrarse a la historia clínica y respetar los mismos permisos de paciente, documento y derivación.</p></section></div></main></div>;
}
