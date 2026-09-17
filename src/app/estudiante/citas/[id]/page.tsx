"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/student-shell";
import { cancelInitialAppointment, getClinicalInitialAppointment } from "@/lib/demo-booking-store";
import type { Appointment, AppointmentStatus } from "@/lib/ui-contracts";

const labels: Record<AppointmentStatus, string> = { REQUESTED: "Solicitud registrada", SCHEDULED: "Cita confirmada", CANCELLED: "Cancelada", NO_SHOW: "No asistió", ATTENDED: "Atendida" };
const styles: Record<AppointmentStatus, string> = { REQUESTED: "bg-warning-container text-warning", SCHEDULED: "bg-primary-container text-primary", CANCELLED: "bg-error-container text-error", NO_SHOW: "bg-surface-secondary text-text-secondary", ATTENDED: "bg-success-container text-success" };

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [appointment, setAppointment] = useState<Appointment>();
  useEffect(() => { const timer = window.setTimeout(() => setAppointment(getClinicalInitialAppointment(params.id)), 0); return () => window.clearTimeout(timer); }, [params.id]);
  if (!appointment) return <StudentShell active="appointments"><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><h1 className="text-2xl font-bold text-text-primary">Cita no encontrada</h1><Link href="/estudiante/citas" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">← Mis citas</Link></main></StudentShell>;
  const cancellable = appointment.status === "REQUESTED" || appointment.status === "SCHEDULED";
  function cancel() { const result = cancelInitialAppointment(appointment!.id); if (result.ok) setAppointment(result.data); }
  return <StudentShell active="appointments"><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><Link href="/estudiante/citas" className="text-sm font-semibold text-primary hover:underline">← Mis citas</Link>{searchParams.get("nueva") && <p className="mt-5 rounded-xl bg-success-container p-4 text-sm text-success"><span className="font-semibold">Solicitud registrada.</span> Administración revisará y asignará un cupo disponible.</p>}<article className="mt-5 rounded-2xl border border-divider bg-surface p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-primary">CITA DE REVISIÓN ESTUDIANTIL</p><h1 className="mt-1 text-3xl font-bold text-text-primary">{labels[appointment.status]}</h1></div><span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${styles[appointment.status]}`}>{labels[appointment.status]}</span></div><dl className="mt-7 grid gap-5 border-y border-divider py-6 text-sm sm:grid-cols-2"><div><dt className="text-text-secondary">Tipo de atención</dt><dd className="mt-1 font-semibold text-text-primary">Revisión estudiantil inicial</dd></div>{appointment.status === "REQUESTED" ? <div><dt className="text-text-secondary">Cupo</dt><dd className="mt-1 font-semibold text-text-primary">Pendiente de asignación</dd></div> : <div><dt className="text-text-secondary">Fecha y hora</dt><dd className="mt-1 font-semibold text-text-primary">{new Date(appointment.scheduledFor).toLocaleString("es-BO", { dateStyle: "full", timeStyle: "short" })}</dd></div>}</dl>{appointment.status === "SCHEDULED" && <p className="mt-6 rounded-xl bg-primary-container p-4 text-sm leading-6 text-primary">Asiste a la fecha asignada. El personal registrará el inicio de tu atención clínica en la plataforma.</p>}{appointment.status === "ATTENDED" && <p className="mt-6 rounded-xl bg-success-container p-4 text-sm text-success">La atención fue cerrada y quedó registrada en tu historial clínico.</p>}{appointment.status === "NO_SHOW" && <p className="mt-6 rounded-xl bg-surface-secondary p-4 text-sm text-text-secondary">Se registró inasistencia. Puedes solicitar una nueva cita cuando corresponda.</p>}{cancellable && <button onClick={cancel} className="mt-7 rounded-lg border border-error px-5 py-2.5 text-sm font-semibold text-error hover:bg-error-container">Cancelar cita</button>}</article></main></StudentShell>;
}
