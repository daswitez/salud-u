"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { createClinicalEncounter, updateClinicalEncounter, closeClinicalEncounter, getPatientClinicalSnapshot, addMeasurement, removeClinicalDocument } from "@/lib/demo-clinical-store";
import type { ClinicalEncounter, ClinicalRole, ClinicalDocument } from "@/lib/ui-contracts";
import { ClinicalDocumentUploader } from "@/components/clinical-document-uploader";
import { ClinicalReferralCreator } from "@/components/clinical-referral-creator";

export function ClinicalForm({ patientId, historyId, doctorId, doctorName, clinicalRole, snapshot }: { patientId: string; historyId: string; doctorId: string; doctorName: string; clinicalRole: ClinicalRole; snapshot: any }) {
  const router = useRouter();
  
  const [encounter, setEncounter] = useState<ClinicalEncounter | null>(null);
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [assessment, setAssessment] = useState("");
  const [instructions, setInstructions] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodChemistryStatus, setBloodChemistryStatus] = useState<"ATTACHED" | "PENDING" | "NOT_PRESENTED">("NOT_PRESENTED");
  
  const [notice, setNotice] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  useEffect(() => {
    const snapshot = getPatientClinicalSnapshot(patientId);
    const draft = snapshot.encounters.find(e => e.doctorId === doctorId && e.status === "DRAFT");
    
    if (draft) {
      setEncounter(draft);
      setChiefComplaint(draft.chiefComplaint);
      setAssessment(draft.assessment || "");
      setInstructions(draft.instructions || "");
      setBloodChemistryStatus(draft.bloodChemistryStatus);
      const weightMeasurement = snapshot.measurements.find(m => m.encounterId === draft.id && m.type === "WEIGHT");
      if (weightMeasurement) setWeight(String(weightMeasurement.value));
      setDocuments(snapshot.documents.filter(d => d.encounterId === draft.id));
    }
  }, [patientId, doctorId]);

  function trySaveWeight(encounterId: string) {
    const val = Number(weight);
    if (!isNaN(val) && val > 0) {
      addMeasurement(encounterId, { type: "WEIGHT", value: val, unit: "kg", measuredAt: new Date().toISOString() });
    }
  }

  function save() {
    if (isFinalized) return;
    
    if (!chiefComplaint.trim()) {
      setNotice("El motivo de consulta es obligatorio para guardar un borrador.");
      return;
    }

    if (!encounter) {
      const result = createClinicalEncounter({
        patientId,
        doctorId,
        type: "INITIAL",
        chiefComplaint,
        assessment,
        instructions,
        bloodChemistryStatus,
      });

      if (result.ok) {
        setEncounter(result.data);
        trySaveWeight(result.data.id);
        setNotice(`Borrador guardado localmente a las ${new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}.`);
      } else {
        setNotice(result.message || "Error al crear el borrador.");
      }
    } else {
      const result = updateClinicalEncounter(encounter.id, doctorId, {
        chiefComplaint,
        assessment,
        instructions,
        bloodChemistryStatus,
      });

      if (result.ok) {
        setEncounter(result.data);
        trySaveWeight(result.data.id);
        setNotice(`Borrador actualizado a las ${new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}.`);
      } else {
        setNotice(result.message || "Error al actualizar el borrador.");
      }
    }
  }

  function requestFinalize() {
    if (!chiefComplaint.trim() || !assessment.trim()) {
      setPendingConfirmation(true);
      setNotice("Faltan campos importantes (motivo o evaluación). Puedes completar los campos o confirmar la finalización bajo tu responsabilidad.");
      return;
    }
    finish();
  }

  function finish() {
    if (isFinalized) return;
    if (!chiefComplaint.trim()) {
      setNotice("El motivo de consulta es obligatorio.");
      return;
    }

    let currentEncounterId = encounter?.id;

    if (!encounter) {
      const result = createClinicalEncounter({
        patientId,
        doctorId,
        type: "INITIAL",
        chiefComplaint,
        assessment,
        instructions,
        bloodChemistryStatus,
      });
      if (!result.ok) {
        setNotice(result.message || "Error al crear la atención.");
        return;
      }
      currentEncounterId = result.data.id;
    } else {
      const updateResult = updateClinicalEncounter(encounter.id, doctorId, {
        chiefComplaint,
        assessment,
        instructions,
        bloodChemistryStatus,
      });
      if (!updateResult.ok) {
        setNotice(updateResult.message || "Error al guardar los datos antes de cerrar.");
        return;
      }
    }
    
    trySaveWeight(currentEncounterId!);

    const closeResult = closeClinicalEncounter(currentEncounterId!, doctorId);
    if (closeResult.ok) {
      setIsFinalized(true);
      setPendingConfirmation(false);
      setNotice(`Consulta finalizada y cerrada a las ${new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}. La evolución es de solo lectura.`);
    } else {
      setNotice(closeResult.message || "Error al cerrar la consulta.");
    }
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="medico" active="patients" clinicalRole={clinicalRole} />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="medico" name={doctorName} clinicalRole={clinicalRole} />
        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          <Link href={`/medico/pacientes/${patientId}`} className="text-sm font-semibold text-primary hover:underline">
            ← Volver a la ficha del paciente
          </Link>
          <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-wide text-secondary">
                ATENCIÓN MÉDICA EN CURSO
              </p>
              <h1 className="mt-1 text-3xl font-bold text-text-primary">Evolución Clínica</h1>
              <p className="mt-2 text-text-secondary">
                {encounter ? `Encuentro ${encounter.id}` : "Nueva atención"} · {isFinalized ? "Cerrada" : "Borrador en curso"}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                isFinalized ? "bg-success-container text-success" : "bg-warning-container text-warning"
              }`}
            >
              {isFinalized ? "Atención cerrada" : "Borrador recuperable"}
            </span>
          </header>

          <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_350px]">
            {/* Columna Izquierda: Formulario */}
            <div className="space-y-6">

          <section className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-7">
            <div className="mt-2 grid gap-6">
              
              {/* Motivo de Consulta */}
              <label className="block">
                <span className="text-sm font-semibold text-text-primary">Motivo de Consulta *</span>
                <span className="mt-1 block text-xs text-text-tertiary">La razón principal por la que acude el paciente.</span>
                <textarea
                  disabled={isFinalized}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  rows={2}
                  className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200 disabled:bg-surface-secondary disabled:text-text-secondary"
                  placeholder="Ej: Dolor abdominal recurrente..."
                />
              </label>

              {/* Peso (Medición) */}
              <label className="block">
                <span className="text-sm font-semibold text-text-primary">Peso (kg)</span>
                <span className="mt-1 block text-xs text-text-tertiary">Medición histórica.</span>
                <input
                  type="number"
                  disabled={isFinalized}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200 disabled:bg-surface-secondary disabled:text-text-secondary"
                  placeholder="Ej: 70.5"
                  step="0.1"
                  min="0"
                />
              </label>

              {/* Evaluación */}
              <label className="block">
                <span className="text-sm font-semibold text-text-primary">Evaluación Clínica</span>
                <span className="mt-1 block text-xs text-text-tertiary">Desarrollo de la revisión, síntomas y hallazgos.</span>
                <textarea
                  disabled={isFinalized}
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200 disabled:bg-surface-secondary disabled:text-text-secondary"
                />
              </label>

              {/* Indicaciones / Seguimiento */}
              <label className="block">
                <span className="text-sm font-semibold text-text-primary">Indicaciones y Seguimiento</span>
                <span className="mt-1 block text-xs text-text-tertiary">Tratamiento sugerido, recomendaciones o seguimiento.</span>
                <textarea
                  disabled={isFinalized}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200 disabled:bg-surface-secondary disabled:text-text-secondary"
                />
              </label>

              {/* Examen de Química Sanguínea */}
              <label className="block">
                <span className="text-sm font-semibold text-text-primary">Examen de Química Sanguínea</span>
                <span className="mt-1 block text-xs text-text-tertiary">Estado de los laboratorios requeridos institucionalmente.</span>
                <select
                  disabled={isFinalized}
                  value={bloodChemistryStatus}
                  onChange={(e) => setBloodChemistryStatus(e.target.value as any)}
                  className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200 disabled:bg-surface-secondary disabled:text-text-secondary"
                >
                  <option value="NOT_PRESENTED">No presentado</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="ATTACHED">Adjunto (Subir en documentos)</option>
                </select>
              </label>

              {/* Adjuntos del Encuentro */}
              <div className="rounded-xl border border-divider p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Documentos de la atención</h3>
                  {encounter && (
                    <ClinicalDocumentUploader 
                      patientId={patientId} 
                      encounterId={encounter.id}
                      uploadedBy={doctorId}
                      onUploadSuccess={() => {
                        // Refresh the snapshot
                        const snap = getPatientClinicalSnapshot(patientId);
                        setDocuments(snap.documents.filter(d => d.encounterId === encounter.id));
                      }}
                    />
                  )}
                </div>
                
                {encounter ? (
                  <div className="mt-3 space-y-2">
                    {documents.length > 0 ? (
                      documents.map(doc => (
                        <div key={doc.id} className="flex justify-between items-center rounded-lg bg-surface-secondary p-3 text-sm">
                          <div>
                            <p className="font-semibold text-text-primary">{doc.fileName}</p>
                            <p className="text-xs text-text-secondary">{doc.type.replaceAll("_", " ")}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-text-secondary">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                            {!isFinalized && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("¿Estás seguro de quitar este documento?")) {
                                    removeClinicalDocument(doc.id);
                                    setDocuments(prev => prev.filter(d => d.id !== doc.id));
                                  }
                                }}
                                className="text-error hover:text-error/80"
                                aria-label="Quitar documento"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-text-secondary">No hay documentos adjuntos a esta atención.</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-text-secondary">Debes guardar un borrador antes de adjuntar documentos a esta atención específica.</p>
                )}
              </div>
              
              {/* Derivación (Solo Médico de Revisión) */}
              {clinicalRole === "REVIEW_DOCTOR" && (
                <div className="rounded-xl border border-divider p-4 bg-warning-container/20">
                  <h3 className="text-sm font-semibold text-text-primary">Derivación a Especialidad</h3>
                  <p className="mt-1 text-xs text-text-secondary">Si el caso lo requiere, puedes derivar al estudiante a una atención especializada.</p>
                  
                  {encounter ? (
                    <div className="mt-3">
                      <ClinicalReferralCreator
                        patientId={patientId}
                        encounterId={encounter.id}
                        requestedBy={doctorId}
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-text-secondary font-semibold">Guarda el borrador primero para habilitar derivaciones.</p>
                  )}
                </div>
              )}

            </div>

            {notice && (
              <p
                role="status"
                className={`mt-6 rounded-lg p-4 text-sm leading-6 ${
                  isFinalized ? "bg-success-container text-success" : "bg-warning-container text-warning"
                }`}
              >
                {notice}
              </p>
            )}

            {!isFinalized && (
              <div className="mt-7 flex flex-wrap gap-3 border-t border-divider pt-6">
                <button
                  onClick={save}
                  className="rounded-lg border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary-container"
                >
                  Guardar borrador
                </button>
                <button
                  onClick={requestFinalize}
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
                >
                  Finalizar atención
                </button>
                {pendingConfirmation && (
                  <button
                    onClick={finish}
                    className="rounded-lg border border-warning px-5 py-2.5 text-sm font-semibold text-warning hover:bg-warning-container"
                  >
                    Finalizar con datos pendientes
                  </button>
                )}
              </div>
            )}
          </section>
          </div>

          {/* Columna Derecha: Contexto y Antecedentes */}
          <aside className="space-y-6">
            <section className="rounded-2xl border border-divider bg-surface p-5 sticky top-5">
              <h2 className="text-lg font-bold text-text-primary">Contexto del Paciente</h2>
              
              {snapshot?.patient && (
                <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm border-b border-divider pb-5">
                  <div className="col-span-2">
                    <dt className="text-text-secondary">Paciente</dt>
                    <dd className="font-semibold text-text-primary">{snapshot.patient.fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Carnet / Código</dt>
                    <dd className="font-semibold text-text-primary">{snapshot.patient.carnet} / {snapshot.patient.registrationCode}</dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Carrera</dt>
                    <dd className="font-semibold text-text-primary">{snapshot.patient.career}</dd>
                  </div>
                </dl>
              )}

              {snapshot?.history?.intake && (
                <div className="mt-4 border-b border-divider pb-5">
                  <h3 className="font-semibold text-text-primary mb-3 text-sm uppercase tracking-wide">Antecedentes Médicos</h3>
                  <dl className="grid gap-y-3 text-sm">
                    {snapshot.history.intake.allergies && (
                      <div>
                        <dt className="text-text-secondary text-xs">Alergias</dt>
                        <dd className="font-medium text-error-600">{snapshot.history.intake.allergies}</dd>
                      </div>
                    )}
                    {snapshot.history.intake.chronicConditions && (
                      <div>
                        <dt className="text-text-secondary text-xs">Condiciones Crónicas</dt>
                        <dd className="font-medium text-text-primary">{snapshot.history.intake.chronicConditions}</dd>
                      </div>
                    )}
                    {snapshot.history.intake.relevantHistory && (
                      <div>
                        <dt className="text-text-secondary text-xs">Historia Relevante / Cirugías</dt>
                        <dd className="font-medium text-text-primary">{snapshot.history.intake.relevantHistory}</dd>
                      </div>
                    )}
                    {snapshot.history.intake.currentMedications && (
                      <div>
                        <dt className="text-text-secondary text-xs">Medicación Actual</dt>
                        <dd className="font-medium text-text-primary">{snapshot.history.intake.currentMedications}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {snapshot?.encounters && snapshot.encounters.length > 0 && (
                <div className="mt-6 border-t border-divider pt-5">
                  <h3 className="font-semibold text-text-primary mb-3">Últimas Atenciones</h3>
                  <div className="space-y-3">
                    {snapshot.encounters.filter((e: any) => e.status === "CLOSED").slice(0, 3).map((enc: any) => (
                      <div key={enc.id} className="rounded-lg bg-surface-secondary p-3 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-text-primary">{enc.type === "INITIAL" ? "Revisión" : "Especialidad"}</span>
                          <span className="text-xs text-text-secondary">{new Date(enc.occurredAt).toLocaleDateString("es-BO")}</span>
                        </div>
                        <p className="text-text-primary line-clamp-2">{enc.chiefComplaint}</p>
                        {enc.assessment && <p className="mt-1 text-xs text-text-secondary italic line-clamp-2">{enc.assessment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isFinalized && (
                <div className="mt-7 border-t border-divider pt-6">
                  <button
                    onClick={() => router.push(`/medico/pacientes/${patientId}`)}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
                  >
                    Volver al historial
                  </button>
                </div>
              )}
            </section>
          </aside>
          
          </div>
        </div>
      </main>
    </div>
  );
}
