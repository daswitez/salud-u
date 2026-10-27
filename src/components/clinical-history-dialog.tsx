"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ClinicalBackgroundSummary } from "@/components/clinical-background";
import { formatAppointmentTime } from "@/components/medical-appointments";
import { ReviewSnapshot, SpecialtySnapshot, type PatientRecord } from "@/components/medical-patient-record";
import { ApiRequestError, apiJson } from "@/lib/api/client";

type SearchResult = { id: string };
const field = "mt-1 w-full rounded-lg border border-divider bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

/** RNF-08: historia autorizada en un diálogo, sin salir ni tocar el formulario de la atención en curso. */
export function ClinicalHistoryDialog({ patientId, currentEncounterId }: { patientId: string; currentEncounterId: string }) {
  const dialog = useRef<HTMLDialogElement>(null), feedback = useRef<HTMLParagraphElement>(null), generation = useRef(0);
  const [open, setOpen] = useState(false), [record, setRecord] = useState<PatientRecord | null>(null), [loading, setLoading] = useState(false);
  const [error, setError] = useState(""), [expired, setExpired] = useState(false);
  const [filters, setFilters] = useState({ q: "", from: "", to: "" }), [matching, setMatching] = useState<string[] | null>(null);

  async function read(requested: typeof filters | null) {
    const current = ++generation.current; setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(requested ?? {}).filter(([, value]) => value));
      const [data, found] = await Promise.all([
        apiJson<PatientRecord>(`/api/medical/patients/${patientId}`),
        requested && params.size ? apiJson<SearchResult[]>(`/api/medical/patients/${patientId}/search?${params}`) : Promise.resolve(null),
      ]);
      if (current !== generation.current) return;
      setRecord(data); setMatching(found?.map(item => item.id) ?? null); setError(""); setExpired(false);
    } catch (cause) {
      if (current !== generation.current) return;
      setError(cause instanceof ApiRequestError ? cause.message : "No pudimos cargar la historia. Lo que escribiste en la ficha se conserva; vuelve a intentar.");
      setExpired(cause instanceof ApiRequestError && cause.status === 401);
    } finally { if (current === generation.current) setLoading(false); }
  }

  // Cada apertura relee la historia; si falla, se conserva la última lectura junto al error.
  function show() { setOpen(true); void read(matching ? filters : null); }
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); }, [open]);
  useEffect(() => { if (error) feedback.current?.focus(); }, [error]);

  const closed = (record?.encounters ?? []).filter(item => item.status === "CLOSED" && item.id !== currentEncounterId)
    .filter(item => !matching || matching.includes(item.id))
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  return <>
    <button type="button" onClick={show} aria-haspopup="dialog" className="fixed bottom-24 right-5 z-40 rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-lg hover:bg-primary-hover focus:outline-none focus:ring-4 focus:ring-primary-container md:bottom-5">Ver historia clínica</button>
    {open && <dialog ref={dialog} aria-labelledby="clinical-history-title" onClose={() => setOpen(false)} className="fixed inset-0 m-auto max-h-[90vh] w-[95vw] max-w-3xl overflow-auto rounded-2xl bg-surface p-6 backdrop:bg-black/40">
      <header className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-semibold text-primary">HISTORIA CLÍNICA AUTORIZADA</p><h2 id="clinical-history-title" className="mt-1 text-2xl font-bold">{record ? `Historia de ${record.patient.fullName}` : "Historia del paciente"}</h2><p className="mt-1 text-sm text-text-secondary">Consulta sin salir de la atención: la ficha conserva lo que ya escribiste.</p></div>
        <button type="button" onClick={() => dialog.current?.close()} className="rounded-lg border border-divider px-3 py-2 text-sm font-semibold">Cerrar historia</button>
      </header>
      {error && <div className="mt-4 space-y-2"><p ref={feedback} tabIndex={-1} role="alert" className="font-semibold text-error">{error}</p>
        {expired && <Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="block font-semibold text-primary">Iniciar sesión en otra pestaña y volver</Link>}
        <button type="button" onClick={() => void read(matching ? filters : null)} className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary">Reintentar</button></div>}
      {loading && <p role="status" className="mt-4">Cargando historia…</p>}
      {record && <>
        <div className="mt-5"><ClinicalBackgroundSummary version={record.clinicalBackground} compact /></div>
        <form onSubmit={event => { event.preventDefault(); void read(filters); }} className="mt-5 grid gap-3 rounded-xl border border-divider bg-surface-secondary p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <label className="text-sm font-semibold">Buscar en la historia<input value={filters.q} onChange={event => setFilters({ ...filters, q: event.target.value })} className={field} /></label>
          <label className="text-sm font-semibold">Desde<input type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} className={field} /></label>
          <label className="text-sm font-semibold">Hasta<input type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} className={field} /></label>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">Buscar</button>
        </form>
        <section className="mt-5" aria-labelledby="clinical-history-encounters"><h3 id="clinical-history-encounters" className="text-lg font-bold">Atenciones previas ({closed.length})</h3>
          <div className="mt-3 space-y-3">{closed.map(item => {
            const diagnoses = record.diagnoses.filter(diagnosis => diagnosis.encounter_id === item.id).map(diagnosis => diagnosis.label);
            return <details key={item.id} className="rounded-xl border border-divider p-4"><summary className="cursor-pointer font-semibold">{item.accessReason === "REFERRAL_SOURCE" ? "Origen de derivación autorizado" : item.encounter_type === "INITIAL" ? "Revisión médica" : item.specialty ?? "Especialidad"} · {formatAppointmentTime(item.occurred_at)} · {item.chief_complaint ?? "Motivo no registrado"}</summary>
              <dl className="mt-3 space-y-2 text-sm"><div><dt className="font-semibold">Evaluación</dt><dd>{item.assessment ?? "Sin evaluación registrada."}</dd></div><div><dt className="font-semibold">Diagnósticos</dt><dd>{diagnoses.join(" · ") || "Sin diagnósticos registrados."}</dd></div><div><dt className="font-semibold">Indicaciones</dt><dd>{item.instructions ?? "Sin indicaciones registradas."}</dd></div><div><dt className="font-semibold">Seguimiento</dt><dd>{item.follow_up_text ?? "Sin seguimiento registrado."}</dd></div></dl>
              {item.encounter_type === "INITIAL" ? <ReviewSnapshot data={item.reviewHistory} hideGeneral /> : <SpecialtySnapshot data={item.specialtyHistory} hideGeneral />}
            </details>;
          })}{!closed.length && <p>{matching ? "No hay atenciones que coincidan con la búsqueda." : "No hay atenciones cerradas anteriores en el historial autorizado."}</p>}</div>
        </section>
        <Link href={`/medico/pacientes/${patientId}`} target="_blank" rel="noopener" className="mt-5 block font-semibold text-primary">Abrir historia completa con documentos en otra pestaña</Link>
      </>}
    </dialog>}
  </>;
}
