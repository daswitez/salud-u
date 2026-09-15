import type { AppRole } from "@/components/app-sidebar";

export type NotificationEvent = "APPOINTMENT" | "CHANGE" | "CANCELLATION" | "WAITLIST_OFFER" | "CAMPAIGN";
export type Notification = { id: string; event: NotificationEvent; title: string; message: string; createdAt: string; resourceHref: string; readAt?: string; status: "INFO" | "ACTION" | "CHANGE" | "CANCELLED" };
export type NotificationPreference = Record<NotificationEvent, { inApp: boolean; email: boolean }>;
type NotificationState = { notifications: Notification[]; preferences: Record<AppRole, NotificationPreference> };
const STORAGE_KEY = "salud-universitaria-notifications-demo-v1";

const defaultPreferences: NotificationPreference = {
  APPOINTMENT: { inApp: true, email: true },
  CHANGE: { inApp: true, email: true },
  CANCELLATION: { inApp: true, email: true },
  WAITLIST_OFFER: { inApp: true, email: true },
  CAMPAIGN: { inApp: true, email: false },
};
function clonePreferences(): NotificationPreference { return Object.fromEntries(Object.entries(defaultPreferences).map(([key, value]) => [key, { ...value }])) as NotificationPreference; }
function initialState(): NotificationState { return { notifications: [
  { id: "NOT-2026-001", event: "APPOINTMENT", title: "Recordatorio de cita", message: "Tu cita presencial es hoy a las 10:30.", createdAt: "2026-09-10T08:00:00.000Z", resourceHref: "/estudiante/citas/CIT-2026-001", status: "INFO" },
  { id: "NOT-2026-002", event: "CHANGE", title: "Teleconsulta disponible", message: "Tu sala virtual está habilitada para la cita de las 14:30.", createdAt: "2026-09-10T14:20:00.000Z", resourceHref: "/estudiante/citas/CIT-2026-004", status: "ACTION" },
  { id: "NOT-2026-003", event: "WAITLIST_OFFER", title: "Oferta compatible", message: "Hay un cupo temporal que coincide con tu lista de espera.", createdAt: "2026-09-14T10:00:00.000Z", resourceHref: "/estudiante/lista-espera", status: "ACTION" },
  { id: "NOT-2026-004", event: "CAMPAIGN", title: "Campaña disponible", message: "Ya puedes programar tu chequeo obligatorio Tipo A.", createdAt: "2026-09-12T09:00:00.000Z", resourceHref: "/estudiante/chequeo", status: "INFO", readAt: "2026-09-12T09:10:00.000Z" },
  { id: "NOT-2026-005", event: "CANCELLATION", title: "Cambio en una cita", message: "Una cita anterior fue cancelada. Consulta el detalle si necesitas reprogramar.", createdAt: "2026-09-11T11:00:00.000Z", resourceHref: "/estudiante/citas/CIT-2026-003", status: "CANCELLED" },
], preferences: { estudiante: clonePreferences(), medico: clonePreferences(), administrativo: clonePreferences() } }; }
function readState(): NotificationState { if (typeof window === "undefined") return initialState(); try { const saved = window.localStorage.getItem(STORAGE_KEY); if (!saved) return initialState(); const parsed = JSON.parse(saved) as Partial<NotificationState>; const defaults = initialState(); return { notifications: parsed.notifications ?? defaults.notifications, preferences: parsed.preferences ?? defaults.preferences }; } catch { return initialState(); } }
function writeState(state: NotificationState) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

export function getNotifications() { return readState().notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function markNotificationRead(id: string) { const state = readState(); const updated = state.notifications.map((item) => item.id === id ? { ...item, readAt: item.readAt ?? "2026-09-14T10:45:00.000Z" } : item); writeState({ ...state, notifications: updated }); return updated.find((item) => item.id === id); }
export function markAllNotificationsRead() { const state = readState(); writeState({ ...state, notifications: state.notifications.map((item) => ({ ...item, readAt: item.readAt ?? "2026-09-14T10:45:00.000Z" })) }); }
export function getNotificationPreferences(role: AppRole) { return readState().preferences[role]; }
export function saveNotificationPreferences(role: AppRole, preferences: NotificationPreference) {
  if (!preferences.CANCELLATION.inApp) return { error: "La política requiere avisos dentro de la aplicación para cancelaciones críticas." };
  const state = readState(); writeState({ ...state, preferences: { ...state.preferences, [role]: preferences } }); return { preferences };
}
