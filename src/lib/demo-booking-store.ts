import { AppointmentHold, DEMO_TODAY, INITIAL_APPOINTMENTS, INITIAL_CLINICAL_ENCOUNTERS, INITIAL_QUEUE, MockAppointment, MockClinicalEncounter, MockQueueEntry, MockSlot } from "@/lib/mock-clinic";
import {
  cancelInitialClinicalAppointment,
  getClinicalDemoState,
  getClinicalAppointment,
  getPatientClinicalAppointments,
  markInitialClinicalAppointmentNoShow,
  requestInitialClinicalAppointment,
  scheduleInitialClinicalAppointment,
  startInitialClinicalEncounter,
  createClinicalAppointment,
  type ClinicalStoreResult,
} from "@/lib/demo-clinical-store";
import type { Appointment, AppointmentType, ClinicalEncounter, Specialty } from "@/lib/ui-contracts";

type BookingState = { appointments: MockAppointment[]; holds: AppointmentHold[]; queue: MockQueueEntry[]; encounters: MockClinicalEncounter[] };
const STORAGE_KEY = "salud-universitaria-booking-demo-v1";

function initialState(): BookingState { return { appointments: [...INITIAL_APPOINTMENTS], holds: [], queue: [...INITIAL_QUEUE], encounters: [...INITIAL_CLINICAL_ENCOUNTERS] }; }
function readState(): BookingState {
  if (typeof window === "undefined") return initialState();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState();
    const parsed = JSON.parse(saved) as Partial<BookingState>;
    const savedAppointments = parsed.appointments ?? [];
    const appointments = [...INITIAL_APPOINTMENTS.map((seed) => ({ ...seed, ...(savedAppointments.find((item) => item.id === seed.id) ?? {}) })), ...savedAppointments.filter((item) => !INITIAL_APPOINTMENTS.some((seed) => seed.id === item.id))];
    const savedQueue = parsed.queue ?? [];
    const queue = [...INITIAL_QUEUE.map((seed) => ({ ...seed, ...(savedQueue.find((item) => item.id === seed.id) ?? {}) })), ...savedQueue.filter((item) => !INITIAL_QUEUE.some((seed) => seed.id === item.id))];
    const savedEncounters = parsed.encounters ?? [];
    const encounters = [...INITIAL_CLINICAL_ENCOUNTERS.map((seed) => ({ ...seed, ...(savedEncounters.find((item) => item.id === seed.id) ?? {}) })), ...savedEncounters.filter((item) => !INITIAL_CLINICAL_ENCOUNTERS.some((seed) => seed.id === item.id))];
    return { appointments, holds: parsed.holds ?? [], queue, encounters };
  } catch { return initialState(); }
}
function writeState(state: BookingState) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function cleanExpired(state: BookingState) { return { ...state, holds: state.holds.filter((hold) => hold.expiresAt > Date.now()) }; }

export function getAppointments() { return readState().appointments; }
export function getHold(slotId: string) { const state = cleanExpired(readState()); writeState(state); return state.holds.find((hold) => hold.slotId === slotId); }
export function createHold(slot: MockSlot, rescheduleId?: string) {
  const state = cleanExpired(readState());
  const isBooked = state.appointments.some((appointment) => appointment.slotId === slot.id && appointment.status === "CONFIRMED");
  if (!slot.available || isBooked) return null;
  const existing = state.holds.find((hold) => hold.slotId === slot.id);
  const hold = existing ?? { slotId: slot.id, expiresAt: Date.now() + 10 * 60 * 1000, rescheduleId };
  writeState({ ...state, holds: [...state.holds.filter((item) => item.slotId !== slot.id), hold] });
  return hold;
}
export function releaseHold(slotId: string) { const state = readState(); writeState({ ...state, holds: state.holds.filter((hold) => hold.slotId !== slotId) }); }
export function confirmAppointment(slot: MockSlot, hold: AppointmentHold) {
  const state = cleanExpired(readState());
  if (!state.holds.some((item) => item.slotId === hold.slotId && item.expiresAt > Date.now())) return null;
  const id = `CIT-2026-${String(state.appointments.length + 1).padStart(3, "0")}`;
  const appointment: MockAppointment = { id, slotId: slot.id, specialty: slot.specialty, doctor: slot.doctor, doctorId: slot.doctorId, patientId: "EST-2026-001", patientName: "Daniela Rojas", qrToken: slot.modality === "Presencial" ? `qr_${Math.random().toString(36).slice(2, 12)}` : undefined, date: slot.date, weekday: slot.weekday, time: slot.time, modality: slot.modality, status: "CONFIRMED", location: slot.modality === "Presencial" ? "Consultorio B-12" : undefined, createdAt: new Date().toISOString(), rescheduledFromId: hold.rescheduleId };
  const appointments = hold.rescheduleId ? state.appointments.map((item) => item.id === hold.rescheduleId ? { ...item, status: "CANCELLED" as const } : item) : state.appointments;
  writeState({ appointments: [...appointments, appointment], holds: state.holds.filter((item) => item.slotId !== slot.id), queue: state.queue, encounters: state.encounters });
  return appointment;
}
export function cancelAppointment(id: string) { const state = readState(); writeState({ ...state, appointments: state.appointments.map((item) => item.id === id ? { ...item, status: "CANCELLED" as const } : item) }); }
export function completeAppointment(id: string) { const state = readState(); const appointment = state.appointments.find((item) => item.id === id && item.status === "CONFIRMED"); if (!appointment) return null; const updated = { ...appointment, status: "COMPLETED" as const }; writeState({ ...state, appointments: state.appointments.map((item) => item.id === id ? updated : item) }); return updated; }
export function getAppointment(id: string) { return getAppointments().find((appointment) => appointment.id === id); }

