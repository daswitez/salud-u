"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson, ApiRequestError } from "@/lib/api/client";
import { useSessionName } from "@/components/session-name";

type Request = { id: string; status: "PENDING" | "ASSIGNED" | "CANCELLED"; appointment: { id: string; status: string; scheduled_for: string; doctorName: string; endsAt: string | null } | null };
const appointmentLabels: Record<string, string> = { SCHEDULED: "Confirmada", CHECKED_IN: "Llegada registrada" };
const when = (value: string) => new Intl.DateTimeFormat("es-BO", { dateStyle: "full", timeStyle: "short", timeZone: "America/La_Paz" }).format(new Date(value));

/** Inicio del estudiante con sus solicitudes reales en Spring; sin datos de ejemplo. */
export function StudentOverview() {
  const name = useSessionName();
  const [requests, setRequests] = useState<Request[] | null>(null), [error, setError] = useState(""), [expired, setExpired] = useState(false);
  const request = useRef<AbortController | null>(null), feedback = useRef<HTMLParagraphElement>(null);
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setRequests(null); setError(""); setExpired(false);
    try { const data = await apiJson<Request[]>("/api/appointment-requests", { signal: controller.signal }); if (controller.signal.aborted) return; if (!Array.isArray(data)) throw new Error("La respuesta de solicitudes no es válida."); setRequests(data); }
    catch (cause) { if (controller.signal.aborted) return; setExpired(cause instanceof ApiRequestError && cause.status === 401); setError(cause instanceof ApiRequestError && cause.status === 401 ? "Tu sesión expiró. Vuelve a iniciar sesión para ver tus citas." : cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "No se pudieron cargar tus citas por un problema de conexión."); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => { window.clearTimeout(timer); request.current?.abort(); }; }, [load]);
  useEffect(() => { if (error) feedback.current?.focus(); }, [error]);
  const upcoming = (requests ?? []).filter(r => r.status === "ASSIGNED" && r.appointment && (r.appointment.status === "CHECKED_IN" || (r.appointment.status === "SCHEDULED" && new Date(r.appointment.endsAt ?? r.appointment.scheduled_for) >= new Date()))).sort((a, b) => a.appointment!.scheduled_for.localeCompare(b.appointment!.scheduled_for));
  const next = upcoming[0], pending = (requests ?? []).filter(r => r.status === "PENDING").length;
  return <main className="mx-auto max-w-5xl space-y-6 px-5 py-6 md:px-8 md:py-8" aria-busy={requests === null && !error}>
    <header><p className="text-sm font-semibold tracking-wide text-primary">MI SALUD UNIVERSITARIA</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Hola{name ? `, ${name.split(" ")[0]}` : ""}</h1><p className="mt-2 text-text-secondary">Consulta tus citas, solicita una revisión y revisa tu carnet de vacunación.</p></header>
    <section aria-labelledby="next-appointment-heading" className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="next-appointment-heading" className="text-lg font-semibold text-text-primary">Próxima cita</h2><Link href="/estudiante/citas" className="text-sm font-semibold text-primary hover:underline">Ver mis citas</Link></div>
      {requests === null && !error && <p role="status" className="mt-4 text-sm">Consultando tus citas…</p>}
      {error && <div className="mt-4 space-y-3"><p ref={feedback} tabIndex={-1} role="alert" className="rounded-lg bg-error-container p-4 text-sm text-error">{error}</p>{expired ? <Link href="/iniciar-sesion?error=session" className="font-semibold text-primary">Iniciar sesión</Link> : <button type="button" onClick={() => void load()} className="rounded-lg border border-primary px-4 py-2 text-sm">Reintentar</button>}</div>}
      {requests && (next ? <><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-text-secondary">Fecha y hora</dt><dd className="mt-1 font-semibold">{when(next.appointment!.scheduled_for)}</dd></div><div><dt className="text-text-secondary">Médico</dt><dd className="mt-1 font-semibold">{next.appointment!.doctorName}</dd></div><div><dt className="text-text-secondary">Estado</dt><dd className="mt-1 font-semibold">{appointmentLabels[next.appointment!.status] ?? next.appointment!.status}</dd></div></dl><Link href={`/estudiante/citas/${next.id}`} className="mt-3 inline-block font-semibold text-primary hover:underline">Ver detalle de la cita →</Link></>
        : <p className="mt-4 text-sm text-text-secondary">No tienes citas confirmadas próximas.</p>)}
      {requests && pending > 0 && <p role="status" className="mt-4 text-sm">{pending} solicitud(es) esperando que Administración asigne un cupo.</p>}
    </section>
    <nav aria-label="Accesos rápidos" className="grid gap-4 sm:grid-cols-3">{[["/estudiante/buscar", "Solicitar cita de revisión", "Administración asigna el cupo disponible."], ["/estudiante/citas", "Mis citas", "Estado, médico y horario de cada solicitud."], ["/estudiante/vacunas", "Mi carnet de vacunación", "Vacunas, dosis aplicadas y estado del esquema."]].map(([href, title, detail]) => <Link key={href} href={href} className="rounded-2xl border border-divider bg-surface p-5 hover:border-primary"><span className="block font-semibold text-primary">{title} →</span><span className="mt-1 block text-sm text-text-secondary">{detail}</span></Link>)}</nav>
  </main>;
}
