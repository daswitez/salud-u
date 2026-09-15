import { createCampaignAppointment, createWaitlistAppointment } from "@/lib/demo-booking-store";
import type { MockSlot, Modality } from "@/lib/mock-clinic";

export type CheckupStatus = "PENDING" | "BOOKED" | "COMPLETED" | "NOT_ELIGIBLE";
export type TypeACampaign = { id: string; name: string; date: string; time: string; location: string; remaining: number; active: boolean };
export type WaitlistStatus = "ACTIVE" | "OFFERED" | "ACCEPTED" | "CANCELLED";
export type WaitlistPreferences = { specialty: string; startDate: string; endDate: string; timeRange: string; modality: Modality | "Cualquiera"; doctor: string };
export type WaitlistOffer = { id: string; slot: MockSlot; expiresAt: number };
export type WaitlistEntry = WaitlistPreferences & { id: string; status: WaitlistStatus; createdAt: string; updatedAt: string; offer?: WaitlistOffer; audit: string[] };
type AccessState = { checkupStatus: CheckupStatus; campaign: TypeACampaign; waitlist: WaitlistEntry[]; exceptions: string[] };
const STORAGE_KEY = "salud-universitaria-access-demo-v1";

function offerSlot(): MockSlot { return { id: "OFFER-2026-001", specialty: "Especialidad 2", doctorId: "MED-002", doctor: "Dr. Andrés Flores", date: "2026-09-16", weekday: "Miércoles 16 de septiembre", time: "15:30", modality: "Presencial", available: true, demand: "Media", wait: "15–25 min" }; }
function initialState(): AccessState {
  const offer: WaitlistOffer = { id: "OFF-2026-001", slot: offerSlot(), expiresAt: Date.now() + 20 * 60 * 1000 };
  return { checkupStatus: "PENDING", campaign: { id: "CAM-2026-001", name: "Campaña de chequeo 2026", date: "2026-09-22", time: "08:30", location: "Centro de Salud Universitaria", remaining: 12, active: true }, waitlist: [{ id: "LE-2026-001", specialty: "Especialidad 2", startDate: "2026-09-16", endDate: "2026-09-20", timeRange: "14:00–18:00", modality: "Presencial", doctor: "", status: "OFFERED", createdAt: "2026-09-14T09:00:00.000Z", updatedAt: "2026-09-14T10:00:00.000Z", offer, audit: ["Preferencias guardadas · 14 sep, 09:00", "Oferta compatible enviada · 14 sep, 10:00"] }], exceptions: ["Cancelación CIT-2026-003 registrada para revisión administrativa"] };
}
function readState(): AccessState {
  if (typeof window === "undefined") return initialState();
  try { const saved = window.localStorage.getItem(STORAGE_KEY); if (!saved) return initialState(); const parsed = JSON.parse(saved) as Partial<AccessState>; const fallback = initialState(); return { checkupStatus: parsed.checkupStatus ?? fallback.checkupStatus, campaign: parsed.campaign ?? fallback.campaign, waitlist: parsed.waitlist ?? fallback.waitlist, exceptions: parsed.exceptions ?? fallback.exceptions }; } catch { return initialState(); }
}
function writeState(state: AccessState) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function stamp() { return "14 sep, 10:30"; }

export function getCheckup() { const state = readState(); return { status: state.checkupStatus, campaign: state.campaign }; }
export function reserveCampaign() {
  const state = readState();
  if (state.checkupStatus === "COMPLETED") return { error: "El chequeo obligatorio ya fue completado y no puede realizarse una segunda vez." };
  if (state.checkupStatus === "BOOKED") return { error: "Ya tienes un cupo reservado para esta campaña." };
  if (state.checkupStatus === "NOT_ELIGIBLE" || !state.campaign.active) return { error: "No eres elegible para una campaña activa en este momento." };
  if (!state.campaign.remaining) return { error: "La campaña ya no tiene capacidad disponible." };
  const appointment = createCampaignAppointment(state.campaign);
  if (!appointment) return { error: "No se pudo reservar un segundo cupo de campaña." };
  writeState({ ...state, checkupStatus: "BOOKED", campaign: { ...state.campaign, remaining: state.campaign.remaining - 1 } });
  return { appointment };
}

