"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiRequestError, apiJson } from "@/lib/api/client";
import { todayInBolivia } from "@/lib/clinical-reports";
import { replaceUrl } from "@/lib/url-state";

type Slot = { slotId: string; startsAt: string; currentCapacity: number; suggestedCapacity: number; appliedCapacity?: number };
type Suggestion = {
  id: string; type: string; date: string; specialtyId: string | null; specialtyName: string | null; staffId: string | null; staffName: string | null;
  explanation: string; status: "PENDING" | "ACCEPTED" | "MODIFIED" | "REJECTED" | "EXPIRED"; expiresAt: string;
  suggestedValue: { capacity?: number; suggestedAppointments?: number; estimatedAttendance?: number; overbooking?: number; slots?: Slot[]; demandExceedsSupply?: boolean; daysWithoutEstimate?: number; projectedDemand?: number; freePlaces?: number };
  decision: { decidedAt: string; decidedByName: string | null; reason: string | null; appliedValue: { overbooking?: number; slots?: Slot[] } | null } | null;
};
type PublishedSlot = { id: string; specialtyId: string | null; startsAt: string; capacity: number; status: string; doctorName: string };
type StaffMember = { id: string; displayName: string; active: boolean };
type Choice = "ACCEPTED" | "MODIFIED" | "REJECTED";
const statusLabel: Record<Suggestion["status"], string> = { PENDING: "Pendiente", ACCEPTED: "Aceptada", MODIFIED: "Modificada", REJECTED: "Rechazada", EXPIRED: "Vencida" };
const button = "min-h-10 rounded-lg border border-primary-200 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50";
const field = "mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text-primary";
const boliviaDate = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const formatTime = (value: string) => new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function errorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Tu sesión terminó. Inicia sesión nuevamente para continuar.";
    if (error.status === 403) return "No tienes permiso para consultar o decidir estas sugerencias.";
    if (error.status < 500) return error.message;
  }
  return "No pudimos comunicarnos con el servidor. Inténtalo nuevamente.";
}

function title(item: Suggestion) {
  if (item.type === "DAY_SLOTS") return "Cupos de la jornada";
  if (item.type === "OVERBOOKING") return "Sobrecupo sugerido";
  if (item.type === "CAPACITY_ALERT") return item.suggestedValue.demandExceedsSupply ? "Alerta: jornada adicional" : "Alerta: liberar o reasignar horarios";
  return "Otra sugerencia";
}

function source(item: Suggestion) {
  if (item.type === "CAPACITY_ALERT") {
    const days = item.suggestedValue.daysWithoutEstimate;
    return days ? `En ${days} ${days === 1 ? "día se usó" : "días se usó"} la capacidad publicada como referencia; no se detalla la fuente de los demás días.` : "La fuente específica de demanda no está detallada en esta alerta.";
  }
  const origin = item.explanation.match(/\((valor inicial|estimación del médico|estimación de la especialidad|estimación del área)\)/i)?.[1];
  if (!origin) return "No indicada en la explicación.";
  return origin === "valor inicial" ? "Valor inicial" : origin.replace(/^estimación/i, "Estimación aprendida");
}

