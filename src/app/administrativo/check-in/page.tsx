"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { apiJson, type AdministrativePatient } from "@/lib/api/client";

type Slot = { id: string; startsAt: string; endsAt: string; capacity: number; bookedCount: number; specialtyId: string | null; doctorName: string };
type Appointment = { id: string; status: "SCHEDULED" | "CHECKED_IN" | "NO_SHOW" | "CANCELLED" | "ATTENDED"; scheduled_for: string; doctorName: string; endsAt: string | null };
type Referral = { id: string; specialty_id: string; specialty_name: string; status: "PENDING_ASSIGNMENT" | "ASSIGNED" };
type Specialty = { id: string; name: string };
type Request = { id: string; appointment_type: "INITIAL" | "REFERRAL" | "SPECIALTY"; referral_id: string | null; specialty_id: string | null; status: "PENDING" | "ASSIGNED" | "CANCELLED"; patient: { id: string; carnet: string; given_names: string; family_names: string } | null; appointment: Appointment | null };

function appointmentStatus(status: Appointment["status"]) { return { SCHEDULED: "Confirmada", CHECKED_IN: "Ingresó", NO_SHOW: "No asistió", CANCELLED: "Cancelada", ATTENDED: "Atendida" }[status]; }
function requestLabel(request: Request, referrals: Referral[], specialties: Specialty[] = []) { if (request.appointment_type === "INITIAL") return "Revisión estudiantil"; const specialty = request.appointment_type === "REFERRAL" ? referrals.find((referral) => referral.id === request.referral_id)?.specialty_name : specialties.find((item) => item.id === request.specialty_id)?.name; return `${request.appointment_type === "REFERRAL" ? "Derivación" : "Especialidad solicitada"} · ${specialty ?? "Especialidad"}`; }

