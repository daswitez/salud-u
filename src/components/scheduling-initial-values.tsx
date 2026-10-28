"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiRequestError, apiJson } from "@/lib/api/client";
import { periodLabels, type PeriodType } from "@/lib/scheduling-setup";

type InitialValue = { specialtyId: string | null; specialtyName: string | null; periodType: PeriodType; expectedDailyDemand: number | null; expectedAttendance: number; appointmentWeight: number; isDefault: boolean; updatedAt: string | null };
type Specialty = { id: string; name: string; active: boolean };
type Draft = { attendance: string; demand: string; weight: string; selected: boolean };
const input = "mt-1.5 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-text-primary";
const rowKey = (value: InitialValue) => `${value.specialtyId ?? "area"}|${value.periodType}`;
const draftFrom = (value: InitialValue): Draft => ({ attendance: String(Number((value.expectedAttendance * 100).toFixed(1))), demand: value.expectedDailyDemand === null ? "" : String(value.expectedDailyDemand), weight: String(value.appointmentWeight), selected: false });
const draftsFrom = (values: InitialValue[]) => Object.fromEntries(values.map(value => [rowKey(value), draftFrom(value)]));
const message = (error: unknown) => error instanceof ApiRequestError && error.status === 401 ? "Tu sesión terminó. Inicia sesión nuevamente." : error instanceof ApiRequestError && error.status === 403 ? "No tienes permiso para gestionar los valores iniciales." : error instanceof ApiRequestError && error.status < 500 ? error.message : "No pudimos comunicarnos con el servidor. Inténtalo nuevamente.";

function validate(draft: Draft) {
  const attendance = Number(draft.attendance), demand = Number(draft.demand), weight = Number(draft.weight);
  if (!/^\d+(?:\.\d)?$/.test(draft.attendance) || attendance <= 0 || attendance >= 100) return "La asistencia debe ser mayor que 0 y menor que 100 %, con hasta un decimal.";
  if (draft.demand !== "" && (!/^\d+(?:\.\d{1,2})?$/.test(draft.demand) || demand < 0 || demand > 1000)) return "La demanda debe estar entre 0 y 1000, con hasta dos decimales; también puede quedar vacía.";
  if (!/^\d+$/.test(draft.weight) || weight < 1 || weight > 100) return "El peso debe ser un número entero entre 1 y 100.";
  return "";
}

