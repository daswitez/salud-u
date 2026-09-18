"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startInitialClinicalEncounter, markInitialClinicalAppointmentNoShow } from "@/lib/demo-clinical-store";
import type { Appointment } from "@/lib/ui-contracts";
import Link from "next/link";

export function AppointmentActionController({
  appointment,
  doctorId,
  encounterId: initialEncounterId,
  encounterStatus: initialEncounterStatus,
}: {
  appointment: Appointment;
  doctorId: string;
  encounterId?: string;
  encounterStatus?: "DRAFT" | "CLOSED" | "AMENDED";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [localEncounterId, setLocalEncounterId] = useState<string | undefined>(initialEncounterId);
  const [localEncounterStatus, setLocalEncounterStatus] = useState<"DRAFT" | "CLOSED" | "AMENDED" | undefined>(initialEncounterStatus);

  async function handleStart() {
    setLoading(true);
    const res = startInitialClinicalEncounter(appointment.id, doctorId);
    if (res.ok && res.data) {
      setLocalEncounterId(res.data.id);
      setLocalEncounterStatus(res.data.status);
      setLoading(false);
      // Optional: push a query param or something, but just updating state works for the button.
    } else {
      alert(res.ok ? "Error" : res.message);
      setLoading(false);
    }
  }

  function handleFinalize() {
    router.push(`/medico/pacientes/${appointment.patientId}/atenciones/nueva?origen=${localEncounterId}&volvera=/medico/citas/${appointment.id}`);
  }

  async function handleNoShow() {
    if (!confirm("¿Confirmas que el paciente no asistió a la cita?")) return;
    setLoading(true);
    
    // In a real app we would call an API, here we just use the store update
    markInitialClinicalAppointmentNoShow(appointment.id);
    alert("Cita marcada como inasistencia (No Show).");
    router.refresh();
    setLoading(false);
  }

  const isScheduled = appointment.status === "SCHEDULED";
  
  return (
    <div className="flex flex-col justify-center rounded-xl border border-primary-200 bg-primary-container p-5">
      <h3 className="font-bold text-primary-900 mb-2">Control de la Cita</h3>
      
      {isScheduled && !localEncounterId && (
        <>
          <p className="text-sm text-primary-800 mb-4">La cita está pendiente. Inicia la atención para activar el estado en curso y revisar el historial con el paciente.</p>
          <div className="flex gap-3">
            <button 
              onClick={handleStart}
              disabled={loading}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-bold text-on-primary hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? "Procesando..." : "Empezar atención presencial"}
            </button>
            <button 
              onClick={handleNoShow}
              disabled={loading}
              className="flex-1 rounded-lg border border-primary text-primary py-2 text-sm font-bold hover:bg-primary-50 disabled:opacity-50"
            >
              No asistió
            </button>
          </div>
        </>
      )}

      {localEncounterId && localEncounterStatus === "DRAFT" && (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-success-700">
            <span className="flex h-2 w-2 rounded-full bg-success"></span>
            Atención en curso
          </div>
          <p className="text-sm text-primary-800 mb-4">Revisa el historial y los documentos. Al terminar la evaluación, procede a registrar la evolución médica.</p>
          <button 
            onClick={handleFinalize}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-on-primary shadow-sm hover:bg-primary-hover transition-colors"
          >
            Finalizar Consulta y Llenar Evolución
          </button>
        </>
      )}

      {localEncounterId && localEncounterStatus === "CLOSED" && (
        <>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-700">
            <span>✓</span>
            Consulta completada
          </div>
          <p className="text-sm text-primary-800 mb-4">La evolución de esta cita ya fue redactada y cerrada.</p>
          <Link 
            href={`/medico/pacientes/${appointment.patientId}`}
            className="block text-center w-full rounded-lg border border-primary py-2 text-sm font-bold text-primary hover:bg-primary-50 transition-colors"
          >
            Ver en el historial
          </Link>
        </>
      )}
    </div>
  );
}
