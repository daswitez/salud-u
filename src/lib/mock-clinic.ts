export type Modality = "Presencial" | "Teleconsulta";
export type AppointmentStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type QueueStatus = "WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED";
export type ClinicalEncounterStatus = "DRAFT" | "FINALIZED";

export type MockSlot = {
  id: string;
  specialty: string;
  doctorId: string;
  doctor: string;
  date: string;
  weekday: string;
  time: string;
  modality: Modality;
  available: boolean;
  demand: "Baja" | "Media" | "Alta";
  wait: string;
};

export type MockAppointment = {
  id: string;
  slotId: string;
  specialty: string;
  doctor: string;
  date: string;
  weekday: string;
  time: string;
  modality: Modality;
  status: AppointmentStatus;
  doctorId?: string;
  patientId?: string;
  patientName?: string;
  qrToken?: string;
  location?: string;
  createdAt: string;
  rescheduledFromId?: string;
  careType?: "TYPE_A" | "TYPE_B";
  campaignName?: string;
};

export type MockPatient = {
  id: string;
  name: string;
  studentCode: string;
  career: string;
  email: string;
  phone: string;
  emergencyContact: string;
};

export type MockQueueEntry = {
  id: string;
  appointmentId: string;
  patientName: string;
  doctorId: string;
  specialty: string;
  scheduledTime: string;
  checkedInAt: string;
  updatedAt: string;
  demand: "Baja" | "Media" | "Alta";
  estimatedWait: string;
  status: QueueStatus;
};

export type MockAgendaItem = {
  id: string;
  doctorId: string;
  date: string;
  weekday: string;
  startTime: string;
  endTime: string;
  title: string;
  kind: "APPOINTMENT" | "PUBLISHED_SLOT" | "BLOCKED";
  modality?: Modality;
  appointmentId?: string;
  patientName?: string;
  status?: "Confirmada" | "Disponible" | "No disponible" | "Bloqueado";
};

export type MockClinicalEncounter = {
  id: string;
  queueId: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  specialty: string;
  status: ClinicalEncounterStatus;
  startedAt: string;
  updatedAt: string;
  endedAt?: string;
  formData: Record<string, string>;
};

export const MOCK_ADMIN_DASHBOARD = {
  appointmentsToday: 84,
  activeDoctors: 16,
  queuePatients: 11,
  waitlistEntries: 7,
  saturatedSpecialties: 2,
  demand: "Media",
  incidents: 2,
} as const;

export const DEMO_TODAY = "2026-09-10";

export type AppointmentHold = { slotId: string; expiresAt: number; rescheduleId?: string };

export const MOCK_DOCTORS = [
  { id: "MED-001", name: "Dra. Valeria Mendoza", specialty: "Especialidad 1", modalities: ["Presencial", "Teleconsulta"] as Modality[] },
  { id: "MED-002", name: "Dr. Andrés Flores", specialty: "Especialidad 2", modalities: ["Presencial", "Teleconsulta"] as Modality[] },
  { id: "MED-003", name: "Dra. Camila Torres", specialty: "Especialidad 3", modalities: ["Teleconsulta"] as Modality[] },
  { id: "MED-004", name: "Dr. Mateo Silva", specialty: "Especialidad 4", modalities: ["Presencial"] as Modality[] },
];

export const MOCK_PATIENTS: MockPatient[] = [
  { id: "EST-2026-001", name: "Daniela Rojas", studentCode: "EST-2026-001", career: "Ingeniería de Sistemas", email: "daniela.rojas@demo.com", phone: "+591 700 123 45", emergencyContact: "Contacto demo · +591 700 000 01" },
  { id: "EST-2026-002", name: "Estudiante B.", studentCode: "EST-2026-002", career: "Arquitectura", email: "estudiante.b@demo.com", phone: "+591 700 123 46", emergencyContact: "Contacto demo · +591 700 000 02" },
  { id: "EST-2026-003", name: "Estudiante C.", studentCode: "EST-2026-003", career: "Derecho", email: "estudiante.c@demo.com", phone: "+591 700 123 47", emergencyContact: "Contacto demo · +591 700 000 03" },
  { id: "EST-2026-004", name: "Estudiante D.", studentCode: "EST-2026-004", career: "Economía", email: "estudiante.d@demo.com", phone: "+591 700 123 48", emergencyContact: "Contacto demo · +591 700 000 04" },
  { id: "EST-2026-005", name: "Estudiante E.", studentCode: "EST-2026-005", career: "Medicina", email: "estudiante.e@demo.com", phone: "+591 700 123 49", emergencyContact: "Contacto demo · +591 700 000 05" },
];