export default function AdministrativeAppointmentsPage() {
  const searchParams = useSearchParams(); const patientId = searchParams.get("patientId"); const referralFromQuery = searchParams.get("referralId");
  const [requests, setRequests] = useState<Request[]>([]); const [slots, setSlots] = useState<Slot[]>([]); const [patient, setPatient] = useState<AdministrativePatient>(); const [referrals, setReferrals] = useState<Referral[]>([]); const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [appointmentType, setAppointmentType] = useState<"INITIAL" | "REFERRAL" | "SPECIALTY">("INITIAL"); const [referralId, setReferralId] = useState(""); const [specialtyId, setSpecialtyId] = useState(""); const [activeRequestId, setActiveRequestId] = useState("");
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error || notice) feedback.current?.focus(); }, [error, notice]);

  const refresh = useCallback(async () => {
    try {
      const [requestData, slotData, specialtyData] = await Promise.all([apiJson<Request[]>("/api/appointment-requests"), apiJson<Slot[]>("/api/availability-slots"), apiJson<Specialty[]>("/api/specialties")]);
      setRequests(requestData); setSlots(slotData.filter((slot) => slot.bookedCount < slot.capacity)); setSpecialties(specialtyData); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la agenda."); throw cause; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const task = window.setTimeout(() => {
      void refresh().catch(() => {});
      if (patientId) {
        void apiJson<AdministrativePatient>(`/api/patients/${patientId}`)
          .then(setPatient)
          .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudo cargar el estudiante."));
      }
    }, 0);
    return () => window.clearTimeout(task);
  }, [patientId, referralFromQuery, refresh]);
  useEffect(() => {
    if (!patientId || (appointmentType !== "REFERRAL" && !referralFromQuery)) return;
    const task = window.setTimeout(() => {
      void apiJson<Referral[]>(`/api/patients/${patientId}/referrals`).then((available) => {
        setReferrals(available);
        const selected = available.find((item) => item.id === referralFromQuery);
        if (selected) { setAppointmentType("REFERRAL"); setReferralId(selected.id); }
        else if (available.length === 1) setReferralId(available[0].id);
      }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar las derivaciones."));
    }, 0);
    return () => window.clearTimeout(task);
  }, [patientId, appointmentType, referralFromQuery]);

  const visibleRequests = useMemo(() => patientId ? requests.filter((request) => request.patient?.id === patientId) : requests, [patientId, requests]);
  const pendingRequests = visibleRequests.filter((request) => request.status === "PENDING");
  const activeRequest = pendingRequests.find((request) => request.id === activeRequestId) ?? pendingRequests.find((request) => request.appointment_type === appointmentType) ?? pendingRequests[0];
  const selectedReferral = referrals.find((referral) => referral.id === referralId);
  const activeSpecialtyId = activeRequest?.appointment_type === "REFERRAL" ? referrals.find((referral) => referral.id === activeRequest.referral_id)?.specialty_id : activeRequest?.specialty_id;
  const compatibleSlots = activeRequest?.appointment_type === "INITIAL" ? slots.filter((slot) => slot.specialtyId === null) : slots.filter((slot) => slot.specialtyId === activeSpecialtyId);
  const hasPendingType = pendingRequests.some((request) => request.appointment_type === appointmentType && (appointmentType === "INITIAL" || request.referral_id === referralId || request.specialty_id === specialtyId));

  async function createRequest() {
    if (!patientId || (appointmentType === "REFERRAL" && !referralId) || (appointmentType === "SPECIALTY" && !specialtyId)) { setError("Selecciona la especialidad o derivación para crear la cita."); return; }
    setBusy("create"); setError(""); setNotice("");
    try {
      const result = await apiJson<{ id: string }>("/api/appointment-requests", { method: "POST", body: JSON.stringify({ patientId, appointmentType, referralId: appointmentType === "REFERRAL" ? referralId : null, specialtyId: appointmentType === "SPECIALTY" ? specialtyId : null }) });
      setActiveRequestId(result.id); setNotice("Solicitud creada. Elige ahora un médico y horario compatible."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la solicitud."); } finally { setBusy(""); }
  }
  async function assign(slotId: string) {
    if (!activeRequest) return; setBusy(slotId); setError(""); setNotice("");
    try { await apiJson(`/api/appointment-requests/${activeRequest.id}/assign`, { method: "POST", body: JSON.stringify({ slotId }) }); setNotice("Cita confirmada correctamente."); setActiveRequestId(""); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo asignar el cupo."); } finally { setBusy(""); }
  }
  async function action(appointmentId: string, actionName: "check-in" | "no-show") {
    setBusy(appointmentId); setError(""); setNotice("");
    try { await apiJson(`/api/appointments/${appointmentId}/${actionName}`, { method: "POST", body: "{}" }); await refresh(); setNotice(actionName === "check-in" ? "Ingreso registrado." : "Inasistencia registrada."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar la cita."); } finally { setBusy(""); }
  }

  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="appointments" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" name="Administración" clinicalRole="ADMINISTRATIVE" /><div className="mx-auto max-w-7xl p-5 sm:p-8"><Link href="/administrativo" className="text-sm font-semibold text-primary hover:underline">← Inicio administrativo</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-primary">CITAS POR CUPO</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Programar una cita</h1><p className="mt-2 text-text-secondary">Programa revisiones, una especialidad solicitada por el estudiante o una derivación clínica.</p></header>
    {patient && <section className="mt-6 rounded-2xl border border-primary-200 bg-primary-container p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-wide text-primary">ESTUDIANTE SELECCIONADO</p><p className="mt-1 text-lg font-bold text-text-primary">{patient.fullName}</p><p className="text-sm text-text-secondary">Carnet {patient.carnet}</p></div></div><div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr_auto]"><label><span className="text-sm font-semibold">Tipo de cita</span><select value={appointmentType} onChange={(event) => { setAppointmentType(event.target.value as "INITIAL" | "REFERRAL" | "SPECIALTY"); setActiveRequestId(""); }} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5"><option value="INITIAL">Revisión estudiantil</option><option value="SPECIALTY">Especialidad solicitada</option><option value="REFERRAL">Atención por derivación</option></select></label>{appointmentType === "REFERRAL" ? <label><span className="text-sm font-semibold">Derivación disponible</span><select value={referralId} onChange={(event) => setReferralId(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5"><option value="">Selecciona una derivación</option>{referrals.map((referral) => <option key={referral.id} value={referral.id}>{referral.specialty_name} · {referral.status === "ASSIGNED" ? "Asignada" : "Pendiente de asignación"}</option>)}</select>{!referrals.length && <span className="mt-1 block text-xs text-text-secondary">No hay derivaciones activas para este estudiante.</span>}</label> : appointmentType === "SPECIALTY" ? <label><span className="text-sm font-semibold">Especialidad solicitada</span><select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5"><option value="">Selecciona una especialidad</option>{specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}</select></label> : <p className="self-end pb-2 text-sm text-text-secondary">Puedes crear otra revisión aunque tenga citas o atenciones anteriores.</p>}<button disabled={busy === "create" || hasPendingType || (appointmentType === "REFERRAL" && !selectedReferral) || (appointmentType === "SPECIALTY" && !specialtyId)} onClick={() => void createRequest()} className="self-end rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60">{busy === "create" ? "Creando…" : hasPendingType ? "Solicitud pendiente" : "Crear solicitud"}</button></div></section>}
    <div ref={feedback} tabIndex={-1}>{notice && <p role="status" className="mt-5 rounded-xl bg-success-container p-4 text-sm text-success">{notice}</p>}{error && <p role="alert" className="mt-5 rounded-xl bg-error-container p-4 text-sm text-error">{error}</p>}</div>
    {loading && <p role="status" className="mt-5 text-sm text-text-secondary">Cargando agenda…</p>}
    {error && <button type="button" disabled={Boolean(busy)} onClick={() => void refresh().catch(() => {})} className="mt-3 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary">Reintentar carga</button>}
    {pendingRequests.length > 0 && <section className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-6"><div><p className="text-xs font-semibold tracking-wide text-primary">ELEGIR MÉDICO Y HORARIO</p><h2 className="mt-1 text-xl font-bold text-text-primary">Solicitudes pendientes</h2><p className="mt-1 text-sm text-text-secondary">Selecciona una solicitud y luego un cupo compatible.</p></div><div className="mt-4 flex flex-wrap gap-2">{pendingRequests.map((request) => <button key={request.id} type="button" onClick={() => setActiveRequestId(request.id)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeRequest?.id === request.id ? "bg-primary text-on-primary" : "bg-surface-secondary text-text-secondary"}`}>{requestLabel(request, referrals)}</button>)}</div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{compatibleSlots.map((slot) => <button key={slot.id} disabled={Boolean(busy)} onClick={() => void assign(slot.id)} className="rounded-xl border border-divider bg-surface-secondary p-4 text-left transition hover:border-primary hover:bg-primary-container disabled:opacity-60"><p className="font-bold text-text-primary">{slot.doctorName}</p><p className="mt-2 text-sm font-semibold text-primary">{new Date(slot.startsAt).toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" })}</p><p className="mt-1 text-sm text-text-secondary">{new Date(slot.startsAt).toLocaleTimeString("es-BO", { timeStyle: "short" })} – {new Date(slot.endsAt).toLocaleTimeString("es-BO", { timeStyle: "short" })}</p><p className="mt-3 text-xs text-text-tertiary">{slot.capacity - slot.bookedCount} cupo(s) disponible(s)</p></button>)}{!compatibleSlots.length && <p className="rounded-xl bg-surface-secondary p-5 text-sm text-text-secondary">No hay cupos publicados compatibles con esta solicitud.</p>}</div></section>}
    <section className="mt-7"><h2 className="text-xl font-bold text-text-primary">{patient ? "Detalle de citas del estudiante" : "Citas registradas"}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{visibleRequests.map((request) => <article data-request-id={request.id} key={request.id} className="rounded-2xl border border-divider bg-surface p-5"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold tracking-wide text-primary">{requestLabel(request, referrals).toUpperCase()}</p><h3 className="mt-1 font-bold text-text-primary">{request.patient ? `${request.patient.given_names} ${request.patient.family_names}` : "Estudiante"}</h3></div><span className="h-fit rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-semibold text-text-secondary">{request.status === "PENDING" ? "Pendiente" : request.appointment ? appointmentStatus(request.appointment.status) : "Cancelada"}</span></div>{request.appointment ? <dl className="mt-5 grid gap-4 border-y border-divider py-4 text-sm sm:grid-cols-2"><div><dt className="text-text-secondary">Médico</dt><dd className="mt-1 font-semibold text-text-primary">{request.appointment.doctorName}</dd></div><div><dt className="text-text-secondary">Fecha y hora</dt><dd className="mt-1 font-semibold text-text-primary">{new Date(request.appointment.scheduled_for).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })}</dd></div></dl> : <p className="mt-5 text-sm text-text-secondary">Aún falta elegir un cupo.</p>}{(request.appointment?.status === "SCHEDULED" || request.appointment?.status === "CHECKED_IN") && <div className="mt-5 flex gap-3">{request.appointment.status === "SCHEDULED" && <button disabled={Boolean(busy)} onClick={() => void action(request.appointment!.id, "check-in")} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">Registrar ingreso</button>}<button disabled={Boolean(busy)} onClick={() => void action(request.appointment!.id, "no-show")} className="rounded-lg border border-error px-3 py-2 text-sm font-semibold text-error disabled:opacity-50">No asistió</button></div>}</article>)}{!loading && !error && !visibleRequests.length && <article className="rounded-2xl border border-dashed border-divider bg-surface p-8 text-center text-sm text-text-secondary">{patient ? "Todavía no hay citas para este estudiante." : "No hay solicitudes ni citas registradas."}</article>}</div></section>
  </div></main></div>;
}
