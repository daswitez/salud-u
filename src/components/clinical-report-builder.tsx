"use client";

import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { apiJson } from "@/lib/api/client";

type Specialty = { id: string; name: string };
type Row = { encounter_id: string; closed_at: string; encounter_type: string; specialty_name: string | null; carnet: string; patient_name: string; chief_complaint: string; assessment: string | null; instructions: string | null; diagnoses: string; allergies: string };
type Filters = { from: string; to: string; specialtyId: string; encounterType: string; diagnosis: string; allergy: string; habit: string };

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
const initial: Filters = { from: `${today.slice(0, 8)}01`, to: today, specialtyId: "", encounterType: "", diagnosis: "", allergy: "", habit: "" };
const headers = ["Fecha", "Paciente", "Carnet", "Tipo", "Especialidad", "Diagnósticos", "Alergias", "Motivo", "Evaluación", "Indicaciones"];

function rowValues(rows: Row[]) {
  return rows.map((row) => [new Date(row.closed_at).toLocaleDateString("es-BO"), row.patient_name, row.carnet, row.encounter_type === "INITIAL" ? "Revisión" : "Especialidad", row.specialty_name ?? "—", row.diagnoses, row.allergies, row.chief_complaint, row.assessment ?? "", row.instructions ?? ""]);
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
  const query = useMemo(() => new URLSearchParams(Object.entries(appliedFilters).filter(([, value]) => value)).toString(), [appliedFilters]);

  useEffect(() => {
    let active = true;
    void Promise.all([apiJson<Row[]>(`/api/reports/clinical?${query}`), apiJson<Specialty[]>("/api/specialties")])
      .then(([reportRows, availableSpecialties]) => {
        if (!active) return;
        setRows(reportRows);
        setSpecialties(availableSpecialties);
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

  const change = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const applyFilters = () => { setLoading(true); setAppliedFilters(filters); setRefresh((current) => current + 1); };
  const setQuickPeriod = (next: Filters) => { setFilters(next); setLoading(true); setAppliedFilters(next); };

  const report = async (format: "CSV" | "XLSX" | "PDF") => {
    try {
      await apiJson("/api/reports/clinical", { method: "POST", body: JSON.stringify({ format, rowCount: rows.length, filters: appliedFilters, purpose }) });
      const data = rowValues(rows);
      if (format === "CSV") download("reporte-clinico.csv", [headers, ...data].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"), "text/csv;charset=utf-8");
      if (format === "XLSX") {
        const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "Atenciones");
        XLSX.writeFile(book, "reporte-clinico.xlsx");
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
    <header className="border-b border-divider pb-5"><p className="text-sm font-semibold tracking-wide text-primary">REPORTES CLÍNICOS</p><h1 className="mt-1 text-3xl font-bold text-text-primary">{scope === "administrative" ? "Reporte institucional" : "Mis reportes de atención"}</h1><p className="mt-2 text-text-secondary">Filtra atenciones cerradas por período, especialidad, diagnóstico, alergias y hábitos. Las descargas quedan auditadas.</p></header>
    <section className="rounded-2xl border border-divider bg-surface p-5">
      <div className="flex flex-wrap gap-2"><button onClick={() => setQuickPeriod({ ...initial, from: today, to: today })} className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary">Hoy</button><button onClick={() => setQuickPeriod({ ...initial, from: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), to: today })} className="rounded-lg border border-divider px-3 py-2 text-sm">Últimos 7 días</button><button onClick={() => setQuickPeriod(initial)} className="rounded-lg border border-divider px-3 py-2 text-sm">Este mes</button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><Field label="Desde" type="date" value={filters.from} onChange={(value) => change("from", value)} /><Field label="Hasta" type="date" value={filters.to} onChange={(value) => change("to", value)} /><Select label="Tipo" value={filters.encounterType} onChange={(value) => change("encounterType", value)} options={[["", "Todos"], ["INITIAL", "Revisión"], ["SPECIALTY", "Especialidad"]]} /><Select label="Especialidad" value={filters.specialtyId} onChange={(value) => change("specialtyId", value)} options={[["", "Todas"], ...specialties.map((item) => [item.id, item.name])]} /><Field label="Diagnóstico" value={filters.diagnosis} onChange={(value) => change("diagnosis", value)} /><Field label="Alergia" value={filters.allergy} onChange={(value) => change("allergy", value)} /><Select label="Hábito" value={filters.habit} onChange={(value) => change("habit", value)} options={[["", "Cualquiera"], ["tobacco", "Tabaco"], ["alcohol", "Alcohol"], ["physicalActivity", "Actividad física"]]} /><Field label="Finalidad de exportación" value={purpose} onChange={setPurpose} /></div>
      <button onClick={applyFilters} className="mt-5 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary">Aplicar filtros</button>
    </section>
    {error && <p className="rounded-lg bg-error-container p-4 text-sm text-error">{error}</p>}
    <section className="rounded-2xl border border-divider bg-surface p-5"><div className="flex flex-wrap items-center justify-between gap-4"><p className="font-semibold">{rows.length} atención(es) encontradas</p><div className="flex gap-2"><button onClick={() => void report("CSV")} disabled={!rows.length} className="rounded-lg border border-divider px-3 py-2 text-sm disabled:opacity-50">CSV</button><button onClick={() => void report("XLSX")} disabled={!rows.length} className="rounded-lg border border-divider px-3 py-2 text-sm disabled:opacity-50">Excel</button><button onClick={() => void report("PDF")} disabled={!rows.length} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">PDF</button></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-divider text-text-secondary"><tr>{headers.slice(0, 7).map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.encounter_id} className="border-b border-divider"><td className="px-3 py-3">{new Date(row.closed_at).toLocaleDateString("es-BO")}</td><td className="px-3 py-3 font-semibold">{row.patient_name}</td><td className="px-3 py-3">{row.carnet}</td><td className="px-3 py-3">{row.encounter_type === "INITIAL" ? "Revisión" : "Especialidad"}</td><td className="px-3 py-3">{row.specialty_name ?? "—"}</td><td className="px-3 py-3">{row.diagnoses || "—"}</td><td className="px-3 py-3">{row.allergies || "—"}</td></tr>)}{!loading && !rows.length && <tr><td colSpan={7} className="px-3 py-12 text-center text-text-secondary">No hay atenciones para estos filtros.</td></tr>}</tbody></table>{loading && <p className="py-8 text-center text-sm text-text-secondary">Generando reporte…</p>}</div></section>
  </div>;
}

function Field({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (value: string) => void }) { return <label><span className="text-sm font-semibold">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-divider px-3 py-2" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label><span className="text-sm font-semibold">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-divider px-3 py-2">{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