export const MOCK_SLOTS: MockSlot[] = [
  { id: "SLOT-100", specialty: "Especialidad 1", doctorId: "MED-001", doctor: "Dra. Valeria Mendoza", date: "2026-09-15", weekday: "Martes 15 de septiembre", time: "09:00", modality: "Presencial", available: true, demand: "Media", wait: "15–25 min" },
  { id: "SLOT-101", specialty: "Especialidad 1", doctorId: "MED-001", doctor: "Dra. Valeria Mendoza", date: "2026-09-15", weekday: "Martes 15 de septiembre", time: "09:30", modality: "Presencial", available: true, demand: "Media", wait: "15–25 min" },
  { id: "SLOT-102", specialty: "Especialidad 1", doctorId: "MED-001", doctor: "Dra. Valeria Mendoza", date: "2026-09-15", weekday: "Martes 15 de septiembre", time: "10:00", modality: "Presencial", available: false, demand: "Alta", wait: "30–40 min" },
  { id: "SLOT-103", specialty: "Especialidad 1", doctorId: "MED-001", doctor: "Dra. Valeria Mendoza", date: "2026-09-15", weekday: "Martes 15 de septiembre", time: "14:30", modality: "Teleconsulta", available: true, demand: "Baja", wait: "10–15 min" },
  { id: "SLOT-104", specialty: "Especialidad 1", doctorId: "MED-001", doctor: "Dra. Valeria Mendoza", date: "2026-09-16", weekday: "Miércoles 16 de septiembre", time: "08:30", modality: "Presencial", available: true, demand: "Baja", wait: "10–20 min" },
  { id: "SLOT-105", specialty: "Especialidad 2", doctorId: "MED-002", doctor: "Dr. Andrés Flores", date: "2026-09-16", weekday: "Miércoles 16 de septiembre", time: "11:00", modality: "Teleconsulta", available: true, demand: "Media", wait: "15–25 min" },
  { id: "SLOT-200", specialty: "Especialidad 2", doctorId: "MED-002", doctor: "Dr. Andrés Flores", date: "2026-09-16", weekday: "Miércoles 16 de septiembre", time: "15:00", modality: "Presencial", available: false, demand: "Alta", wait: "35–50 min" },
  { id: "SLOT-300", specialty: "Especialidad 3", doctorId: "MED-003", doctor: "Dra. Camila Torres", date: "2026-09-17", weekday: "Jueves 17 de septiembre", time: "10:00", modality: "Teleconsulta", available: true, demand: "Baja", wait: "10–20 min" },
  { id: "SLOT-400", specialty: "Especialidad 4", doctorId: "MED-004", doctor: "Dr. Mateo Silva", date: "2026-09-18", weekday: "Viernes 18 de septiembre", time: "09:00", modality: "Presencial", available: true, demand: "Media", wait: "15–25 min" },
];

