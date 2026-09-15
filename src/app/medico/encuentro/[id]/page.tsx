"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getAppointment, getClinicalHistory, getOrCreateClinicalEncounter, getQueueEntry } from "@/lib/demo-booking-store";
import { getMockPatient, type MockClinicalEncounter, type MockQueueEntry } from "@/lib/mock-clinic";
import { MOCK_USERS } from "@/lib/mock-users";

const formRoute: Record<string, string> = {
  "Especialidad 1": "/medico/fichas/especialidad-1",
  "Especialidad 2": "/medico/fichas/especialidad-2",
  "Especialidad 3": "/medico/fichas/especialidad-3",
  "Especialidad 4": "/medico/fichas/especialidad-4",
};

const queueStatus = { WAITING: "En espera", CALLED: "Paciente llamado", IN_SERVICE: "En atención", COMPLETED: "Atendido" } as const;

export default function ClinicalEncounterPage() {
  const params = useParams<{ id: string }>();
  const doctor = MOCK_USERS.find((user) => user.role === "medico")!;
  const doctorId = "MED-001";
  const [entry, setEntry] = useState<MockQueueEntry | undefined>();
  const [patientId, setPatientId] = useState<string | undefined>();
  const [encounter, setEncounter] = useState<MockClinicalEncounter | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const queueEntry = getQueueEntry(params.id);
      setEntry(queueEntry);
      setPatientId(queueEntry ? getAppointment(queueEntry.appointmentId)?.patientId : undefined);
      setEncounter(getOrCreateClinicalEncounter(params.id, doctorId));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params.id, doctorId]);

  const patient = getMockPatient(encounter?.patientId ?? patientId);
  const history = patient ? getClinicalHistory(patient.id, doctorId) : [];
  const canStartEncounter = entry?.status === "CALLED" || entry?.status === "IN_SERVICE";

  if (!entry || entry.doctorId !== doctorId) {
    return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="schedule" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={doctor.name} /><div className="mx-auto max-w-3xl p-5 sm:p-8"><Link href="/medico/agenda" className="text-sm font-semibold text-primary hover:underline">← Volver a agenda y cola</Link><section className="mt-6 rounded-2xl border border-error-container bg-error-container p-6"><h1 className="text-2xl font-bold text-text-primary">Resumen no disponible</h1><p className="mt-2 text-sm text-text-secondary">Solo puedes consultar información de pacientes asignados a tu propia cola.</p></section></div></main></div>;
  }

  const fichaHref = encounter ? `${formRoute[encounter.specialty]}?cola=${encodeURIComponent(entry.id)}` : "";

  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="schedule" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={doctor.name} /><div className="mx-auto max-w-4xl p-5 sm:p-8"><Link href={`/medico/atencion/${entry.id}`} className="text-sm font-semibold text-primary hover:underline">← Contexto de cita</Link><header className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-secondary">RESUMEN CLÍNICO AUTORIZADO</p><h1 className="mt-1 text-3xl font-bold text-text-primary">{patient?.name ?? entry.patientName}</h1><p className="mt-2 text-text-secondary">{entry.specialty} · {queueStatus[entry.status]}</p></div><span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${encounter?.status === "DRAFT" ? "bg-warning-container text-warning" : encounter?.status === "FINALIZED" ? "bg-success-container text-success" : "bg-secondary-container text-secondary"}`}>{encounter?.status === "DRAFT" ? "Borrador activo" : encounter?.status === "FINALIZED" ? "Finalizado" : "Sin encuentro activo"}</span></header><section className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 className="text-lg font-bold text-text-primary">Encuentros previos permitidos</h2><p className="mt-1 text-sm text-text-secondary">Historial autorizado de este paciente, disponible antes de iniciar la atención.</p>{history.length ? <div className="mt-4 divide-y divide-divider">{history.map((item) => <div key={item.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-text-primary">{item.specialty}</p><span className="text-xs font-medium text-text-secondary">{new Date(item.endedAt ?? item.updatedAt).toLocaleDateString("es-BO")}</span></div><p className="mt-1 text-sm text-text-secondary">Encuentro finalizado · metadata autorizada</p></div>)}</div> : <p className="mt-4 text-sm text-text-secondary">No hay encuentros previos autorizados para este paciente.</p>}</article><article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 className="text-lg font-bold text-text-primary">Atención actual</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-text-secondary">Cita</dt><dd className="mt-0.5 font-semibold text-text-primary">{entry.scheduledTime} · {entry.specialty}</dd></div><div><dt className="text-text-secondary">Estado de cola</dt><dd className="mt-0.5 font-semibold text-text-primary">{queueStatus[entry.status]}</dd></div>{encounter && <div><dt className="text-text-secondary">Último guardado</dt><dd className="mt-0.5 font-semibold text-text-primary">{new Date(encounter.updatedAt).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}</dd></div>}</dl>{canStartEncounter && encounter ? <Link href={fichaHref} className="mt-6 inline-flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">{encounter.status === "DRAFT" ? "Abrir ficha y continuar" : "Ver ficha finalizada"}</Link> : <div className="mt-6 rounded-xl bg-surface-secondary p-4 text-sm leading-6 text-text-secondary">Este paciente está en espera. Puedes revisar su historia ahora; la ficha se habilitará al llamarlo e iniciar la atención.</div>}</article></section></div></main></div>;
}
