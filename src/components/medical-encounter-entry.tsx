"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { appointmentStatusLabel, formatAppointmentTime } from "@/components/medical-appointments";
import { ApiRequestError, apiJson, type MedicalAppointment } from "@/lib/api/client";

type OpenEncounter = { encounterId: string; status: "DRAFT" | "CLOSED" | "VOIDED" };

/** UC-09 ends with a verified draft; the clinical form is the next workflow stage. */
export function MedicalEncounterEntry({ appointmentId }: { appointmentId: string }) {
  const [appointment, setAppointment] = useState<MedicalAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [opened, setOpened] = useState<OpenEncounter | null>(null);
  const feedback = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<MedicalAppointment[]>("/api/medical/appointments");
      setAppointment(data.find(item => item.id === appointmentId) ?? null);
      setError(""); setSessionExpired(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la cita.");
      setSessionExpired(cause instanceof ApiRequestError && cause.status === 401);
    } finally { setLoading(false); }
  }, [appointmentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => { if (error || notice) feedback.current?.focus(); }, [error, notice]);

  async function start() {
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await apiJson<OpenEncounter>(`/api/medical/appointments/${appointmentId}/start`, { method: "POST" });
      setOpened(result);
      setNotice(result.status === "DRAFT" ? "Borrador disponible para esta atención." : "El encuentro está disponible en modo de consulta.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir el borrador.");
      setSessionExpired(cause instanceof ApiRequestError && cause.status === 401);
    } finally { setSaving(false); }
  }

  const encounter = opened ? { id: opened.encounterId, status: opened.status } : appointment?.encounter;
  const canStart = appointment && ["SCHEDULED", "CHECKED_IN"].includes(appointment.status)
    && (!encounter || encounter.status === "DRAFT");

  return <section className="space-y-5" aria-busy={loading || saving}>
    <Link href="/medico/agenda" className="text-sm font-semibold text-primary hover:underline">← Mi agenda</Link>
    <div ref={feedback} tabIndex={-1}>
      {error && <p role="alert" className="rounded-xl bg-error-container p-4 text-sm text-error">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-success-container p-4 text-sm text-success">{notice}</p>}
    </div>
    {loading ? <p role="status" className="py-12 text-center text-text-secondary">Cargando cita…</p>
      : appointment ? <article className="rounded-2xl border border-divider bg-surface p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-primary">ATENCIÓN MÉDICA</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary">{appointment.patient?.fullName ?? "Paciente asignado"}</h1>
        <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
          <div><dt className="text-text-secondary">Especialidad</dt><dd>{appointment.specialty}</dd></div>
          <div><dt className="text-text-secondary">Estado de la cita</dt><dd>{appointmentStatusLabel(appointment.status)}</dd></div>
          <div><dt className="text-text-secondary">Horario</dt><dd>{formatAppointmentTime(appointment.scheduledFor)}</dd></div>
          <div><dt className="text-text-secondary">Registro estudiantil</dt><dd>{appointment.patient?.registrationCode ?? "—"}</dd></div>
        </dl>
        {encounter && <div className="mt-6 rounded-xl bg-surface-secondary p-4" data-encounter-id={encounter.id}>
          <h2 className="font-bold">{encounter.status === "DRAFT" ? "Encuentro en borrador" : encounter.status === "CLOSED" ? "Atención cerrada" : "Encuentro anulado"}</h2>
          <p className="mt-1 text-sm text-text-secondary">La atención permanece vinculada a esta cita.</p>
        </div>}
        <div className="mt-6 flex flex-wrap gap-3">
          {encounter && <Link href={`/medico/citas/${appointmentId}/documentos`} prefetch={false} className="rounded-lg border border-primary px-5 py-3 text-sm font-semibold text-primary">Documentos de la atención</Link>}
          {appointment.patient && <Link href={`/medico/pacientes/${appointment.patient.id}/antecedentes${encounter ? `?encounterId=${encounter.id}` : ""}`} prefetch={false} className="rounded-lg border border-primary px-5 py-3 text-sm font-semibold text-primary">Antecedentes generales</Link>}
          {canStart && !opened && <button type="button" onClick={() => void start()} disabled={saving || sessionExpired} className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-50">{saving ? "Abriendo…" : encounter ? "Recuperar borrador" : "Iniciar cita"}</button>}
          {opened?.status === "DRAFT" && <Link href={`/medico/citas/${appointmentId}?ficha=1`} prefetch={false} className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary">Completar ficha</Link>}
          {(encounter?.status === "CLOSED" || appointment.status === "ATTENDED") && <Link href={`/medico/citas/${appointmentId}?ficha=1`} prefetch={false} className="rounded-lg border border-primary px-5 py-3 text-sm font-semibold text-primary">Consultar atención</Link>}
          {!canStart && !encounter && <p className="text-sm text-text-secondary">Esta cita ya no puede iniciarse.</p>}
        </div>
      </article> : !error && <p role="status" className="rounded-xl bg-surface p-6 text-text-secondary">No se encontró una cita asignada a tu cuenta.</p>}
    {error && <div className="flex flex-wrap gap-3">
      <button type="button" disabled={saving || loading} onClick={() => void load()} className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary">Reintentar carga</button>
      {sessionExpired && <Link href="/iniciar-sesion?error=session" className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary">Volver a iniciar sesión</Link>}
    </div>}
  </section>;
}