export function getWaitlistEntries() { return readState().waitlist; }
export function saveWaitlistPreferences(input: WaitlistPreferences, id?: string) {
  const state = readState();
  if (!input.specialty || !input.startDate || !input.endDate || input.endDate < input.startDate || !input.timeRange) return { error: "Completa especialidad, rango de fechas y franja horaria válidos." };
  const existing = id ? state.waitlist.find((item) => item.id === id) : state.waitlist.find((item) => item.status === "ACTIVE" || item.status === "OFFERED");
  const entry: WaitlistEntry = existing ? { ...existing, ...input, status: "ACTIVE", offer: undefined, updatedAt: "2026-09-14T10:30:00.000Z", audit: [...existing.audit, `Preferencias actualizadas · ${stamp()}`] } : { ...input, id: `LE-2026-${String(state.waitlist.length + 1).padStart(3, "0")}`, status: "ACTIVE", createdAt: "2026-09-14T10:30:00.000Z", updatedAt: "2026-09-14T10:30:00.000Z", audit: [`Preferencias creadas · ${stamp()}`] };
  writeState({ ...state, waitlist: existing ? state.waitlist.map((item) => item.id === existing.id ? entry : item) : [...state.waitlist, entry] });
  return { entry };
}
export function cancelWaitlist(id: string) {
  const state = readState(); const entry = state.waitlist.find((item) => item.id === id && (item.status === "ACTIVE" || item.status === "OFFERED"));
  if (!entry) return null;
  const updated: WaitlistEntry = { ...entry, status: "CANCELLED", offer: undefined, updatedAt: "2026-09-14T10:35:00.000Z", audit: [...entry.audit, `Lista cancelada por estudiante · ${stamp()}`] };
  writeState({ ...state, waitlist: state.waitlist.map((item) => item.id === id ? updated : item) }); return updated;
}
export function acceptWaitlistOffer(id: string) {
  const state = readState(); const entry = state.waitlist.find((item) => item.id === id && item.status === "OFFERED");
  if (!entry?.offer) return { error: "Esta oferta ya no está disponible." };
  if (entry.offer.expiresAt <= Date.now()) return { error: "La oferta venció y no se realizó ninguna reserva." };
  const appointment = createWaitlistAppointment(entry.offer.slot);
  const updated: WaitlistEntry = { ...entry, status: "ACCEPTED", offer: undefined, updatedAt: "2026-09-14T10:40:00.000Z", audit: [...entry.audit, `Oferta aceptada y cita ${appointment.id} confirmada · ${stamp()}`] };
  writeState({ ...state, waitlist: state.waitlist.map((item) => item.id === id ? updated : item), exceptions: [...state.exceptions, `Oferta ${entry.offer.id} aceptada; cita ${appointment.id} creada`] });
  return { appointment };
}
export function declineWaitlistOffer(id: string) {
  const state = readState(); const entry = state.waitlist.find((item) => item.id === id && item.status === "OFFERED");
  if (!entry) return null;
  const updated: WaitlistEntry = { ...entry, status: "ACTIVE", offer: undefined, updatedAt: "2026-09-14T10:40:00.000Z", audit: [...entry.audit, `Oferta rechazada por estudiante · ${stamp()}`] };
  writeState({ ...state, waitlist: state.waitlist.map((item) => item.id === id ? updated : item), exceptions: [...state.exceptions, `Oferta rechazada para ${entry.specialty}; preferencias permanecen activas`] }); return updated;
}
export function getAdminWaitlistExceptions() { const state = readState(); return { entries: state.waitlist, exceptions: state.exceptions }; }
export function adminHandleWaitlistException(id: string, action: "RESEND" | "WITHDRAW") {
  const state = readState(); const entry = state.waitlist.find((item) => item.id === id);
  if (!entry) return { error: "No se encontró la entrada de lista de espera." };
  if (action === "WITHDRAW" && entry.status === "OFFERED") {
    const updated: WaitlistEntry = { ...entry, status: "ACTIVE", offer: undefined, updatedAt: "2026-09-14T10:45:00.000Z", audit: [...entry.audit, `Oferta retirada por administración · ${stamp()}`] };
    writeState({ ...state, waitlist: state.waitlist.map((item) => item.id === id ? updated : item), exceptions: [...state.exceptions, `Oferta retirada para ${entry.id}`] }); return { entry: updated };
  }
  if (action === "RESEND" && entry.status !== "ACCEPTED" && entry.status !== "CANCELLED") {
    const offer: WaitlistOffer = { id: `OFF-2026-${String(state.exceptions.length + 2).padStart(3, "0")}`, slot: offerSlot(), expiresAt: Date.now() + 20 * 60 * 1000 };
    const updated: WaitlistEntry = { ...entry, status: "OFFERED", offer, updatedAt: "2026-09-14T10:45:00.000Z", audit: [...entry.audit, `Oferta compatible reenviada por administración · ${stamp()}`] };
    writeState({ ...state, waitlist: state.waitlist.map((item) => item.id === id ? updated : item), exceptions: [...state.exceptions, `Oferta ${offer.id} enviada para ${entry.id}`] }); return { entry: updated };
  }
  return { error: "La acción no está disponible para el estado actual." };
}
