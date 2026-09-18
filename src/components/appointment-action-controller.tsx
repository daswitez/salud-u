"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startInitialClinicalEncounter, markInitialClinicalAppointmentNoShow } from "@/lib/demo-clinical-store";
import type { Appointment } from "@/lib/ui-contracts";
import Link from "next/link";

export function AppointmentActionController({
  appointment,
  doctorId,
  encounterId,
  encounterStatus,
}: {
  appointment: Appointment;
  doctorId: string;
  encounterId?: string;
  encounterStatus?: "DRAFT" | "CLOSED" | "AMENDED";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    const res = startInitialClinicalEncounter(appointment.id, doctorId);
    if (res.ok && res.data) {
      router.push(`/medico/pacientes/${appointment.patientId}/atenciones/nueva?origen=${res.data.id}&volvera=/medico/citas/${appointment.id}`);
    } else {
      alert(res.ok ? "Error" : res.message);
      setLoading(false);
    }
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
      <h3 className="font-bold text-primary-900 mb-2">Acciones Operativas</h3>
      
      {isScheduled && !encounterId && (
        <>
          <p className="text-sm text-primary-800 mb-4">El paciente está programado. Inicia la consulta para documentar el encuentro clínico.</p>
          <div className="flex gap-3">
            <button 
              onClick={handleStart}
              disabled={loading}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-bold text-on-primary hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? "Procesando..." : "Empezar consulta médica"}
            </button>
            <button 
              onClick={handleNoShow}
              disabled={loading}
              className="rounded-lg border border-primary-300 bg-transparent px-4 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-200 disabled:opacity-50"
            >
              No asistió
            </button>
          </div>
        </>
      )}

      {!isScheduled && appointment.status === "NO_SHOW" && (
        <p className="text-sm font-semibold text-error">Esta cita ha sido marcada como NO ASISTIÓ y ha sido cerrada.</p>
      )}

      {encounterId && encounterStatus === "DRAFT" && (
        <>
          <p className="text-sm text-primary-800 mb-4">La consulta está en progreso (borrador).</p>
          <Link 
            href={`/medico/pacientes/${appointment.patientId}/atenciones/nueva?origen=${encounterId}&volvera=/medico/citas/${appointment.id}`}
            className="block text-center rounded-lg bg-primary py-2 text-sm font-bold text-on-primary hover:bg-primary-hover"
          >
            Continuar llenando evolución clínica
          </Link>
        </>
      )}

      {encounterId && encounterStatus === "CLOSED" && (
        <p className="text-sm font-semibold text-success">La consulta ha finalizado y el diagnóstico ha sido registrado.</p>
      )}
    </div>
  );
}
