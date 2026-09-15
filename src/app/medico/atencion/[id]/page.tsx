"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getAppointment, getQueueEntry } from "@/lib/demo-booking-store";
import { getMockPatient, type MockAppointment, type MockQueueEntry } from "@/lib/mock-clinic";
import { MOCK_USERS } from "@/lib/mock-users";

const queueStatus = { WAITING: "En espera", CALLED: "Llamado", IN_SERVICE: "En atención", COMPLETED: "Atendido" } as const;

export default function MedicalAppointmentContextPage() {
  const params = useParams<{ id: string }>();
  const doctor = MOCK_USERS.find((user) => user.role === "medico")!;
  const doctorId = "MED-001";
  const [entry, setEntry] = useState<MockQueueEntry | undefined>();
  const [appointment, setAppointment] = useState<MockAppointment | undefined>();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const queueEntry = getQueueEntry(params.id);
      setEntry(queueEntry);
      setAppointment(queueEntry ? getAppointment(queueEntry.appointmentId) : undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params.id]);

  if (!entry || entry.doctorId !== doctorId) {
    return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="schedule" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={doctor.name} /><div className="mx-auto max-w-3xl p-5 sm:p-8"><Link href="/medico/agenda" className="text-sm font-semibold text-primary hover:underline">← Volver a agenda y cola</Link><section className="mt-6 rounded-2xl border border-error-container bg-error-container p-6"><p className="text-sm font-semibold text-error">ACCESO RESTRINGIDO</p><h1 className="mt-2 text-2xl font-bold text-text-primary">No tienes una relación asistencial permitida</h1><p className="mt-3 text-sm leading-6 text-text-secondary">El contexto se muestra únicamente al personal médico asignado al paciente de su propia cola.</p></section></div></main></div>;
  }

  const modality = appointment?.modality ?? "Presencial";
  const patient = getMockPatient(appointment?.patientId);
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="schedule" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={doctor.name} /><div className="mx-auto max-w-3xl p-5 sm:p-8"><Link href="/medico/agenda" className="text-sm font-semibold text-primary hover:underline">← Volver a agenda y cola</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-secondary">CONTEXTO DE ATENCIÓN</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Cita de {entry.patientName}</h1><p className="mt-2 text-text-secondary">Información autorizada para preparar la atención, disponible incluso mientras el paciente espera.</p></header><section className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-7">{patient && <div className="rounded-xl border border-divider bg-surface-secondary p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-secondary">DETALLES DEL PACIENTE</p><h2 className="mt-1 text-xl font-bold text-text-primary">{patient.name}</h2></div><span className="rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-primary">{patient.studentCode}</span></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-text-secondary">Carrera</dt><dd className="mt-1 font-semibold text-text-primary">{patient.career}</dd></div><div><dt className="text-text-secondary">Correo institucional</dt><dd className="mt-1 font-semibold text-text-primary">{patient.email}</dd></div><div><dt className="text-text-secondary">Teléfono</dt><dd className="mt-1 font-semibold text-text-primary">{patient.phone}</dd></div><div><dt className="text-text-secondary">Contacto de emergencia</dt><dd className="mt-1 font-semibold text-text-primary">{patient.emergencyContact}</dd></div></dl></div>}<dl className="mt-6 grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-text-secondary">Especialidad</dt><dd className="mt-1 font-semibold text-text-primary">{entry.specialty}</dd></div><div><dt className="text-sm text-text-secondary">Horario</dt><dd className="mt-1 font-semibold text-text-primary">{entry.scheduledTime}</dd></div><div><dt className="text-sm text-text-secondary">Modalidad</dt><dd className="mt-1 font-semibold text-text-primary">{modality}</dd></div><div><dt className="text-sm text-text-secondary">Estado actual</dt><dd className="mt-1 font-semibold text-text-primary">{queueStatus[entry.status]}</dd></div></dl><div className="mt-7 rounded-xl bg-surface-secondary p-4"><h2 className="font-bold text-text-primary">Historia clínica</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Consulta los encuentros autorizados antes de atender. La ficha se habilita recién cuando el paciente es llamado o está en atención.</p><Link href={`/medico/encuentro/${entry.id}`} className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Ver historia clínica</Link></div></section></div></main></div>;
}