export function SchedulingInitialValues() {
  const [values, setValues] = useState<InitialValue[] | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [scope, setScope] = useState("area");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expired, setExpired] = useState(false);
  const pending = useRef(false);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    try {
      const [rows, catalog] = await Promise.all([
        apiJson<InitialValue[]>("/api/scheduling/initial-values", { signal: controller.signal }),
        apiJson<Specialty[]>("/api/v1/catalogs/SPECIALTY", { signal: controller.signal }),
      ]);
      if (!Array.isArray(rows) || !Array.isArray(catalog)) throw new Error("Respuesta inválida");
      if (!controller.signal.aborted) { setValues(rows); setDrafts(draftsFrom(rows)); setSpecialties(catalog); setExpired(false); }
    } catch (cause) { if (!controller.signal.aborted) { setError(message(cause)); setExpired(cause instanceof ApiRequestError && cause.status === 401); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => { window.clearTimeout(timer); request.current?.abort(); }; }, [load]);

  function update(value: InitialValue, key: "attendance" | "demand" | "weight", next: string) {
    const id = rowKey(value); setDrafts(previous => ({ ...previous, [id]: { ...previous[id], [key]: next, selected: true } })); setSuccess("");
  }
  function select(value: InitialValue, checked: boolean) {
    const id = rowKey(value); setDrafts(previous => ({ ...previous, [id]: checked ? { ...previous[id], selected: true } : draftFrom(value) })); setSuccess("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!values || pending.current) return;
    const selected = values.filter(value => drafts[rowKey(value)]?.selected);
    if (!selected.length) return;
    for (const value of selected) {
      const invalid = validate(drafts[rowKey(value)]);
      const active = value.specialtyId === null || specialties.some(item => item.id === value.specialtyId && item.active);
      if (invalid || !active) { setScope(value.specialtyId ?? "area"); setError(`${value.specialtyName ?? "Área"} · ${periodLabels[value.periodType]}: ${invalid || "la especialidad no está habilitada."}`); return; }
    }
    const rows = selected.map(value => {
      const draft = drafts[rowKey(value)];
      return { specialtyId: value.specialtyId, periodType: value.periodType, expectedAttendance: Number((Number(draft.attendance) / 100).toFixed(3)), expectedDailyDemand: draft.demand === "" ? null : Number(draft.demand), appointmentWeight: Number(draft.weight) };
    });
    pending.current = true; setSaving(true); setError(""); setSuccess("");
    try {
      const data = await apiJson<InitialValue[]>("/api/scheduling/initial-values", { method: "PUT", body: JSON.stringify({ values: rows }) });
      if (!Array.isArray(data)) throw new Error("Respuesta inválida");
      setValues(data); setDrafts(draftsFrom(data)); setSuccess(`Se guardaron ${selected.length} ${selected.length === 1 ? "fila" : "filas"}.`); setExpired(false);
    } catch (cause) { setError(message(cause)); setExpired(cause instanceof ApiRequestError && cause.status === 401); }
    finally { pending.current = false; setSaving(false); }
  }

  const selectedCount = Object.values(drafts).filter(draft => draft.selected).length;
  const scopeRows = values?.filter(value => (value.specialtyId ?? "area") === scope) ?? [];
  const options = [...new Map((values ?? []).filter(value => value.specialtyId !== null).map(value => [value.specialtyId!, { id: value.specialtyId!, name: value.specialtyName ?? "Especialidad", active: specialties.some(item => item.id === value.specialtyId && item.active) }])).values()];
  const isInactive = scope !== "area" && !specialties.some(item => item.id === scope && item.active);
  return <section aria-label="Valores iniciales de la agenda" className="mt-6 space-y-5">
    <div className="rounded-2xl border border-primary-200 bg-primary-container/50 p-5"><h2 className="text-xl font-bold">Valores iniciales</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Carga los datos de asistencia y demanda acordados con el área. Los valores marcados como predeterminados son referencias del sistema, no mediciones del centro. Una especialidad sin ajuste puede heredar el valor configurado del área.</p><p className="mt-2 text-sm text-text-secondary">La demanda vacía usa la capacidad publicada. El peso expresa cuántas citas equivalen al punto de partida de la estimación.</p></div>
    {loading && <p role="status" className="text-sm">Cargando valores iniciales…</p>}
    {error && <div role="alert" className="rounded-xl bg-error-container p-4 text-sm text-error"><p>{error}</p>{expired ? <Link href="/iniciar-sesion?error=session" className="mt-2 inline-block font-semibold underline">Iniciar sesión</Link> : !values && <button type="button" onClick={() => void load()} className="mt-2 font-semibold underline">Reintentar valores</button>}</div>}
    {values && <form onSubmit={event => void save(event)} noValidate className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><label className="w-full max-w-md text-sm font-semibold">Especialidad<select aria-label="Especialidad" value={scope} disabled={saving} onChange={event => setScope(event.target.value)} className={input}><option value="area">Área general</option>{options.map(item => <option key={item.id} value={item.id}>{item.name}{item.active ? "" : " · inactiva"}</option>)}</select></label><button type="button" disabled={loading || saving || selectedCount > 0} onClick={() => void load()} className="min-h-11 rounded-lg border border-primary-200 px-4 text-sm font-semibold text-primary disabled:opacity-50">Actualizar valores</button></div>
      {isInactive && <p role="status" className="mt-4 rounded-lg bg-warning-container p-3 text-sm text-warning">Esta especialidad está inactiva. Sus valores guardados se conservan para consulta.</p>}
      <p className="mt-4 text-sm text-text-secondary">Al modificar una fila se selecciona para guardar; al desmarcarla se restablece. También puedes seleccionar una fila predeterminada para confirmarla explícitamente.</p>
      {!scopeRows.length && <p className="mt-5 text-sm text-text-secondary">No hay valores para esta especialidad.</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">{scopeRows.map(value => { const draft = drafts[rowKey(value)]; if (!draft) return null; const label = periodLabels[value.periodType];
        return <fieldset key={rowKey(value)} disabled={saving || loading || isInactive} className="rounded-xl border border-divider p-4 disabled:opacity-70"><legend className="px-1 font-bold">{label}</legend>
          <p className="text-xs font-semibold text-text-secondary">{value.isDefault ? "Predeterminado · aún no guardado" : "Configurado"}</p>
          <label className="mt-3 block text-sm font-semibold">Asistencia esperada (%) · {label}<input aria-label={`Asistencia esperada (%) · ${label}`} type="number" min="0.1" max="99.9" step="0.1" value={draft.attendance} onChange={event => update(value, "attendance", event.target.value)} className={input} /></label>
          <label className="mt-3 block text-sm font-semibold">Demanda diaria esperada · {label}<input aria-label={`Demanda diaria esperada · ${label}`} type="number" min="0" max="1000" step="0.01" value={draft.demand} placeholder="Capacidad publicada" onChange={event => update(value, "demand", event.target.value)} className={input} /></label>
          <label className="mt-3 block text-sm font-semibold">Peso en citas · {label}<input aria-label={`Peso en citas · ${label}`} type="number" min="1" max="100" step="1" value={draft.weight} onChange={event => update(value, "weight", event.target.value)} className={input} /></label>
          <label className="mt-4 flex items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.selected} onChange={event => select(value, event.target.checked)} className="mt-0.5 size-4 accent-primary" />Seleccionar {label} para guardar</label>
        </fieldset>;
      })}</div>
      <p className="mt-5 text-sm text-text-secondary">{selectedCount} {selectedCount === 1 ? "fila seleccionada" : "filas seleccionadas"} para guardar.</p>
      {success && <p role="status" className="mt-3 text-sm font-semibold text-success">{success}</p>}
      <button disabled={saving || loading || selectedCount === 0} className="mt-4 min-h-11 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">{saving ? "Guardando…" : "Guardar valores seleccionados"}</button>
    </form>}
  </section>;
}
