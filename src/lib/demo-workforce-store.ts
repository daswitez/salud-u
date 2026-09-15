import { INITIAL_APPOINTMENTS, MOCK_DOCTORS, MOCK_SLOTS, type Modality } from "@/lib/mock-clinic";

export type Professional = {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  modalities: Modality[];
  active: boolean;
  audit: string[];
};

export type RequestType = "BLOCK" | "CHANGE_HOURS" | "CHANGE_MODALITY";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "APPLIED" | "NEEDS_ADJUSTMENT";
export type AffectedAppointment = { id: string; patientName: string; date: string; time: string; modality: Modality; specialty: string };
export type ScheduleRequest = {
  id: string;
  doctorId: string;
  doctorName: string;
  type: RequestType;
  startDate: string;
  endDate: string;
  modality?: Modality;
  reason: string;
  status: RequestStatus;
  affectedAppointments: AffectedAppointment[];
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  audit: string[];
};

export type ShiftStatus = "DRAFT" | "PUBLISHED";
export type ShiftBreak = { startTime: string; endTime: string };
export type MedicalShift = {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  startTime: string;
  endTime: string;
  modality: Modality;
  durationMinutes: number;
  breaks: ShiftBreak[];
  status: ShiftStatus;
  createdAt: string;
  audit: string[];
};

export type ShiftPreviewSlot = { startTime: string; endTime: string; reservable: boolean; reason?: string };
export type CapacityMetric = { specialty: string; published: number; occupied: number; waitlist: number; demand: "Baja" | "Media" | "Alta"; estimatedWait: string; deficit: number };

type WorkforceState = { professionals: Professional[]; requests: ScheduleRequest[]; shifts: MedicalShift[] };
const STORAGE_KEY = "salud-universitaria-workforce-demo-v1";

function appointmentPreview(doctorId: string, startDate: string, endDate: string) {
  return INITIAL_APPOINTMENTS.filter((appointment) => appointment.doctorId === doctorId && appointment.status === "CONFIRMED" && appointment.date >= startDate && appointment.date <= endDate).map((appointment) => ({ id: appointment.id, patientName: appointment.patientName ?? "Estudiante", date: appointment.date, time: appointment.time, modality: appointment.modality, specialty: appointment.specialty }));
}

const initialProfessionals: Professional[] = MOCK_DOCTORS.map((doctor, index) => ({ id: doctor.id, name: doctor.name, email: `${doctor.id.toLowerCase()}@demo.com`, specialties: [doctor.specialty], modalities: [...doctor.modalities], active: true, audit: [`Configuración inicial registrada · 2026-09-01 08:00`, ...(index === 0 ? ["Modalidad teleconsulta habilitada · 2026-09-03 09:30"] : [])] }));
const initialRequests: ScheduleRequest[] = [
  { id: "SOL-2026-001", doctorId: "MED-001", doctorName: "Dra. Valeria Mendoza", type: "BLOCK", startDate: "2026-09-10", endDate: "2026-09-10", reason: "Reunión académica impostergable", status: "PENDING", affectedAppointments: appointmentPreview("MED-001", "2026-09-10", "2026-09-10"), createdAt: "2026-09-08T10:20:00.000Z", updatedAt: "2026-09-08T10:20:00.000Z", audit: ["Solicitud creada por Dra. Valeria Mendoza · 8 sep, 10:20"] },
  { id: "SOL-2026-002", doctorId: "MED-001", doctorName: "Dra. Valeria Mendoza", type: "CHANGE_MODALITY", startDate: "2026-09-15", endDate: "2026-09-15", modality: "Teleconsulta", reason: "Atención académica fuera de consultorio", status: "APPROVED", affectedAppointments: [], resolution: "Aprobada: se conserva cobertura en teleconsulta.", createdAt: "2026-09-05T11:00:00.000Z", updatedAt: "2026-09-06T09:15:00.000Z", audit: ["Solicitud creada por Dra. Valeria Mendoza · 5 sep, 11:00", "Aprobada por María Fernández · 6 sep, 09:15"] },
];
const initialShifts: MedicalShift[] = [
  { id: "TUR-2026-001", doctorId: "MED-001", doctorName: "Dra. Valeria Mendoza", specialty: "Especialidad 1", date: "2026-09-15", startTime: "08:00", endTime: "10:00", modality: "Presencial", durationMinutes: 30, breaks: [{ startTime: "09:00", endTime: "09:30" }], status: "PUBLISHED", createdAt: "2026-09-04T09:00:00.000Z", audit: ["Turno creado en borrador · 4 sep, 09:00", "Capacidad publicada · 4 sep, 09:15"] },
  { id: "TUR-2026-002", doctorId: "MED-002", doctorName: "Dr. Andrés Flores", specialty: "Especialidad 2", date: "2026-09-16", startTime: "09:00", endTime: "12:00", modality: "Teleconsulta", durationMinutes: 30, breaks: [{ startTime: "10:30", endTime: "11:00" }], status: "DRAFT", createdAt: "2026-09-08T11:00:00.000Z", audit: ["Turno creado en borrador · 8 sep, 11:00"] },
];

