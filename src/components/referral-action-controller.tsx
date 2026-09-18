"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Referral } from "@/lib/ui-contracts";
import Link from "next/link";

export function ReferralActionController({
  referral,
  doctorId,
  encounterId,
  encounterStatus,
}: {
  referral: Referral;
  doctorId: string;
  encounterId?: string;
  encounterStatus?: "DRAFT" | "CLOSED" | "AMENDED";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    // Simula creación del encounter y pase a la ruta con el draft (Como Specialist)
    // En demo real usaríamos un endpoint createSpecialtyEncounter
    alert("Función simulada: Creando borrador especializado...");
    router.push(`/medico/pacientes/${referral.patientId}/atenciones/nueva?referral=${referral.id}&volvera=/medico/derivaciones/${referral.id}`);
    setLoading(false);
  }

  async function handleNoShow() {
    if (!confirm("¿Confirmas que el paciente derivado no asistió a especialidad?")) return;
    setLoading(true);
    alert("Función simulada: Se marcaría como devuelto o no asistió.");
    router.refresh();
    setLoading(false);
  }

  const isAssigned = referral.status === "ASSIGNED" || referral.status === "PENDING_ASSIGNMENT";
  
  return (
    <div className="flex flex-col justify-center rounded-xl border border-primary-200 bg-primary-container p-5">
      <h3 className="font-bold text-primary-900 mb-2">Acciones Operativas</h3>
      
      {isAssigned && !encounterId && (
        <>
          <p className="text-sm text-primary-800 mb-4">La derivación está lista. Inicia la atención especializada para abrir la ficha correspondiente.</p>
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

      {encounterId && encounterStatus === "DRAFT" && (
        <>
          <p className="text-sm text-primary-800 mb-4">El borrador clínico de la especialidad está en progreso.</p>
          <Link 
            href={`/medico/pacientes/${referral.patientId}/atenciones/nueva?referral=${referral.id}&origen=${encounterId}&volvera=/medico/derivaciones/${referral.id}`}
            className="block text-center rounded-lg bg-primary py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover"
          >
            Continuar informe de especialidad
          </Link>
        </>
      )}

      {encounterId && encounterStatus === "CLOSED" && (
        <p className="text-sm font-semibold text-success">El informe de especialidad ha sido concluido y la derivación se cerró.</p>
      )}
    </div>
  );
}
