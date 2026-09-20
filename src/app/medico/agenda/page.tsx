import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MedicalAgenda } from "@/components/medical-agenda";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function DoctorAgendaPage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" clinicalRole={session.clinicalRole} active="schedule" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-6xl p-5 sm:p-8"><Link href="/medico" className="text-sm font-semibold text-primary hover:underline">← Inicio</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-secondary">ÁREA MÉDICA</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Mi agenda</h1><p className="mt-2 text-text-secondary">Citas reales, con paciente, horario, especialidad y estado.</p></header><MedicalAgenda /></div></main></div>;
}
