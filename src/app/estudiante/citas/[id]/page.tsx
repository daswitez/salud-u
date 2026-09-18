"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { StudentShell } from "@/components/student-shell";
import { apiJson } from "@/lib/api/client";

type Request = { id: string; status: "PENDING" | "ASSIGNED" | "CANCELLED"; cancellation_reason: string | null; appointment: { id: string; status: string; scheduled_for: string; checked_in_at: string | null } | null };

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>(); const searchParams = useSearchParams();
  const [request, setRequest] = useState<Request>(); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function load() { try { const records = await apiJson<Request[]>("/api/appointment-requests"); setRequest(records.find((item) => item.id === id)); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la solicitud."); } }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [id]);
  async function cancel() { setSaving(true); try { await apiJson(`/api/appointment-requests/${id}`, { method: "PATCH", body: JSON.stringify({ action: "cancel" }) }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cancelar."); } finally { setSaving(false); } }
  if (!request) return <StudentShell active="appointments"><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><h1 className="text-2xl font-bold text-text-primary">{error || "Cargando solicitud…"}</h1><Link href="/estudiante/citas" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">← Mis citas</Link></main></StudentShell>;
  const canCancel = request.status === "PENDING" || (request.status === "ASSIGNED" && request.appointment?.status === "SCHEDULED");
  const title = request.status === "PENDING" ? "Solicitud registrada" : request.status === "ASSIGNED" ? "Cita confirmada" : "Solicitud cancelada";
  return <StudentShell active="appointments"><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><Link href="/estudiante/citas" className="text-sm font-semibold text-primary hover:underline">← Mis citas</Link>{searchParams.get("nueva") && <p className="mt-5 rounded-xl bg-success-container p-4 text-sm text-success"><span className="font-semibold">Solicitud registrada.</span> Administración revisará y asignará un cupo disponible.</p>}{error && <p role="alert" className="mt-5 rounded-xl bg-error-container p-4 text-sm text-error">{error}</p>}<article className="mt-5 rounded-2xl border border-divider bg-surface p-6"><p className="text-sm font-semibold text-primary">CITA DE REVISIÓN ESTUDIANTIL</p><h1 className="mt-1 text-3xl font-bold text-text-primary">{title}</h1><dl className="mt-7 grid gap-5 border-y border-divider py-6 text-sm sm:grid-cols-2"><div><dt className="text-text-secondary">Tipo de atención</dt><dd className="mt-1 font-semibold text-text-primary">Revisión estudiantil inicial</dd></div><div><dt className="text-text-secondary">Horario</dt><dd className="mt-1 font-semibold text-text-primary">{request.appointment ? new Date(request.appointment.scheduled_for).toLocaleString("es-BO", { dateStyle: "full", timeStyle: "short" }) : "Pendiente de asignación"}</dd></div></dl>{request.status === "ASSIGNED" && <p className="mt-6 rounded-xl bg-primary-container p-4 text-sm text-primary">Asiste a la fecha asignada. Administración registrará tu ingreso al llegar.</p>}{canCancel && <button disabled={saving} onClick={cancel} className="mt-7 rounded-lg border border-error px-5 py-2.5 text-sm font-semibold text-error disabled:opacity-50">{saving ? "Cancelando…" : "Cancelar solicitud"}</button>}</article></main></StudentShell>;
}
