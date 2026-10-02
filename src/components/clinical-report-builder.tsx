"use client";

import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";

import { apiJson } from "@/lib/api/client";

type Specialty = { id: string; name: string };
type Row = { encounter_id: string; closed_at: string; encounter_type: string; specialty_name: string | null; carnet: string; patient_name: string; chief_complaint: string; assessment: string | null; instructions: string | null; diagnoses: string; allergies: string };
type Filters = { from: string; to: string; specialtyId: string; encounterType: string; diagnosis: string; allergy: string; habit: string };
type PeriodPreset = "TODAY" | "SEVEN_DAYS" | "THIRTY_DAYS" | "MONTH" | "SEMESTER" | "YEAR";

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
const initial: Filters = { from: `${today.slice(0, 8)}01`, to: today, specialtyId: "", encounterType: "", diagnosis: "", allergy: "", habit: "" };
const headers = ["Fecha", "Paciente", "Carnet", "Tipo", "Especialidad", "Diagnósticos", "Alergias", "Motivo", "Evaluación", "Indicaciones"];
const periodLabels: Record<PeriodPreset, string> = { TODAY: "Hoy", SEVEN_DAYS: "Últimos 7 días", THIRTY_DAYS: "Últimos 30 días", MONTH: "Este mes", SEMESTER: "Semestre actual", YEAR: "Año actual" };

function dateOffset(days: number) {
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function periodRange(preset: PeriodPreset) {
  const [year, month] = today.split("-").map(Number);
  if (preset === "TODAY") return { from: today, to: today };
  if (preset === "SEVEN_DAYS") return { from: dateOffset(-6), to: today };
  if (preset === "THIRTY_DAYS") return { from: dateOffset(-29), to: today };
  if (preset === "MONTH") return { from: `${today.slice(0, 8)}01`, to: today };
  if (preset === "SEMESTER") return { from: `${year}-${month <= 6 ? "01" : "07"}-01`, to: today };
  return { from: `${year}-01-01`, to: today };
}

function formatDate(value: string) {
  if (!value) return "sin fecha";
  return new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeZone: "America/La_Paz" }).format(new Date(`${value}T12:00:00`));
}

function formatClosedDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz" }).format(new Date(value));
}

function rowValues(rows: Row[]) {
  return rows.map((row) => [formatClosedDate(row.closed_at), row.patient_name, row.carnet, row.encounter_type === "INITIAL" ? "Revisión" : "Especialidad", row.specialty_name ?? "—", row.diagnoses, row.allergies, row.chief_complaint, row.assessment ?? "", row.instructions ?? ""]);
}

function excelDate(value: string) {
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date(value));
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function appliedFilterSummary(filters: Filters, specialties: Specialty[]) {
  const specialty = specialties.find((item) => item.id === filters.specialtyId)?.name;
  const values = [
    filters.encounterType === "INITIAL" ? "Revisión" : filters.encounterType === "SPECIALTY" ? "Especialidad" : "Todos los tipos",
    specialty && `Especialidad: ${specialty}`,
    filters.diagnosis && `Diagnóstico: ${filters.diagnosis}`,
    filters.allergy && `Alergia: ${filters.allergy}`,
    filters.habit && `Hábito: ${{ tobacco: "Tabaco", alcohol: "Alcohol", physicalActivity: "Actividad física" }[filters.habit] ?? filters.habit}`,
  ].filter(Boolean);
  return values.join(" · ");
}

