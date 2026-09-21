"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { StudentShell } from "@/components/student-shell";
import { apiJson } from "@/lib/api/client";

export default function ReserveInitialCarePage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function requestAppointment() { setSaving(true); try { const result = await apiJson<{ id: string }>("/api/appointment-requests", { method: "POST" }); router.push(`/estudiante/citas/${result.id}?nueva=1`); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "No se pudo registrar la solicitud."); setSaving(false); } }
  return <StudentShell active="request"><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><Link href="/estudiante/buscar" className="text-sm font-semibold text-primary hover:underline">← Solicitud de cita</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-primary">CONFIRMAR SOLICITUD</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Solicitar revisión estudiantil</h1><p className="mt-2 text-text-secondary">No eliges especialidad ni profesional. Administración revisará tu solicitud y asignará un cupo publicado.</p></header><article className="mt-7 rounded-2xl border border-divider bg-surface p-6"><dl className="space-y-4 text-sm"><div><dt className="text-text-secondary">Tipo de atención</dt><dd className="mt-1 font-semibold text-text-primary">Revisión estudiantil inicial</dd></div><div><dt className="text-text-secondary">Estado inicial</dt><dd className="mt-1 font-semibold text-text-primary">Pendiente de asignación</dd></div></dl>{message && <p role="alert" className="mt-5 rounded-lg bg-warning-container p-3 text-sm text-warning">{message}</p>}<button onClick={requestAppointment} disabled={saving} className="mt-7 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60">{saving ? "Registrando…" : "Registrar solicitud"}</button></article></main></StudentShell>;
}
