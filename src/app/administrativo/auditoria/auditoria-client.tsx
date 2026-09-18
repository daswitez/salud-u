"use client";

import { useState, useMemo, useEffect } from "react";
import { getAuditDemoLog, AuditEvent, AuditEventResource, AuditEventAction } from "@/lib/demo-audit-store";

export function AuditoriaClient() {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [actorFilter, setActorFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState<AuditEventResource | "TODOS">("TODOS");
  const [actionFilter, setActionFilter] = useState<AuditEventAction | "TODOS">("TODOS");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    setLogs(getAuditDemoLog());
  }, []);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (actorFilter.trim()) {
      const q = actorFilter.toLowerCase();
      result = result.filter(r => r.actor.name.toLowerCase().includes(q) || r.actor.id.toLowerCase().includes(q) || r.actor.role.toLowerCase().includes(q));
    }
    if (resourceFilter !== "TODOS") result = result.filter(r => r.resource === resourceFilter);
    if (actionFilter !== "TODOS") result = result.filter(r => r.action === actionFilter);
    if (dateFilter) result = result.filter(r => r.timestamp.startsWith(dateFilter));
    return result;
  }, [logs, actorFilter, resourceFilter, actionFilter, dateFilter]);

  return (
    <div className="space-y-6">
      <header className="border-b border-divider pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Auditoría Clínica y de Reportes</h1>
          <p className="mt-2 text-text-secondary">Registro inmutable de eventos operacionales y accesos, garantizando trazabilidad y privacidad de datos de salud.</p>
        </div>
      </header>

      {/* Filters */}
      <section className="bg-surface border border-divider rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Buscar por Actor</label>
            <input type="text" placeholder="Ej. Valeria Mendoza o DOC-001..." value={actorFilter} onChange={e => setActorFilter(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Recurso Afectado</label>
            <select value={resourceFilter} onChange={e => setResourceFilter(e.target.value as any)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="TODOS">Cualquier recurso</option>
              <option value="STUDENT">Estudiante (Registro Administrativo)</option>
              <option value="ENCOUNTER">Atención (Creación/Cierre/Adenda)</option>
              <option value="DOCUMENT">Documento Adjunto (Carga/Acceso)</option>
              <option value="REFERRAL">Derivación (Creación/Cambio)</option>
              <option value="REPORT">Reporte (Exportación)</option>
              <option value="SYSTEM">Sistema</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Acción</label>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value as any)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="TODOS">Cualquier acción</option>
              <option value="CREATE">Creación / Alta</option>
              <option value="READ">Lectura / Visualización</option>
              <option value="UPDATE">Actualización / Edición</option>
              <option value="DELETE">Eliminación / Baja</option>
              <option value="STATUS_CHANGE">Cambio de Estado</option>
              <option value="EXPORT">Exportación / Descarga</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Fecha</label>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full rounded-lg border-divider bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => { setActorFilter(""); setResourceFilter("TODOS"); setActionFilter("TODOS"); setDateFilter(""); }} className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">Limpiar filtros</button>
        </div>
      </section>

      {/* Table */}
      <div className="bg-surface border border-divider rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-secondary text-text-secondary border-b border-divider">
              <tr>
                <th className="px-5 py-4 font-semibold">Fecha y Hora</th>
                <th className="px-5 py-4 font-semibold">Actor (Usuario)</th>
                <th className="px-5 py-4 font-semibold">Acción y Recurso</th>
                <th className="px-5 py-4 font-semibold">Contexto / Detalle Operativo</th>
                <th className="px-5 py-4 font-semibold text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-secondary/50">
                  <td className="px-5 py-4 whitespace-nowrap text-text-secondary text-xs">
                    <span className="block font-medium text-text-primary">{log.timestamp.split("T")[0]}</span>
                    <span className="block mt-0.5">{log.timestamp.split("T")[1]?.substring(0, 8)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-text-primary">{log.actor.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{log.actor.role} ({log.actor.id})</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-secondary border border-divider text-text-secondary">
                        {log.action}
                      </span>
                      <span className="text-xs font-semibold text-primary">{log.resource} {log.resourceId ? `#${log.resourceId}` : ""}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-text-primary text-xs leading-relaxed max-w-sm">
                      {log.context}
                    </p>
                    <div className="mt-2 text-[10px] text-text-disabled uppercase flex gap-2">
                      <span className="flex items-center gap-1" title="La bitácora nunca muestra el contenido clínico completo">
                        <svg className="size-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                        </svg>
                        Oculto por privacidad
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {log.result === "SUCCESS" && <span className="inline-block px-2 py-1 rounded bg-success-50 text-success-700 text-xs font-bold border border-success/20">EXITOSO</span>}
                    {log.result === "FAILURE" && <span className="inline-block px-2 py-1 rounded bg-error-50 text-error-700 text-xs font-bold border border-error/20">FALLIDO</span>}
                    {log.result === "DENIED" && <span className="inline-block px-2 py-1 rounded bg-warning-50 text-warning-800 text-xs font-bold border border-warning/20">DENEGADO</span>}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-text-secondary">No hay eventos en la bitácora que coincidan con la búsqueda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
