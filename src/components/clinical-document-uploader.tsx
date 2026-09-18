"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { addClinicalDocument } from "@/lib/demo-clinical-store";
import type { ClinicalDocumentType } from "@/lib/ui-contracts";

const DOCUMENT_TYPES: { value: ClinicalDocumentType; label: string }[] = [
  { value: "BLOOD_CHEMISTRY", label: "Química Sanguínea" },
  { value: "LAB_RESULT", label: "Resultado de Laboratorio" },
  { value: "RADIOGRAPH", label: "Radiografía / Imagen" },
  { value: "PRESCRIPTION", label: "Receta / Prescripción" },
  { value: "CLINICAL_PHOTO", label: "Fotografía Clínica" },
  { value: "REFERRAL_DOCUMENT", label: "Documento de Derivación" },
  { value: "OTHER", label: "Otro" },
];

export function ClinicalDocumentUploader({ 
  patientId, 
  encounterId, 
  uploadedBy,
  onUploadSuccess
}: { 
  patientId: string; 
  encounterId?: string; 
  uploadedBy: string;
  onUploadSuccess?: () => void;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<ClinicalDocumentType>("OTHER");
  const [studyDate, setStudyDate] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  }

  function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Debes seleccionar un archivo.");
      setStatus("error");
      return;
    }
    
    setStatus("loading");
    
    // Simulate upload delay
    setTimeout(() => {
      const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      
      const result = addClinicalDocument({
        patientId,
        encounterId,
        type,
        status: "AVAILABLE",
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        studyDate: studyDate || undefined,
        description: description || undefined,
        tags,
        uploadedBy
      });

      if (result.ok) {
        setStatus("success");
        setFile(null);
        setDescription("");
        setTagsInput("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        setTimeout(() => {
          setIsOpen(false);
          setStatus("idle");
          if (onUploadSuccess) onUploadSuccess();
          router.refresh();
        }, 1500);
      } else {
        setStatus("error");
        setErrorMessage(result.message);
      }
    }, 1000);
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
      >
        + Adjuntar Documento
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Subir Adjunto Clínico</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-text-secondary hover:text-text-primary"
            disabled={status === "loading"}
          >
            ✕
          </button>
        </div>

        {status === "success" ? (
          <div className="mt-6 rounded-xl bg-success-container p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-on-primary">
              ✓
            </div>
            <p className="mt-4 font-semibold text-success">¡Documento adjuntado exitosamente!</p>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">Archivo / Fotografía *</span>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                disabled={status === "loading"}
                className="mt-1 block w-full text-sm text-text-secondary file:mr-4 file:rounded-full file:border-0 file:bg-primary-container file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-text-primary">Tipo de Documento *</span>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as ClinicalDocumentType)}
                  disabled={status === "loading"}
                  className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary-200"
                >
                  {DOCUMENT_TYPES.map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-text-primary">Fecha del Estudio</span>
                <input 
                  type="date"
                  value={studyDate}
                  onChange={(e) => setStudyDate(e.target.value)}
                  disabled={status === "loading"}
                  className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary-200"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-text-primary">Descripción</span>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={status === "loading"}
                rows={2}
                placeholder="Breve detalle del documento..."
                className="mt-1 block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary-200"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-text-primary">Etiquetas (separadas por coma)</span>
              <input 
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                disabled={status === "loading"}
                placeholder="ej: colesterol, ayunas, rx-torax"
                className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary-200"
              />
            </label>

            {status === "error" && (
              <p className="text-sm font-semibold text-error">{errorMessage}</p>
            )}

            <div className="mt-2 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={status === "loading"}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-secondary"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={status === "loading" || !file}
                className="flex items-center rounded-lg bg-primary px-5 py-2 text-sm font-bold text-on-primary hover:bg-primary-hover disabled:opacity-50"
              >
                {status === "loading" ? "Subiendo..." : "Subir Adjunto"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
