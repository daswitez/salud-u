"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startInitialClinicalEncounter } from "@/lib/demo-clinical-store";
import type { Appointment, Patient } from "@/lib/ui-contracts";

export function DashboardAppointmentItem({
  appointment,
  patient,
  doctorId,
}: {
  appointment: Appointment;
  patient?: Patient;
  doctorId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <article className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-primary-200 bg-primary-container p-4">
      <div>
        <p className="font-bold text-primary-900">{patient?.fullName ?? "Paciente asignado"}</p>
        <p className="mt-1 text-sm text-primary-800">
          {appointment.scheduledFor.split("T")[1].substring(0, 5)} hrs · Revisión estudiantil
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => router.push(`/medico/citas/${appointment.id}`)}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-on-primary hover:bg-primary-hover transition-colors"
        >
          Abrir sala de consulta
        </button>
      </div>
    </article>
  );
}
