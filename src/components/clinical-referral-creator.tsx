"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClinicalReferral, getPatientClinicalSnapshot } from "@/lib/demo-clinical-store";
import type { Specialty } from "@/lib/ui-contracts";

const SPECIALTY_LABELS: Record<Specialty, string> = {
  DERMATOLOGY: "Dermatología",
  OPHTHALMOLOGY: "Oftalmología",
  INTERNAL_MEDICINE: "Medicina Interna",
  UROLOGY: "Urología",
  GYNECOLOGY: "Ginecología"
};

export function ClinicalReferralCreator({
  patientId,
  encounterId,
  requestedBy,
  onSuccess
}: {
  patientId: string;
  encounterId: string;
  requestedBy: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  const [specialty, setSpecialty] = useState<Specialty>("INTERNAL_MEDICINE");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Obtener data del snapshot cuando se abre el modal
  const snapshot = getPatientClinicalSnapshot(patientId);
  const encounterDiagnoses = snapshot.diagnoses.filter(d => d.encounterId === encounterId);
  const encounterDocuments = snapshot.documents.filter(d => d.encounterId === encounterId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || !comment.trim()) {
      setStatus("error");
      setErrorMessage("El motivo y el comentario son obligatorios.");
      return;
    }
    
    setStatus("loading");
    
    setTimeout(() => {
      const result = createClinicalReferral({
        patientId,
        sourceEncounterId: encounterId,
        specialty,
        reason,
        commentForSpecialist: comment,
        diagnosisIds: selectedDiagnoses,
        documentIds: selectedDocuments,
        requestedBy
      });

      if (result.ok) {
        setStatus("success");
        setTimeout(() => {
          setIsOpen(false);
          setStatus("idle");
          setReason("");
          setComment("");
          setSelectedDiagnoses([]);
          setSelectedDocuments([]);
          router.refresh();
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        setStatus("error");
        setErrorMessage(result.message);
      }
    }, 800);
  }

  function toggleDiagnosis(id: string) {
    setSelectedDiagnoses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleDocument(id: string) {
    setSelectedDocuments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  if (!isOpen) {
    return (
      <button 
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-warning-container px-4 py-2 text-sm font-semibold text-warning-700 hover:bg-warning-container/80 transition-colors"
      >
        + Crear Derivación a Especialidad
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Nueva Derivación</h2>
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-text-secondary hover:text-text-primary text-xl font-bold"
            disabled={status === "loading"}
          >
            ✕
          </button>
        </div>
        
        <p className="mt-2 text-sm text-text-secondary">
          Esta derivación será enviada a Administración para asignar cupo con el especialista indicado.
        </p>

        {status === "success" ? (
          <div className="mt-6 rounded-xl bg-success-container p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-on-primary">✓</div>
            <p className="mt-4 font-semibold text-success">Derivación creada exitosamente</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">Especialidad Requerida *</span>
              <select 
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value as Specialty)}
                disabled={status === "loading"}
                className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary-200"
              >
                {Object.entries(SPECIALTY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-text-primary">Motivo de la Derivación *</span>
              <input 
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={status === "loading"}
                placeholder="Ej. Valoración de lunares atípicos"
                className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary-200"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-text-primary">Comentario Clínico para el Especialista *</span>
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={status === "loading"}
                rows={3}
                placeholder="Detalle clínico relevante, estado del paciente, sospechas..."
                className="mt-1 block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary-200"
                required
              />
            </label>

            <div className="grid sm:grid-cols-2 gap-4 border-t border-divider pt-4">
              {/* Diagnósticos */}
              <div>
                <p className="text-sm font-semibold text-text-primary mb-2">Vincular Diagnósticos</p>
                {encounterDiagnoses.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No hay diagnósticos en esta atención.</p>
                ) : (
                  <div className="space-y-2">
                    {encounterDiagnoses.map(diag => (
                      <label key={diag.id} className="flex items-start gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedDiagnoses.includes(diag.id)}
                          onChange={() => toggleDiagnosis(diag.id)}
                          className="mt-0.5 accent-primary"
                        />
                        <span className="text-sm text-text-secondary leading-snug">{diag.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Adjuntos */}
              <div>
                <p className="text-sm font-semibold text-text-primary mb-2">Vincular Documentos</p>
                {encounterDocuments.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No hay adjuntos en esta atención.</p>
                ) : (
                  <div className="space-y-2">
                    {encounterDocuments.map(doc => (
                      <label key={doc.id} className="flex items-start gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedDocuments.includes(doc.id)}
                          onChange={() => toggleDocument(doc.id)}
                          className="mt-0.5 accent-primary"
                        />
                        <span className="text-sm text-text-secondary leading-snug">{doc.fileName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {status === "error" && (
              <p className="text-sm font-semibold text-error bg-error-container p-3 rounded-lg">{errorMessage}</p>
            )}

            <div className="mt-4 flex justify-end gap-3 border-t border-divider pt-4">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={status === "loading"}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={status === "loading" || !reason.trim() || !comment.trim()}
                className="rounded-lg bg-warning px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-warning/90 disabled:opacity-50 transition-colors"
              >
                {status === "loading" ? "Procesando..." : "Emitir Derivación"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
