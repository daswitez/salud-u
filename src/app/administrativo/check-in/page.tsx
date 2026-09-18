"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { beginInitialAppointmentAttention, confirmInitialAppointmentAgainstCapacity, createAdministrativeAppointment, getAvailableCareCapacities, getInitialCareCapacities, markInitialAppointmentNoShow, type AvailableCareCapacity } from "@/lib/demo-booking-store";
import { getClinicalDemoState, getClinicalPatient, searchClinicalPatients } from "@/lib/demo-clinical-store";
import type { Appointment, AppointmentStatus, Patient, Specialty } from "@/lib/ui-contracts";

const PAGE_SIZE = 10;
const specialtyLabels: Record<Specialty, string> = { DERMATOLOGY: "Dermatología", OPHTHALMOLOGY: "Oftalmología", INTERNAL_MEDICINE: "Medicina interna", UROLOGY: "Urología", GYNECOLOGY: "Ginecología" };
const statusLabels: Record<AppointmentStatus, string> = { REQUESTED: "Solicitada", SCHEDULED: "Programada", CANCELLED: "Cancelada", NO_SHOW: "No asistió", ATTENDED: "Atendida" };
type AppointmentRow = { appointment: Appointment; patient?: Patient };

function AvailabilityCalendar({ capacities, selectedId, onSelect }: { capacities: AvailableCareCapacity[]; selectedId: string; onSelect: (id: string) => void }) {
  const [view, setView] = useState<"DAY" | "WEEK" | "MONTH">("DAY");
  const dates = Array.from(new Set(capacities.map((item) => item.scheduledFor.slice(0, 10)))).sort();
  const [date, setDate] = useState("");
  const activeDate = date || dates[0];
  const visible = view === "DAY" ? capacities.filter((item) => item.scheduledFor.startsWith(activeDate)) : capacities;
  return <section className="mt-5 rounded-2xl border border-primary-200 bg-surface p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold tracking-wide text-primary">DISPONIBILIDAD</p><h2 className="mt-1 font-bold text-text-primary">Selecciona un horario en el calendario</h2></div><div className="flex rounded-lg border border-divider p-1">{(["DAY", "WEEK", "MONTH"] as const).map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === item ? "bg-primary text-on-primary" : "text-text-secondary"}`}>{item === "DAY" ? "Día" : item === "WEEK" ? "Semana" : "Mes"}</button>)}</div></div><div className="mt-4 flex flex-wrap gap-2">{dates.map((item) => <button key={item} onClick={() => setDate(item)} className={`rounded-lg border px-3 py-2 text-sm ${activeDate === item ? "border-primary bg-primary-container text-primary" : "border-divider text-text-secondary"}`}>{new Date(`${item}T12:00:00`).toLocaleDateString("es-BO", { weekday: view === "MONTH" ? "short" : "long", day: "numeric", month: "short" })}</button>)}</div><div className={`mt-4 grid gap-3 ${view === "MONTH" ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>{visible.map((capacity) => <button key={capacity.id} onClick={() => onSelect(capacity.id)} className={`rounded-xl border p-4 text-left ${selectedId === capacity.id ? "border-primary bg-primary-container" : "border-divider hover:border-primary"}`}><p className="font-bold text-text-primary">{new Date(capacity.scheduledFor).toLocaleString("es-BO", { dateStyle: view === "DAY" ? undefined : "short", timeStyle: "short" })}</p><p className="mt-1 text-sm text-text-secondary">{capacity.doctorName}</p></button>)}</div>{!visible.length && <p className="mt-4 text-sm text-text-secondary">No hay cupos disponibles para esta vista.</p>}</section>;
}

function ReservationModal({ patient, kind, specialty, capacityId, capacities, onClose, onKindChange, onSpecialtyChange, onCapacityChange, onConfirm }: { patient: Patient; kind: "INITIAL" | "SPECIALTY"; specialty: Specialty; capacityId: string; capacities: AvailableCareCapacity[]; onClose: () => void; onKindChange: (kind: "INITIAL" | "SPECIALTY") => void; onSpecialtyChange: (specialty: Specialty) => void; onCapacityChange: (id: string) => void; onConfirm: () => void }) {
  return <div role="dialog" aria-modal="true" aria-labelledby="reservation-title" className="fixed inset-0 z-50 overflow-y-auto bg-text-primary/45 p-4 sm:p-8"><div className="mx-auto my-4 max-w-5xl rounded-3xl bg-background shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-divider bg-surface px-6 py-5 sm:px-8"><div><p className="text-sm font-semibold tracking-wide text-primary">NUEVA RESERVA</p><h2 id="reservation-title" className="mt-1 text-2xl font-bold text-text-primary">{patient.fullName}</h2><p className="mt-1 text-sm text-text-secondary">Carnet {patient.carnet} · {patient.isRecurrent ? "Paciente recurrente" : "Registro inicial"}</p></div><button onClick={onClose} aria-label="Cerrar reserva" className="grid size-10 place-items-center rounded-full text-xl text-text-secondary hover:bg-surface-secondary">×</button></header><div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-6 py-6 sm:px-8"><div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-semibold text-text-primary">Tipo de atención</span><select value={kind} onChange={(event) => onKindChange(event.target.value as "INITIAL" | "SPECIALTY")} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5"><option value="INITIAL">Revisión estudiantil</option><option value="SPECIALTY">Especialidad directa</option></select></label>{kind === "SPECIALTY" && <label><span className="text-sm font-semibold text-text-primary">Especialidad</span><select value={specialty} onChange={(event) => onSpecialtyChange(event.target.value as Specialty)} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5">{Object.entries(specialtyLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}</div><AvailabilityCalendar capacities={capacities} selectedId={capacityId} onSelect={onCapacityChange} /></div><footer className="flex flex-wrap items-center justify-between gap-3 border-t border-divider bg-surface px-6 py-5 sm:px-8"><p className="text-sm text-text-secondary">{capacityId ? "Horario seleccionado. Puedes confirmar la reserva." : "Selecciona un horario disponible para continuar."}</p><div className="flex gap-3"><button onClick={onClose} className="rounded-lg border border-divider px-4 py-2.5 text-sm font-semibold text-text-secondary">Cancelar</button><button onClick={onConfirm} disabled={!capacityId} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50">Confirmar reserva</button></div></footer></div></div>;
}

function pagesFor(total: number) { return Math.max(1, Math.ceil(total / PAGE_SIZE)); }

export default function AdministrativeAppointmentsPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientPage, setPatientPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient>();
  const [kind, setKind] = useState<"INITIAL" | "SPECIALTY">("INITIAL");
  const [specialty, setSpecialty] = useState<Specialty>("DERMATOLOGY");
  const [capacityId, setCapacityId] = useState("");
  const [allAppointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [initialCapacities, setInitialCapacities] = useState<AvailableCareCapacity[]>([]);
  const [message, setMessage] = useState("");

  function refreshAppointments() {
    const state = getClinicalDemoState();
    setAppointments(state.appointments.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).map((appointment) => ({ appointment, patient: state.patients.find((patient) => patient.id === appointment.patientId) })));
    setInitialCapacities(getInitialCareCapacities());
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { refreshAppointments(); setPatients(searchClinicalPatients("")); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const patientId = searchParams.get("patientId");
    if (!patientId) return;
    const timer = window.setTimeout(() => {
      const patient = getClinicalPatient(patientId);
      if (patient) { setSelectedPatient(patient); setQuery(patient.carnet); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setPatients(searchClinicalPatients(query)); setPatientPage(1); }, 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  const totalPages = pagesFor(patients.length);
  const visiblePatients = useMemo(() => patients.slice((patientPage - 1) * PAGE_SIZE, patientPage * PAGE_SIZE), [patients, patientPage]);
  const appointmentPages = pagesFor(allAppointments.length);
  const appointments = useMemo(() => allAppointments.slice((appointmentPage - 1) * PAGE_SIZE, appointmentPage * PAGE_SIZE), [allAppointments, appointmentPage]);
  const capacities = getAvailableCareCapacities({ appointmentType: kind, specialty: kind === "SPECIALTY" ? specialty : undefined }).filter((capacity) => capacity.availableAppointments > 0);

  function reserve() {
    if (!selectedPatient || !capacityId) { setMessage("Selecciona un estudiante de la tabla y un cupo disponible."); return; }
    const result = createAdministrativeAppointment(selectedPatient.id, capacityId);
    setMessage(result.ok ? "Cita reservada para " + selectedPatient.fullName + "." : result.message);
    if (result.ok) { setCapacityId(""); setSelectedPatient(undefined); refreshAppointments(); }
  }

  function confirmRequest(appointmentId: string, selectedCapacityId: string) {
    if (!selectedCapacityId) return;
    const result = confirmInitialAppointmentAgainstCapacity(appointmentId, selectedCapacityId);
    setMessage(result.ok ? "Solicitud confirmada." : result.message);
    refreshAppointments();
  }

  function noShow(appointmentId: string) {
    const result = markInitialAppointmentNoShow(appointmentId);
    setMessage(result.ok ? "Inasistencia registrada." : result.message);
    refreshAppointments();
  }

  function start(appointment: Appointment) {
    const result = beginInitialAppointmentAttention(appointment.id, appointment.assignedDoctorId ?? "DOC-REV-001");
    setMessage(result.ok ? "Atención clínica iniciada; al cerrarla, la cita quedará atendida." : result.message);
    refreshAppointments();
  }

  const resultCopy = query ? patients.length + " coincidencia(s)" : patients.length + " estudiante(s) registrados";
  const firstPatient = patients.length ? (patientPage - 1) * PAGE_SIZE + 1 : 0;

  return <div className="min-h-screen bg-background md:flex">
    <AppSidebar role="administrativo" active="appointments" />
    <main className="min-w-0 flex-1 pb-22 md:pb-0">
      <AppHeader role="administrativo" name="María Fernández" clinicalRole="ADMINISTRATIVE" />
      <div className="mx-auto max-w-7xl p-5 sm:p-8">
        <Link href="/administrativo" className="text-sm font-semibold text-primary hover:underline">← Inicio administrativo</Link>
        <header className="mt-5"><p className="text-sm font-semibold tracking-wide text-primary">CITAS POR CUPO</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Reservar, confirmar e ingresar</h1><p className="mt-2 text-text-secondary">Busca por carnet, código o nombre. Selecciona al estudiante en la tabla para iniciar la reserva.</p></header>
        {message && <p role="status" className="mt-5 rounded-xl bg-primary-container p-4 text-sm text-primary">{message}</p>}
        {selectedPatient && <ReservationModal patient={selectedPatient} kind={kind} specialty={specialty} capacityId={capacityId} capacities={capacities} onClose={() => setSelectedPatient(undefined)} onKindChange={(nextKind) => { setKind(nextKind); setCapacityId(""); }} onSpecialtyChange={(nextSpecialty) => { setSpecialty(nextSpecialty); setCapacityId(""); }} onCapacityChange={setCapacityId} onConfirm={reserve} />}

        <section className="mt-7 rounded-2xl border border-divider bg-surface p-5"><div className="flex flex-wrap items-end justify-between gap-4"><label className="min-w-0 flex-1"><span className="text-sm font-semibold text-text-primary">Buscar estudiante</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Carnet, código de registro o nombre completo" className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary" /></label><Link href="/administrativo/estudiantes/nuevo" className="rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-container">Registrar estudiante</Link></div></section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-divider bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-4"><div><h2 className="font-bold text-text-primary">Estudiantes</h2><p className="mt-1 text-sm text-text-secondary">{resultCopy}</p></div><p className="text-sm text-text-secondary">Página {patientPage} de {totalPages}</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-190 text-left text-sm"><thead className="border-b border-divider text-xs uppercase text-text-tertiary"><tr><th className="px-4 py-3">Estudiante</th><th className="px-4 py-3">Carnet / código</th><th className="px-4 py-3">Carrera</th><th className="px-4 py-3">Condición</th><th className="px-4 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y divide-divider">{visiblePatients.map((patient) => <tr key={patient.id} className={selectedPatient?.id === patient.id ? "bg-primary-container/40" : ""}><td className="px-4 py-4 font-semibold text-text-primary">{patient.fullName}</td><td className="px-4 py-4 text-text-secondary"><p>{patient.carnet}</p><p className="text-xs text-text-tertiary">{patient.registrationCode}</p></td><td className="px-4 py-4 text-text-secondary">{patient.career}</td><td className="px-4 py-4 text-text-secondary">{patient.isRecurrent ? "Recurrente" : "Registro inicial"}</td><td className="px-4 py-4 text-right"><button onClick={() => { setSelectedPatient(patient); setCapacityId(""); setMessage(""); }} className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-container">Reservar cita</button></td></tr>)}{!visiblePatients.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-text-secondary">No se encontraron estudiantes con esos datos.</td></tr>}</tbody></table></div>
          <div className="flex items-center justify-between border-t border-divider px-5 py-4 text-sm"><p className="text-text-secondary">Mostrando {firstPatient}–{Math.min(patientPage * PAGE_SIZE, patients.length)} de {patients.length}</p><div className="flex gap-2"><button onClick={() => setPatientPage((current) => Math.max(1, current - 1))} disabled={patientPage === 1} className="rounded-lg border border-divider px-3 py-2 font-semibold text-text-secondary disabled:opacity-50">Anterior</button><button onClick={() => setPatientPage((current) => Math.min(totalPages, current + 1))} disabled={patientPage === totalPages} className="rounded-lg border border-divider px-3 py-2 font-semibold text-text-secondary disabled:opacity-50">Siguiente</button></div></div>
        </section>


        <section className="mt-7 overflow-hidden rounded-2xl border border-divider bg-surface"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-4"><h2 className="font-bold text-text-primary">Solicitudes y citas registradas</h2><p className="text-sm text-text-secondary">Página {appointmentPage} de {appointmentPages} · {allAppointments.length} registro(s)</p></div><div className="overflow-x-auto"><table className="w-full min-w-230 text-left text-sm"><thead className="border-b border-divider text-xs uppercase text-text-tertiary"><tr><th className="px-4 py-3">Estudiante</th><th className="px-4 py-3">Atención</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Horario</th><th className="px-4 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y divide-divider">{appointments.map(({ appointment, patient }) => <tr key={appointment.id}><td className="px-4 py-4"><p className="font-semibold text-text-primary">{patient?.fullName}</p><p className="text-xs text-text-tertiary">{patient?.carnet}</p></td><td className="px-4 py-4 text-text-secondary">{appointment.type === "INITIAL" ? "Revisión" : appointment.type === "SPECIALTY" ? specialtyLabels[appointment.specialty!] : "Derivación"}</td><td className="px-4 py-4 text-text-secondary">{statusLabels[appointment.status]}</td><td className="px-4 py-4 text-text-secondary">{appointment.status === "REQUESTED" ? <select onChange={(event) => confirmRequest(appointment.id, event.target.value)} defaultValue=""><option value="">Asignar cupo de revisión</option>{initialCapacities.filter((capacity) => capacity.availableAppointments).map((capacity) => <option key={capacity.id} value={capacity.id}>{new Date(capacity.scheduledFor).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })}</option>)}</select> : new Date(appointment.scheduledFor).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })}</td><td className="px-4 py-4 text-right">{appointment.status === "SCHEDULED" && appointment.type === "INITIAL" && <><button onClick={() => start(appointment)} className="mr-3 font-semibold text-primary hover:underline">Iniciar atención</button><button onClick={() => noShow(appointment.id)} className="font-semibold text-error hover:underline">No asistió</button></>}</td></tr>)}</tbody></table></div><div className="flex justify-end gap-2 border-t border-divider px-5 py-4"><button onClick={() => setAppointmentPage((current) => Math.max(1, current - 1))} disabled={appointmentPage === 1} className="rounded-lg border border-divider px-3 py-2 text-sm font-semibold text-text-secondary disabled:opacity-50">Anterior</button><button onClick={() => setAppointmentPage((current) => Math.min(appointmentPages, current + 1))} disabled={appointmentPage === appointmentPages} className="rounded-lg border border-divider px-3 py-2 text-sm font-semibold text-text-secondary disabled:opacity-50">Siguiente</button></div></section>
      </div>
    </main>
  </div>;
}
