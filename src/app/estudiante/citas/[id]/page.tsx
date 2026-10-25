"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { StudentShell } from "@/components/student-shell";
import { apiJson } from "@/lib/api/client";

type Request = { id: string; status: "PENDING" | "ASSIGNED" | "CANCELLED"; cancellation_reason: string | null; appointment: { id: string; status: string; scheduled_for: string; doctorName: string; endsAt: string | null; checked_in_at: string | null } | null };

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>(); const searchParams = useSearchParams();
  const [request, setRequest] = useState<Request>(); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const feedback = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    try {
      const records = await apiJson<Request[]>("/api/appointment-requests");
      setRequest(records.find((item) => item.id === id)); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la solicitud."); throw cause; }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { const timer = window.setTimeout(() => { void load().catch(() => {}); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (error || notice) feedback.current?.focus(); }, [error, notice]);
  async function cancel() {
    setSaving(true); setError(""); setNotice("");
    try {
      await apiJson(`/api/appointment-requests/${id}`, { method: "PATCH", body: JSON.stringify({ action: "cancel", reason: reason.trim() || null }) });
      await load(); setNotice("Solicitud cancelada correctamente.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cancelar."); }
    finally { setSaving(false); }
  }
  if (!request) return <StudentShell active="appointments"><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><h1 className="text-2xl font-bold text-text-primary">{loading ? "Cargando solicitud…" : error || "Solicitud no encontrada."}</h1>{error && <button type="button" onClick={() => void load().catch(() => {})} className="mt-4 rounded-lg border border-primary px-4 py-2 text-primary">Reintentar carga</button>}<Link href="/estudiante/citas" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">← Mis citas</Link></main></StudentShell>;
  const canCancel = request.status === "PENDING" || (request.status === "ASSIGNED" && request.appointment?.status === "SCHEDULED");
  const title = request.status === "PENDING" ? "Solicitud registrada" : request.status === "ASSIGNED" ? "Cita confirmada" : "Solicitud cancelada";
  return <StudentShell active="appointments"><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><Link href="/estudiante/citas" className="text-sm font-semibold text-primary hover:underline">← Mis citas</Link>{searchParams.get("nueva") && request.status === "PENDING" && <p className="mt-5 rounded-xl bg-success-container p-4 text-sm text-success"><span className="font-semibold">Solicitud registrada.</span> Administración revisará y asignará un cupo disponible.</p>}<div ref={feedback} tabIndex={-1}>{notice && <p role="status" className="mt-5 rounded-xl bg-success-container p-4 text-sm text-success">{notice}</p>}{error && <p role="alert" className="mt-5 rounded-xl bg-error-container p-4 text-sm text-error">{error}</p>}</div><article className="mt-5 rounded-2xl border border-divider bg-surface p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">CITA DE REVISIÓN ESTUDIANTIL</p><h1 className="mt-1 text-3xl font-bold text-text-primary">{title}</h1></div><span className="rounded-full bg-primary-container px-3 py-1.5 text-sm font-semibold text-primary">{request.status === "CANCELLED" ? "Cancelada" : request.appointment?.status === "CHECKED_IN" ? "Ingresó" : request.appointment?.status === "NO_SHOW" ? "No asistió" : request.appointment?.status === "ATTENDED" ? "Atendida" : request.appointment ? "Confirmada" : "Pendiente"}</span></div><dl className="mt-7 grid gap-5 border-y border-divider py-6 text-sm sm:grid-cols-2"><div><dt className="text-text-secondary">Tipo de atención</dt><dd className="mt-1 font-semibold text-text-primary">Revisión estudiantil inicial</dd></div><div><dt className="text-text-secondary">Médico asignado</dt><dd className="mt-1 font-semibold text-text-primary">{request.appointment?.doctorName ?? "Pendiente de asignación"}</dd></div><div><dt className="text-text-secondary">Inicio</dt><dd className="mt-1 font-semibold text-text-primary">{request.appointment ? new Date(request.appointment.scheduled_for).toLocaleString("es-BO", { dateStyle: "full", timeStyle: "short" }) : "Pendiente"}</dd></div><div><dt className="text-text-secondary">Fin estimado</dt><dd className="mt-1 font-semibold text-text-primary">{request.appointment?.endsAt ? new Date(request.appointment.endsAt).toLocaleTimeString("es-BO", { timeStyle: "short" }) : "—"}</dd></div></dl>{request.status === "ASSIGNED" && request.appointment?.status === "SCHEDULED" && <p className="mt-6 rounded-xl bg-primary-container p-4 text-sm text-primary">Asiste al horario indicado. Administración registrará tu ingreso al llegar.</p>}{request.status === "CANCELLED" && request.cancellation_reason && <p className="mt-6 rounded-xl bg-surface-secondary p-4 text-sm text-text-secondary">Motivo: {request.cancellation_reason}</p>}{canCancel && <><label className="mt-6 block text-sm font-semibold text-text-primary">Motivo de cancelación (opcional)<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} disabled={saving} className="mt-2 block w-full rounded-lg border border-border bg-surface p-3" /></label><button disabled={saving} onClick={cancel} className="mt-7 rounded-lg border border-error px-5 py-2.5 text-sm font-semibold text-error disabled:opacity-50">{saving ? "Cancelando…" : "Cancelar solicitud"}</button></>}</article></main></StudentShell>;
}
