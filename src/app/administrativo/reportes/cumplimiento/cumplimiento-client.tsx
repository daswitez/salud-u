"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";

type AppState = ReturnType<typeof import("@/lib/demo-clinical-store").getClinicalDemoState>;

export function CumplimientoClient({ state, userName }: { state: AppState; userName: string }) {
  const [career, setCareer] = useState("");
  const [gestion, setGestion] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS"); // "CUMPLIDO", "PENDIENTE", "TODOS"

  // Derive all unique management years from registration codes (e.g. REG-2026-001 -> 2026)
  const gestiones = Array.from(new Set(state.patients.map(p => {
    const match = p.registrationCode.match(/-(\d{4})-/);
    return match ? match[1] : "Desconocida";
  }))).sort().reverse();

  const uniqueCareers = Array.from(new Set(state.patients.map(p => p.career)));

  // Calculate compliance per student
  const studentCompliance = useMemo(() => {
    return state.patients.map(patient => {
      // Look for at least one CLOSED encounter for this patient
      const hasClosedEncounter = state.encounters.some(e => e.patientId === patient.id && e.status === "CLOSED");
      const match = patient.registrationCode.match(/-(\d{4})-/);
      const studentGestion = match ? match[1] : "Desconocida";
      
      return {
        patient,
        gestion: studentGestion,
        fulfilled: hasClosedEncounter
      };
    });
  }, [state]);

  const filteredData = useMemo(() => {
    let result = studentCompliance;
    if (career) result = result.filter(r => r.patient.career === career);
    if (gestion) result = result.filter(r => r.gestion === gestion);
    if (statusFilter === "CUMPLIDO") result = result.filter(r => r.fulfilled);
    if (statusFilter === "PENDIENTE") result = result.filter(r => !r.fulfilled);
    return result;
  }, [studentCompliance, career, gestion, statusFilter]);

  const fulfilledCount = filteredData.filter(r => r.fulfilled).length;
  const pendingCount = filteredData.length - fulfilledCount;
  const percentage = filteredData.length === 0 ? 0 : Math.round((fulfilledCount / filteredData.length) * 100);

  const handleExport = () => {
    // Log audit
    console.log(`[AUDITORÍA EXPORTACIÓN] Usuario: ${userName} | Acción: Exportación de Cumplimiento Médico | Filtros: { carrera: "${career}", gestion: "${gestion}", estado: "${statusFilter}" } | Total: ${filteredData.length}`);
    
    const header = ["Carnet / Doc", "Código", "Nombre Completo", "Carrera", "Gestión", "Estado de Revisión"];
    const rows = filteredData.map(r => [
      r.patient.carnet,
      r.patient.registrationCode,
      r.patient.fullName,
      r.patient.career,
      r.gestion,
      r.fulfilled ? "CUMPLIDO" : "PENDIENTE"
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cumplimiento");
    XLSX.writeFile(workbook, `cumplimiento_medico_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-divider pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Control de Cumplimiento Médico</h1>
          <p className="mt-2 text-text-secondary">Monitorea a los estudiantes que han cumplido con el requisito de revisión médica inicial.</p>
        </div>
        <button onClick={handleExport} disabled={filteredData.length === 0} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-600 transition-colors shadow-sm disabled:opacity-50">
          Exportar a Excel
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-divider rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-text-secondary mb-1">Total Filtrado</p>
          <p className="text-3xl font-black text-text-primary">{filteredData.length}</p>
        </div>
        <div className="bg-success-container border border-success/20 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-success-900 mb-1">Cumplieron Requisito</p>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-black text-success-900">{fulfilledCount}</p>
            <p className="text-sm font-bold text-success-700 pb-1">{percentage}% del grupo</p>
          </div>
        </div>
        <div className="bg-warning-container border border-warning/20 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-warning-900 mb-1">Pendientes de Atención</p>
          <p className="text-3xl font-black text-warning-900">{pendingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <section className="bg-surface-secondary border border-divider rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Gestión de Ingreso</label>
            <select value={gestion} onChange={e => setGestion(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">Todas las gestiones</option>
              {gestiones.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Carrera</label>
            <select value={career} onChange={e => setCareer(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">Todas las carreras</option>
              {uniqueCareers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Estado de Cumplimiento</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="TODOS">Todos</option>
              <option value="CUMPLIDO">Solo Cumplidos</option>
              <option value="PENDIENTE">Solo Pendientes</option>
            </select>
          </div>
        </div>
      </section>

      {/* Table */}
      <div className="bg-surface border border-divider rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-secondary text-text-secondary border-b border-divider">
              <tr>
                <th className="px-5 py-4 font-semibold">Estudiante</th>
                <th className="px-5 py-4 font-semibold">Carrera y Gestión</th>
                <th className="px-5 py-4 font-semibold">Estado de Requisito</th>
                <th className="px-5 py-4 font-semibold text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {filteredData.map((row) => (
                <tr key={row.patient.id} className="hover:bg-surface-secondary/50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-text-primary">{row.patient.fullName}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{row.patient.carnet} · {row.patient.registrationCode}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-text-primary">{row.patient.career}</p>
                    <p className="text-xs text-text-secondary mt-0.5">Ingreso: {row.gestion}</p>
                  </td>
                  <td className="px-5 py-4">
                    {row.fulfilled ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold bg-success-50 text-success-700 border border-success/20">
                        <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                        CUMPLIDO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold bg-warning-50 text-warning-800 border border-warning/20">
                        <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                        PENDIENTE
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="text-xs text-text-tertiary max-w-[200px] ml-auto">
                      {row.fulfilled 
                        ? "Cuenta con al menos una atención clínica finalizada en su historial."
                        : "No bloquea inscripción, pero se requerirá completar la cita."}
                    </p>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-text-secondary">No se encontraron estudiantes para los filtros actuales.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