export function createCampaignAppointment(campaign: { id: string; name: string; date: string; time: string; location: string }) {
  const state = readState();
  if (state.appointments.some((item) => item.careType === "TYPE_A" && item.status === "CONFIRMED")) return null;
  const appointment: MockAppointment = { id: `CIT-A-2026-${String(state.appointments.filter((item) => item.careType === "TYPE_A").length + 1).padStart(3, "0")}`, slotId: campaign.id, specialty: "Chequeo médico Tipo A", doctor: "Equipo de Salud Universitaria", doctorId: "MED-CAMPAIGN", patientId: "EST-2026-001", patientName: "Daniela Rojas", date: campaign.date, weekday: campaign.date, time: campaign.time, modality: "Presencial", status: "CONFIRMED", location: campaign.location, createdAt: "2026-09-14T10:00:00.000Z", careType: "TYPE_A", campaignName: campaign.name };
  writeState({ ...state, appointments: [...state.appointments, appointment] });
  return appointment;
}

export function createWaitlistAppointment(slot: MockSlot) {
  const state = readState();
  const appointment: MockAppointment = { id: `CIT-2026-${String(state.appointments.length + 1).padStart(3, "0")}`, slotId: slot.id, specialty: slot.specialty, doctor: slot.doctor, doctorId: slot.doctorId, patientId: "EST-2026-001", patientName: "Daniela Rojas", qrToken: slot.modality === "Presencial" ? "qr_waitlist_offer" : undefined, date: slot.date, weekday: slot.weekday, time: slot.time, modality: slot.modality, status: "CONFIRMED", location: slot.modality === "Presencial" ? "Consultorio B-14" : undefined, createdAt: "2026-09-14T10:00:00.000Z", careType: "TYPE_B" };
  writeState({ ...state, appointments: [...state.appointments, appointment] });
  return appointment;
}

export type CheckInResult = { ok: true; entry: MockQueueEntry; appointment: MockAppointment } | { ok: false; reason: "NOT_FOUND" | "INVALID" | "ALREADY_CHECKED_IN" };

export function checkInByReference(reference: string): CheckInResult {
  const state = readState();
  const normalized = reference.trim().toLowerCase();
  const appointment = state.appointments.find((item) => item.id.toLowerCase() === normalized || item.qrToken?.toLowerCase() === normalized);
  if (!appointment) return { ok: false, reason: "NOT_FOUND" };
  if (state.queue.some((entry) => entry.appointmentId === appointment.id && entry.status !== "COMPLETED")) return { ok: false, reason: "ALREADY_CHECKED_IN" };
  if (appointment.status !== "CONFIRMED" || appointment.modality !== "Presencial" || appointment.date !== DEMO_TODAY || !appointment.doctorId) return { ok: false, reason: "INVALID" };
  const timestamp = new Date().toISOString();
  const entry: MockQueueEntry = { id: `COL-2026-${String(state.queue.length + 1).padStart(3, "0")}`, appointmentId: appointment.id, patientName: appointment.patientName ?? "Estudiante", doctorId: appointment.doctorId, specialty: appointment.specialty, scheduledTime: appointment.time, checkedInAt: timestamp, updatedAt: timestamp, demand: "Media", estimatedWait: "25–35 min", status: "WAITING" };
  writeState({ ...state, queue: [...state.queue, entry] });
  return { ok: true, entry, appointment };
}

