import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AdministrativeInitialHistoryPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="students" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" name="Administración" clinicalRole="ADMINISTRATIVE" /><div className="mx-auto max-w-3xl p-5 sm:p-8"><Link href={`/administrativo/estudiantes/${patientId}`} className="text-sm font-semibold text-primary hover:underline">← Registro administrativo</Link><section className="mt-7 rounded-2xl border border-divider bg-surface p-6"><p className="text-sm font-semibold tracking-wide text-primary">SEPARACIÓN DE FUNCIONES</p><h1 className="mt-2 text-3xl font-bold text-text-primary">Historia clínica protegida</h1><p className="mt-3 leading-7 text-text-secondary">La admisión crea la historia clínica base automáticamente, pero Administración no puede capturar ni consultar antecedentes, diagnósticos, documentos o notas clínicas. Esos datos se registran únicamente durante una atención por personal médico autorizado.</p><Link href={`/administrativo/check-in?patientId=${patientId}`} className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">Gestionar solicitud o cita</Link></section></div></main></div>;
}
