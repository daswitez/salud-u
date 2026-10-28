"use client";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api/client";

type Suggested = { rank: number; slotId: string; startsAt: string; endsAt: string; staffName: string; score: number; explanation: string; freePlaces: number };
type Result = { requestId: string; slots: Suggested[] };
const time = (value: string) => new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function SuggestedSlots({ requestId, disabled, onAssign }: { requestId: string; disabled: boolean; onAssign: (slotId: string) => void }) {
 const [result, setResult] = useState<Result | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [retry, setRetry] = useState(0);
 useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => { setLoading(true); setError(""); setResult(null); apiJson<Result>(`/api/appointment-requests/${requestId}/suggested-slots`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setResult(data); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron consultar las sugerencias."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); }, 0); return () => { window.clearTimeout(timer); controller.abort(); }; }, [requestId, retry]);
 return <section aria-label="Cupos sugeridos" className="mt-5 rounded-xl border border-primary-200 bg-primary-container/30 p-4"><h3 className="font-bold">Cupos sugeridos para esta solicitud</h3><p className="mt-1 text-sm text-text-secondary">Se muestran hasta tres opciones. También puedes elegir otro cupo compatible.</p>
 {loading && <p role="status" className="mt-3">Consultando cupos sugeridos…</p>}{error && <p role="alert" className="mt-3 text-error">{error} <button type="button" className="font-semibold underline" onClick={() => setRetry(x => x + 1)}>Reintentar</button></p>}
 {!loading && result?.requestId === requestId && (result.slots.length ? <div className="mt-3 grid gap-3 lg:grid-cols-3">{result.slots.map(slot => <article key={slot.slotId} data-suggested-slot-id={slot.slotId} className="rounded-xl border border-divider bg-surface p-4"><p className="text-sm font-bold text-primary">Opción {slot.rank} · Puntaje {new Intl.NumberFormat("es-BO", {maximumFractionDigits:1}).format(slot.score)}</p><p className="mt-2 font-semibold">{slot.staffName}</p><p className="text-sm">{time(slot.startsAt)} · Bolivia</p><p className="mt-2 text-sm leading-6">{slot.explanation}</p><button type="button" disabled={disabled} onClick={() => onAssign(slot.slotId)} className="mt-3 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">Asignar este cupo</button></article>)}</div> : <p className="mt-3 text-sm">No hay cupos sugeridos disponibles para esta solicitud.</p>)}
 </section>;
}
