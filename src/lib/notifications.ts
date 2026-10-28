import { ApiRequestError } from "@/lib/api/client";

export type InboxNotification = {
  id: string;
  appointmentId: string;
  eventType: string;
  channel: "INBOX";
  subject: string;
  message: string;
  status: "DELIVERED" | "READ";
  scheduledFor: string;
  deliveredAt: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  ok: true;
  data: InboxNotification[];
  pagination: { hasMore: boolean; nextCursor: string | null };
  unreadCount: number;
};

export type NotificationPreferences = {
  receiveReminders: boolean;
  reinforcedReminder: boolean;
  updatedAt: string | null;
};

const eventLabels: Record<string, string> = {
  APPOINTMENT_ASSIGNED: "Cita asignada",
  APPOINTMENT_CANCELLED: "Cita cancelada",
  APPOINTMENT_NO_SHOW: "Ausencia registrada",
  APPOINTMENT_RESCHEDULED: "Cita reprogramada",
  APPOINTMENT_REMINDER: "Recordatorio de cita",
  APPOINTMENT_REMINDER_REINFORCED: "Recordatorio adicional",
};

export function notificationEventLabel(code: string) { return eventLabels[code] ?? "Aviso de cita"; }

export function notificationDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/La_Paz",
  }).format(new Date(value));
}

export function notificationError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Tu sesión terminó. Inicia sesión nuevamente para continuar.";
    if (error.status === 403) return "No tienes permiso para realizar esta acción.";
    if (error.status === 404) return "Este aviso ya no está disponible. Actualiza la bandeja.";
    if (error.status < 500) return error.message;
  }
  return "No pudimos comunicarnos con el servidor. Inténtalo nuevamente.";
}
