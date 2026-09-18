"use client";

import { useState } from "react";

export type ClinicalViewerContext = 
  | { type: "REVIEW"; appointmentId: string }
  | { type: "SPECIALTY"; referral: any; sourceEncounter: any; sourceDiagnoses: any[] };

export function ClinicalChartViewer({ snapshot, context }: { snapshot: any, context?: ClinicalViewerContext }) {
  const defaultTab = context?.type === "SPECIALTY" ? "SOURCE" : "INTAKE";
  const [activeTab, setActiveTab] = useState<"SOURCE" | "TIMELINE" | "INTAKE" | "DOCUMENTS">(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = [];
  if (context?.type === "SPECIALTY") {
    tabs.push({ id: "SOURCE", label: "Cuestionario de Derivación" });
  }
  tabs.push({ id: "INTAKE", label: "Registro Inicial (Admin)" });
  tabs.push({ id: "TIMELINE", label: "Línea de Tiempo" });
  tabs.push({ id: "DOCUMENTS", label: "Exámenes y Adjuntos" });

  const filteredEncounters = snapshot.encounters.filter((e: any) => 
    e.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (e.assessment && e.assessment.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDocuments = snapshot.documents.filter((d: any) => 
    d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[650px] bg-surface rounded-2xl border border-divider overflow-hidden shadow-sm">
      {/* Tabs Header */}
      <div className="flex border-b border-divider bg-surface-secondary overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? "border-primary text-primary bg-primary-50/50" 
                : "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6 overflow-y-auto bg-surface relative flex-1">
        
        {/* Render SOURCE (Referral Form View) */}
        {activeTab === "SOURCE" && context?.type === "SPECIALTY" && (
          <div className="max-w-3xl mx-auto bg-white border border-divider shadow-sm rounded-xl p-8">
            <div className="border-b border-divider pb-4 mb-6">
              <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">Formulario de Revisión Estudiantil</h2>
              <p className="text-sm text-text-secondary mt-1">Cuestionario completado por el médico general que motivó esta derivación.</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Especialidad Solicitada</label>
                <div className="bg-surface-secondary p-3 rounded-lg border border-divider font-semibold text-primary-800">
                  {context.referral.specialty}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Motivo de Consulta (Cuestionario)</label>
                <div className="bg-surface-secondary p-4 rounded-lg border border-divider text-text-primary whitespace-pre-wrap">
                  {context.sourceEncounter.chiefComplaint}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Evaluación y Hallazgos Clínicos</label>
                <div className="bg-surface-secondary p-4 rounded-lg border border-divider text-text-primary whitespace-pre-wrap">
                  {context.sourceEncounter.assessment || "No se registró evaluación detallada."}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Justificación / Comentario al Especialista</label>
                <div className="bg-warning-50 p-4 rounded-lg border border-warning-200 text-warning-900 font-medium">
                  {context.referral.commentForSpecialist}
                </div>
              </div>

              {context.sourceDiagnoses.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Impresión Diagnóstica</label>
                  <div className="flex flex-col gap-2">
                    {context.sourceDiagnoses.map((d: any) => (
                      <div key={d.id} className="bg-primary-50 p-3 rounded-lg border border-primary-100 flex justify-between items-center">
                        <span className="font-bold text-primary-900">{d.label}</span>
                        {d.code && <span className="text-xs font-mono bg-primary-100 px-2 py-1 rounded text-primary-800">{d.code}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {context.sourceEncounter.bloodChemistryStatus && context.sourceEncounter.bloodChemistryStatus !== "NOT_PRESENTED" && (
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Examen de Química Sanguínea</label>
                  <div className={`p-3 rounded-lg border font-semibold ${
                    context.sourceEncounter.bloodChemistryStatus === "ATTACHED" 
                      ? "bg-success-container text-success-800 border-success-200" 
                      : "bg-warning-container text-warning-800 border-warning-200"
                  }`}>
                    {context.sourceEncounter.bloodChemistryStatus === "ATTACHED" 
                      ? "✓ Resultados Adjuntos al Expediente" 
                      : "⏳ Examen Solicitado / Pendiente de Resultados"}
                  </div>
                </div>
              )}

              {(() => {
                const sourceDocs = snapshot.documents.filter((d: any) => d.encounterId === context.sourceEncounter.id);
                if (sourceDocs.length === 0) return null;
                return (
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Documentos Adjuntados en esta Revisión</label>
                    <div className="flex flex-col gap-2">
                      {sourceDocs.map((doc: any) => (
                        <div key={doc.id} className="bg-surface-secondary p-3 rounded-lg border border-divider flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs font-bold">{doc.type.substring(0, 3)}</span>
                            <span className="font-semibold text-text-primary text-sm">{doc.fileName}</span>
                          </div>
                          <span className="text-xs text-text-secondary">{doc.type.replaceAll("_", " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Render INTAKE (Admin Form View) */}
        {activeTab === "INTAKE" && (
          <div className="max-w-3xl mx-auto bg-white border border-divider shadow-sm rounded-xl p-8">
            <div className="border-b border-divider pb-4 mb-6">
              <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">Registro Inicial Administrativo</h2>
              <p className="text-sm text-text-secondary mt-1">Cuestionario base llenado durante el registro en recepción.</p>
            </div>
            
            {snapshot.history?.intake ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Tipo de Sangre</label>
                    <div className="bg-surface-secondary p-3 rounded-lg border border-divider font-semibold text-text-primary">
                      {snapshot.history.intake.bloodType || "No registrado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-error-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-error"></span> Alergias Conocidas
                    </label>
                    <div className="bg-error-50 p-3 rounded-lg border border-error-200 font-bold text-error-900">
                      {snapshot.history.intake.allergies || "Ninguna registrada"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Condiciones Crónicas</label>
                  <div className="bg-surface-secondary p-4 rounded-lg border border-divider text-text-primary whitespace-pre-wrap">
                    {snapshot.history.intake.chronicConditions || "No refiere"}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Historia Quirúrgica / Relevante</label>
                  <div className="bg-surface-secondary p-4 rounded-lg border border-divider text-text-primary whitespace-pre-wrap">
                    {snapshot.history.intake.relevantHistory || "No refiere"}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Medicación Actual</label>
                  <div className="bg-surface-secondary p-4 rounded-lg border border-divider text-text-primary whitespace-pre-wrap">
                    {snapshot.history.intake.currentMedications || "Ninguna"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-text-secondary">
                <p>El paciente no tiene cuestionario de registro inicial guardado.</p>
              </div>
            )}
          </div>
        )}

        {/* Render TIMELINE */}
        {activeTab === "TIMELINE" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 sticky top-0 bg-surface z-10 pb-4 border-b border-divider">
              <h3 className="text-lg font-bold text-text-primary">Línea de tiempo de atenciones</h3>
              <input 
                type="search"
                placeholder="Buscar atenciones..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="rounded-lg border border-input bg-surface px-4 py-2 text-sm max-w-xs w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-4">
              {filteredEncounters.map((encounter: any) => (
                <article key={encounter.id} className="rounded-xl border border-divider p-4 hover:border-primary-300 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-text-primary">
                        {encounter.type === "INITIAL" ? "Revisión estudiantil" : `Atención especializada (${encounter.specialty})`}
                      </p>
                      <p className="mt-1 text-xs font-medium text-text-secondary">
                        {new Date(encounter.occurredAt).toLocaleString("es-BO", { dateStyle: "long", timeStyle: "short" })}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${encounter.status === "CLOSED" ? "bg-success-container text-success" : "bg-warning-container text-warning"}`}>
                      {encounter.status === "CLOSED" ? "Cerrada" : "Borrador"}
                    </span>
                  </div>
                  <div className="mt-4 bg-surface-secondary p-3 rounded-lg">
                    <p className="text-sm font-semibold text-text-primary">Motivo: {encounter.chiefComplaint}</p>
                    {encounter.assessment && (
                      <p className="mt-2 text-sm text-text-secondary border-t border-divider pt-2">{encounter.assessment}</p>
                    )}
                  </div>
                  
                  {/* Mostrar diagnósticos de esta atención */}
                  {snapshot.diagnoses.filter((d: any) => d.encounterId === encounter.id).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {snapshot.diagnoses.filter((d: any) => d.encounterId === encounter.id).map((diagnosis: any) => (
                        <span key={diagnosis.id} className="inline-flex items-center rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-700/10">
                          {diagnosis.label} {diagnosis.code ? `(${diagnosis.code})` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
              {!filteredEncounters.length && <p className="py-8 text-center text-sm text-text-secondary">No hay atenciones que coincidan con la búsqueda.</p>}
            </div>
          </div>
        )}

        {/* Render DOCUMENTS */}
        {activeTab === "DOCUMENTS" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 sticky top-0 bg-surface z-10 pb-4 border-b border-divider">
              <h3 className="text-lg font-bold text-text-primary">Archivos y Documentos Clínicos</h3>
              <input 
                type="search"
                placeholder="Buscar archivos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="rounded-lg border border-input bg-surface px-4 py-2 text-sm max-w-xs w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-4">
              {filteredDocuments.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl border border-divider bg-surface hover:bg-surface-secondary transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                    <span className="font-bold text-xs">{doc.type.substring(0, 3)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{doc.fileName}</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {doc.type.replaceAll("_", " ")} · Subido el {new Date(doc.uploadedAt).toLocaleDateString("es-BO")}
                    </p>
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {doc.tags.map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-[10px] font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary-50 rounded-lg transition-colors">
                    Ver
                  </button>
                </div>
              ))}
              {!filteredDocuments.length && <p className="py-8 text-center text-sm text-text-secondary">No hay documentos ni exámenes que coincidan con la búsqueda.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