export const INITIAL_APPOINTMENTS: MockAppointment[] = [
  { id: "CIT-2026-001", slotId: "CURRENT-001", specialty: "Especialidad 1", doctor: "Dra. Valeria Mendoza", doctorId: "MED-001", patientId: "EST-2026-001", patientName: "Daniela Rojas", qrToken: "qr_7Hd4mP2kX9", date: DEMO_TODAY, weekday: "Hoy", time: "10:30", modality: "Presencial", status: "CONFIRMED", location: "Consultorio B-12", createdAt: "2026-09-01T10:00:00.000Z" },
  { id: "CIT-2026-002", slotId: "HISTORY-001", specialty: "Especialidad 2", doctor: "Dr. Andrés Flores", doctorId: "MED-002", patientId: "EST-2026-001", patientName: "Daniela Rojas", date: "2026-08-21", weekday: "Jueves 21 de agosto", time: "09:00", modality: "Teleconsulta", status: "COMPLETED", createdAt: "2026-08-10T10:00:00.000Z" },
  { id: "CIT-2026-003", slotId: "HISTORY-002", specialty: "Especialidad 1", doctor: "Dra. Valeria Mendoza", doctorId: "MED-001", patientId: "EST-2026-001", patientName: "Daniela Rojas", date: "2026-08-15", weekday: "Viernes 15 de agosto", time: "11:30", modality: "Presencial", status: "CANCELLED", createdAt: "2026-08-01T10:00:00.000Z" },
  { id: "CIT-2026-004", slotId: "TELE-2026-001", specialty: "Especialidad 1", doctor: "Dra. Valeria Mendoza", doctorId: "MED-001", patientId: "EST-2026-001", patientName: "Daniela Rojas", date: DEMO_TODAY, weekday: "Hoy", time: "14:30", modality: "Teleconsulta", status: "CONFIRMED", createdAt: "2026-09-01T10:00:00.000Z", careType: "TYPE_B" },
  { id: "CIT-2026-010", slotId: "CURRENT-010", specialty: "Especialidad 2", doctor: "Dr. Andrés Flores", doctorId: "MED-002", patientId: "EST-2026-002", patientName: "Estudiante B.", date: DEMO_TODAY, weekday: "Hoy", time: "11:00", modality: "Presencial", status: "CONFIRMED", location: "Consultorio B-14", createdAt: "2026-09-01T10:00:00.000Z" },
  { id: "CIT-2026-011", slotId: "CURRENT-011", specialty: "Especialidad 3", doctor: "Dra. Camila Torres", doctorId: "MED-003", patientId: "EST-2026-003", patientName: "Estudiante C.", date: DEMO_TODAY, weekday: "Hoy", time: "11:30", modality: "Teleconsulta", status: "CONFIRMED", createdAt: "2026-09-01T10:00:00.000Z" },
  { id: "CIT-2026-012", slotId: "CURRENT-012", specialty: "Especialidad 4", doctor: "Dr. Mateo Silva", doctorId: "MED-004", patientId: "EST-2026-004", patientName: "Estudiante D.", date: DEMO_TODAY, weekday: "Hoy", time: "12:00", modality: "Presencial", status: "CONFIRMED", location: "Consultorio C-02", createdAt: "2026-09-01T10:00:00.000Z" },
  { id: "CIT-2026-009", slotId: "CURRENT-009", specialty: "Especialidad 1", doctor: "Dra. Valeria Mendoza", doctorId: "MED-001", patientId: "EST-2026-005", patientName: "Estudiante E.", date: DEMO_TODAY, weekday: "Hoy", time: "10:00", modality: "Presencial", status: "CONFIRMED", location: "Consultorio B-12", createdAt: "2026-09-01T10:00:00.000Z" },
];

export const INITIAL_QUEUE: MockQueueEntry[] = [
  { id: "COL-2026-002", appointmentId: "CIT-DEMO-002", patientName: "Estudiante B.", doctorId: "MED-001", specialty: "Especialidad 1", scheduledTime: "11:00", checkedInAt: "2026-09-10T10:42:00.000Z", updatedAt: "2026-09-10T10:42:00.000Z", demand: "Media", estimatedWait: "15–25 min", status: "WAITING" },
  { id: "COL-2026-003", appointmentId: "CIT-DEMO-003", patientName: "Estudiante C.", doctorId: "MED-001", specialty: "Especialidad 1", scheduledTime: "11:30", checkedInAt: "2026-09-10T10:48:00.000Z", updatedAt: "2026-09-10T10:48:00.000Z", demand: "Media", estimatedWait: "25–35 min", status: "WAITING" },
  { id: "COL-2026-010", appointmentId: "CIT-2026-010", patientName: "Estudiante B.", doctorId: "MED-002", specialty: "Especialidad 2", scheduledTime: "11:00", checkedInAt: "2026-09-10T10:35:00.000Z", updatedAt: "2026-09-10T10:45:00.000Z", demand: "Media", estimatedWait: "En atención", status: "IN_SERVICE" },
  { id: "COL-2026-011", appointmentId: "CIT-2026-011", patientName: "Estudiante C.", doctorId: "MED-003", specialty: "Especialidad 3", scheduledTime: "11:30", checkedInAt: "2026-09-10T10:40:00.000Z", updatedAt: "2026-09-10T10:50:00.000Z", demand: "Baja", estimatedWait: "En atención", status: "IN_SERVICE" },
  { id: "COL-2026-012", appointmentId: "CIT-2026-012", patientName: "Estudiante D.", doctorId: "MED-004", specialty: "Especialidad 4", scheduledTime: "12:00", checkedInAt: "2026-09-10T10:45:00.000Z", updatedAt: "2026-09-10T10:55:00.000Z", demand: "Media", estimatedWait: "En atención", status: "IN_SERVICE" },
  { id: "COL-2026-009", appointmentId: "CIT-2026-009", patientName: "Estudiante E.", doctorId: "MED-001", specialty: "Especialidad 1", scheduledTime: "10:00", checkedInAt: "2026-09-10T09:55:00.000Z", updatedAt: "2026-09-10T10:05:00.000Z", demand: "Media", estimatedWait: "En atención", status: "IN_SERVICE" },
];