export function getQueue() { return readState().queue; }
export function getQueueForAppointment(appointmentId: string) { return getQueue().find((entry) => entry.appointmentId === appointmentId && entry.status !== "COMPLETED"); }
export function getQueueEntry(id: string) { return getQueue().find((entry) => entry.id === id); }
export function getDoctorQueue(doctorId: string) { return getQueue().filter((entry) => entry.doctorId === doctorId && entry.status !== "COMPLETED").sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt)); }

function updateQueueEntry(id: string, doctorId: string, allowedStatus: MockQueueEntry["status"], nextStatus: MockQueueEntry["status"]) {
  const state = readState();
  const entry = state.queue.find((item) => item.id === id && item.doctorId === doctorId && item.status === allowedStatus);
  if (!entry) return null;
  const updated = { ...entry, status: nextStatus, updatedAt: new Date().toISOString() };
  const appointments = nextStatus === "COMPLETED" ? state.appointments.map((appointment) => appointment.id === entry.appointmentId ? { ...appointment, status: "COMPLETED" as const } : appointment) : state.appointments;
  writeState({ ...state, appointments, queue: state.queue.map((item) => item.id === id ? updated : item) });
  return updated;
}

export function callNextPatient(doctorId: string) {
  const state = readState();
  if (state.queue.some((entry) => entry.doctorId === doctorId && (entry.status === "CALLED" || entry.status === "IN_SERVICE"))) return null;
  const next = getDoctorQueue(doctorId).find((entry) => entry.status === "WAITING");
  return next ? updateQueueEntry(next.id, doctorId, "WAITING", "CALLED") : null;
}
export function startAttention(queueId: string, doctorId: string) { return updateQueueEntry(queueId, doctorId, "CALLED", "IN_SERVICE"); }
export function finishAttention(queueId: string, doctorId: string) { return updateQueueEntry(queueId, doctorId, "IN_SERVICE", "COMPLETED"); }

