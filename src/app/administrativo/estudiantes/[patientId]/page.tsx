"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getPatientClinicalSnapshot, updateAdministrativePatient } from "@/lib/demo-clinical-store";
import { requestStudentInitialAppointment } from "@/lib/demo-booking-store";
import type { Appointment, Patient, ReferralStatus } from "@/lib/ui-contracts";

type AdministrativeForm = Pick<Patient, "fullName" | "birthDate" | "career" | "email" | "phone" | "academicStatus" | "isRecurrent">;

function referralLabel(status?: ReferralStatus) {
  if (!status) return "Sin derivación activa";
  const labels: Record<ReferralStatus, string> = { PENDING_ASSIGNMENT: "Pendiente de asignación", ASSIGNED: "Asignada", IN_PROGRESS: "En atención", RETURNED: "Devuelta", CLOSED: "Cerrada", CANCELLED: "Cancelada" };
  return labels[status];
}

function appointmentLabel(status: Appointment["status"]) {
  const labels: Record<Appointment["status"], string> = { REQUESTED: "Solicitud registrada", SCHEDULED: "Programada", CANCELLED: "Cancelada", NO_SHOW: "No asistió", ATTENDED: "Atendida" };
  return labels[status];
}

export default function AdministrativeStudentDetailPage() {
  const params = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<Patient>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [lastEncounterAt, setLastEncounterAt] = useState<string>();
  const [activeReferral, setActiveReferral] = useState<ReferralStatus>();
  const [form, setForm] = useState<AdministrativeForm>();
  const [notice, setNotice] = useState("");

  const refresh = useCallback(() => {
    const snapshot = getPatientClinicalSnapshot(params.patientId);
    if (!snapshot.patient) return;
    const latest = snapshot.encounters.find((encounter) => encounter.status === "CLOSED");
    const referral = snapshot.referrals.find((item) => ["PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS"].includes(item.status));
    setPatient(snapshot.patient);
    setAppointments(snapshot.appointments.sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor)));
    setLastEncounterAt(latest?.occurredAt);
    setActiveReferral(referral?.status);
    setForm({ fullName: snapshot.patient.fullName, birthDate: snapshot.patient.birthDate, career: snapshot.patient.career, email: snapshot.patient.email, phone: snapshot.patient.phone, academicStatus: snapshot.patient.academicStatus, isRecurrent: snapshot.patient.isRecurrent });
  }, [params.patientId]);

  useEffect(() => { const timer = window.setTimeout(refresh, 0); return () => window.clearTimeout(timer); }, [refresh]);

  function update<K extends keyof AdministrativeForm>(key: K, value: AdministrativeForm[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setNotice("");
  }

  function saveAdministrativeData(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const result = updateAdministrativePatient(params.patientId, form);
    setNotice(result.ok ? "Datos administrativos actualizados." : result.message);
    if (result.ok) refresh();
  }

  function requestAppointment() {
    const result = requestStudentInitialAppointment(params.patientId, "ADMIN-001");
    setNotice(result.ok ? "Solicitud de cita creada. Puedes asignarle un cupo desde Citas por cupo." : result.message);
    if (result.ok) refresh();
  }

  if (!patient || !form) return <div className="grid min-h-screen place-items-center bg-background text-text-secondary">Cargando registro administrativo…</div>;

  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="students" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole="ADMINISTRATIVE" name="María Fernández" /><div className="mx-auto max-w-5xl p-5 sm:p-8"><Link href="/administrativo/estudiantes" className="text-sm font-semibold text-primary hover:underline">← Volver a estudiantes</Link><header className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-primary">REGISTRO ADMINISTRATIVO</p><h1 className="mt-1 text-3xl font-bold text-text-primary">{patient.fullName}</h1><p className="mt-2 text-text-secondary">Carnet {patient.carnet} · Código {patient.registrationCode}</p></div><span className="rounded-full bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary">{patient.isRecurrent ? "Paciente recurrente" : "Registro inicial"}</span></header>{notice && <p role="status" className="mt-5 rounded-xl bg-info-container p-4 text-sm text-info">{notice}</p>}<section className="mt-7 grid gap-4 sm:grid-cols-3"><article className="rounded-xl border border-divider bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Última atención</p><p className="mt-2 font-semibold text-text-primary">{lastEncounterAt ? new Date(lastEncounterAt).toLocaleDateString("es-BO") : "Sin atención registrada"}</p></article><article className="rounded-xl border border-divider bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Consulta obligatoria</p><p className="mt-2 font-semibold text-text-primary">{lastEncounterAt ? "Cumplida" : "Pendiente"}</p></article><article className="rounded-xl border border-divider bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Derivación</p><p className="mt-2 font-semibold text-text-primary">{referralLabel(activeReferral)}</p></article></section>        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <form onSubmit={saveAdministrativeData} className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-text-primary">Datos administrativos</h2><p className="mt-1 text-sm text-text-secondary">No se editan diagnósticos, evaluaciones, adjuntos ni derivaciones desde esta vista.</p></div></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-semibold text-text-secondary">Nombre completo<input required value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-text-primary" /></label>
                <label className="text-sm font-semibold text-text-secondary">Carnet<input disabled value={patient.carnet} className="mt-1.5 w-full rounded-lg border border-divider bg-surface-secondary px-3 py-2.5 text-text-secondary" /></label>
                <label className="text-sm font-semibold text-text-secondary">Código de registro<input disabled value={patient.registrationCode} className="mt-1.5 w-full rounded-lg border border-divider bg-surface-secondary px-3 py-2.5 text-text-secondary" /></label>
                <label className="text-sm font-semibold text-text-secondary">Fecha de nacimiento<input type="date" value={form.birthDate ?? ""} onChange={(event) => update("birthDate", event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-text-primary" /></label>
                <label className="text-sm font-semibold text-text-secondary">Carrera<input required value={form.career} onChange={(event) => update("career", event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-text-primary" /></label>
                <label className="text-sm font-semibold text-text-secondary">Correo<input type="email" value={form.email ?? ""} onChange={(event) => update("email", event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-text-primary" /></label>
                <label className="text-sm font-semibold text-text-secondary">Teléfono<input value={form.phone ?? ""} onChange={(event) => update("phone", event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-text-primary" /></label>
                <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary sm:col-span-2"><input type="checkbox" checked={form.isRecurrent} onChange={(event) => update("isRecurrent", event.target.checked)} className="size-4 accent-primary" />Paciente recurrente</label>
              </div>
              <button className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Guardar datos administrativos</button>
            </form>

            <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
              <h2 className="text-lg font-bold text-text-primary">Archivos e Historiales</h2>
              <p className="mt-1 text-sm text-text-secondary">Acceso directo a las diferentes historias clínicas del estudiante.</p>
              
              <div className="mt-5 grid gap-3">
                <Link href={`/administrativo/estudiantes/${params.patientId}/historia-inicial`} className="group flex items-center justify-between rounded-xl border border-divider bg-surface-secondary p-4 hover:border-primary-200">
                  <div>
                    <p className="font-semibold text-text-primary group-hover:text-primary">Historia Clínica Base (Antecedentes)</p>
                    <p className="mt-1 text-xs text-text-secondary">Cuestionario de ingreso inicial, alergias y crónicos.</p>
                  </div>
                  <span className="text-primary">→</span>
                </Link>

                {/* Mocks de historias de especialidad según requerimiento */}
                <Link href={`#`} className="group flex items-center justify-between rounded-xl border border-divider bg-surface-secondary p-4 hover:border-primary-200" title="En desarrollo: Vista de especialidad">
                  <div>
                    <p className="font-semibold text-text-primary group-hover:text-primary">Historial de Ginecología (Ejemplo)</p>
                    <p className="mt-1 text-xs text-text-secondary">Atenciones categóricas de la especialidad.</p>
                  </div>
                  <span className="text-primary">→</span>
                </Link>

                <Link href={`#`} className="group flex items-center justify-between rounded-xl border border-divider bg-surface-secondary p-4 hover:border-primary-200" title="En desarrollo: Vista de especialidad">
                  <div>
                    <p className="font-semibold text-text-primary group-hover:text-primary">Historial de Odontología (Ejemplo)</p>
                    <p className="mt-1 text-xs text-text-secondary">Atenciones categóricas de la especialidad.</p>
                  </div>
                  <span className="text-primary">→</span>
                </Link>
              </div>
            </section>
          </div>

          <aside className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-text-primary">Citas por cupo</h2><p className="mt-1 text-sm text-text-secondary">Solicitudes y citas administrativas del estudiante.</p></div><button onClick={requestAppointment} className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-container">Crear solicitud</button></div><div className="mt-5 divide-y divide-divider">{appointments.length ? appointments.map((appointment) => <article key={appointment.id} className="py-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-text-primary">{appointment.type === "INITIAL" ? "Revisión estudiantil" : "Atención por derivación"}</p><p className="mt-1 text-sm text-text-secondary">{new Date(appointment.scheduledFor).toLocaleDateString("es-BO")}</p></div><span className="rounded-full bg-primary-container px-2.5 py-1 text-xs font-semibold text-primary">{appointmentLabel(appointment.status)}</span></div></article>) : <p className="py-6 text-sm text-text-secondary">No hay solicitudes ni citas registradas.</p>}</div><p className="mt-5 rounded-xl bg-surface-secondary p-4 text-xs leading-5 text-text-secondary">La asignación concreta de cupo y profesional se desarrollará en el módulo de citas. Esta vista no muestra contenido clínico.</p></aside></section></div></main></div>;
}
