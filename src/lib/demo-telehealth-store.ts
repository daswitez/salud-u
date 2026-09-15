import { completeAppointment, getAppointment } from "@/lib/demo-booking-store";

export type TeleSessionStatus = "WAITING" | "ADMITTED" | "ENDED" | "REVOKED";
export type TeleSession = { id: string; appointmentId: string; doctorId: string; patientName: string; specialty: string; token: string; opensAt: number; expiresAt: number; status: TeleSessionStatus; audit: string[] };
type TeleState = { sessions: TeleSession[] };
const STORAGE_KEY = "salud-universitaria-telehealth-demo-v1";

function initialState(): TeleState { return { sessions: [{ id: "TEL-2026-001", appointmentId: "CIT-2026-004", doctorId: "MED-001", patientName: "Daniela Rojas", specialty: "Especialidad 1", token: "tele_7Xk2pQ9m", opensAt: Date.now() - 5 * 60 * 1000, expiresAt: Date.now() + 25 * 60 * 1000, status: "WAITING", audit: ["Acceso temporal emitido para la cita · 14 sep, 14:20"] }] }; }
function readState(): TeleState { if (typeof window === "undefined") return initialState(); try { const saved = window.localStorage.getItem(STORAGE_KEY); if (!saved) return initialState(); const parsed = JSON.parse(saved) as Partial<TeleState>; return { sessions: parsed.sessions ?? initialState().sessions }; } catch { return initialState(); } }
function writeState(state: TeleState) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function stamp() { return "14 sep, 14:30"; }

export type TeleAccessResult = { ok: true; session: TeleSession } | { ok: false; reason: "NOT_FOUND" | "INVALID_TOKEN" | "NOT_OPEN" | "EXPIRED" | "ENDED" | "REVOKED" | "CANCELLED" };
export function validateTeleAccess(appointmentId: string, token: string): TeleAccessResult {
  const session = readState().sessions.find((item) => item.appointmentId === appointmentId);
  if (!session) return { ok: false, reason: "NOT_FOUND" };
  if (session.token !== token) return { ok: false, reason: "INVALID_TOKEN" };
  const appointment = getAppointment(appointmentId);
  if (appointment?.status === "CANCELLED") return { ok: false, reason: "CANCELLED" };
  if (session.status === "ENDED") return { ok: false, reason: "ENDED" };
  if (session.status === "REVOKED") return { ok: false, reason: "REVOKED" };
  if (Date.now() < session.opensAt) return { ok: false, reason: "NOT_OPEN" };
  if (Date.now() > session.expiresAt) return { ok: false, reason: "EXPIRED" };
  return { ok: true, session };
}
export function getDoctorTeleSessions(doctorId: string) { return readState().sessions.filter((item) => item.doctorId === doctorId && (item.status === "WAITING" || item.status === "ADMITTED")); }
export function admitTeleSession(id: string, doctorId: string) {
  const state = readState(); const session = state.sessions.find((item) => item.id === id && item.doctorId === doctorId && item.status === "WAITING");
  if (!session) return null;
  const updated: TeleSession = { ...session, status: "ADMITTED", audit: [...session.audit, `Paciente admitida por médico · ${stamp()}`] };
  writeState({ sessions: state.sessions.map((item) => item.id === id ? updated : item) }); return updated;
}
export function endTeleSession(id: string, doctorId: string) {
  const state = readState(); const session = state.sessions.find((item) => item.id === id && item.doctorId === doctorId && item.status === "ADMITTED");
  if (!session) return null;
  const appointment = completeAppointment(session.appointmentId);
  if (!appointment) return null;
  const updated: TeleSession = { ...session, status: "ENDED", audit: [...session.audit, `Sesión finalizada y acceso invalidado · ${stamp()}`] };
  writeState({ sessions: state.sessions.map((item) => item.id === id ? updated : item) }); return updated;
}
