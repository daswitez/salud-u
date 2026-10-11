import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MedicalAgenda } from "@/components/medical-agenda";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function DoctorAgendaPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const params = await searchParams;
  const initialView = params.vista === "atendidas" ? "ATTENDED" as const : params.vista === "todas" ? "ALL" as const : "UPCOMING" as const;
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" clinicalRole={session.clinicalRole} active="schedule" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-6xl p-5 sm:p-8"><Link href="/medico" className="text-sm font-semibold text-primary hover:underline">← Inicio</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-secondary">ÁREA MÉDICA</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Mi agenda</h1><p className="mt-2 text-text-secondary">Consulta lo pendiente y vuelve a abrir el detalle completo de las atenciones realizadas.</p></header><MedicalAgenda initialView={initialView} /></div></main></div>;
}
