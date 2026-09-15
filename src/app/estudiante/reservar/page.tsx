"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { StudentShell } from "@/components/student-shell";
import { confirmAppointment, createHold, getHold, releaseHold } from "@/lib/demo-booking-store";
import { getMockSlot, type AppointmentHold } from "@/lib/mock-clinic";
import { getPublishedBookableSlots } from "@/lib/demo-workforce-store";

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function ReservationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slotId = searchParams.get("slotId");
  const rescheduleId = searchParams.get("reprogramar") ?? undefined;
  const [slot, setSlot] = useState(() => getMockSlot(slotId));
  const [hold, setHold] = useState<AppointmentHold | null>(null);
  const [holdReady, setHoldReady] = useState(false);
  const [now, setNow] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSlot(getMockSlot(slotId) ?? getPublishedBookableSlots().find((item) => item.id === slotId)), 0);
    return () => window.clearTimeout(timer);
  }, [slotId]);

  useEffect(() => {
    if (!slot) return;
    const starter = window.setTimeout(() => {
      setHold(getHold(slot.id) ?? createHold(slot, rescheduleId));
      setNow(Date.now());
      setHoldReady(true);
    }, 0);
    return () => window.clearTimeout(starter);
  }, [slot, rescheduleId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expired = hold !== null && hold.expiresAt <= now;
  const searchHref = `/estudiante/buscar${rescheduleId ? `?reprogramar=${encodeURIComponent(rescheduleId)}` : ""}`;

  async function confirm() {
    if (!slot || !hold || expired || processing) return;
    setProcessing(true);
    setError("");
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    const appointment = confirmAppointment(slot, hold);
    if (!appointment) {
      setError("El horario dejó de estar disponible o la retención venció. No se creó ninguna cita.");
      setHold(null);
      setProcessing(false);
      return;
    }
    router.push(`/estudiante/citas/${appointment.id}?nueva=1`);
  }

  if (!slot) {
    return <StudentShell><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><h1 className="text-2xl font-bold text-text-primary">Horario no encontrado</h1><p className="mt-2 text-text-secondary">El horario solicitado no existe en los datos de demostración.</p><Link href="/estudiante/buscar" className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">Volver a buscar</Link></main></StudentShell>;
  }

  return <StudentShell><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><Link href={searchHref} className="inline-flex text-sm font-semibold text-primary hover:underline">← Volver a los horarios</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-primary">RESERVAR ATENCIÓN</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Confirma tu horario</h1><p className="mt-2 text-text-secondary">Revisá los datos antes de confirmar la reserva.</p></header>{rescheduleId && <div className="mt-5 rounded-xl border border-secondary-200 bg-secondary-container p-4 text-sm text-text-secondary"><span className="font-semibold text-secondary">Reprogramación en curso. </span>Tu cita actual se mantiene vigente hasta confirmar este nuevo horario.</div>}<article className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">{slot.specialty}</p><h2 className="mt-1 text-xl font-bold text-text-primary">{slot.doctor}</h2></div><span className={`rounded-full px-3 py-1 text-sm font-semibold ${!holdReady ? "bg-surface-secondary text-text-secondary" : !hold || expired ? "bg-error-container text-error" : "bg-warning-container text-warning"}`}>{!holdReady ? "Preparando retención…" : !hold ? "Horario no disponible" : expired ? "Retención vencida" : `Reservado por ${formatRemaining(hold.expiresAt - now)}`}</span></div><dl className="mt-7 grid gap-5 border-y border-divider py-6 sm:grid-cols-2"><div><dt className="text-sm text-text-secondary">Fecha y hora</dt><dd className="mt-1 font-semibold text-text-primary">{slot.weekday} · {slot.time}</dd></div><div><dt className="text-sm text-text-secondary">Modalidad</dt><dd className="mt-1 font-semibold text-text-primary">{slot.modality}</dd></div><div><dt className="text-sm text-text-secondary">Demanda estimada</dt><dd className="mt-1 font-semibold text-text-primary">{slot.demand}</dd></div><div><dt className="text-sm text-text-secondary">Espera aproximada</dt><dd className="mt-1 font-semibold text-text-primary">{slot.wait}</dd></div></dl>{error && <p role="alert" className="mt-5 rounded-lg bg-error-container p-3 text-sm text-error">{error}</p>}{!holdReady ? <p className="mt-6 text-sm text-text-secondary">Verificando disponibilidad del horario…</p> : !hold || expired ? <div className="mt-6"><p className="text-sm leading-6 text-text-secondary">{hold ? "Este horario fue liberado y no se creó una cita." : "Este horario ya fue tomado por otra reserva de demostración."} Puedes regresar a los resultados para elegir otro horario compatible.</p><Link href={searchHref} className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Volver a los resultados</Link></div> : <div className="mt-6 flex flex-wrap gap-3"><button onClick={confirm} disabled={processing} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60">{processing ? "Confirmando…" : "Confirmar reserva"}</button><Link onClick={() => releaseHold(slot.id)} href={searchHref} className="rounded-lg border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary-container">Cancelar</Link></div>}</article><p className="mt-5 text-xs leading-5 text-text-tertiary">Simulación: la retención se guarda en este navegador durante 10 minutos y evita confirmar dos veces el mismo cupo.</p></main></StudentShell>;
}

export default function ReservationPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-background text-text-secondary">Preparando reserva…</main>}><ReservationContent /></Suspense>;
}