export function getClinicalHistory(patientId: string, doctorId: string) {
  return readState().encounters.filter((encounter) => encounter.patientId === patientId && encounter.doctorId === doctorId && encounter.status === "FINALIZED").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getClinicalEncounter(encounterId: string) { return readState().encounters.find((encounter) => encounter.id === encounterId); }

export function getOrCreateClinicalEncounter(queueId: string, doctorId: string) {
  const state = readState();
  const queueEntry = state.queue.find((entry) => entry.id === queueId && entry.doctorId === doctorId && (entry.status === "CALLED" || entry.status === "IN_SERVICE"));
  if (!queueEntry) return null;
  const existing = state.encounters.find((encounter) => encounter.queueId === queueId && encounter.doctorId === doctorId);
  if (existing) return existing;
  const appointment = state.appointments.find((item) => item.id === queueEntry.appointmentId);
  if (!appointment?.patientId) return null;
  const timestamp = new Date().toISOString();
  const encounter: MockClinicalEncounter = { id: `ENC-2026-${String(state.encounters.length + 1).padStart(3, "0")}`, queueId, appointmentId: appointment.id, doctorId, patientId: appointment.patientId, specialty: appointment.specialty, status: "DRAFT", startedAt: timestamp, updatedAt: timestamp, formData: {} };
  writeState({ ...state, encounters: [...state.encounters, encounter] });
  return encounter;
}

export function saveClinicalDraft(encounterId: string, doctorId: string, formData: Record<string, string>) {
  const state = readState();
  const encounter = state.encounters.find((item) => item.id === encounterId && item.doctorId === doctorId && item.status === "DRAFT");
  if (!encounter) return null;
  const updated = { ...encounter, formData, updatedAt: new Date().toISOString() };
  writeState({ ...state, encounters: state.encounters.map((item) => item.id === encounterId ? updated : item) });
  return updated;
}

export function finalizeClinicalEncounter(encounterId: string, doctorId: string, formData: Record<string, string>) {
  const state = readState();
  const encounter = state.encounters.find((item) => item.id === encounterId && item.doctorId === doctorId && item.status === "DRAFT");
  if (!encounter) return null;
  const queueEntry = state.queue.find((item) => item.id === encounter.queueId && item.doctorId === doctorId && item.status === "IN_SERVICE");
  if (!queueEntry) return null;
  const timestamp = new Date().toISOString();
  const updated = { ...encounter, formData, status: "FINALIZED" as const, updatedAt: timestamp, endedAt: timestamp };
  writeState({ ...state, encounters: state.encounters.map((item) => item.id === encounterId ? updated : item), queue: state.queue.map((item) => item.id === queueEntry.id ? { ...item, status: "COMPLETED" as const, updatedAt: timestamp } : item), appointments: state.appointments.map((item) => item.id === encounter.appointmentId ? { ...item, status: "COMPLETED" as const } : item) });
  return updated;
}

// B4. Citas por cupo. Este adaptador usa exclusivamente el store clínico
// central; los helpers anteriores se conservan sólo para rutas heredadas.
export type CareCapacity = {
  id: string;
  scheduledFor: string;
  doctorId: string;
  doctorName: string;
  appointmentType: Extract<AppointmentType, "INITIAL" | "SPECIALTY">;
  specialty?: Specialty;
  durationMinutes: number;
};

export type MedicalSchedule = {
  id: string;
  doctorId: string;
  doctorName: string;
  appointmentType: Extract<AppointmentType, "INITIAL" | "SPECIALTY">;
  specialty?: Specialty;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  blocks: { startTime: string; endTime: string; reason: string }[];
};

const CAPACITY_STORAGE_KEY = "salud-universitaria-medical-schedules-v1";
const INITIAL_SCHEDULES: readonly MedicalSchedule[] = [
  { id: "SCH-REV-001", doctorId: "DOC-REV-001", doctorName: "Dra. Valeria Mendoza", appointmentType: "INITIAL", date: "2026-09-18", startTime: "09:00", endTime: "11:00", durationMinutes: 30, blocks: [{ startTime: "10:00", endTime: "10:30", reason: "Bloqueo administrativo" }] },
  { id: "SCH-DER-001", doctorId: "DOC-DER-001", doctorName: "Dra. Sofía Álvarez", appointmentType: "SPECIALTY", specialty: "DERMATOLOGY", date: "2026-09-19", startTime: "09:00", endTime: "11:00", durationMinutes: 30, blocks: [] },
  { id: "SCH-OFT-001", doctorId: "DOC-OFT-001", doctorName: "Dr. Andrés Flores", appointmentType: "SPECIALTY", specialty: "OPHTHALMOLOGY", date: "2026-09-19", startTime: "14:00", endTime: "16:00", durationMinutes: 30, blocks: [{ startTime: "15:00", endTime: "15:30", reason: "Bloqueo clínico" }] },
];

function cloneSchedules() { return JSON.parse(JSON.stringify(INITIAL_SCHEDULES)) as MedicalSchedule[]; }
function readSchedules() { if (typeof window === "undefined") return cloneSchedules(); try { return JSON.parse(window.localStorage.getItem(CAPACITY_STORAGE_KEY) ?? "null") as MedicalSchedule[] ?? cloneSchedules(); } catch { return cloneSchedules(); } }
function writeSchedules(schedules: MedicalSchedule[]) { if (typeof window !== "undefined") window.localStorage.setItem(CAPACITY_STORAGE_KEY, JSON.stringify(schedules)); }
function toMinutes(time: string) { const [hours, minutes] = time.split(":").map(Number); return hours * 60 + minutes; }
function toTime(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function overlaps(start: string, end: string, blockStart: string, blockEnd: string) { return toMinutes(start) < toMinutes(blockEnd) && toMinutes(end) > toMinutes(blockStart); }

export type AvailableCareCapacity = CareCapacity & { availableAppointments: number };
export type AvailableInitialCareCapacity = AvailableCareCapacity;

export function getMedicalSchedules(doctorId?: string) { return readSchedules().filter((schedule) => !doctorId || schedule.doctorId === doctorId).sort((left, right) => `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`)); }

export function saveMedicalSchedule(input: Omit<MedicalSchedule, "id" | "doctorName">): ClinicalStoreResult<MedicalSchedule> {
  const doctor = getClinicalDemoState().professionals.find((professional) => professional.id === input.doctorId);
  if (!doctor || !input.date || toMinutes(input.startTime) >= toMinutes(input.endTime) || ![15, 30, 45, 60].includes(input.durationMinutes)) return { ok: false, code: "VALIDATION", message: "Revisa fecha, horario y duración de cada cita." };
  if (input.appointmentType === "SPECIALTY" && (!input.specialty || doctor.specialty !== input.specialty)) return { ok: false, code: "VALIDATION", message: "La especialidad debe corresponder al profesional." };
  if (input.appointmentType === "INITIAL" && doctor.role !== "REVIEW_DOCTOR") return { ok: false, code: "VALIDATION", message: "Solo el médico de revisión puede publicar cupos iniciales." };
  if (input.blocks.some((block) => toMinutes(block.startTime) >= toMinutes(block.endTime) || toMinutes(block.startTime) < toMinutes(input.startTime) || toMinutes(block.endTime) > toMinutes(input.endTime))) return { ok: false, code: "VALIDATION", message: "Los bloqueos deben estar dentro del horario publicado." };
  const schedules = readSchedules();
  const schedule: MedicalSchedule = { ...input, id: `SCH-NEW-${String(schedules.length + 1).padStart(3, "0")}`, doctorName: doctor.fullName };
  writeSchedules([...schedules, schedule]);
  return { ok: true, data: schedule };
}

export function getAvailableCareCapacities(filter: { appointmentType?: "INITIAL" | "SPECIALTY"; specialty?: Specialty } = {}): AvailableCareCapacity[] {
  const appointments = getClinicalDemoState().appointments;
  return getMedicalSchedules().flatMap((schedule) => {
    if (filter.appointmentType && schedule.appointmentType !== filter.appointmentType) return [];
    if (filter.specialty && schedule.specialty !== filter.specialty) return [];
    const capacities: AvailableCareCapacity[] = [];
    for (let start = toMinutes(schedule.startTime); start + schedule.durationMinutes <= toMinutes(schedule.endTime); start += schedule.durationMinutes) {
      const startTime = toTime(start); const endTime = toTime(start + schedule.durationMinutes);
      if (schedule.blocks.some((block) => overlaps(startTime, endTime, block.startTime, block.endTime))) continue;
      const id = `CAP-${schedule.id}-${startTime.replace(":", "")}`;
      const occupied = appointments.some((appointment) => appointment.capacityId === id && ["SCHEDULED", "ATTENDED"].includes(appointment.status));
      capacities.push({ id, scheduledFor: `${schedule.date}T${startTime}:00.000Z`, doctorId: schedule.doctorId, doctorName: schedule.doctorName, appointmentType: schedule.appointmentType, specialty: schedule.specialty, durationMinutes: schedule.durationMinutes, availableAppointments: occupied ? 0 : 1 });
    }
    return capacities;
  });
}

export function getInitialCareCapacities(): AvailableInitialCareCapacity[] {
  return getAvailableCareCapacities({ appointmentType: "INITIAL" });
}

export function requestStudentInitialAppointment(patientId: string, requestedBy = "U-EST-001") {
  return requestInitialClinicalAppointment(patientId, requestedBy);
}

export function getClinicalInitialAppointment(appointmentId: string) {
  return getClinicalAppointment(appointmentId);
}

export function getInitialAppointmentsForPatient(patientId: string) {
  return getPatientClinicalAppointments(patientId);
}

export function confirmInitialAppointmentAgainstCapacity(appointmentId: string, capacityId: string): ClinicalStoreResult<Appointment> {
  const capacity = getInitialCareCapacities().find((item) => item.id === capacityId);
  if (!capacity) return { ok: false, code: "NOT_FOUND", message: "No se encontró el cupo seleccionado." };
  if (capacity.availableAppointments <= 0) return { ok: false, code: "CONFLICT", message: "El cupo ya fue ocupado. Elige otro cupo disponible." };
  return scheduleInitialClinicalAppointment(appointmentId, capacity);
}

/** Reserva hecha por Administración tras buscar al estudiante por carnet, código o nombre. */
export function createAdministrativeAppointment(patientId: string, capacityId: string): ClinicalStoreResult<Appointment> {
  const capacity = getAvailableCareCapacities().find((item) => item.id === capacityId);
  if (!capacity) return { ok: false, code: "NOT_FOUND", message: "No se encontró el cupo seleccionado." };
  if (!capacity.availableAppointments) return { ok: false, code: "CONFLICT", message: "El cupo ya está ocupado. Selecciona otro horario." };
  return createClinicalAppointment({ patientId, type: capacity.appointmentType, specialty: capacity.specialty, capacityId: capacity.id, requestedBy: "ADMIN-001", assignedDoctorId: capacity.doctorId, scheduledFor: capacity.scheduledFor, status: "SCHEDULED" });
}

export function cancelInitialAppointment(appointmentId: string) {
  return cancelInitialClinicalAppointment(appointmentId);
}

export function markInitialAppointmentNoShow(appointmentId: string) {
  return markInitialClinicalAppointmentNoShow(appointmentId);
}

export function beginInitialAppointmentAttention(appointmentId: string, doctorId: string): ClinicalStoreResult<ClinicalEncounter> {
  return startInitialClinicalEncounter(appointmentId, doctorId);
}
