"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { apiJson } from "@/lib/api/client";

type Intake = { allergies: string; chronicConditions: string; currentMedications: string; relevantHistory: string; emergencyContact: string };
type StoredIntake = { version_no: number; allergies: string | null; chronic_conditions: string | null; current_medications: string | null; relevant_history: string | null; emergency_contact_note: string | null; recorded_at: string };
const emptyIntake: Intake = { allergies: "", chronicConditions: "", currentMedications: "", relevantHistory: "", emergencyContact: "" };

export default function AdministrativeInitialHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const [intake, setIntake] = useState<Intake>(emptyIntake);
  const [version, setVersion] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const data = await apiJson<StoredIntake | null>(`/api/patients/${patientId}/initial-history`);
      if (data) {
        setIntake({ allergies: data.allergies ?? "", chronicConditions: data.chronic_conditions ?? "", currentMedications: data.current_medications ?? "", relevantHistory: data.relevant_history ?? "", emergencyContact: data.emergency_contact_note ?? "" });
        setVersion(data.version_no);
      }
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la historia inicial."); }
    finally { setLoading(false); }
  }, [patientId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  function update(key: keyof Intake, value: string) { setIntake((current) => ({ ...current, [key]: value })); setNotice(""); }
  async function save(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); try { const result = await apiJson<{ versionNo: number }>(`/api/patients/${patientId}/initial-history`, { method: "PUT", body: JSON.stringify(intake) }); setVersion(result.versionNo); setNotice(`Historia inicial guardada como versión ${result.versionNo}.`); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la historia inicial."); } finally { setSaving(false); } }
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="students" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" name="Administración" clinicalRole="ADMINISTRATIVE" /><div className="mx-auto max-w-5xl p-5 sm:p-8"><Link href={`/administrativo/estudiantes/${patientId}`} className="text-sm font-semibold text-primary hover:underline">← Registro administrativo</Link><header className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-primary">ADMISIÓN E HISTORIA INICIAL</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Cuestionario de primer registro</h1><p className="mt-2 text-text-secondary">Registra la declaración inicial del estudiante. Cada guardado conserva una nueva versión trazable.</p></div>{version && <span className="rounded-full bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary">Versión {version}</span>}</header>{error && <p role="alert" className="mt-6 rounded-xl bg-error-container p-4 text-sm text-error">{error}</p>}{notice && <p role="status" className="mt-6 rounded-xl bg-success-container p-4 text-sm text-success">{notice}</p>}<form onSubmit={save} className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-2"><label><span className="text-sm font-semibold text-text-primary">Alergias</span><textarea disabled={loading} value={intake.allergies} onChange={(event) => update("allergies", event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 disabled:bg-surface-secondary" /></label><label><span className="text-sm font-semibold text-text-primary">Enfermedades crónicas</span><textarea disabled={loading} value={intake.chronicConditions} onChange={(event) => update("chronicConditions", event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 disabled:bg-surface-secondary" /></label><label><span className="text-sm font-semibold text-text-primary">Medicamentos actuales</span><textarea disabled={loading} value={intake.currentMedications} onChange={(event) => update("currentMedications", event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 disabled:bg-surface-secondary" /></label><label><span className="text-sm font-semibold text-text-primary">Antecedentes relevantes</span><textarea disabled={loading} value={intake.relevantHistory} onChange={(event) => update("relevantHistory", event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 disabled:bg-surface-secondary" /></label><label className="sm:col-span-2"><span className="text-sm font-semibold text-text-primary">Contacto de emergencia / observación</span><input disabled={loading} value={intake.emergencyContact} onChange={(event) => update("emergencyContact", event.target.value)} placeholder="Nombre, parentesco y teléfono" className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 disabled:bg-surface-secondary" /></label></div><div className="mt-7 flex flex-wrap justify-end gap-3"><Link href={`/administrativo/estudiantes/${patientId}`} className="rounded-lg border border-divider px-4 py-2.5 text-sm font-semibold text-text-secondary">Cancelar</Link><button disabled={saving || loading} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? "Guardando…" : version ? "Guardar nueva versión" : "Guardar historia inicial"}</button></div></form></div></main></div>;
}