export const INITIAL_CLINICAL_ENCOUNTERS: MockClinicalEncounter[] = [
  { id: "ENC-2026-001", queueId: "HISTORY-001", appointmentId: "CIT-2026-002", doctorId: "MED-002", patientId: "EST-2026-001", specialty: "Especialidad 2", status: "FINALIZED", startedAt: "2026-08-21T09:00:00.000Z", updatedAt: "2026-08-21T09:22:00.000Z", endedAt: "2026-08-21T09:22:00.000Z", formData: { motivo: "Seguimiento programado", plan: "Control según indicación" } },
  { id: "ENC-2026-002", queueId: "HISTORY-002", appointmentId: "CIT-2026-003", doctorId: "MED-001", patientId: "EST-2026-001", specialty: "Especialidad 1", status: "FINALIZED", startedAt: "2026-08-15T11:30:00.000Z", updatedAt: "2026-08-15T11:55:00.000Z", endedAt: "2026-08-15T11:55:00.000Z", formData: { motivo: "Consulta previa", plan: "Seguimiento de rutina" } },
];

export const MOCK_MEDICAL_AGENDA: MockAgendaItem[] = [
  { id: "AGEN-001", doctorId: "MED-001", date: DEMO_TODAY, weekday: "Miércoles 10 de septiembre", startTime: "09:00", endTime: "09:30", title: "Control programado", kind: "APPOINTMENT", modality: "Presencial", patientName: "Estudiante A.", status: "Confirmada" },
  { id: "AGEN-002", doctorId: "MED-001", date: DEMO_TODAY, weekday: "Miércoles 10 de septiembre", startTime: "10:30", endTime: "11:00", title: "Consulta de seguimiento", kind: "APPOINTMENT", modality: "Presencial", appointmentId: "CIT-2026-001", patientName: "Daniela Rojas", status: "Confirmada" },
  { id: "AGEN-003", doctorId: "MED-001", date: DEMO_TODAY, weekday: "Miércoles 10 de septiembre", startTime: "12:00", endTime: "13:00", title: "Bloque administrativo", kind: "BLOCKED", status: "Bloqueado" },
  { id: "AGEN-004", doctorId: "MED-001", date: DEMO_TODAY, weekday: "Miércoles 10 de septiembre", startTime: "14:30", endTime: "15:00", title: "Teleconsulta de seguimiento", kind: "APPOINTMENT", modality: "Teleconsulta", patientName: "Estudiante D.", status: "Confirmada" },
  { id: "AGEN-010", doctorId: "MED-001", date: DEMO_TODAY, weekday: "Miércoles 10 de septiembre", startTime: "10:00", endTime: "10:30", title: "Horario disponible", kind: "PUBLISHED_SLOT", modality: "Presencial", status: "Disponible" },
  { id: "AGEN-011", doctorId: "MED-001", date: DEMO_TODAY, weekday: "Miércoles 10 de septiembre", startTime: "15:00", endTime: "15:30", title: "Horario disponible", kind: "PUBLISHED_SLOT", modality: "Presencial", status: "Disponible" },
  { id: "AGEN-005", doctorId: "MED-001", date: "2026-09-11", weekday: "Jueves 11 de septiembre", startTime: "09:00", endTime: "09:30", title: "Horario publicado", kind: "PUBLISHED_SLOT", modality: "Presencial", status: "Disponible" },
  { id: "AGEN-006", doctorId: "MED-001", date: "2026-09-11", weekday: "Jueves 11 de septiembre", startTime: "10:00", endTime: "10:30", title: "Reunión de equipo", kind: "BLOCKED", status: "Bloqueado" },
  { id: "AGEN-007", doctorId: "MED-001", date: "2026-09-12", weekday: "Viernes 12 de septiembre", startTime: "11:00", endTime: "11:30", title: "Horario publicado", kind: "PUBLISHED_SLOT", modality: "Teleconsulta", status: "Disponible" },
  { id: "AGEN-008", doctorId: "MED-001", date: "2026-09-15", weekday: "Lunes 15 de septiembre", startTime: "09:00", endTime: "09:30", title: "Horario publicado", kind: "PUBLISHED_SLOT", modality: "Presencial", status: "Disponible" },
  { id: "AGEN-009", doctorId: "MED-001", date: "2026-09-15", weekday: "Lunes 15 de septiembre", startTime: "14:30", endTime: "15:00", title: "Teleconsulta publicada", kind: "PUBLISHED_SLOT", modality: "Teleconsulta", status: "Disponible" },
];

export function getMockSlot(slotId: string | null) {
  return MOCK_SLOTS.find((slot) => slot.id === slotId);
}

export function getMockPatient(patientId: string | undefined) {
  return MOCK_PATIENTS.find((patient) => patient.id === patientId);
}