function exportExcel(rows: Row[], filters: Filters, specialties: Specialty[], purpose: string) {
  const data = rows.map((row) => [excelDate(row.closed_at), row.patient_name, row.carnet, row.encounter_type === "INITIAL" ? "Revisión" : "Especialidad", row.specialty_name ?? "—", row.diagnoses, row.allergies, row.chief_complaint, row.assessment ?? "", row.instructions ?? ""]);
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Reporte de atenciones clínicas"],
    [`Período: ${formatDate(filters.from)} al ${formatDate(filters.to)}`],
    [`${rows.length} atención(es) · Finalidad: ${purpose}`],
    [`Filtros: ${appliedFilterSummary(filters, specialties)}`],
    [],
    headers,
    ...data,
  ]);
  const lastRow = Math.max(6, data.length + 6);
  const border = { style: "thin", color: { rgb: "D9E2F3" } };
  const titleStyle = { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0B3D6E" } }, alignment: { horizontal: "left", vertical: "center" } };
  const detailStyle = { font: { italic: true, color: { rgb: "425466" } }, fill: { fgColor: { rgb: "EAF2FB" } }, alignment: { vertical: "center" } };
  const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1261A0" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: { top: border, bottom: border, left: border, right: border } };
  const dataStyle = { alignment: { vertical: "top", wrapText: true }, border: { bottom: border } };

  sheet["!merges"] = ["A1:J1", "A2:J2", "A3:J3", "A4:J4"].map((range) => XLSX.utils.decode_range(range));
  sheet["!cols"] = [{ wch: 13 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 19 }, { wch: 31 }, { wch: 25 }, { wch: 36 }, { wch: 42 }, { wch: 38 }];
  sheet["!rows"] = [{ hpt: 26 }, { hpt: 19 }, { hpt: 19 }, { hpt: 32 }, { hpt: 7 }, { hpt: 32 }];
  sheet["!autofilter"] = { ref: `A6:J${lastRow}` };
  sheet["!freeze"] = { xSplit: 0, ySplit: 6, topLeftCell: "A7", activePane: "bottomLeft", state: "frozen" };
  sheet["!margins"] = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };

  for (let column = 0; column < headers.length; column += 1) {
    const header = XLSX.utils.encode_cell({ r: 5, c: column });
    sheet[header].s = headerStyle;
  }
  [0, 1, 2, 3].forEach((row) => {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
    cell.s = row === 0 ? titleStyle : detailStyle;
  });
  data.forEach((_, row) => {
    const fill = row % 2 === 0 ? { fgColor: { rgb: "F6F9FC" } } : undefined;
    for (let column = 0; column < headers.length; column += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row + 6, c: column })];
      cell.s = { ...dataStyle, ...(fill ? { fill } : {}) };
      if (column === 0) cell.z = "dd/mm/yyyy";
    }
  });

  XLSX.utils.book_append_sheet(workbook, sheet, "Atenciones");
  XLSX.writeFile(workbook, "reporte-clinico.xlsx", { cellStyles: true });
}

