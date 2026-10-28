"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiRequestError, apiJson } from "@/lib/api/client";
import { periodLabels, type PeriodType } from "@/lib/scheduling-setup";

type Period = { id: string; name: string; type: PeriodType; startDate: string; endDate: string; createdAt: string };
const input = "mt-1.5 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-text-primary";
const date = (value: string) => value.split("-").reverse().join("/");
const message = (error: unknown) => error instanceof ApiRequestError && error.status === 401 ? "Tu sesión terminó. Inicia sesión nuevamente." : error instanceof ApiRequestError && error.status === 403 ? "No tienes permiso para gestionar el calendario." : error instanceof ApiRequestError && error.status < 500 ? error.message : "No pudimos comunicarnos con el servidor. Inténtalo nuevamente.";

export function AcademicCalendar() {
  const [periods, setPeriods] = useState<Period[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expired, setExpired] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PeriodType | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filter, setFilter] = useState("");
  const [shown, setShown] = useState(10);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");
  const pending = useRef(false);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setLoading(true); setLoadError("");
    try {
      const data = await apiJson<Period[]>("/api/academic-periods", { signal: controller.signal });
      if (!Array.isArray(data)) throw new Error("Respuesta inválida");
      if (!controller.signal.aborted) { setPeriods(data); setExpired(false); }
    } catch (cause) { if (!controller.signal.aborted) { setLoadError(message(cause)); setExpired(cause instanceof ApiRequestError && cause.status === 401); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => { window.clearTimeout(timer); request.current?.abort(); }; }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current || !type) return;
    const days = (Date.parse(endDate + "T00:00:00Z") - Date.parse(startDate + "T00:00:00Z")) / 86400000;
    if (!name.trim() || !Number.isFinite(days) || days < 0 || days > 366) { setSaveError("Indica un nombre y fechas válidas: hasta 367 días, incluido el inicio y el fin."); return; }
    pending.current = true; setSaving(true); setSaveError(""); setSuccess("");
    try {
      const created = await apiJson<Period>("/api/academic-periods", { method: "POST", body: JSON.stringify({ name: name.trim(), type, startDate, endDate }) });
      setPeriods(previous => previous ? [...previous, created] : [created]); setName(""); setType(""); setStartDate(""); setEndDate(""); setFilter(""); setShown(10); setSuccess("Período registrado."); setExpired(false);
    } catch (cause) { setSaveError(message(cause)); setExpired(cause instanceof ApiRequestError && cause.status === 401); }
    finally { pending.current = false; setSaving(false); }
  }
  const visible = (periods ?? []).filter(p => p.name.toLocaleLowerCase("es").includes(filter.trim().toLocaleLowerCase("es"))).sort((a, b) => b.startDate.localeCompare(a.startDate));
  return <section aria-label="Calendario académico" className="mt-6 space-y-5">
    <form aria-label="Registrar período académico" onSubmit={event => void save(event)} className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <h2 className="text-xl font-bold">Registrar período académico</h2><p className="mt-1 text-sm text-text-secondary">Las fechas incluyen el inicio y el fin. Los períodos no pueden compartir días.</p>
      <fieldset disabled={saving || loading || !periods} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><legend className="sr-only">Datos del período</legend>
        <label className="text-sm font-semibold">Nombre<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} className={input} /></label>
        <label className="text-sm font-semibold">Tipo de período<select aria-label="Tipo de período" required value={type} onChange={event => setType(event.target.value as PeriodType | "")} className={input}><option value="">Selecciona un tipo</option>{Object.entries(periodLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
        <label className="text-sm font-semibold">Fecha de inicio<input required type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className={input} /></label>
        <label className="text-sm font-semibold">Fecha de fin<input required type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className={input} /></label>
      </fieldset>
      {saveError && <p role="alert" className="mt-4 text-sm text-error">{saveError}</p>}{expired && <Link href="/iniciar-sesion?error=session" className="mt-2 inline-block text-sm font-semibold underline">Iniciar sesión</Link>}
      {success && <p role="status" className="mt-4 text-sm font-semibold text-success">{success}</p>}
      <button disabled={saving || loading || !periods} className="mt-4 min-h-11 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">{saving ? "Registrando…" : "Registrar período"}</button>
    </form>
    <div className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Períodos registrados</h2><p className="mt-1 text-sm text-text-secondary">Consulta los períodos existentes antes de agregar uno nuevo.</p></div><button type="button" disabled={loading || saving} onClick={() => void load()} className="min-h-10 rounded-lg border border-primary-200 px-4 text-sm font-semibold text-primary disabled:opacity-50">Actualizar</button></div>
      {loading && <p role="status" className="mt-4 text-sm">Cargando períodos…</p>}{loadError && <div role="alert" className="mt-4 text-sm text-error"><p>{loadError}</p>{!expired && <button type="button" onClick={() => void load()} className="mt-2 font-semibold underline">Reintentar períodos</button>}</div>}
      {periods && !loadError && <><label className="mt-4 block max-w-md text-sm font-semibold">Buscar período<input value={filter} onChange={event => { setFilter(event.target.value); setShown(10); }} className={input} /></label>{!visible.length ? <p className="mt-5 text-sm text-text-secondary">{filter ? "No hay períodos con ese nombre." : "Aún no hay períodos registrados."}</p> : <div className="relative mt-4 overflow-x-auto" role="region" aria-label="Tabla de períodos académicos" tabIndex={0}><table className="w-full min-w-[37rem] text-left text-sm"><thead><tr>{["Nombre", "Tipo", "Inicio", "Fin"].map(column => <th key={column} scope="col" className="border-b border-divider px-3 py-2">{column}</th>)}</tr></thead><tbody>{visible.slice(0, shown).map(period => <tr key={period.id}><td className="border-b border-divider px-3 py-3">{period.name}</td><td className="border-b border-divider px-3 py-3">{periodLabels[period.type] ?? period.type}</td><td className="border-b border-divider px-3 py-3">{date(period.startDate)}</td><td className="border-b border-divider px-3 py-3">{date(period.endDate)}</td></tr>)}</tbody></table></div>}{visible.length > shown && <button type="button" onClick={() => setShown(value => value + 10)} className="mt-4 min-h-10 font-semibold text-primary underline">Mostrar más períodos</button>}</>}
    </div>
  </section>;
}
