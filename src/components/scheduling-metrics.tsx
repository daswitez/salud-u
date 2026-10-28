"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiRequestError, apiJson } from "@/lib/api/client";
import { notificationEventLabel } from "@/lib/notifications";
import { replaceUrl } from "@/lib/url-state";
import { MetricCard, PageIntro, SectionHeading } from "@/components/ux-primitives";

// O-08: GET /api/scheduling/metrics. Un indicador null significa que el período no tiene datos para calcularlo.
type Counts = { issued: number; accepted: number; modified: number; rejected: number; expired: number; pending: number };
type Metrics = {
  from: string; to: string; modelVersion: string;
  idlePlaces: { days: number; publishedPlaces: number; idlePlaces: number; rate: number | null };
  waitTime: { assignedRequests: number; averageDays: number | null; medianDays: number | null; p90Days: number | null };
  overload: { days: number; overloadedDays: number; rate: number | null; maxRisk: number; daysWithOverbooking: number };
  attendanceCalibration: { appointments: number; brierScore: number | null; baselineBrierScore: number | null; skill: number | null };
  demandError: { days: number; meanAbsoluteError: number | null; comparableDays: number; comparableMeanAbsoluteError: number | null; baselineMeanAbsoluteError: number | null };
  suggestions: Counts & { acceptanceRate: number | null; byType: Array<Counts & { type: string }> };
  notifications: { registered: number; delivered: number; read: number; readRate: number | null; byType: Array<{ eventType: string; registered: number; delivered: number; read: number }> };
};

const suggestionLabels: Record<string, string> = { DAY_SLOTS: "Cupos de la jornada", OVERBOOKING: "Sobrecupo", CAPACITY_ALERT: "Alerta de capacidad", RESCHEDULE: "Reprogramación" };
const field = "mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text-primary";
const number = (value: number, digits = 1) => new Intl.NumberFormat("es-BO", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const percent = (value: number | null) => value === null ? "Sin datos" : new Intl.NumberFormat("es-BO", { style: "percent", maximumFractionDigits: 1 }).format(value);
const days = (value: number | null) => value === null ? "Sin datos" : `${number(value)} días`;
const score = (value: number | null) => value === null ? "Sin datos" : number(value, 3);
const formatDate = (value: string) => new Intl.DateTimeFormat("es-BO", { timeZone: "UTC", dateStyle: "long" }).format(new Date(value + "T00:00:00Z"));
const isDate = (value: string | null) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

function errorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Tu sesión terminó. Inicia sesión nuevamente para continuar.";
    if (error.status === 403) return "Solo Administración puede consultar las métricas de la agenda.";
    if (error.status < 500) return error.message;
  }
  return "No pudimos comunicarnos con el servidor. Inténtalo nuevamente.";
}

function comparison(model: number | null, baseline: number | null, lowerIsBetter = true) {
  if (model === null || baseline === null) return { text: "Sin línea base para comparar", tone: "neutral" as const };
  if (model === baseline) return { text: "Igual que la línea base", tone: "neutral" as const };
  return (model < baseline) === lowerIsBetter ? { text: "Mejor que la línea base", tone: "success" as const } : { text: "Peor que la línea base", tone: "warning" as const };
}