export function ScheduleSuggestions() {
  const [date, setDate] = useState(() => todayInBolivia());
  const [appliedDate, setAppliedDate] = useState("");
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [selected, setSelected] = useState<{ item: Suggestion; choice: Choice } | null>(null);
  const [reason, setReason] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [capacities, setCapacities] = useState<Record<string, string>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [slotsNotice, setSlotsNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [success, setSuccess] = useState("");
  const request = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const slotRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (day: string) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(""); setExpired(false);
    try {
      const data = await apiJson<Suggestion[]>("/api/scheduling/suggestions?date=" + encodeURIComponent(day), { signal: controller.signal });
      if (!Array.isArray(data)) throw new Error("Respuesta inválida");
      if (!controller.signal.aborted) { setItems(data); setAppliedDate(day); replaceUrl("/administrativo/planificacion?date=" + encodeURIComponent(day)); }
    } catch (cause) {
      if (!controller.signal.aborted) { setItems(null); setError(errorMessage(cause)); setExpired(cause instanceof ApiRequestError && cause.status === 401); }
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requested = new URLSearchParams(window.location.search).get("date");
      const initial = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayInBolivia();
      setDate(initial); void load(initial);
    }, 0);
    return () => { window.clearTimeout(timer); request.current?.abort(); slotRequest.current?.abort(); };
  }, [load]);

  async function loadSlots(item: Suggestion) {
    slotRequest.current?.abort();
    const controller = new AbortController(); slotRequest.current = controller; setSlotsLoading(true); setSlotsError(""); setSlotsNotice("");
    const proposed = item.suggestedValue.slots ?? [];
    try {
      const [published, staff] = await Promise.all([
        apiJson<PublishedSlot[]>("/api/availability-slots", { signal: controller.signal }),
        apiJson<StaffMember[]>("/api/v1/admin/staff", { signal: controller.signal }),
      ]);
      if (!Array.isArray(published) || !Array.isArray(staff)) throw new Error("Respuesta inválida");
      if (controller.signal.aborted) return;
      const sameName = staff.filter(person => person.active && person.displayName === item.staffName);
      if (sameName.length !== 1 || sameName[0].id !== item.staffId) {
        setSlots(proposed);
        setSlotsNotice("No se pueden distinguir todos los horarios de este profesional; se muestran solo los cupos sugeridos.");
        return;
      }
      const candidates = published.filter(slot => slot.status === "PUBLISHED" && slot.doctorName === item.staffName && slot.specialtyId === item.specialtyId && boliviaDate(slot.startsAt) === item.date && slot.capacity < 20)
        .map(slot => ({ slotId: slot.id, startsAt: slot.startsAt, currentCapacity: slot.capacity, suggestedCapacity: slot.capacity + 1 }));
      setSlots([...new Map([...candidates, ...proposed].map(slot => [slot.slotId, slot])).values()].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)));
    } catch { if (!controller.signal.aborted) setSlotsError("No se pudieron consultar otros cupos. Puedes usar los cupos sugeridos o reintentar."); }
    finally { if (!controller.signal.aborted) setSlotsLoading(false); }
  }

  async function begin(item: Suggestion, choice: Choice) {
    if (saving || loading) return;
    slotRequest.current?.abort();
    setSelected({ item, choice }); setReason(""); setDecisionError(""); setSuccess(""); setSlotsError(""); setSlotsNotice("");
    const proposed = item.suggestedValue.slots ?? [];
    setSlots(proposed); setCapacities(Object.fromEntries(proposed.map(slot => [slot.slotId, String(slot.suggestedCapacity)])));
    if (choice === "MODIFIED") await loadSlots(item);
    else setSlotsLoading(false);
  }

  function closeDecision() { if (!saving) { slotRequest.current?.abort(); setSelected(null); setDecisionError(""); } }

  async function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy.current) return;
    const trimmed = reason.trim();
    if (selected.choice !== "ACCEPTED" && !trimmed) { setDecisionError("Escribe un motivo para modificar o rechazar."); return; }
    const changedSlots = slots.filter(slot => capacities[slot.slotId] !== undefined && capacities[slot.slotId] !== "").map(slot => ({ slotId: slot.slotId, capacity: Number(capacities[slot.slotId]) }));
    if (selected.choice === "MODIFIED" && (slotsLoading || !changedSlots.length || changedSlots.length > 20 || changedSlots.some(entry => !Number.isInteger(entry.capacity) || entry.capacity <= (slots.find(slot => slot.slotId === entry.slotId)?.currentCapacity ?? 20) || entry.capacity > 20))) {
      setDecisionError("Indica entre uno y veinte cupos, con capacidad entera mayor que la actual y no superior a 20."); return;
    }
    busy.current = true; setSaving(true); setDecisionError("");
    try {
      const body = { decision: selected.choice, ...(trimmed ? { reason: trimmed } : {}), ...(selected.choice === "MODIFIED" ? { slots: changedSlots } : {}) };
      const updated = await apiJson<Suggestion>(`/api/scheduling/suggestions/${selected.item.id}/decision`, { method: "POST", body: JSON.stringify(body) });
      setItems(previous => previous?.map(item => item.id === updated.id ? updated : item) ?? [updated]);
      setSelected(null); setSuccess(`Decisión registrada: ${statusLabel[updated.status].toLowerCase()}.`);
    } catch (cause) {
      setDecisionError(errorMessage(cause)); setExpired(cause instanceof ApiRequestError && cause.status === 401);
    } finally { busy.current = false; setSaving(false); }
  }

  const visible = items?.filter(item => ["DAY_SLOTS", "OVERBOOKING", "CAPACITY_ALERT"].includes(item.type)) ?? [];
  const other = (items?.length ?? 0) - visible.length;
  return <>
    <header><p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">PLANIFICACIÓN DE AGENDA</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">Sugerencias de la jornada</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">Revisa los datos y la explicación antes de decidir. Las sugerencias no modifican la agenda hasta que las confirmes.</p><Link href="/administrativo/bloqueos" className="mt-4 inline-flex rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary">Bloqueos y reprogramación</Link></header>
    <form onSubmit={event => { event.preventDefault(); if (!date || saving) return; setSelected(null); setSuccess(""); void load(date); }} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-divider bg-surface p-4">
      <label className="text-sm font-semibold">Fecha de la jornada<input aria-label="Fecha de la jornada" type="date" required value={date} onChange={event => setDate(event.target.value)} className={field} /></label>
      <button disabled={loading || saving} className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">Consultar</button>
      <button type="button" disabled={loading || saving || !appliedDate} onClick={() => { setSelected(null); setSuccess(""); void load(appliedDate); }} className={button}>Actualizar</button>
    </form>
    {success && <p role="status" className="mt-4 rounded-xl bg-success-container p-4 text-sm font-semibold text-success">{success}</p>}
    {loading && <p role="status" className="mt-5 text-sm text-text-secondary">Cargando sugerencias…</p>}
    {error && <div role="alert" className="mt-5 rounded-xl bg-error-container p-4 text-sm text-error"><p>{error}</p>{expired ? <Link href="/iniciar-sesion?error=session" className="mt-2 inline-block font-semibold underline">Iniciar sesión</Link> : <button type="button" className="mt-2 font-semibold underline" onClick={() => void load(date)}>Reintentar</button>}</div>}
    {!loading && !error && items && <section aria-label="Sugerencias y alertas" className="mt-5 space-y-4">
      <p className="text-sm text-text-secondary">{visible.length} {visible.length === 1 ? "sugerencia o alerta" : "sugerencias y alertas"} · Fecha consultada: {appliedDate.split("-").reverse().join("/")}</p>
      {!visible.length && <div className="rounded-2xl border border-dashed border-divider bg-surface p-8 text-center"><h2 className="font-bold text-text-primary">No hay sugerencias para esta fecha</h2><p className="mt-2 text-sm text-text-secondary">Consulta otra jornada o vuelve después de la actualización de la agenda.</p></div>}
      {other > 0 && <p className="rounded-xl bg-info-container p-3 text-sm text-info">Hay {other} {other === 1 ? "sugerencia de otro proceso" : "sugerencias de otros procesos"}; su gestión corresponde al flujo de reprogramación.</p>}
      {visible.map(item => <article key={item.id} data-suggestion-id={item.id} className="rounded-2xl border border-divider bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">{item.specialtyName ?? "Revisión inicial"}{item.staffName ? ` · ${item.staffName}` : ""}</p><h2 className="mt-1 text-xl font-bold text-text-primary">{title(item)}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "PENDING" ? "bg-warning-container text-warning" : item.status === "EXPIRED" || item.status === "REJECTED" ? "bg-surface-secondary text-text-secondary" : "bg-success-container text-success"}`}>{statusLabel[item.status]}</span></div>
        <p className="mt-3 text-sm leading-6 text-text-primary">{item.explanation}</p><p className="mt-2 text-sm text-text-secondary"><strong>Fuente:</strong> {source(item)}</p>
        {(item.type === "DAY_SLOTS" || item.type === "OVERBOOKING") && <p className="mt-2 text-sm text-text-secondary">Capacidad: {item.suggestedValue.capacity ?? "—"} · Citas sugeridas: {item.suggestedValue.suggestedAppointments ?? "—"} · Asistencia: {item.suggestedValue.estimatedAttendance == null ? "—" : `${new Intl.NumberFormat("es-BO", { maximumFractionDigits: 1 }).format(item.suggestedValue.estimatedAttendance * 100)} %`}</p>}
        {item.type === "CAPACITY_ALERT" && <p className="mt-2 text-sm text-text-secondary">Demanda proyectada: {item.suggestedValue.projectedDemand ?? "—"} · Lugares libres: {item.suggestedValue.freePlaces ?? "—"}</p>}
        {item.type === "OVERBOOKING" && item.suggestedValue.slots?.map(slot => <p key={slot.slotId} className="mt-2 text-sm text-text-secondary">Cupo {formatTime(slot.startsAt)} · Capacidad actual {slot.currentCapacity} → sugerida {slot.suggestedCapacity}</p>)}
        <p className="mt-3 text-xs text-text-tertiary">Vence: {formatTime(item.expiresAt)} · Hora de Bolivia</p>
        {item.decision && <div className="mt-4 rounded-xl bg-surface-secondary p-4 text-sm"><p className="font-semibold">Decisión: {statusLabel[item.status]}{item.decision.decidedByName ? ` · ${item.decision.decidedByName}` : ""}</p><p className="mt-1">Registrada: {formatTime(item.decision.decidedAt)} · Bolivia</p>{item.decision.reason && <p className="mt-1 break-words">Motivo: {item.decision.reason}</p>}{item.decision.appliedValue?.slots?.map(slot => <p key={slot.slotId} className="mt-1">{formatTime(slot.startsAt)} · Capacidad aplicada: {slot.appliedCapacity}</p>)}</div>}
        {item.status === "PENDING" && <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={saving || loading} onClick={() => void begin(item, "ACCEPTED")} className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">Aceptar</button>{item.type === "OVERBOOKING" && <button type="button" disabled={saving || loading} onClick={() => void begin(item, "MODIFIED")} className={button}>Modificar</button>}<button type="button" disabled={saving || loading} onClick={() => void begin(item, "REJECTED")} className={button}>Rechazar</button></div>}
        {selected?.item.id === item.id && <form onSubmit={event => void decide(event)} className="mt-4 space-y-4 rounded-xl border border-primary-200 bg-primary-container/40 p-4">
          <h3 className="font-bold">{selected.choice === "ACCEPTED" ? "Confirmar aceptación" : selected.choice === "MODIFIED" ? "Modificar sobrecupo" : "Rechazar sugerencia"}</h3>
          <p className="text-sm text-text-secondary">{item.type === "OVERBOOKING" && selected.choice !== "REJECTED" ? "Al confirmar se actualiza la capacidad de los cupos indicados." : "Esta decisión registra tu revisión; no cambia las citas ni los cupos."}</p>
          {selected.choice === "MODIFIED" && <fieldset disabled={saving || slotsLoading} className="space-y-2"><legend className="text-sm font-semibold">Capacidad final por cupo</legend><p className="text-sm text-text-secondary">Deja en blanco los cupos que no quieras modificar. Se comprobará que pertenezcan a la jornada y respeten el límite permitido.</p>{slotsLoading && <p role="status">Consultando cupos…</p>}{slotsNotice && <p role="status" className="text-text-secondary">{slotsNotice}</p>}{slotsError && <p role="alert" className="text-error">{slotsError} <button type="button" onClick={() => void loadSlots(item)} className="underline">Reintentar</button></p>}{slots.map(slot => <label key={slot.slotId} className="grid gap-1 text-sm sm:grid-cols-[1fr_8rem] sm:items-center"><span>{formatTime(slot.startsAt)} · Actual: {slot.currentCapacity}</span><input type="number" min={slot.currentCapacity + 1} max={20} step={1} aria-label={`Capacidad final de ${formatTime(slot.startsAt)}`} value={capacities[slot.slotId] ?? ""} onChange={event => setCapacities(previous => ({ ...previous, [slot.slotId]: event.target.value }))} className={field} /></label>)}</fieldset>}
          <label className="block text-sm font-semibold">Motivo {selected.choice === "ACCEPTED" ? "(opcional)" : "(obligatorio)"}<textarea value={reason} maxLength={500} required={selected.choice !== "ACCEPTED"} onChange={event => setReason(event.target.value)} rows={2} className={field} /></label>
          {decisionError && <p role="alert" className="text-sm text-error">{decisionError}</p>}{expired && <Link href="/iniciar-sesion?error=session" className="block text-sm font-semibold underline">Iniciar sesión</Link>}
          <div className="flex flex-wrap gap-2"><button disabled={saving || slotsLoading} className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">{saving ? "Guardando…" : "Confirmar decisión"}</button><button type="button" disabled={saving} onClick={closeDecision} className={button}>Cancelar</button></div>
        </form>}
      </article>)}
    </section>}
  </>;
}
