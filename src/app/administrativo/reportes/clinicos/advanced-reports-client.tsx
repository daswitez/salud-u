"use client";

import { useState, useMemo } from "react";
import type { Specialty } from "@/lib/ui-contracts";

type ReturnState = ReturnType<typeof import("@/lib/demo-clinical-store").getClinicalDemoState>;

function getAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const today = new Date("2026-09-17T12:00:00");
  const birth = new Date(`${birthDate}T12:00:00`);
  let result = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
    result -= 1;
  }
  return result;
}

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function AdvancedReportsClient({ state, userName, fixedDoctorId }: { state: ReturnState; userName: string; fixedDoctorId?: string }) {
  // Filtros
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState(fixedDoctorId || "");
  const [specialty, setSpecialty] = useState("");
  const [diagnosisQuery, setDiagnosisQuery] = useState("");
  const [career, setCareer] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [recurrent, setRecurrent] = useState("TODOS");
  const [referralStatus, setReferralStatus] = useState("TODOS");

  // Visualización
  const [mode, setMode] = useState<"NOMINAL" | "AGREGADO">("NOMINAL");
  const [pseudonymized, setPseudonymized] = useState(false);

  // Modal Exportación
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPurpose, setExportPurpose] = useState("Auditoría Interna");
  const [exportFormat, setExportFormat] = useState("CSV");
  const [exporting, setExporting] = useState(false);

  // Computación de resultados
  const results = useMemo(() => {
    let encounters = [...state.encounters];

    // Fecha
    if (dateFrom) encounters = encounters.filter(e => e.occurredAt >= dateFrom);
    if (dateTo) encounters = encounters.filter(e => e.occurredAt <= dateTo + "T23:59");
    
    // Médico
    const effectiveDoctorId = fixedDoctorId || selectedDoctorId;
    if (effectiveDoctorId) encounters = encounters.filter(e => e.doctorId === effectiveDoctorId);
    
    // Especialidad
    if (specialty) encounters = encounters.filter(e => e.specialty === specialty);

    // Filter combinations (requires expanding patient & diagnosis data)
    let filtered = encounters.map(e => {
      const patient = state.patients.find(p => p.id === e.patientId);
      const encounterDiagnoses = state.diagnoses.filter(d => d.encounterId === e.id);
      const activeReferral = state.referrals.find(r => r.patientId === e.patientId && (r.assignedDoctorId === e.doctorId || r.requestedBy === e.doctorId));
      return { encounter: e, patient, diagnoses: encounterDiagnoses, referral: activeReferral };
    }).filter(row => row.patient !== undefined);

    // Diagnóstico texto libre
    if (diagnosisQuery.trim()) {
      const q = diagnosisQuery.toLowerCase();
      filtered = filtered.filter(row => row.diagnoses.some(d => d.label.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q)));
    }

    // Carrera
    if (career) {
      filtered = filtered.filter(row => row.patient?.career === career);
    }

    // Edad
    if (ageMin) {
      filtered = filtered.filter(row => {
        const age = getAge(row.patient?.birthDate);
        return age !== null && age >= parseInt(ageMin);
      });
    }
    if (ageMax) {
      filtered = filtered.filter(row => {
        const age = getAge(row.patient?.birthDate);
        return age !== null && age <= parseInt(ageMax);
      });
    }

    // Recurrente
    if (recurrent !== "TODOS") {
      const isRec = recurrent === "SI";
      filtered = filtered.filter(row => row.patient?.isRecurrent === isRec);
    }

    // Estado Derivación
    if (referralStatus !== "TODOS") {
      filtered = filtered.filter(row => row.referral?.status === referralStatus);
    }

    return filtered;
  }, [state, dateFrom, dateTo, selectedDoctorId, specialty, diagnosisQuery, career, ageMin, ageMax, recurrent, referralStatus, fixedDoctorId]);

  // Agrupación si es modo AGREGADO
  const aggregatedResults = useMemo(() => {
    if (mode !== "AGREGADO") return [];
    const grouped = new Map<string, number>();
    results.forEach(row => {
      const key = `${row.encounter.type === "INITIAL" ? "Revisión Estudiantil" : row.encounter.specialty || "Especialidad"} - ${row.patient?.career || "Desconocida"}`;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([grupo, total]) => ({ grupo, total })).sort((a,b) => b.total - a.total);
  }, [results, mode]);

  const uniqueCareers = Array.from(new Set(state.patients.map(p => p.career)));
  const uniqueSpecialties = ["DERMATOLOGY", "OPHTHALMOLOGY", "INTERNAL_MEDICINE", "UROLOGY", "GYNECOLOGY"];

  const handleExport = () => {
    setExporting(true);
    // Simular exportación y log de auditoría
    setTimeout(() => {
      console.log(`[AUDITORÍA EXPORTACIÓN] Usuario: ${userName} | Finalidad: ${exportPurpose} | Formato: ${exportFormat} | Filtros: { diag: "${diagnosisQuery}", medico: "${fixedDoctorId || selectedDoctorId}", carrera: "${career}" } | Total registros: ${results.length} | Seudonimizado: ${pseudonymized}`);
      
      const fileName = `reporte_clinico_${mode.toLowerCase()}_${new Date().toISOString().split("T")[0]}`;

      let dataToExport: any[] = [];
      let header: string[] = [];
      
      if (mode === "NOMINAL") {
        header = ["Fecha Atención", "Identificador de Paciente", "Perfil Académico", "Diagnósticos", "Derivación"];
        dataToExport = results.map(row => {
          const date = new Date(row.encounter.occurredAt).toLocaleString("es-BO");
          const patientId = pseudonymized ? `PACIENTE_${row.patient!.id.split("-")[0]}` : `${row.patient!.fullName} (${row.patient!.carnet})`;
          const profile = `${row.patient!.career} - ${getAge(row.patient!.birthDate) ?? "?"} años`;
          const diagnoses = row.diagnoses.map(d => `${d.code || "S/C"} ${d.label}`).join("; ");
          const referral = row.referral ? `${row.referral.specialty} (${row.referral.status})` : "Ninguna";
          return [date, patientId, profile, diagnoses, referral];
        });
      } else {
        header = ["Agrupación (Tipo/Especialidad - Carrera)", "Total de Casos", "Porcentaje de la Muestra"];
        dataToExport = aggregatedResults.map(agg => {
          const percent = Math.round((agg.total / results.length) * 100) + "%";
          return [agg.grupo, agg.total, percent];
        });
      }

      if (exportFormat === "CSV") {
        let csvContent = header.join(",") + "\n";
        dataToExport.forEach(row => {
          csvContent += row.map((str: any) => `"${String(str).replace(/"/g, '""')}"`).join(",") + "\n";
        });
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${fileName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (exportFormat === "EXCEL") {
        const worksheet = XLSX.utils.aoa_to_sheet([header, ...dataToExport]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      } else if (exportFormat === "PDF") {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Reporte Clínico", 14, 20);
        doc.setFontSize(10);
        doc.text(`Generado por: ${userName}`, 14, 28);
        doc.text(`Finalidad: ${exportPurpose}`, 14, 34);
        doc.text(`Modo: ${mode} ${pseudonymized ? "(Seudonimizado)" : ""}`, 14, 40);
        
        autoTable(doc, {
          startY: 45,
          head: [header],
          body: dataToExport,
        });
        doc.save(`${fileName}.pdf`);
      }

      setExporting(false);
      setExportOpen(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-divider pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Investigación y Reportes Clínicos</h1>
          <p className="mt-2 text-text-secondary">Construye conjuntos de datos combinando filtros para estadística o investigación.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary cursor-pointer bg-surface-secondary px-3 py-1.5 rounded-lg border border-divider hover:bg-divider transition-colors">
            <input type="checkbox" checked={pseudonymized} onChange={(e) => setPseudonymized(e.target.checked)} className="rounded border-divider text-primary focus:ring-primary" />
            Modo de Investigación (Seudonimizado)
          </label>
        </div>
      </header>

      {/* Constructor de Filtros */}
      <section className="bg-surface border border-divider rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-text-primary mb-5">Constructor de Filtros (Tipo Lego)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Diagnóstico o Etiqueta (Texto)</label>
            <input type="text" placeholder="Ej. ansiedad, J01, miopía..." value={diagnosisQuery} onChange={e => setDiagnosisQuery(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          {!fixedDoctorId && (
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Profesional de Salud</label>
              <select value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
                <option value="">Cualquier profesional</option>
                {state.professionals.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Especialidad Clínica</label>
            <select value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">Todas</option>
              {uniqueSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Carrera del Paciente</label>
            <select value={career} onChange={e => setCareer(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">Todas las carreras</option>
              {uniqueCareers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-secondary mb-1">Edad Mín</label>
              <input type="number" value={ageMin} onChange={e => setAgeMin(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm" placeholder="Años" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-secondary mb-1">Edad Máx</label>
              <input type="number" value={ageMax} onChange={e => setAgeMax(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm" placeholder="Años" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Rango de Fechas</label>
            <div className="flex gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full rounded-lg border-divider bg-background px-2 py-2 text-xs" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full rounded-lg border-divider bg-background px-2 py-2 text-xs" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Paciente Recurrente</label>
            <select value={recurrent} onChange={e => setRecurrent(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm">
              <option value="TODOS">Indiferente</option>
              <option value="SI">Sí, crónico/recurrente</option>
              <option value="NO">No, atención puntual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Estado de Derivación</label>
            <select value={referralStatus} onChange={e => setReferralStatus(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm">
              <option value="TODOS">Indiferente</option>
              <option value="PENDING_ASSIGNMENT">Pendiente de Asignación</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="CLOSED">Cerrada</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={() => {
            setDateFrom(""); setDateTo(""); setSelectedDoctorId(fixedDoctorId || ""); setSpecialty(""); setDiagnosisQuery(""); setCareer(""); setAgeMin(""); setAgeMax(""); setRecurrent("TODOS"); setReferralStatus("TODOS");
          }} className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">Limpiar todos los filtros</button>
        </div>
      </section>

      {/* Acciones de Vista */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-surface-secondary rounded-lg p-1 border border-divider">
          <button onClick={() => setMode("NOMINAL")} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${mode === "NOMINAL" ? "bg-surface shadow-sm text-text-primary" : "text-text-secondary hover:text-text-primary"}`}>Vista Nominal (Detalle)</button>
          <button onClick={() => setMode("AGREGADO")} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${mode === "AGREGADO" ? "bg-surface shadow-sm text-text-primary" : "text-text-secondary hover:text-text-primary"}`}>Vista Agregada (Estadística)</button>
        </div>
        <button onClick={() => setExportOpen(true)} disabled={results.length === 0} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-sm">
          Exportar Resultados ({results.length})
        </button>
      </div>

      {/* Resultados */}
      <section className="bg-surface border border-divider rounded-2xl overflow-hidden shadow-sm">
        {mode === "NOMINAL" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary text-text-secondary border-b border-divider">
                <tr>
                  <th className="px-5 py-4 font-semibold">Fecha Atención</th>
                  <th className="px-5 py-4 font-semibold">Identificador de Paciente</th>
                  <th className="px-5 py-4 font-semibold">Perfil Académico</th>
                  <th className="px-5 py-4 font-semibold">Diagnósticos</th>
                  <th className="px-5 py-4 font-semibold">Derivación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {results.map((row, idx) => (
                  <tr key={row.encounter.id + idx} className="hover:bg-surface-secondary/50">
                    <td className="px-5 py-4 whitespace-nowrap text-text-primary">
                      {row.encounter.occurredAt.split("T")[0]} {row.encounter.occurredAt.split("T")[1]?.substring(0, 5)}
                    </td>
                    <td className="px-5 py-4">
                      {pseudonymized ? (
                        <div className="font-mono text-xs bg-surface-secondary px-2 py-1 rounded inline-block text-text-secondary">PACIENTE_{row.patient!.id.split("-")[0]}</div>
                      ) : (
                        <div>
                          <p className="font-semibold text-text-primary">{row.patient!.fullName}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{row.patient!.carnet} · {row.patient!.registrationCode}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-text-primary">{row.patient!.career}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{getAge(row.patient!.birthDate) ?? "?"} años · {row.patient!.isRecurrent ? "Recurrente" : "No recurrente"}</p>
                    </td>
                    <td className="px-5 py-4">
                      {row.diagnoses.length > 0 ? (
                        <ul className="list-disc list-inside text-xs text-text-secondary">
                          {row.diagnoses.map(d => <li key={d.id}><span className="font-semibold text-text-primary">{d.code || "S/C"}</span> {d.label}</li>)}
                        </ul>
                      ) : <span className="text-text-disabled italic">Ninguno</span>}
                    </td>
                    <td className="px-5 py-4">
                      {row.referral ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-primary-50 text-primary-900 border border-primary-200">
                          {row.referral.specialty} ({row.referral.status})
                        </span>
                      ) : <span className="text-text-disabled">-</span>}
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-text-secondary">No se encontraron atenciones que coincidan con los filtros combinados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary text-text-secondary border-b border-divider">
                <tr>
                  <th className="px-5 py-4 font-semibold">Agrupación (Tipo/Especialidad - Carrera)</th>
                  <th className="px-5 py-4 font-semibold text-right">Total de Casos</th>
                  <th className="px-5 py-4 font-semibold text-right">Porcentaje de la Muestra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {aggregatedResults.map((agg, idx) => (
                  <tr key={idx} className="hover:bg-surface-secondary/50">
                    <td className="px-5 py-4 font-medium text-text-primary">{agg.grupo}</td>
                    <td className="px-5 py-4 text-right font-black text-text-primary text-lg">{agg.total}</td>
                    <td className="px-5 py-4 text-right text-text-secondary">
                      {Math.round((agg.total / results.length) * 100)}%
                    </td>
                  </tr>
                ))}
                {aggregatedResults.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-12 text-center text-text-secondary">Aplica filtros para ver datos estadísticos agrupados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de Exportación */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl border border-divider">
            <h3 className="text-xl font-bold text-text-primary mb-2">Exportar Conjunto de Datos</h3>
            <p className="text-sm text-text-secondary mb-6">Por normativa de salud, se debe registrar la finalidad de extracción de datos masivos. La auditoría guardará tu usuario y filtros aplicados.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Finalidad de la exportación</label>
                <select value={exportPurpose} onChange={e => setExportPurpose(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
                  <option value="Auditoría Interna">Auditoría Interna</option>
                  <option value="Investigación Académica">Investigación Académica / Tesis</option>
                  <option value="Reporte Operativo Mensual">Reporte Operativo Mensual</option>
                  <option value="Análisis Estadístico">Análisis Estadístico Anónimo</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Formato de Archivo</label>
                <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
                  <option value="CSV">CSV (Compatible con SPSS / R / Excel)</option>
                  <option value="EXCEL">Hoja de cálculo Excel (.xlsx)</option>
                  <option value="PDF">Reporte Documental PDF</option>
                </select>
              </div>

              <div className="rounded-lg bg-warning-container text-warning-900 p-3 text-xs mt-4">
                <strong>Resumen de extracción:</strong> Se exportarán <strong>{results.length}</strong> registros en modo {mode.toLowerCase()} {pseudonymized ? "seudonimizados" : "con datos sensibles expuestos"}.
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setExportOpen(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-secondary transition-colors">Cancelar</button>
              <button onClick={handleExport} disabled={exporting} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-600 transition-colors disabled:opacity-70 flex items-center gap-2">
                {exporting ? "Procesando y auditando..." : "Confirmar y Descargar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
