"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { ClinicalIntakeEditor } from "@/components/clinical-intake-editor";

export default function AdministrativeInitialHistoryPage() {
  const params = useParams<{ patientId: string }>();
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="students" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" name="María Fernández" clinicalRole="ADMINISTRATIVE" /><div className="mx-auto max-w-5xl p-5 sm:p-8"><Link href="/administrativo/estudiantes" className="text-sm font-semibold text-primary hover:underline">← Estudiantes</Link><header className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-primary">ADMISIÓN E HISTORIA INICIAL</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Cuestionario de ingreso</h1><p className="mt-2 text-text-secondary">Registra los datos clínicos base y adjunta estudios, fotografías o escaneos antes de reservar la cita.</p></div><Link href={"/administrativo/check-in?patientId=" + params.patientId} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">Continuar a reserva</Link></header><div className="mt-7"><ClinicalIntakeEditor patientId={params.patientId} actorId="ADMIN-001" /></div></div></main></div>;
}
