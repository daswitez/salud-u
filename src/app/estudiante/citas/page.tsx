"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/student-shell";
import { getInitialAppointmentsForPatient } from "@/lib/demo-booking-store";
import type { Appointment, AppointmentStatus } from "@/lib/ui-contracts";

const labels: Record<AppointmentStatus, string> = { REQUESTED: "Solicitud registrada", SCHEDULED: "Cita confirmada", CANCELLED: "Cancelada", NO_SHOW: "No asistió", ATTENDED: "Atendida" };
const styles: Record<AppointmentStatus, string> = { REQUESTED: "bg-warning-container text-warning", SCHEDULED: "bg-primary-container text-primary", CANCELLED: "bg-error-container text-error", NO_SHOW: "bg-surface-secondary text-text-secondary", ATTENDED: "bg-success-container text-success" };

export default function StudentAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  useEffect(() => { const timer = window.setTimeout(() => setAppointments(getInitialAppointmentsForPatient("PAT-2026-001")), 0); return () => window.clearTimeout(timer); }, []);
  return <StudentShell active="appointments"><main className="mx-auto max-w-4xl px-5 py-8 sm:px-8"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-primary">MIS CITAS</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Atención de revisión</h1><p className="mt-2 text-text-secondary">Consulta el estado de tus solicitudes y citas confirmadas.</p></div><Link href="/estudiante/buscar" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Solicitar cita</Link></header><section className="mt-7 space-y-4">{appointments.map((appointment) => <article key={appointment.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-divider bg-surface p-5 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-text-primary">{appointment.type === "INITIAL" ? "Revisión estudiantil" : "Atención por derivación"}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[appointment.status]}`}>{labels[appointment.status]}</span></div><p className="mt-2 text-sm text-text-secondary">{appointment.status === "REQUESTED" ? "Pendiente de asignación de cupo por Administración." : new Date(appointment.scheduledFor).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })}</p></div><Link href={`/estudiante/citas/${appointment.id}`} className="rounded-lg border border-primary px-4 py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary-container">Ver detalle</Link></article>)}{!appointments.length && <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><p className="text-text-secondary">Aún no tienes citas registradas.</p></div>}</section></main></StudentShell>;
}
