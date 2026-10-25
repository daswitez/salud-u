"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MedicalDocuments } from "@/components/medical-documents";
import { apiJson, type MedicalAppointment } from "@/lib/api/client";

export function EncounterDocumentsPage({ appointmentId }: { appointmentId: string }) {
  const [appointment, setAppointment] = useState<MedicalAppointment | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { const appointments = await apiJson<MedicalAppointment[]>("/api/medical/appointments"); const current = appointments.find(item => item.id === appointmentId); if (!current?.encounter || !current.patient) throw new Error("No se encontró una atención iniciada y asignada a tu cuenta."); setAppointment(current); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo consultar la atención."); }
    finally { setLoading(false); }
  }, [appointmentId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  return <div className="space-y-5"><Link href={`/medico/citas/${appointmentId}`} className="font-semibold text-primary">Volver a la cita</Link><h1 className="text-2xl font-bold">Documentos clínicos</h1>
    {loading ? <p role="status">Cargando atención…</p> : error ? <><p role="alert">{error}</p><button type="button" onClick={() => void load()}>Reintentar carga</button></> : appointment?.patient && appointment.encounter && <><p>{appointment.patient.fullName}</p><MedicalDocuments patientId={appointment.patient.id} encounterId={appointment.encounter.id} editable={appointment.encounter.status === "DRAFT"} /></>}
  </div>;
}