function download(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ClinicalReportBuilder({ scope }: { scope: "administrative" | "medical" }) {
  const [filters, setFilters] = useState<Filters>(initial);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initial);
  const [rows, setRows] = useState<Row[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purpose, setPurpose] = useState("Gestión clínica");
  const [refresh, setRefresh] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset | null>("MONTH");
  const query = useMemo(() => new URLSearchParams(Object.entries(appliedFilters).filter(([, value]) => value)).toString(), [appliedFilters]);

  useEffect(() => {
    let active = true;
    void apiJson<Row[]>(`/api/reports/clinical?${query}`)
      .then((reportRows) => {
        if (!active) return;
        setRows(reportRows);
        setError("");
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo generar el reporte.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [query, refresh]);

  useEffect(() => {
    let active = true;
    void apiJson<Specialty[]>("/api/specialties")
      .then((availableSpecialties) => { if (active) setSpecialties(availableSpecialties); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las especialidades."); });
    return () => { active = false; };
  }, []);

  const change = <K extends keyof Filters>(key: K, value: Filters[K]) => { if (key === "from" || key === "to") setSelectedPeriod(null); setFilters((current) => ({ ...current, [key]: value })); };
  const applyFilters = () => { setLoading(true); setAppliedFilters(filters); setRefresh((current) => current + 1); };
  const setQuickPeriod = (preset: PeriodPreset) => {
    const next = { ...filters, ...periodRange(preset) };
    setSelectedPeriod(preset);
    setFilters(next);
    setAppliedFilters(next);
    setLoading(true);
    setRefresh((current) => current + 1);
  };

  const report = async (format: "CSV" | "XLSX" | "PDF") => {
    try {
      await apiJson("/api/reports/clinical", { method: "POST", body: JSON.stringify({ format, rowCount: rows.length, filters: appliedFilters, purpose }) });
      const data = rowValues(rows);
      if (format === "CSV") download("reporte-clinico.csv", [headers, ...data].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"), "text/csv;charset=utf-8");
      if (format === "XLSX") {
        exportExcel(rows, appliedFilters, specialties, purpose);
      }
      if (format === "PDF") {
        const pdf = new jsPDF({ orientation: "landscape" });
        pdf.setFontSize(14);
        pdf.text("Reporte clínico", 14, 15);
        autoTable(pdf, { head: [headers], body: data, startY: 21, styles: { fontSize: 6 } });
        pdf.save("reporte-clinico.pdf");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo exportar el reporte.");
    }
  };

  return <div className="space-y-6">
    <header className="border-b border-divider pb-5"><p className="text-sm font-semibold tracking-wide text-primary">REPORTES CLÍNICOS</p><h1 className="mt-1 text-3xl font-bold text-text-primary">{scope === "administrative" ? "Reporte institucional" : "Mis reportes de atención"}</h1><p className="mt-2 max-w-3xl text-text-secondary">Construye reportes de atenciones cerradas por período, especialidad, diagnóstico, alergias y hábitos. Las descargas quedan auditadas.</p></header>
    <section className="rounded-2xl border border-divider bg-surface p-5">
      <div><p className="text-sm font-semibold text-text-primary">Períodos rápidos</p><p className="mt-1 text-sm text-text-secondary">“Este mes” abarca el mes calendario. Usa semestre, año o los últimos 30 días para incluir atenciones anteriores.</p><div className="mt-3 flex flex-wrap gap-2">{(Object.keys(periodLabels) as PeriodPreset[]).map((preset) => <button key={preset} type="button" aria-pressed={selectedPeriod === preset} onClick={() => setQuickPeriod(preset)} className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${selectedPeriod === preset ? "border-primary bg-primary text-on-primary" : "border-divider bg-surface text-text-primary hover:border-primary"}`}>{periodLabels[preset]}</button>)}</div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><Field label="Desde" type="date" value={filters.from} onChange={(value) => change("from", value)} /><Field label="Hasta" type="date" value={filters.to} onChange={(value) => change("to", value)} /><Select label="Tipo" value={filters.encounterType} onChange={(value) => change("encounterType", value)} options={[["", "Todos"], ["INITIAL", "Revisión"], ["SPECIALTY", "Especialidad"]]} /><Select label="Especialidad" value={filters.specialtyId} onChange={(value) => change("specialtyId", value)} options={[["", "Todas"], ...specialties.map((item) => [item.id, item.name])]} /><Field label="Diagnóstico" value={filters.diagnosis} onChange={(value) => change("diagnosis", value)} /><Field label="Alergia" value={filters.allergy} onChange={(value) => change("allergy", value)} /><Select label="Hábito" value={filters.habit} onChange={(value) => change("habit", value)} options={[["", "Cualquiera"], ["tobacco", "Tabaco"], ["alcohol", "Alcohol"], ["physicalActivity", "Actividad física"]]} /><Field label="Finalidad de exportación" value={purpose} onChange={setPurpose} /></div>
      <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={applyFilters} className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary">Aplicar filtros</button><button type="button" onClick={() => { setFilters(initial); setAppliedFilters(initial); setSelectedPeriod("MONTH"); setLoading(true); setRefresh((current) => current + 1); }} className="rounded-lg px-4 py-3 text-sm font-semibold text-primary hover:bg-primary-container">Restablecer</button></div>
    </section>
    {error && <p className="rounded-lg bg-error-container p-4 text-sm text-error">{error}</p>}
    <section className="rounded-2xl border border-divider bg-surface p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-primary">RESULTADO APLICADO</p><p className="mt-1 text-xl font-bold text-text-primary">{loading ? "Actualizando reporte…" : `${rows.length} atención(es) encontradas`}</p><p className="mt-1 text-sm text-text-secondary">Del {formatDate(appliedFilters.from)} al {formatDate(appliedFilters.to)}</p></div><div className="flex gap-2"><button onClick={() => void report("CSV")} disabled={!rows.length || loading} className="rounded-lg border border-divider px-3 py-2 text-sm disabled:opacity-50">CSV</button><button onClick={() => void report("XLSX")} disabled={!rows.length || loading} className="rounded-lg border border-divider px-3 py-2 text-sm disabled:opacity-50">Excel</button><button onClick={() => void report("PDF")} disabled={!rows.length || loading} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">PDF</button></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-divider text-text-secondary"><tr>{headers.slice(0, 7).map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.encounter_id} className="border-b border-divider"><td className="px-3 py-3">{formatClosedDate(row.closed_at)}</td><td className="px-3 py-3 font-semibold">{row.patient_name}</td><td className="px-3 py-3">{row.carnet}</td><td className="px-3 py-3">{row.encounter_type === "INITIAL" ? "Revisión" : "Especialidad"}</td><td className="px-3 py-3">{row.specialty_name ?? "—"}</td><td className="px-3 py-3">{row.diagnoses || "—"}</td><td className="px-3 py-3">{row.allergies || "—"}</td></tr>)}{!loading && !rows.length && <tr><td colSpan={7} className="px-3 py-12 text-center text-text-secondary">No hay atenciones para estos filtros.</td></tr>}</tbody></table>{loading && <p className="py-8 text-center text-sm text-text-secondary">Actualizando atenciones…</p>}</div></section>
  </div>;
}

function Field({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (value: string) => void }) { return <label><span className="text-sm font-semibold">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-divider px-3 py-2" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label><span className="text-sm font-semibold">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-divider px-3 py-2">{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
