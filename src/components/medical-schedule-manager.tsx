"use client";

import { useEffect, useMemo, useState } from "react";

import { apiJson, type CareerOption } from "@/lib/api/client";

type WeeklyRule = { id: string; weekday: number; startsAt: string; endsAt: string; slotDurationMinutes: number; specialtyId: string | null };
type RecurringBlock = { id: string; weekday: number; startsAt: string; endsAt: string; label: string };
type DateBlock = { id: string; block_date: string; starts_at: string | null; ends_at: string | null; label: string };
type Slot = { id: string; starts_at: string; ends_at: string; capacity: number; booked_count: number; status: "PUBLISHED" | "BLOCKED" | "CLOSED" | "DRAFT" };
type CalendarAppointment = { id: string; slotId: string; status: string; scheduledFor: string; patientName: string };
type ManagementAvailability = {
  schedules: Array<{ id: string; specialty_id: string | null; weekday: number; starts_at: string; ends_at: string; slot_duration_minutes: number }>;
  recurringBlocks: Array<{ id: string; weekday: number; starts_at: string; ends_at: string; label: string }>;
  dateBlocks: DateBlock[];
  slots: Slot[];
  appointments: CalendarAppointment[];
};

const weekdays = [{ value: 1, label: "Lun" }, { value: 2, label: "Mar" }, { value: 3, label: "Mié" }, { value: 4, label: "Jue" }, { value: 5, label: "Vie" }, { value: 6, label: "Sáb" }, { value: 7, label: "Dom" }];