function initialState(): WorkforceState { return { professionals: initialProfessionals.map((item) => ({ ...item, specialties: [...item.specialties], modalities: [...item.modalities], audit: [...item.audit] })), requests: initialRequests.map((item) => ({ ...item, affectedAppointments: [...item.affectedAppointments], audit: [...item.audit] })), shifts: initialShifts.map((item) => ({ ...item, breaks: item.breaks.map((pause) => ({ ...pause })), audit: [...item.audit] })) }; }
function readState(): WorkforceState {
  if (typeof window === "undefined") return initialState();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState();
    const parsed = JSON.parse(saved) as Partial<WorkforceState>;
    const defaults = initialState();
    return { professionals: parsed.professionals ?? defaults.professionals, requests: parsed.requests ?? defaults.requests, shifts: parsed.shifts ?? defaults.shifts };
  } catch { return initialState(); }
}
function writeState(state: WorkforceState) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function now() { return "10 sep, 10:30"; }

export function getProfessionals() { return readState().professionals; }
export function previewAffectedAppointments(doctorId: string, startDate: string, endDate: string) { return appointmentPreview(doctorId, startDate, endDate); }
export function saveProfessional(input: Omit<Professional, "id" | "audit"> & { id?: string }) {
  const state = readState();
  const duplicate = state.professionals.find((professional) => professional.id !== input.id && professional.email.trim().toLowerCase() === input.email.trim().toLowerCase());
  if (duplicate) return { error: "Ya existe un profesional con ese correo. Revisa el registro antes de guardar." };
  if (!input.name.trim() || !input.email.trim() || !input.specialties.length || !input.modalities.length) return { error: "Completa nombre, correo, al menos una especialidad y una modalidad." };
  const existing = state.professionals.find((professional) => professional.id === input.id);
  const professional: Professional = existing ? { ...existing, ...input, audit: [...existing.audit, `Configuración actualizada por administración · ${now()}`] } : { ...input, id: `MED-${String(state.professionals.length + 1).padStart(3, "0")}`, audit: [`Profesional creado por administración · ${now()}`] };
  writeState({ ...state, professionals: existing ? state.professionals.map((item) => item.id === professional.id ? professional : item) : [...state.professionals, professional] });
  return { professional };
}
export function toggleProfessional(id: string) {
  const state = readState();
  const professional = state.professionals.find((item) => item.id === id);
  if (!professional) return null;
  const updated = { ...professional, active: !professional.active, audit: [...professional.audit, `${professional.active ? "Profesional inactivado" : "Profesional activado"} por administración · ${now()}`] };
  writeState({ ...state, professionals: state.professionals.map((item) => item.id === id ? updated : item) });
  return updated;
}