function Table({ caption, headers, rows }: { caption: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return <div className="overflow-x-auto rounded-2xl border border-divider bg-surface">
    <table className="w-full min-w-[36rem] text-left text-sm"><caption className="sr-only">{caption}</caption>
      <thead className="border-b border-divider text-xs uppercase tracking-wide text-text-secondary"><tr>{headers.map((header, index) => <th key={header} scope="col" className={`px-4 py-3 font-bold ${index ? "text-right" : ""}`}>{header}</th>)}</tr></thead>
      <tbody>{rows.length ? rows.map(row => <tr key={String(row[0])} className="border-b border-divider last:border-0">{row.map((cell, index) => index ? <td key={index} className="px-4 py-3 text-right tabular-nums text-text-primary">{cell}</td> : <th key={index} scope="row" className="px-4 py-3 font-semibold text-text-primary">{cell}</th>)}</tr>) : <tr><td colSpan={headers.length} className="px-4 py-6 text-center text-text-secondary">Sin registros en el período.</td></tr>}</tbody>
    </table>
  </div>;
}

export function SchedulingMetrics() {
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [data, setData] = useState<Metrics | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async (start: string, end: string) => {
    controller.current?.abort(); const current = new AbortController(); controller.current = current;
    setLoading(true); setError("");
    const query = start && end ? `?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}` : "";
    try {
      const result = await apiJson<Metrics>("/api/scheduling/metrics" + query, { signal: current.signal });
      if (current.signal.aborted) return;
      setData(result); setFrom(result.from); setTo(result.to);
      replaceUrl(`/administrativo/metricas?from=${result.from}&to=${result.to}`);
    } catch (cause) { if (!current.signal.aborted) setError(errorMessage(cause)); }
    finally { if (!current.signal.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search), start = params.get("from"), end = params.get("to");
    const task = window.setTimeout(() => { void load(isDate(start) && isDate(end) ? start! : "", isDate(start) && isDate(end) ? end! : ""); }, 0);
    return () => { window.clearTimeout(task); controller.current?.abort(); };
  }, [load]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from || !to || from > to) { setError("Elige un período válido: la fecha inicial no puede ser posterior a la final."); return; }
    void load(from, to);
  }

  const brier = data && comparison(data.attendanceCalibration.brierScore, data.attendanceCalibration.baselineBrierScore);
  const demand = data && comparison(data.demandError.comparableMeanAbsoluteError, data.demandError.baselineMeanAbsoluteError);

  return <div className="space-y-8">
    <PageIntro eyebrow="Componente de agenda" title="Métricas del componente" description="Indicadores con los que se evalúa el componente de optimización: uso de la capacidad, espera, calidad del pronóstico frente a su línea base, aceptación de sugerencias y avisos. Un indicador sin datos en el período se muestra como «Sin datos», no como cero." context={data ? { label: "Versión del modelo", value: data.modelVersion } : undefined} />

    <form onSubmit={submit} aria-label="Período de las métricas" className="flex flex-wrap items-end gap-4 rounded-2xl border border-divider bg-surface p-5">
      <label className="text-sm font-semibold text-text-primary">Desde<input type="date" value={from} onChange={event => setFrom(event.target.value)} className={field} required /></label>
      <label className="text-sm font-semibold text-text-primary">Hasta<input type="date" value={to} onChange={event => setTo(event.target.value)} className={field} required /></label>
      <button type="submit" disabled={loading} className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50">{loading ? "Calculando…" : "Consultar período"}</button>
      <p className="basis-full text-xs text-text-secondary">Fechas de Bolivia, hasta 366 días. Sin período, se usan los 30 días que terminan ayer.</p>
    </form>

    {error && <p role="alert" className="rounded-xl border border-error/30 bg-error-container p-4 text-sm text-error">{error}</p>}
    {loading && !data && <p role="status" className="text-sm text-text-secondary">Calculando las métricas del período…</p>}

    {data && <div aria-busy={loading} className="space-y-8">
      <p className="text-sm text-text-secondary">Período consultado: <strong className="text-text-primary">{formatDate(data.from)}</strong> al <strong className="text-text-primary">{formatDate(data.to)}</strong>.</p>

      <section aria-labelledby="metricas-capacidad" className="space-y-4"><div id="metricas-capacidad"><SectionHeading title="Uso de la capacidad" description="Calculado sobre las jornadas cerradas de cada médico." /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard label="Cupos ociosos" value={percent(data.idlePlaces.rate)} detail={data.idlePlaces.rate === null ? "No hay jornadas cerradas en el período." : `${data.idlePlaces.idlePlaces} de ${data.idlePlaces.publishedPlaces} lugares publicados sin paciente atendido, en ${data.idlePlaces.days} jornadas.`} tone={data.idlePlaces.rate === null ? "neutral" : "primary"} />
          <MetricCard label="Jornadas con sobrecarga" value={percent(data.overload.rate)} detail={data.overload.rate === null ? "No hay jornadas cerradas en el período." : `${data.overload.overloadedDays} de ${data.overload.days} jornadas superaron la capacidad del médico. Riesgo máximo configurado: ${percent(data.overload.maxRisk)}; jornadas con sobrecupo: ${data.overload.daysWithOverbooking}.`} tone={data.overload.rate !== null && data.overload.rate > data.overload.maxRisk ? "warning" : "neutral"} />
        </div>
      </section>

      <section aria-labelledby="metricas-espera" className="space-y-4"><div id="metricas-espera"><SectionHeading title="Espera hasta la cita" description={`Días entre la solicitud y la cita asignada, para ${data.waitTime.assignedRequests} solicitudes asignadas en el período.`} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Media" value={days(data.waitTime.averageDays)} detail="Promedio de la espera." />
          <MetricCard label="Mediana" value={days(data.waitTime.medianDays)} detail="La mitad esperó menos que esto." />
          <MetricCard label="Percentil 90" value={days(data.waitTime.p90Days)} detail="El 90 % esperó menos que esto." tone="primary" />
        </div>
      </section>

      <section aria-labelledby="metricas-pronostico" className="space-y-4"><div id="metricas-pronostico"><SectionHeading title="Calidad del pronóstico" description="Cada día se pronostica solo con las jornadas anteriores y se compara con lo que ocurrió." /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard label="Asistencia: puntuación de Brier" value={score(data.attendanceCalibration.brierScore)} detail={`${brier!.text} (asistencia constante inicial: ${score(data.attendanceCalibration.baselineBrierScore)}). ${data.attendanceCalibration.skill === null ? "" : `Mejora relativa: ${percent(data.attendanceCalibration.skill)}. `}${data.attendanceCalibration.appointments} citas evaluadas; menor es mejor.`} tone={brier!.tone} />
          <MetricCard label="Demanda: error absoluto medio" value={data.demandError.meanAbsoluteError === null ? "Sin datos" : `${number(data.demandError.meanAbsoluteError)} solicitudes`} detail={`${demand!.text}: en ${data.demandError.comparableDays} días comparables, ${score(data.demandError.comparableMeanAbsoluteError)} frente a ${score(data.demandError.baselineMeanAbsoluteError)} de repetir la semana anterior. ${data.demandError.days} días evaluados.`} tone={demand!.tone} />
        </div>
      </section>

      <section aria-labelledby="metricas-sugerencias" className="space-y-4"><div id="metricas-sugerencias"><SectionHeading title="Aceptación de sugerencias" description="(Aceptadas + modificadas) / emitidas en el período." /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Tasa de aceptación" value={percent(data.suggestions.acceptanceRate)} detail={`${data.suggestions.accepted + data.suggestions.modified} de ${data.suggestions.issued} sugerencias emitidas.`} tone="success" />
          <MetricCard label="Rechazadas o vencidas" value={data.suggestions.rejected + data.suggestions.expired} detail={`${data.suggestions.rejected} rechazadas y ${data.suggestions.expired} vencidas sin decisión.`} />
          <MetricCard label="Pendientes" value={data.suggestions.pending} detail="Esperan la decisión de Administración." tone={data.suggestions.pending ? "warning" : "neutral"} />
        </div>
        <Table caption="Sugerencias por tipo" headers={["Tipo", "Emitidas", "Aceptadas", "Modificadas", "Rechazadas", "Vencidas", "Pendientes"]} rows={data.suggestions.byType.map(row => [suggestionLabels[row.type] ?? row.type, row.issued, row.accepted, row.modified, row.rejected, row.expired, row.pending])} />
      </section>

      <section aria-labelledby="metricas-avisos" className="space-y-4"><div id="metricas-avisos"><SectionHeading title="Avisos de la bandeja" description="Avisos registrados, entregados y leídos por los estudiantes. No hay envíos fallidos porque los avisos no salen por correo." /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Entregados" value={data.notifications.delivered} detail={`De ${data.notifications.registered} avisos registrados.`} />
          <MetricCard label="Leídos" value={data.notifications.read} detail="Abiertos en la bandeja." />
          <MetricCard label="Tasa de lectura" value={percent(data.notifications.readRate)} detail="Leídos sobre entregados." tone="primary" />
        </div>
        <Table caption="Avisos por tipo de evento" headers={["Evento", "Registrados", "Entregados", "Leídos"]} rows={data.notifications.byType.map(row => [notificationEventLabel(row.eventType), row.registered, row.delivered, row.read])} />
      </section>
    </div>}
  </div>;
}