function boliviaDate(value: Date | string) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date(value)); }
function nextDate(value: string, direction: number) { const day = new Date(`${value}T12:00:00-04:00`); day.setDate(day.getDate() + direction); return boliviaDate(day); }
function timeParts(value: string) { const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/La_Paz", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value)); const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0); const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0); return { hour, minute, value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` }; }
function minutes(value: string) { const [hour, minute] = value.slice(0, 5).split(":").map(Number); return hour * 60 + minute; }
function dateLabel(value: string) { return new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00-04:00`)); }

export function MedicalScheduleManager({ isReviewDoctor }: { isReviewDoctor: boolean }) {
  const [specialties, setSpecialties] = useState<CareerOption[]>([]);
  const [rules, setRules] = useState<WeeklyRule[]>([]);
  const [recurringBlocks, setRecurringBlocks] = useState<RecurringBlock[]>([]);
  const [dateBlocks, setDateBlocks] = useState<DateBlock[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => boliviaDate(new Date()));
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startsAt, setStartsAt] = useState("08:00"); const [endsAt, setEndsAt] = useState("16:00"); const [duration, setDuration] = useState(30); const [specialtyId, setSpecialtyId] = useState("");
  const [blockDays, setBlockDays] = useState<number[]>([1, 2, 3, 4, 5]); const [blockStart, setBlockStart] = useState("12:00"); const [blockEnd, setBlockEnd] = useState("13:00"); const [blockLabel, setBlockLabel] = useState("Hora de almuerzo");
  const [dateBlock, setDateBlock] = useState({ date: "", startsAt: "", endsAt: "", label: "" });
  const [notice, setNotice] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(true);

  async function refresh(day = selectedDate) {
    setLoading(true);
    try {
      const [management, available] = await Promise.all([apiJson<ManagementAvailability>(`/api/availability-slots?manage=true&from=${day}&to=${day}`), apiJson<CareerOption[]>("/api/my-specialties")]);
      setSpecialties(available);
      setRules(management.schedules.map((rule) => ({ id: rule.id, weekday: rule.weekday, startsAt: rule.starts_at.slice(0, 5), endsAt: rule.ends_at.slice(0, 5), slotDurationMinutes: rule.slot_duration_minutes, specialtyId: rule.specialty_id })));
      setRecurringBlocks(management.recurringBlocks.map((block) => ({ id: block.id, weekday: block.weekday, startsAt: block.starts_at.slice(0, 5), endsAt: block.ends_at.slice(0, 5), label: block.label })));
      setDateBlocks(management.dateBlocks); setSlots(management.slots); setAppointments(management.appointments);
      if (!isReviewDoctor && available.length === 1) setSpecialtyId((current) => current || available[0].id);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la disponibilidad."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(selectedDate); }, 0);
    return () => window.clearTimeout(task);
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDay(day: number, target: "schedule" | "block") { const update = (days: number[]) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day].sort(); if (target === "schedule") setSelectedDays(update); else setBlockDays(update); }
  function addRule() {
    if (!selectedDays.length || minutes(endsAt) <= minutes(startsAt)) { setError("Selecciona al menos un día y un horario válido."); return; }
    if (!isReviewDoctor && !specialtyId) { setError("Selecciona la especialidad para esta jornada."); return; }
    const added = selectedDays.map((weekday) => ({ id: `new-${weekday}-${startsAt}-${endsAt}`, weekday, startsAt, endsAt, slotDurationMinutes: duration, specialtyId: isReviewDoctor ? null : specialtyId }));
    if (added.some((rule) => rules.some((current) => current.weekday === rule.weekday && minutes(current.startsAt) < minutes(rule.endsAt) && minutes(current.endsAt) > minutes(rule.startsAt)))) { setError("Una de las jornadas se superpone con un horario ya agregado."); return; }
    setRules((current) => [...current, ...added].sort((left, right) => left.weekday - right.weekday || left.startsAt.localeCompare(right.startsAt))); setError("");
  }
  function addRecurringBlock() {
    if (!blockDays.length || !blockLabel.trim() || minutes(blockEnd) <= minutes(blockStart)) { setError("El bloqueo recurrente necesita días, nombre y horario válido."); return; }
    setRecurringBlocks((current) => [...current, ...blockDays.map((weekday) => ({ id: `new-block-${weekday}-${blockStart}-${blockEnd}`, weekday, startsAt: blockStart, endsAt: blockEnd, label: blockLabel.trim() }))]); setError("");
  }
  async function saveSchedule() {
    if (!rules.length) { setError("Agrega por lo menos una jornada antes de guardar."); return; }
    setSaving(true);
    try { const result = await apiJson<{ generatedSlots: number }>("/api/availability-slots", { method: "POST", body: JSON.stringify({ rules, recurringBlocks }) }); setNotice(`Disponibilidad guardada. Se generaron ${result.generatedSlots} cupos para los próximos 90 días.`); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la disponibilidad."); } finally { setSaving(false); }
  }
  async function createDateBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try { await apiJson("/api/availability-slots", { method: "POST", body: JSON.stringify({ dateBlock: true, blockDate: dateBlock.date, startsAt: dateBlock.startsAt || null, endsAt: dateBlock.endsAt || null, label: dateBlock.label }) }); setNotice("Bloqueo agregado a la agenda."); setDateBlock({ date: "", startsAt: "", endsAt: "", label: "" }); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el bloqueo."); } finally { setSaving(false); }
  }
  async function deleteDateBlock(blockId: string) {
    setSaving(true);
    try { await apiJson(`/api/availability-slots?blockId=${encodeURIComponent(blockId)}`, { method: "DELETE" }); setNotice("Bloqueo eliminado y cupos recalculados."); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar el bloqueo."); } finally { setSaving(false); }
  }

  const dayItems = useMemo(() => {
    const appointmentBySlot = new Map(appointments.map((appointment) => [appointment.slotId, appointment]));
    const items: Array<{ id: string; starts: number; ends: number; kind: "available" | "past" | "appointment" | "block"; title: string; detail: string }> = [];
    for (const slot of slots.filter((slot) => boliviaDate(slot.starts_at) === selectedDate && slot.status === "PUBLISHED")) {
      const starts = timeParts(slot.starts_at); const ends = timeParts(slot.ends_at); const appointment = appointmentBySlot.get(slot.id);
      if (appointment) items.push({ id: `appointment-${appointment.id}`, starts: starts.hour * 60 + starts.minute, ends: ends.hour * 60 + ends.minute, kind: "appointment", title: appointment.patientName, detail: `Cita ${appointment.status.toLowerCase().replace("_", " ")}` });
      else items.push({ id: slot.id, starts: starts.hour * 60 + starts.minute, ends: ends.hour * 60 + ends.minute, kind: new Date(slot.starts_at) < new Date() ? "past" : "available", title: new Date(slot.starts_at) < new Date() ? "Horario vencido" : "Disponible", detail: `${ends.value} · 1 atención` });
    }
    for (const block of dateBlocks.filter((block) => block.block_date === selectedDate)) items.push({ id: `date-block-${block.id}`, starts: block.starts_at ? minutes(block.starts_at) : 7 * 60, ends: block.ends_at ? minutes(block.ends_at) : 21 * 60, kind: "block", title: block.label, detail: block.starts_at ? `${block.starts_at.slice(0, 5)} – ${block.ends_at?.slice(0, 5)}` : "Todo el día" });
    const weekday = new Date(`${selectedDate}T12:00:00-04:00`).getDay() || 7;
    for (const block of recurringBlocks.filter((block) => block.weekday === weekday)) items.push({ id: `recurring-block-${block.id}`, starts: minutes(block.startsAt), ends: minutes(block.endsAt), kind: "block", title: block.label, detail: "Bloqueo recurrente" });
    return items.sort((left, right) => left.starts - right.starts || left.kind.localeCompare(right.kind));
  }, [appointments, dateBlocks, recurringBlocks, selectedDate, slots]);
  const timelineStart = Math.min(7 * 60, ...dayItems.map((item) => item.starts)); const timelineEnd = Math.max(20 * 60, ...dayItems.map((item) => item.ends)); const timelineHeight = Math.max(520, (timelineEnd - timelineStart) * 1.15);

  return <div>
    <header><p className="text-sm font-semibold tracking-wide text-primary">MI DISPONIBILIDAD</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Horario, bloqueos y agenda</h1><p className="mt-2 max-w-3xl text-text-secondary">Define tu jornada una vez. El sistema convierte cada franja en cupos de una atención y evita publicar horarios bloqueados.</p></header>
    {notice && <p role="status" className="mt-5 rounded-xl bg-success-container p-4 text-sm text-success">{notice}</p>}{error && <p role="alert" className="mt-5 rounded-xl bg-error-container p-4 text-sm text-error">{error}</p>}

    <section className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-6"><div><h2 className="text-lg font-bold text-text-primary">Jornada semanal</h2><p className="mt-1 text-sm text-text-secondary">Cada día y horario se divide automáticamente según la duración de atención elegida.</p></div><div className="mt-5 grid gap-4 lg:grid-cols-4"><label><span className="text-sm font-semibold">Inicio</span><input type="time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5" /></label><label><span className="text-sm font-semibold">Fin</span><input type="time" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5" /></label><label><span className="text-sm font-semibold">Cada atención</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5">{[15, 20, 30, 45, 60, 90, 120].map((value) => <option key={value} value={value}>{value} minutos</option>)}</select></label>{!isReviewDoctor && <label><span className="text-sm font-semibold">Especialidad</span><select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5"><option value="">Selecciona una especialidad</option>{specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}</select></label>}</div><div className="mt-4 flex flex-wrap gap-2" aria-label="Días de jornada">{weekdays.map((day) => <button type="button" key={day.value} onClick={() => toggleDay(day.value, "schedule")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${selectedDays.includes(day.value) ? "bg-primary text-on-primary" : "bg-surface-secondary text-text-secondary"}`}>{day.label}</button>)}</div><button type="button" onClick={addRule} className="mt-4 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-container">Agregar jornada</button><div className="mt-5 grid gap-2 sm:grid-cols-2">{rules.map((rule) => <article key={rule.id} className="flex items-center justify-between rounded-xl bg-primary-container px-4 py-3 text-sm"><span><strong>{weekdays.find((day) => day.value === rule.weekday)?.label}</strong> · {rule.startsAt}–{rule.endsAt} · cada {rule.slotDurationMinutes} min</span><button type="button" onClick={() => setRules((current) => current.filter((item) => item.id !== rule.id))} className="font-semibold text-primary hover:underline">Quitar</button></article>)}{!rules.length && <p className="rounded-xl bg-surface-secondary p-4 text-sm text-text-secondary">Todavía no agregaste jornadas.</p>}</div></section>

    <section className="mt-5 rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 className="text-lg font-bold text-text-primary">Bloqueos recurrentes</h2><p className="mt-1 text-sm text-text-secondary">Úsalos para pausas que se repiten, como almuerzo. Los cupos que coincidan no se generan.</p><div className="mt-4 grid gap-4 sm:grid-cols-3"><label><span className="text-sm font-semibold">Nombre</span><input value={blockLabel} onChange={(event) => setBlockLabel(event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5" /></label><label><span className="text-sm font-semibold">Desde</span><input type="time" value={blockStart} onChange={(event) => setBlockStart(event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5" /></label><label><span className="text-sm font-semibold">Hasta</span><input type="time" value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5" /></label></div><div className="mt-4 flex flex-wrap gap-2">{weekdays.map((day) => <button type="button" key={day.value} onClick={() => toggleDay(day.value, "block")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${blockDays.includes(day.value) ? "bg-secondary text-on-primary" : "bg-surface-secondary text-text-secondary"}`}>{day.label}</button>)}</div><button type="button" onClick={addRecurringBlock} className="mt-4 rounded-lg border border-secondary px-4 py-2 text-sm font-semibold text-secondary hover:bg-secondary-container">Agregar bloqueo recurrente</button><div className="mt-4 grid gap-2 sm:grid-cols-2">{recurringBlocks.map((block) => <article key={block.id} className="flex items-center justify-between rounded-xl bg-warning-container px-4 py-3 text-sm text-warning"><span><strong>{weekdays.find((day) => day.value === block.weekday)?.label}</strong> · {block.startsAt}–{block.endsAt} · {block.label}</span><button type="button" onClick={() => setRecurringBlocks((current) => current.filter((item) => item.id !== block.id))} className="font-semibold hover:underline">Quitar</button></article>)}</div><button type="button" disabled={saving} onClick={saveSchedule} className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? "Guardando…" : "Guardar disponibilidad semanal"}</button></section>

    <section className="mt-5 rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 className="text-lg font-bold text-text-primary">Bloqueo por fecha</h2><p className="mt-1 text-sm text-text-secondary">Para un feriado, permiso o excepción. Deja las horas vacías para bloquear todo el día.</p><form onSubmit={createDateBlock} className="mt-4 grid gap-4 sm:grid-cols-4"><label><span className="text-sm font-semibold">Fecha</span><input required type="date" min={boliviaDate(new Date())} value={dateBlock.date} onChange={(event) => setDateBlock((current) => ({ ...current, date: event.target.value }))} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5" /></label><label><span className="text-sm font-semibold">Desde</span><input type="time" value={dateBlock.startsAt} onChange={(event) => setDateBlock((current) => ({ ...current, startsAt: event.target.value }))} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5" /></label><label><span className="text-sm font-semibold">Hasta</span><input type="time" value={dateBlock.endsAt} onChange={(event) => setDateBlock((current) => ({ ...current, endsAt: event.target.value }))} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5" /></label><label><span className="text-sm font-semibold">Motivo</span><input required value={dateBlock.label} onChange={(event) => setDateBlock((current) => ({ ...current, label: event.target.value }))} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5" /></label><button disabled={saving} className="rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60 sm:col-span-4 sm:justify-self-start">Agregar bloqueo</button></form><div className="mt-5 divide-y divide-divider">{dateBlocks.map((block) => <article key={block.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span><strong>{dateLabel(block.block_date)}</strong> · {block.starts_at ? `${block.starts_at.slice(0, 5)}–${block.ends_at?.slice(0, 5)}` : "Todo el día"} · {block.label}</span><button disabled={saving} type="button" onClick={() => void deleteDateBlock(block.id)} className="font-semibold text-error hover:underline disabled:opacity-60">Eliminar</button></article>)}{!dateBlocks.length && <p className="py-4 text-sm text-text-secondary">No hay bloqueos para este día.</p>}</div></section>

    <section className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-text-primary">Calendario diario</h2><p className="mt-1 text-sm text-text-secondary">Disponibles, bloqueos, citas ya realizadas y próximas citas en una sola vista.</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => setSelectedDate((current) => nextDate(current, -1))} className="rounded-lg border border-border px-3 py-2">←</button><input aria-label="Fecha del calendario" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-lg border border-border px-3 py-2" /><button type="button" onClick={() => setSelectedDate((current) => nextDate(current, 1))} className="rounded-lg border border-border px-3 py-2">→</button></div></div><div className="mt-4 flex flex-wrap gap-3 text-xs text-text-secondary"><span><i className="mr-1 inline-block size-2 rounded-full bg-primary" />Disponible</span><span><i className="mr-1 inline-block size-2 rounded-full bg-warning" />Cita</span><span><i className="mr-1 inline-block size-2 rounded-full bg-error" />Bloqueo</span><span><i className="mr-1 inline-block size-2 rounded-full bg-text-disabled" />Vencido</span></div>{loading ? <p className="py-12 text-sm text-text-secondary">Cargando agenda…</p> : <div className="mt-5 overflow-x-auto"><div className="min-w-[620px]"><p className="mb-3 pl-16 text-sm font-semibold capitalize text-text-primary">{dateLabel(selectedDate)}</p><div className="relative ml-16 border-l border-divider" style={{ height: `${timelineHeight}px` }}>{Array.from({ length: Math.ceil((timelineEnd - timelineStart) / 60) + 1 }, (_, index) => { const time = timelineStart + index * 60; return <div key={time} className="absolute inset-x-0 border-t border-divider" style={{ top: `${(time - timelineStart) * 1.15}px` }}><span className="absolute -left-14 -top-2.5 text-xs text-text-tertiary">{String(Math.floor(time / 60)).padStart(2, "0")}:00</span></div>; })}{dayItems.map((item) => { const styles = { available: "border-primary bg-primary-container text-primary", past: "border-text-disabled bg-surface-secondary text-text-secondary", appointment: "border-warning bg-warning-container text-warning", block: "border-error bg-error-container text-error" }[item.kind]; return <article key={item.id} className={`absolute left-3 right-4 overflow-hidden rounded-lg border-l-4 p-2 text-xs shadow-sm ${styles}`} style={{ top: `${(item.starts - timelineStart) * 1.15 + 2}px`, height: `${Math.max(32, (item.ends - item.starts) * 1.15 - 4)}px` }}><strong className="block">{item.title}</strong><span>{String(Math.floor(item.starts / 60)).padStart(2, "0")}:{String(item.starts % 60).padStart(2, "0")} · {item.detail}</span></article>; })}{!dayItems.length && <p className="absolute left-4 top-4 text-sm text-text-secondary">No hay disponibilidad ni eventos para este día.</p>}</div></div></div>}</section>
  </div>;
}
