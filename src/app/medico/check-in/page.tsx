"use client";

import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { checkInByReference, type CheckInResult } from "@/lib/demo-booking-store";
import { MOCK_USERS } from "@/lib/mock-users";

const errors = {
  NOT_FOUND: "No encontramos una cita con ese comprobante.",
  INVALID: "La cita no es apta para registrar llegada: verifica fecha, modalidad, estado y vigencia.",
  ALREADY_CHECKED_IN: "La llegada ya fue registrada anteriormente.",
};

export default function DoctorCheckInPage() {
  const doctor = MOCK_USERS.find((user) => user.role === "medico")!;
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(checkInByReference(reference));
  }
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="checkin" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={doctor.name} /><div className="mx-auto max-w-4xl p-5 sm:p-8"><Link href="/medico" className="text-sm font-semibold text-primary hover:underline">← Inicio</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-secondary">ÁREA MÉDICA</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Validar llegada</h1><p className="mt-2 text-text-secondary">Escanea el comprobante QR o busca la cita antes de incorporarla a tu agenda y cola de atención.</p></header><section className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-7"><form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row"><label className="flex-1"><span className="sr-only">Token QR o identificador de cita</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ej.: qr_7Hd4mP2kX9 o CIT-2026-001" className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary-200" /></label><button disabled={!reference.trim()} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">Validar y registrar</button></form><p className="mt-3 text-xs leading-5 text-text-tertiary">El escaneo está simulado mediante este campo. Se valida token, fecha demo, modalidad presencial, estado y llegada única.</p>{result && <div className={`mt-6 rounded-xl border p-5 ${result.ok ? "border-success-container bg-success-container" : "border-error-container bg-error-container"}`} role="status">{result.ok ? <><p className="font-bold text-success">Llegada registrada</p><p className="mt-2 text-sm leading-6 text-text-secondary">{result.appointment.patientName} fue incorporada a tu cola. Tiempo de espera estimado: {result.entry.estimatedWait}.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/medico/agenda" className="rounded-lg border border-success px-4 py-2 text-sm font-semibold text-success hover:bg-surface">Abrir agenda y cola</Link><Link href="/estudiante/cola" className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-surface">Ver vista estudiante</Link></div></> : <><p className="font-bold text-error">No se pudo registrar la llegada</p><p className="mt-2 text-sm leading-6 text-text-secondary">{errors[result.reason]}</p></>}</div>}</section><section className="mt-7 rounded-2xl border border-primary-200 bg-primary-container p-5"><p className="text-sm font-semibold text-primary">DATOS DE PRUEBA</p><p className="mt-2 text-sm leading-6 text-text-secondary">Usa el token opaco <code className="rounded bg-surface px-1.5 py-0.5 font-semibold text-text-primary">qr_7Hd4mP2kX9</code> o la cita <code className="rounded bg-surface px-1.5 py-0.5 font-semibold text-text-primary">CIT-2026-001</code>.</p></section></div></main></div>;
}
