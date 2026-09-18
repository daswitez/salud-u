/**
 * Adaptador temporal para pantallas aún no migradas.
 * La fuente de datos clínica es demo-clinical-store.ts; este archivo conserva
 * los contratos antiguos mientras se completan los bloques B2–B9.
 */
import { CLINICAL_DEMO_SEED } from "@/lib/demo-clinical-store";
import type { Appointment as ClinicalAppointment, Specialty } from "@/lib/ui-contracts";

export type Modality = "Presencial" | "Teleconsulta";
export type AppointmentStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type QueueStatus = "WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED";
export type ClinicalEncounterStatus = "DRAFT" | "FINALIZED";

export type MockSlot = { id: string; specialty: string; doctorId: string; doctor: string; date: string; weekday: string; time: string; modality: Modality; available: boolean; demand: "Baja" | "Media" | "Alta"; wait: string };
export type MockAppointment = { id: string; slotId: string; specialty: string; doctor: string; date: string; weekday: string; time: string; modality: Modality; status: AppointmentStatus; doctorId?: string; patientId?: string; patientName?: string; qrToken?: string; location?: string; createdAt: string; rescheduledFromId?: string; careType?: "TYPE_A" | "TYPE_B"; campaignName?: string };
export type MockPatient = { id: string; name: string; studentCode: string; career: string; email: string; phone: string; emergencyContact: string };
export type MockQueueEntry = { id: string; appointmentId: string; patientName: string; doctorId: string; specialty: string; scheduledTime: string; checkedInAt: string; updatedAt: string; demand: "Baja" | "Media" | "Alta"; estimatedWait: string; status: QueueStatus };
export type MockAgendaItem = { id: string; doctorId: string; date: string; weekday: string; startTime: string; endTime: string; title: string; kind: "APPOINTMENT" | "PUBLISHED_SLOT" | "BLOCKED"; modality?: Modality; appointmentId?: string; patientName?: string; status?: "Confirmada" | "Disponible" | "No disponible" | "Bloqueado" };
export type MockClinicalEncounter = { id: string; queueId: string; appointmentId: string; doctorId: string; patientId: string; specialty: string; status: ClinicalEncounterStatus; startedAt: string; updatedAt: string; endedAt?: string; formData: Record<string, string> };

export const DEMO_TODAY = "2026-09-17";
export type AppointmentHold = { slotId: string; expiresAt: number; rescheduleId?: string };

const specialtyLabel: Record<Specialty, string> = { DERMATOLOGY: "Dermatología", OPHTHALMOLOGY: "Oftalmología", INTERNAL_MEDICINE: "Medicina interna", UROLOGY: "Urología", GYNECOLOGY: "Ginecología" };

function appointmentStatus(status: ClinicalAppointment["status"]): AppointmentStatus {
  if (status === "ATTENDED") return "COMPLETED";
  if (status === "CANCELLED" || status === "NO_SHOW") return "CANCELLED";
  return "CONFIRMED";
}

function appointmentSpecialty(appointment: ClinicalAppointment) {
  if (appointment.type === "INITIAL") return "Revisión estudiantil";
  const referral = CLINICAL_DEMO_SEED.referrals.find((item) => item.id === appointment.referralId);
  return referral ? specialtyLabel[referral.specialty] : "Atención especializada";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return { date: value.slice(0, 10), weekday: date.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" }), time: value.slice(11, 16) };
}

export const MOCK_DOCTORS = CLINICAL_DEMO_SEED.professionals.map((professional) => ({
  id: professional.id,
  name: professional.fullName,
  specialty: professional.specialty ? specialtyLabel[professional.specialty] : "Revisión estudiantil",
  modalities: ["Presencial"] as Modality[],
}));

export const MOCK_PATIENTS: MockPatient[] = CLINICAL_DEMO_SEED.patients.map((patient) => ({
  id: patient.id,
  name: patient.fullName,
  studentCode: patient.registrationCode,
  career: patient.career,
  email: patient.email ?? "",
  phone: patient.phone ?? "",
  emergencyContact: "No registrado en datos demo",
}));

export const INITIAL_APPOINTMENTS: MockAppointment[] = CLINICAL_DEMO_SEED.appointments.map((appointment) => {
  const patient = CLINICAL_DEMO_SEED.patients.find((item) => item.id === appointment.patientId);
  const doctor = CLINICAL_DEMO_SEED.professionals.find((item) => item.id === appointment.assignedDoctorId);
  const formatted = formatDateTime(appointment.scheduledFor);
  return {
    id: appointment.id,
    slotId: appointment.capacityId,
    specialty: appointmentSpecialty(appointment),
    doctor: doctor?.fullName ?? "Por asignar",
    doctorId: appointment.assignedDoctorId,
    patientId: appointment.patientId,
    patientName: patient?.fullName,
    date: formatted.date,
    weekday: formatted.weekday,
    time: formatted.time,
    modality: "Presencial",
    status: appointmentStatus(appointment.status),
    createdAt: appointment.createdAt,
    careType: "TYPE_B",
  };
});

export const INITIAL_CLINICAL_ENCOUNTERS: MockClinicalEncounter[] = CLINICAL_DEMO_SEED.encounters.map((encounter) => ({
  id: encounter.id,
  queueId: `LEGACY-${encounter.id}`,
  appointmentId: encounter.appointmentId ?? "",
  doctorId: encounter.doctorId,
  patientId: encounter.patientId,
  specialty: encounter.specialty ? specialtyLabel[encounter.specialty] : "Revisión estudiantil",
  status: encounter.status === "DRAFT" ? "DRAFT" : "FINALIZED",
  startedAt: encounter.occurredAt,
  updatedAt: encounter.closedAt ?? encounter.occurredAt,
  endedAt: encounter.closedAt,
  formData: { motivo: encounter.chiefComplaint, evaluacion: encounter.assessment ?? "", plan: encounter.instructions ?? "" },
}));

/** @deprecated Las rutas de agenda/cola se migrarán en B2–B9. */
export const MOCK_SLOTS: MockSlot[] = [];
/** @deprecated La cola digital queda fuera del flujo clínico. */
export const INITIAL_QUEUE: MockQueueEntry[] = [];
/** @deprecated La agenda se reemplaza por Mis pacientes y Derivaciones. */
export const MOCK_MEDICAL_AGENDA: MockAgendaItem[] = [];

export const MOCK_ADMIN_DASHBOARD = {
  appointmentsToday: CLINICAL_DEMO_SEED.appointments.filter((appointment) => appointment.scheduledFor.startsWith(DEMO_TODAY)).length,
  activeDoctors: CLINICAL_DEMO_SEED.professionals.length,
  queuePatients: 0,
  waitlistEntries: 0,
  saturatedSpecialties: 0,
  demand: "No aplica",
  incidents: 0,
} as const;

export function getMockSlot(slotId: string | null) {
  return MOCK_SLOTS.find((slot) => slot.id === slotId);
}

export function getMockPatient(patientId: string | undefined) {
  return MOCK_PATIENTS.find((patient) => patient.id === patientId);
}
