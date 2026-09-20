"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StudentShell } from "@/components/student-shell";
import { apiJson } from "@/lib/api/client";

type Request = { id: string; status: "PENDING" | "ASSIGNED" | "CANCELLED"; appointment: { id: string; status: string; scheduled_for: string; doctorName: string; endsAt: string | null } | null };
const labels: Record<Request["status"], string> = { PENDING: "Solicitud registrada", ASSIGNED: "Cita confirmada", CANCELLED: "Cancelada" };

export default function StudentAppointmentsPage() {
  const [requests, setRequests] = useState<Request[]>([]); const [error, setError] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => { apiJson<Request[]>("/api/appointment-requests").then(setRequests).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar las citas.")); }, 0); return () => window.clearTimeout(timer); }, []);
  return <StudentShell active="appointments"><main className="mx-auto max-w-4xl px-5 py-8 sm:px-8"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-primary">MIS CITAS</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Atención de revisión</h1><p className="mt-2 text-text-secondary">Consulta el profesional, horario y estado de cada atención.</p></div><Link href="/estudiante/reservar" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Solicitar cita</Link></header>{error && <p role="alert" className="mt-5 rounded-xl bg-error-container p-4 text-sm text-error">{error}</p>}<section className="mt-7 space-y-4">{requests.map((request) => <article key={request.id} className="rounded-2xl border border-divider bg-surface p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-text-primary">Revisión estudiantil</h2><span className="rounded-full bg-primary-container px-2.5 py-1 text-xs font-semibold text-primary">{labels[request.status]}</span></div>{request.appointment ? <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-text-secondary">Médico</dt><dd className="mt-1 font-semibold text-text-primary">{request.appointment.doctorName}</dd></div><div><dt className="text-text-secondary">Horario</dt><dd className="mt-1 font-semibold text-text-primary">{new Date(request.appointment.scheduled_for).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })}</dd></div></dl> : <p className="mt-2 text-sm text-text-secondary">Pendiente de asignación de cupo por Administración.</p>}</div><Link href={`/estudiante/citas/${request.id}`} className="rounded-lg border border-primary px-4 py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary-container">Ver detalle</Link></div></article>)}{!requests.length && <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><p className="text-text-secondary">Aún no tienes solicitudes registradas.</p></div>}</section></main></StudentShell>;
}
