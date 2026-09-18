"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startSpecialtyClinicalEncounter, markSpecialtyReferralNoShow } from "@/lib/demo-clinical-store";
import type { Referral } from "@/lib/ui-contracts";
import Link from "next/link";

export function ReferralActionController({
  referral,
  doctorId,
  encounterId: initialEncounterId,
  encounterStatus: initialEncounterStatus,
}: {
  referral: Referral;
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
    const res = startSpecialtyClinicalEncounter(referral.id, doctorId, referral.specialty);
    if (res.ok && res.data) {
      setLocalEncounterId(res.data.id);
      setLocalEncounterStatus(res.data.status);
      setLoading(false);
    } else {
      alert(res.ok ? "Error" : res.message);
      setLoading(false);
    }
  }

  function handleFinalize() {
    router.push(`/medico/pacientes/${referral.patientId}/atenciones/nueva?referral=${referral.id}&origen=${localEncounterId}&volvera=/medico/derivaciones/${referral.id}`);
  }

  async function handleNoShow() {
    if (!confirm("¿Confirmas que el paciente derivado no asistió a la cita de especialidad?")) return;
    setLoading(true);
    markSpecialtyReferralNoShow(referral.id);
    alert("Derivación devuelta por inasistencia (No Show).");
    router.refresh();
    setLoading(false);
  }

  const isAssigned = referral.status === "ASSIGNED" || referral.status === "PENDING_ASSIGNMENT";
  
  return (
    <div className="flex flex-col justify-center rounded-xl border border-primary-200 bg-primary-container p-5">
      <h3 className="font-bold text-primary-900 mb-2">Control de la Especialidad</h3>
      
      {isAssigned && !localEncounterId && (
        <>
          <p className="text-sm text-primary-800 mb-4">La derivación está lista. Inicia la atención especializada para activar el estado en curso y revisar el historial.</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleStart}
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover disabled:opacity-50 shadow-sm"
            >
              {loading ? "Procesando..." : "Empezar atención especializada"}
            </button>
            <button 
              onClick={handleNoShow}
              disabled={loading}
              className="w-full rounded-lg border border-primary-300 bg-transparent py-2.5 text-sm font-semibold text-primary-800 hover:bg-primary-200 disabled:opacity-50"
            >
              Paciente no asistió
            </button>
          </div>
        </>
      )}

      {!isAssigned && (referral.status === "RETURNED" || referral.status === "CANCELLED") && (
        <p className="text-sm font-semibold text-error">Esta derivación fue devuelta o cancelada y ya no está activa.</p>
      )}

      {localEncounterId && localEncounterStatus === "DRAFT" && (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-success-700">
            <span className="flex h-2 w-2 rounded-full bg-success"></span>
            Atención en curso
          </div>
          <p className="text-sm text-primary-800 mb-4">Revisa el historial y los documentos. Al terminar la evaluación, procede a registrar la evolución médica (informe de especialidad).</p>
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
          <p className="text-sm text-primary-800 mb-4">El informe de especialidad ya fue redactado y cerrado.</p>
          <Link 
            href={`/medico/pacientes/${referral.patientId}`}
            className="block text-center w-full rounded-lg border border-primary py-2 text-sm font-bold text-primary hover:bg-primary-50 transition-colors"
          >
            Ver en el historial
          </Link>
        </>
      )}
    </div>
  );
}
