"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StudentShell } from "@/components/student-shell";
import { requestStudentInitialAppointment } from "@/lib/demo-booking-store";

const DEMO_STUDENT_ID = "PAT-2026-001";

export default function ReserveInitialCarePage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  function requestAppointment() {
    setSaving(true);
    const result = requestStudentInitialAppointment(DEMO_STUDENT_ID);
    if (result.ok) router.push(`/estudiante/citas/${result.data.id}?nueva=1`);
    else { setMessage(result.message); setSaving(false); }
  }
  return <StudentShell active="request"><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><Link href="/estudiante/buscar" className="text-sm font-semibold text-primary hover:underline">← Solicitud de cita</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-primary">CONFIRMAR SOLICITUD</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Solicitar revisión estudiantil</h1><p className="mt-2 text-text-secondary">No necesitas elegir especialidad ni profesional. Administración te asignará un cupo disponible.</p></header><article className="mt-7 rounded-2xl border border-divider bg-surface p-6"><dl className="space-y-4 text-sm"><div><dt className="text-text-secondary">Tipo de atención</dt><dd className="mt-1 font-semibold text-text-primary">Revisión estudiantil inicial</dd></div><div><dt className="text-text-secondary">Asignación</dt><dd className="mt-1 font-semibold text-text-primary">Pendiente de cupo administrativo</dd></div></dl>{message && <p role="alert" className="mt-5 rounded-lg bg-warning-container p-3 text-sm text-warning">{message}</p>}<button onClick={requestAppointment} disabled={saving} className="mt-7 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60">{saving ? "Registrando…" : "Registrar solicitud"}</button></article></main></StudentShell>;
}
