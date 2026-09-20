"use client";

import { useEffect, useMemo, useState } from "react";

import { apiJson, type MedicalAppointment } from "@/lib/api/client";

export function boliviaDate(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatAppointmentTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function appointmentStatusLabel(status: MedicalAppointment["status"]) {
  return ({ SCHEDULED: "Programada", CHECKED_IN: "En espera", ATTENDED: "Atendida", NO_SHOW: "Inasistencia", CANCELLED: "Cancelada" })[status];
}

export function appointmentStatusClass(status: MedicalAppointment["status"]) {
  return ({
    SCHEDULED: "bg-primary-container text-primary",
    CHECKED_IN: "bg-warning-container text-warning",
    ATTENDED: "bg-success-container text-success",
    NO_SHOW: "bg-error-container text-error",
    CANCELLED: "bg-surface-secondary text-text-secondary",
  })[status];
}

export function useMedicalAppointments() {
  const [appointments, setAppointments] = useState<MedicalAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiJson<MedicalAppointment[]>("/api/medical/appointments")
      .then((data) => { if (active) setAppointments(data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "No se pudieron cargar las citas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { appointments, loading, error };
}

export function useTodayAppointments(appointments: MedicalAppointment[]) {
  return useMemo(() => appointments.filter((appointment) => boliviaDate(appointment.scheduledFor) === boliviaDate(new Date())), [appointments]);
}
