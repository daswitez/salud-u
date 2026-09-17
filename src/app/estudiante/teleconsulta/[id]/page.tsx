import Link from "next/link";
import { StudentShell } from "@/components/student-shell";

export default function TeleconsultationPage() {
  return <StudentShell active="appointments"><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><Link href="/estudiante/citas" className="text-sm font-semibold text-primary hover:underline">← Mis citas</Link><section className="mt-6 rounded-2xl border border-divider bg-surface p-6 sm:p-8"><p className="text-sm font-semibold tracking-wide text-secondary">MÓDULO FUTURO</p><h1 className="mt-2 text-3xl font-bold text-text-primary">Teleconsulta aún no habilitada</h1><p className="mt-4 leading-7 text-text-secondary">La modalidad de teleconsulta no tiene un proceso clínico definido en esta etapa. Esta pantalla no inicia una sala virtual ni procesa información de atención.</p></section></main></StudentShell>;
}
