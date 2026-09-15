"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { finalizeClinicalEncounter, getOrCreateClinicalEncounter, saveClinicalDraft } from "@/lib/demo-booking-store";
import { getMockPatient, MOCK_DOCTORS, type MockClinicalEncounter } from "@/lib/mock-clinic";
import { MOCK_USERS } from "@/lib/mock-users";

type Field = { id: string; label: string; helper: string };

export function ClinicalForm({ specialty, fields, doctorId = "MED-001" }: { specialty: string; fields: Field[]; doctorId?: string }) {
  const searchParams = useSearchParams();
  const queueId = searchParams.get("cola") ?? "";
  const doctor = MOCK_USERS.find((user) => user.role === "medico")!;
  const doctorName = MOCK_DOCTORS.find((item) => item.id === doctorId)?.name ?? doctor.name;
  const [encounter, setEncounter] = useState<MockClinicalEncounter | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!queueId) return;
      const current = getOrCreateClinicalEncounter(queueId, doctorId);
      setEncounter(current);
      setValues(current?.formData ?? {});
    }, 0);
    return () => window.clearTimeout(timer);
  }, [queueId, doctorId]);
  const patient = getMockPatient(encounter?.patientId);
  const isFinalized = encounter?.status === "FINALIZED";
  function save() {
    if (!encounter || isFinalized) return;
    const updated = saveClinicalDraft(encounter.id, doctorId, values);
    if (!updated) { setNotice("No fue posible guardar el borrador. Verifica que la atención siga activa."); return; }
    setEncounter(updated);
    setNotice(`Borrador guardado localmente a las ${new Date(updated.updatedAt).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}.`);
  }
  function requestFinalize() {
    const missing = fields.filter((field) => !values[field.id]?.trim());
    if (missing.length) { setPendingConfirmation(true); setNotice(`Faltan ${missing.map((field) => field.label.toLowerCase()).join(", ")}. Puedes completar los campos o confirmar la finalización pendiente.`); return; }
    finish();
  }
  function finish() {
    if (!encounter || isFinalized) return;
    const updated = finalizeClinicalEncounter(encounter.id, doctorId, values);
    if (!updated) { setNotice("La consulta solo se puede finalizar cuando el paciente está en atención. No se realizó ningún cambio."); return; }
    setEncounter(updated);
    setPendingConfirmation(false);
    setNotice(`Consulta finalizada a las ${new Date(updated.endedAt!).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}. La cita y la cola fueron actualizadas.`);
  }
  if (!encounter) return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="queue" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={doctorName} /><div className="mx-auto max-w-3xl p-5 sm:p-8"><Link href="/medico/cola" className="text-sm font-semibold text-primary hover:underline">← Volver a la cola</Link><section className="mt-6 rounded-2xl border border-error-container bg-error-container p-6"><p className="text-sm font-semibold text-error">ENCUENTRO NO DISPONIBLE</p><h1 className="mt-2 text-2xl font-bold text-text-primary">No hay una relación asistencial activa</h1><p className="mt-3 text-sm leading-6 text-text-secondary">Inicia el encuentro desde un paciente llamado o en atención de tu propia cola.</p></section></div></main></div>;
  if (encounter.specialty !== specialty) return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="queue" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={doctorName} /><div className="mx-auto max-w-3xl p-5 sm:p-8"><Link href={`/medico/encuentro/${queueId}`} className="text-sm font-semibold text-primary hover:underline">← Resumen clínico</Link><section className="mt-6 rounded-2xl border border-error-container bg-error-container p-6"><h1 className="text-2xl font-bold text-text-primary">Ficha no autorizada</h1><p className="mt-2 text-sm text-text-secondary">La cita activa corresponde a {encounter.specialty}. Selecciona la ficha asignada a la especialidad de la consulta.</p></section></div></main></div>;
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="queue" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={doctorName} /><div className="mx-auto max-w-4xl p-5 sm:p-8"><Link href={`/medico/encuentro/${queueId}`} className="text-sm font-semibold text-primary hover:underline">← Resumen clínico</Link><header className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-secondary">FICHA CLÍNICA ESPECIALIZADA</p><h1 className="mt-1 text-3xl font-bold text-text-primary">{specialty}</h1><p className="mt-2 text-text-secondary">Encuentro {encounter.id} · {isFinalized ? "Finalizado" : "Borrador en curso"}</p></div><span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${isFinalized ? "bg-success-container text-success" : "bg-warning-container text-warning"}`}>{isFinalized ? "Consulta finalizada" : "Borrador recuperable"}</span></header><section className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-7"><div className="rounded-xl bg-surface-secondary p-4"><p className="text-sm font-semibold text-secondary">PACIENTE</p><p className="mt-1 font-bold text-text-primary">{patient?.name ?? "Paciente autorizado"}</p><p className="mt-1 text-sm text-text-secondary">{patient?.studentCode} · {specialty}</p></div><div className="mt-6 grid gap-5">{fields.map((field) => <label key={field.id} className="block"><span className="text-sm font-semibold text-text-primary">{field.label}</span><span className="mt-1 block text-xs text-text-tertiary">{field.helper}</span><textarea disabled={isFinalized} value={values[field.id] ?? ""} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} rows={4} className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200 disabled:bg-surface-secondary disabled:text-text-secondary" /></label>)}</div>{notice && <p role="status" className={`mt-6 rounded-lg p-4 text-sm leading-6 ${isFinalized ? "bg-success-container text-success" : "bg-info-container text-info"}`}>{notice}</p>} {!isFinalized && <div className="mt-7 flex flex-wrap gap-3"><button onClick={save} className="rounded-lg border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary-container">Guardar borrador</button><button onClick={requestFinalize} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Finalizar consulta</button>{pendingConfirmation && <button onClick={finish} className="rounded-lg border border-warning px-5 py-2.5 text-sm font-semibold text-warning hover:bg-warning-container">Finalizar con datos pendientes</button>}</div>}{isFinalized && <Link href="/medico/cola" className="mt-7 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Volver a la cola</Link>}</section></div></main></div>;
}
