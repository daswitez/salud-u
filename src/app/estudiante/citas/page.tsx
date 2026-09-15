"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/student-shell";
import { getAppointments } from "@/lib/demo-booking-store";
import { INITIAL_APPOINTMENTS, type AppointmentStatus, type MockAppointment } from "@/lib/mock-clinic";

type Filter = "future" | "completed" | "cancelled";
const filters: { id: Filter; label: string; status: AppointmentStatus }[] = [{ id: "future", label: "Próximas", status: "CONFIRMED" }, { id: "completed", label: "Completadas", status: "COMPLETED" }, { id: "cancelled", label: "Canceladas", status: "CANCELLED" }];
const statusLabel: Record<AppointmentStatus, string> = { CONFIRMED: "Confirmada", COMPLETED: "Completada", CANCELLED: "Cancelada" };
const statusStyle: Record<AppointmentStatus, string> = { CONFIRMED: "bg-secondary-container text-secondary", COMPLETED: "bg-success-container text-success", CANCELLED: "bg-error-container text-error" };

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<MockAppointment[]>(INITIAL_APPOINTMENTS);
  const [filter, setFilter] = useState<Filter>("future");
  useEffect(() => {
    const timer = window.setTimeout(() => setAppointments(getAppointments()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const current = filters.find((item) => item.id === filter)!;
  const visible = appointments.filter((appointment) => appointment.status === current.status);
  return <StudentShell active="appointments"><main className="mx-auto max-w-4xl px-5 py-8 sm:px-8"><p className="text-sm font-semibold tracking-wide text-primary">MIS CITAS</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Tu historial de atención</h1><p className="mt-2 text-text-secondary">Consulta el estado, detalle e instrucciones de cada atención.</p><div className="mt-7 flex flex-wrap gap-2 border-b border-divider pb-4" role="tablist" aria-label="Estado de las citas">{filters.map((item) => <button key={item.id} role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${filter === item.id ? "bg-primary text-on-primary" : "text-text-secondary hover:bg-surface-secondary"}`}>{item.label} <span className="ml-1 opacity-80">{appointments.filter((appointment) => appointment.status === item.status).length}</span></button>)}</div><section className="mt-6 space-y-4" aria-live="polite">{visible.length ? visible.map((appointment) => <article key={appointment.id} className="flex flex-col gap-4 rounded-2xl border border-divider bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-text-primary">{appointment.specialty}</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[appointment.status]}`}>{statusLabel[appointment.status]}</span></div><p className="mt-2 text-sm font-medium text-text-primary">{appointment.weekday} · {appointment.time} · {appointment.modality}</p><p className="mt-1 text-sm text-text-secondary">{appointment.doctor}</p></div><Link href={`/estudiante/citas/${appointment.id}`} className="shrink-0 rounded-lg border border-primary px-4 py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary-container">Ver detalle</Link></article>) : <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><h2 className="text-lg font-bold text-text-primary">No hay citas {current.label.toLowerCase()}</h2><p className="mt-2 text-sm text-text-secondary">Cuando tengas una atención en este estado aparecerá aquí.</p>{filter === "future" && <Link href="/estudiante/buscar" className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">Buscar atención</Link>}</div>}</section></main></StudentShell>;
}