export function getScheduleRequests() { return readState().requests.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
export function createScheduleRequest(input: Omit<ScheduleRequest, "id" | "doctorName" | "status" | "affectedAppointments" | "createdAt" | "updatedAt" | "audit">) {
  const state = readState();
  const doctor = state.professionals.find((item) => item.id === input.doctorId);
  if (!doctor) return { error: "No se encontró el profesional para esta solicitud." };
  if (!input.reason.trim() || !input.startDate || !input.endDate || input.endDate < input.startDate) return { error: "Indica un periodo válido y el motivo de la solicitud." };
  if (input.type === "CHANGE_MODALITY" && !input.modality) return { error: "Selecciona la modalidad solicitada." };
  const affectedAppointments = appointmentPreview(input.doctorId, input.startDate, input.endDate);
  const request: ScheduleRequest = { ...input, id: `SOL-2026-${String(state.requests.length + 1).padStart(3, "0")}`, doctorName: doctor.name, status: "PENDING", affectedAppointments, createdAt: "2026-09-10T10:30:00.000Z", updatedAt: "2026-09-10T10:30:00.000Z", audit: [`Solicitud creada por ${doctor.name} · ${now()}`] };
  writeState({ ...state, requests: [...state.requests, request] });
  return { request };
}
export function cancelScheduleRequest(id: string, doctorId: string) {
  const state = readState();
  const request = state.requests.find((item) => item.id === id && item.doctorId === doctorId && item.status === "PENDING");
  if (!request) return null;
  const updated = { ...request, status: "CANCELLED" as const, resolution: "Cancelada por la profesional antes de su resolución.", updatedAt: "2026-09-10T10:35:00.000Z", audit: [...request.audit, `Solicitud cancelada por ${request.doctorName} · ${now()}`] };
  writeState({ ...state, requests: state.requests.map((item) => item.id === id ? updated : item) });
  return updated;
}
export function resolveScheduleRequest(id: string, action: "APPROVED" | "REJECTED" | "NEEDS_ADJUSTMENT", reason: string) {
  const state = readState();
  const request = state.requests.find((item) => item.id === id && item.status === "PENDING");
  if (!request || !reason.trim()) return { error: "Escribe el motivo de la resolución antes de continuar." };
  const actionText = action === "APPROVED" ? "Aprobada" : action === "REJECTED" ? "Rechazada" : "Requiere ajuste";
  const updated: ScheduleRequest = { ...request, status: action, resolution: reason.trim(), updatedAt: "2026-09-10T10:40:00.000Z", audit: [...request.audit, `${actionText} por María Fernández · ${now()}: ${reason.trim()}`] };
  writeState({ ...state, requests: state.requests.map((item) => item.id === id ? updated : item) });
  return { request: updated };
}
export function getAlternativeCapacity(request: ScheduleRequest) {
  const compatible = MOCK_SLOTS.filter((slot) => slot.available && (!request.modality || slot.modality === request.modality));
  const samePeriod = compatible.filter((slot) => slot.date >= request.startDate && slot.date <= request.endDate);
  return (samePeriod.length ? samePeriod : compatible.filter((slot) => slot.date > request.endDate && slot.date <= "2026-09-17")).slice(0, 3);
}

function minutes(value: string) { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; }
function timeFromMinutes(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function overlap(startA: string, endA: string, startB: string, endB: string) { return minutes(startA) < minutes(endB) && minutes(endA) > minutes(startB); }

export function getShifts() { return readState().shifts.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)); }
export function previewShiftSlots(input: Pick<MedicalShift, "startTime" | "endTime" | "durationMinutes" | "breaks">): ShiftPreviewSlot[] {
  const slots: ShiftPreviewSlot[] = [];
  for (let start = minutes(input.startTime); start + input.durationMinutes <= minutes(input.endTime); start += input.durationMinutes) {
    const slotStart = timeFromMinutes(start);
    const slotEnd = timeFromMinutes(start + input.durationMinutes);
    const pause = input.breaks.find((item) => overlap(slotStart, slotEnd, item.startTime, item.endTime));
    slots.push({ startTime: slotStart, endTime: slotEnd, reservable: !pause, reason: pause ? "Pausa o bloqueo" : undefined });
  }
  return slots;
}
export function createShiftDraft(input: Omit<MedicalShift, "id" | "doctorName" | "status" | "createdAt" | "audit">) {
  const state = readState();
  const doctor = state.professionals.find((item) => item.id === input.doctorId);
  if (!doctor?.active) return { error: "Selecciona un médico activo antes de crear el turno." };
  if (!doctor.specialties.includes(input.specialty)) return { error: "La especialidad no está habilitada para este médico." };
  if (!doctor.modalities.includes(input.modality)) return { error: "La modalidad no está habilitada para este médico." };
  if (!input.date || minutes(input.startTime) >= minutes(input.endTime)) return { error: "Indica una fecha y un rango horario válido." };
  if (![15, 30, 45, 60].includes(input.durationMinutes)) return { error: "La duración debe ser de 15, 30, 45 o 60 minutos." };
  if (input.breaks.some((pause) => minutes(pause.startTime) >= minutes(pause.endTime) || minutes(pause.startTime) < minutes(input.startTime) || minutes(pause.endTime) > minutes(input.endTime))) return { error: "Cada pausa debe estar dentro del turno y tener una hora de inicio menor a la de fin." };
  if (input.breaks.some((pause, index) => input.breaks.some((other, otherIndex) => index !== otherIndex && overlap(pause.startTime, pause.endTime, other.startTime, other.endTime)))) return { error: "Las pausas o bloqueos no pueden solaparse entre sí." };
  const conflict = state.shifts.find((shift) => shift.doctorId === input.doctorId && shift.date === input.date && overlap(input.startTime, input.endTime, shift.startTime, shift.endTime));
  if (conflict) return { error: `El turno se solapa con ${conflict.id} (${conflict.startTime}–${conflict.endTime}). Ajusta el horario.` };
  const shift: MedicalShift = { ...input, id: `TUR-2026-${String(state.shifts.length + 1).padStart(3, "0")}`, doctorName: doctor.name, status: "DRAFT", createdAt: "2026-09-10T10:45:00.000Z", audit: [`Turno creado en borrador por María Fernández · ${now()}`] };
  writeState({ ...state, shifts: [...state.shifts, shift] });
  return { shift };
}
export function publishShift(id: string) {
  const state = readState();
  const shift = state.shifts.find((item) => item.id === id && item.status === "DRAFT");
  if (!shift) return { error: "El turno ya fue publicado o no está disponible." };
  const updated: MedicalShift = { ...shift, status: "PUBLISHED", audit: [...shift.audit, `Capacidad publicada por María Fernández · ${now()}`] };
  writeState({ ...state, shifts: state.shifts.map((item) => item.id === id ? updated : item) });
  return { shift: updated };
}
export function getPublishedBookableSlots() {
  const state = readState();
  return state.shifts.filter((shift) => shift.status === "PUBLISHED").flatMap((shift) => previewShiftSlots(shift).filter((slot) => slot.reservable).map((slot, index) => ({ id: `PUB-${shift.id}-${index + 1}`, specialty: shift.specialty, doctorId: shift.doctorId, doctor: shift.doctorName, date: shift.date, weekday: shift.date, time: slot.startTime, modality: shift.modality, available: true, demand: "Media" as const, wait: "15–25 min" })));
}
export function getCapacityMetrics(startDate: string, endDate: string, specialty: string | "Todas"): CapacityMetric[] {
  const available = [...MOCK_SLOTS, ...getPublishedBookableSlots()].filter((slot) => slot.date >= startDate && slot.date <= endDate);
  const specialties = specialty === "Todas" ? ["Especialidad 1", "Especialidad 2", "Especialidad 3", "Especialidad 4"] : [specialty];
  return specialties.map((name) => {
    const published = available.filter((slot) => slot.specialty === name && slot.available).length;
    const occupied = INITIAL_APPOINTMENTS.filter((appointment) => appointment.specialty === name && appointment.date >= startDate && appointment.date <= endDate && appointment.status === "CONFIRMED").length;
    const waitlist = name === "Especialidad 2" ? 7 : name === "Especialidad 1" ? 1 : 0;
    const demand = name === "Especialidad 2" ? "Alta" : name === "Especialidad 1" ? "Media" : "Baja";
    const deficit = Math.max(0, occupied + waitlist - published);
    return { specialty: name, published, occupied, waitlist, demand, estimatedWait: demand === "Alta" ? "35–50 min" : demand === "Media" ? "15–25 min" : "10–15 min", deficit };
  });
}
