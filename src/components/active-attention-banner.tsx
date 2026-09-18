"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startInitialClinicalEncounter } from "@/lib/demo-clinical-store";
import type { Appointment, Referral } from "@/lib/ui-contracts";

// Un action temporal cliente. En un proyecto real, esto llamaría a una API.
// NOTA: Para derivaciones (Especialista), la lógica sería crear un SPECIALTY encounter.
// Por ahora simplificamos a iniciar la atención.
async function mockStartSpecialtyEncounter(patientId: string, referralId: string, doctorId: string) {
  // Aquí idealmente habría un endpoint real en demo-clinical-store.ts para iniciar atención de especialidad.
  // Por el alcance del demo actual y la instrucción, navegaremos con los params adecuados.
  return true;
}

export function ActiveAttentionBanner({ 
  patientId, 
  doctorId,
  appointment,
  referral
}: { 
  patientId: string;
  doctorId: string;
  appointment?: Appointment;
  referral?: Referral;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Determinar si hay alguna atención pendiente que "iniciar"
  const isPending = (appointment && appointment.status === "SCHEDULED") || (referral && referral.status === "ASSIGNED");

  if (!isPending) return null;

  async function handleStart() {
    setLoading(true);
    
    if (appointment) {
      // Iniciar cita inicial / estudiante
      const res = startInitialClinicalEncounter(appointment.id, doctorId);
      if (res.ok && res.data) {
        router.push(`/medico/pacientes/${patientId}/atenciones/nueva?origen=${res.data.id}`);
      } else {
        alert(res.ok ? "Error" : res.message);
        setLoading(false);
      }
    } else if (referral) {
      // Iniciar derivación (Especialista)
      // Como el store no tiene `startSpecialtyEncounter` explícito, navegaremos con la info.
      // (En una app real, aquí se crearía el DRAFT del specialty encounter).
      router.push(`/medico/pacientes/${patientId}/atenciones/nueva?referral=${referral.id}`);
    }
  }

  async function handleNoShow() {
    if (!confirm("¿Confirmas que el paciente no asistió?")) return;
    setLoading(true);
    
    // Aquí idealmente llamaríamos a la API/Store para actualizar el estado a NO_SHOW
    alert("Función simulada: Se marcaría como No Asistió.");
    setLoading(false);
  }

  return (
    <div className="mb-6 rounded-2xl border border-primary-200 bg-primary-container p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-primary-800">
            {appointment ? "Atención Inicial Programada" : "Derivación Especializada Pendiente"}
          </h2>
          <p className="mt-1 text-sm text-primary-700">
            El paciente está registrado para atención. Inicia la consulta médica para abrir la ficha de evolución.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button 
            onClick={handleNoShow}
            disabled={loading}
            className="rounded-lg border border-primary-300 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-200 disabled:opacity-50"
          >
            No asistió
          </button>
          <button 
            onClick={handleStart}
            disabled={loading}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover shadow-sm disabled:opacity-50"
          >
            {loading ? "Procesando..." : "Empezar consulta"}
          </button>
        </div>
      </div>
    </div>
  );
}
