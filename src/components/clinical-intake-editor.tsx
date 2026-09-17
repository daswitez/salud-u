"use client";

import { useEffect, useState } from "react";
import { addClinicalDocument, getPatientClinicalSnapshot, updateClinicalIntake } from "@/lib/demo-clinical-store";
import type { ClinicalDocumentType, ClinicalIntake } from "@/lib/ui-contracts";

const emptyIntake: Omit<ClinicalIntake, "updatedAt" | "updatedBy"> = { allergies: "", chronicConditions: "", currentMedications: "", relevantHistory: "", emergencyContact: "" };

export function ClinicalIntakeEditor({ patientId, actorId, editable = true }: { patientId: string; actorId: string; editable?: boolean }) {
  const [intake, setIntake] = useState(emptyIntake);
  const [documents, setDocuments] = useState<ReturnType<typeof getPatientClinicalSnapshot>["documents"]>([]);
  const [file, setFile] = useState<File>();
  const [documentType, setDocumentType] = useState<ClinicalDocumentType>("OTHER");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [notice, setNotice] = useState("");
  function refresh() {
    const snapshot = getPatientClinicalSnapshot(patientId);
    setIntake(snapshot.history?.intake ?? emptyIntake);
    setDocuments(snapshot.documents);
  }
  useEffect(() => { const timer = window.setTimeout(() => { const snapshot = getPatientClinicalSnapshot(patientId); setIntake(snapshot.history?.intake ?? emptyIntake); setDocuments(snapshot.documents); }, 0); return () => window.clearTimeout(timer); }, [patientId]);
  function update(key: keyof typeof emptyIntake, value: string) { setIntake((current) => ({ ...current, [key]: value })); }
  function saveIntake() {
    const result = updateClinicalIntake(patientId, intake, actorId);
    setNotice(result.ok ? "Historia inicial actualizada." : result.message);
    if (result.ok) refresh();
  }
  function upload() {
    if (!file) { setNotice("Selecciona una imagen, escaneo o documento antes de subirlo."); return; }
    const result = addClinicalDocument({ patientId, type: documentType, status: "AVAILABLE", fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size || 1, description: description.trim(), tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), uploadedBy: actorId });
    setNotice(result.ok ? "Adjunto agregado a la historia clínica." : result.message);
    if (result.ok) { setFile(undefined); setDescription(""); setTags(""); refresh(); }
  }
  return <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><div><p className="text-sm font-semibold tracking-wide text-primary">HISTORIA INICIAL</p><h2 className="mt-1 text-xl font-bold text-text-primary">Cuestionario y documentos base</h2><p className="mt-1 text-sm text-text-secondary">Estos datos se inician en admisión y pueden ser corregidos o ampliados por el médico.</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-semibold text-text-primary">Alergias</span><textarea disabled={!editable} value={intake.allergies ?? ""} onChange={(event) => update("allergies", event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm disabled:bg-surface-secondary" /></label><label><span className="text-sm font-semibold text-text-primary">Enfermedades crónicas</span><textarea disabled={!editable} value={intake.chronicConditions ?? ""} onChange={(event) => update("chronicConditions", event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm disabled:bg-surface-secondary" /></label><label><span className="text-sm font-semibold text-text-primary">Medicamentos actuales</span><textarea disabled={!editable} value={intake.currentMedications ?? ""} onChange={(event) => update("currentMedications", event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm disabled:bg-surface-secondary" /></label><label><span className="text-sm font-semibold text-text-primary">Antecedentes relevantes</span><textarea disabled={!editable} value={intake.relevantHistory ?? ""} onChange={(event) => update("relevantHistory", event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm disabled:bg-surface-secondary" /></label><label className="sm:col-span-2"><span className="text-sm font-semibold text-text-primary">Contacto de emergencia</span><input disabled={!editable} value={intake.emergencyContact ?? ""} onChange={(event) => update("emergencyContact", event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm disabled:bg-surface-secondary" /></label></div>{editable && <button onClick={saveIntake} className="mt-5 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-container">Guardar cuestionario</button>}<div className="mt-7 border-t border-divider pt-5"><h3 className="font-bold text-text-primary">Imágenes, escaneos y estudios</h3>{editable && <div className="mt-4 grid gap-3 sm:grid-cols-2"><input type="file" accept="image/*,.pdf" onChange={(event) => setFile(event.target.files?.[0])} className="rounded-lg border border-border p-2 text-sm" /><select value={documentType} onChange={(event) => setDocumentType(event.target.value as ClinicalDocumentType)} className="rounded-lg border border-border px-3 py-2.5 text-sm"><option value="BLOOD_CHEMISTRY">Química sanguínea</option><option value="RADIOGRAPH">Radiografía / imagen</option><option value="CLINICAL_PHOTO">Fotografía clínica</option><option value="LAB_RESULT">Laboratorio</option><option value="OTHER">Otro documento</option></select><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Etiquetas: laboratorio, control" className="rounded-lg border border-border px-3 py-2.5 text-sm" /><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descripción del archivo" className="rounded-lg border border-border px-3 py-2.5 text-sm" /></div>}{editable && <button onClick={upload} className="mt-3 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">Subir adjunto</button>}<div className="mt-4 space-y-2">{documents.map((document) => <div key={document.id} className="rounded-lg bg-surface-secondary p-3 text-sm"><p className="font-semibold text-text-primary">{document.fileName}</p><p className="mt-1 text-text-secondary">{document.description || "Sin descripción"} · {document.tags.join(", ") || "Sin etiquetas"}</p></div>)}{!documents.length && <p className="text-sm text-text-secondary">Aún no hay imágenes, escaneos ni estudios adjuntos.</p>}</div></div>{notice && <p role="status" className="mt-5 rounded-lg bg-info-container p-3 text-sm text-info">{notice}</p>}</section>;
}
