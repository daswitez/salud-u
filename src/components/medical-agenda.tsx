"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { appointmentStatusClass, appointmentStatusLabel, boliviaDate, formatAppointmentTime, useMedicalAppointments } from "@/components/medical-appointments";
import type { MedicalAppointment } from "@/lib/api/client";

type AgendaView = "UPCOMING" | "ATTENDED" | "ALL";

const views: { key: AgendaView; label: string; description: string }[] = [
  { key: "UPCOMING", label: "Pendientes", description: "Programadas y en espera" },
  { key: "ATTENDED", label: "Atendidas", description: "Historial cerrado" },
  { key: "ALL", label: "Todas", description: "Incluye canceladas e inasistencias" },
];

function matchesView(appointment: MedicalAppointment, view: AgendaView) {
  if (view === "UPCOMING") return appointment.status === "SCHEDULED" || appointment.status === "CHECKED_IN";
  if (view === "ATTENDED") return appointment.status === "ATTENDED";
  return true;
}

export function MedicalAgenda({ initialView = "UPCOMING" }: { initialView?: AgendaView }) {
  const { appointments, loading, error } = useMedicalAppointments();
  const [view, setView] = useState<AgendaView>(initialView);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const counts = useMemo(() => ({
    UPCOMING: appointments.filter((item) => matchesView(item, "UPCOMING")).length,
    ATTENDED: appointments.filter((item) => matchesView(item, "ATTENDED")).length,
    ALL: appointments.length,
  }), [appointments]);

  const visibleAppointments = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es-BO");
    return appointments
      .filter((item) => {
        const date = boliviaDate(item.scheduledFor);
        if (!matchesView(item, view)) return false;
        if (status !== "ALL" && item.status !== status) return false;
        if (from && date < from) return false;
        if (to && date > to) return false;
        if (term && ![item.patient?.fullName ?? "", item.patient?.carnet ?? "", item.patient?.registrationCode ?? "", item.specialty].some((value) => value.toLocaleLowerCase("es-BO").includes(term))) return false;
        return true;
      })
      .sort((first, second) => view === "UPCOMING" ? new Date(first.scheduledFor).getTime() - new Date(second.scheduledFor).getTime() : new Date(second.scheduledFor).getTime() - new Date(first.scheduledFor).getTime());
  }, [appointments, from, query, status, to, view]);

  const filtersActive = Boolean(query || from || to || status !== "ALL");
  function clearFilters() { setQuery(""); setStatus("ALL"); setFrom(""); setTo(""); }

  return (
    <section className="mt-7 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3" role="tablist" aria-label="Vistas de agenda">
        {views.map((item) => {
          const selected = view === item.key;
          return <button key={item.key} type="button" role="tab" aria-selected={selected} onClick={() => { setView(item.key); setStatus("ALL"); }} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-primary bg-primary text-on-primary shadow-sm" : "border-divider bg-surface hover:border-primary-200 hover:bg-primary-container"}`}><span className="flex items-center justify-between gap-3"><span className={`font-bold ${selected ? "text-on-primary" : "text-text-primary"}`}>{item.label}</span><span className={`rounded-full px-2.5 py-1 text-xs font-black ${selected ? "bg-white/15 text-white" : "bg-surface-secondary text-text-secondary"}`}>{loading ? "—" : counts[item.key]}</span></span><span className={`mt-1 block text-xs ${selected ? "text-white/70" : "text-text-secondary"}`}>{item.description}</span></button>;
        })}
      </div>

      <div className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-text-primary">{view === "ATTENDED" ? "Atenciones realizadas" : view === "UPCOMING" ? "Citas por atender" : "Historial de citas"}</h2><p className="mt-1 text-sm text-text-secondary">{view === "ATTENDED" ? "Abre una ficha para consultar evaluación, diagnósticos, indicaciones y archivos asociados." : "Filtra por paciente, especialidad, estado o intervalo de fechas."}</p></div>{filtersActive && <button type="button" onClick={clearFilters} className="rounded-lg px-3 py-2 text-sm font-bold text-primary hover:bg-primary-container">Limpiar filtros</button>}</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="xl:col-span-2"><span className="text-sm font-bold text-text-primary">Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Paciente, carnet, registro o especialidad" className="mt-2 min-h-11 w-full rounded-xl border border-divider bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-100" /></label>
          <label><span className="text-sm font-bold text-text-primary">Desde</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-divider bg-surface px-3 text-sm outline-none focus:border-primary" /></label>
          <label><span className="text-sm font-bold text-text-primary">Hasta</span><input type="date" min={from || undefined} value={to} onChange={(event) => setTo(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-divider bg-surface px-3 text-sm outline-none focus:border-primary" /></label>
          {view === "ALL" && <label><span className="text-sm font-bold text-text-primary">Estado</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-divider bg-surface px-3 text-sm outline-none focus:border-primary"><option value="ALL">Todos</option><option value="SCHEDULED">Programada</option><option value="CHECKED_IN">En espera</option><option value="ATTENDED">Atendida</option><option value="NO_SHOW">Inasistencia</option><option value="CANCELLED">Cancelada</option></select></label>}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-divider pt-4"><p aria-live="polite" className="text-sm font-semibold text-text-secondary">{loading ? "Cargando agenda…" : `${visibleAppointments.length} cita${visibleAppointments.length === 1 ? "" : "s"}`}</p>{view === "ATTENDED" && <span className="text-xs text-text-tertiary">Más recientes primero</span>}</div>
        {error ? <p className="mt-5 rounded-xl bg-error-container p-4 text-sm font-semibold text-error">{error}</p> : loading ? <p className="py-12 text-center text-sm text-text-secondary">Cargando agenda…</p> : visibleAppointments.length ? <div className="mt-2 divide-y divide-divider">{visibleAppointments.map((item) => {
          const canOpen = item.status === "ATTENDED" || item.status === "SCHEDULED" || item.status === "CHECKED_IN";
          return <article key={item.id} className="grid gap-4 py-5 first:pt-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div className="flex items-start gap-3"><span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black ${item.status === "ATTENDED" ? "bg-success-container text-success" : item.status === "CHECKED_IN" ? "bg-warning-container text-warning" : "bg-primary-container text-primary"}`}>{new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", day: "2-digit" }).format(new Date(item.scheduledFor))}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-text-primary">{item.patient?.fullName ?? "Paciente asignado"}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${appointmentStatusClass(item.status)}`}>{appointmentStatusLabel(item.status)}</span></div><p className="mt-1 text-sm text-text-secondary">{formatAppointmentTime(item.scheduledFor)}{item.endsAt ? ` – ${new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(item.endsAt))}` : ""}</p><p className="mt-1 text-sm text-text-secondary">{item.specialty} · {item.patient ? `CI ${item.patient.carnet}` : "Datos restringidos"}</p></div></div>{canOpen ? <Link href={`/medico/citas/${item.id}`} className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold ${item.status === "ATTENDED" ? "border border-success/30 text-success hover:bg-success-container" : "bg-primary text-on-primary hover:bg-primary-hover"}`}>{item.status === "ATTENDED" ? "Ver atención completa" : "Abrir cita"}</Link> : <span className="text-right text-xs font-semibold text-text-tertiary">Sin acciones disponibles</span>}</article>;
        })}</div> : <div className="mt-5 rounded-xl border border-dashed border-divider bg-surface-secondary/55 p-8 text-center"><p className="font-semibold text-text-primary">No hay citas en esta vista</p><p className="mt-1 text-sm text-text-secondary">Prueba otro intervalo, cambia de vista o limpia los filtros.</p></div>}
      </div>
    </section>
  );
}
