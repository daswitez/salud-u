"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MOCK_MEDICAL_AGENDA } from "@/lib/mock-clinic";
import { MOCK_USERS } from "@/lib/mock-users";

export default function MedicalAgendaDetailPage() {
  const params = useParams<{ id: string }>();
  const doctor = MOCK_USERS.find((user) => user.role === "medico")!;
  const item = MOCK_MEDICAL_AGENDA.find((agendaItem) => agendaItem.id === params.id && agendaItem.doctorId === "MED-001");
  if (!item || item.kind !== "APPOINTMENT") return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="schedule" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={doctor.name} /><div className="mx-auto max-w-3xl p-5 sm:p-8"><Link href="/medico/agenda" className="text-sm font-semibold text-primary hover:underline">← Volver a mi agenda</Link><section className="mt-6 rounded-2xl border border-error-container bg-error-container p-6"><h1 className="text-2xl font-bold text-text-primary">Detalle no autorizado</h1><p className="mt-2 text-sm text-text-secondary">Solo puedes abrir citas asignadas a tu propia agenda.</p></section></div></main></div>;
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="schedule" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={doctor.name} /><div className="mx-auto max-w-3xl p-5 sm:p-8"><Link href="/medico/agenda" className="text-sm font-semibold text-primary hover:underline">← Volver a mi agenda</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-secondary">DETALLE AUTORIZADO</p><h1 className="mt-1 text-3xl font-bold text-text-primary">{item.title}</h1><p className="mt-2 text-text-secondary">Cita asignada a tu agenda médica.</p></header><section className="mt-7 rounded-2xl border border-divider bg-surface p-6"><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-text-secondary">Paciente</dt><dd className="mt-1 font-semibold text-text-primary">{item.patientName ?? "Paciente asignado"}</dd></div><div><dt className="text-sm text-text-secondary">Fecha</dt><dd className="mt-1 font-semibold text-text-primary">{item.weekday}</dd></div><div><dt className="text-sm text-text-secondary">Horario</dt><dd className="mt-1 font-semibold text-text-primary">{item.startTime}–{item.endTime}</dd></div><div><dt className="text-sm text-text-secondary">Modalidad</dt><dd className="mt-1 font-semibold text-text-primary">{item.modality}</dd></div><div><dt className="text-sm text-text-secondary">Estado</dt><dd className="mt-1 font-semibold text-text-primary">{item.status}</dd></div></dl><p className="mt-7 rounded-xl bg-surface-secondary p-4 text-sm leading-6 text-text-secondary">El contexto detallado del paciente se habilita desde la cola cuando existe una llegada registrada y relación asistencial activa.</p></section></div></main></div>;
}
