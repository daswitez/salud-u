import type {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  ClinicalDocument,
  ClinicalDocumentStatus,
  ClinicalDocumentType,
  ClinicalEncounter,
  ClinicalHistory,
  ClinicalIntake,
  ClinicalRole,
  Diagnosis,
  Measurement,
  Patient,
  Referral,
  ReferralStatus,
  ReportFilter,
  Specialty,
} from "@/lib/ui-contracts";

export type ClinicalDemoProfessional = {
  id: string;
  fullName: string;
  role: Extract<ClinicalRole, "REVIEW_DOCTOR" | "SPECIALIST">;
  specialty?: Specialty;
};

export type ClinicalDemoState = {
  patients: Patient[];
  histories: ClinicalHistory[];
  encounters: ClinicalEncounter[];
  diagnoses: Diagnosis[];
  measurements: Measurement[];
  documents: ClinicalDocument[];
  referrals: Referral[];
  appointments: Appointment[];
  professionals: ClinicalDemoProfessional[];
};

export type ClinicalStoreFailure = { ok: false; code: "CONFLICT" | "NOT_FOUND" | "VALIDATION"; message: string };
export type ClinicalStoreSuccess<T> = { ok: true; data: T };
export type ClinicalStoreResult<T> = ClinicalStoreSuccess<T> | ClinicalStoreFailure;

const STORAGE_KEY = "salud-universitaria-clinical-demo-v3";
const NOW = "2026-09-17T10:00:00.000Z";

export const CLINICAL_DEMO_SEED: ClinicalDemoState = {
  professionals: [
    { id: "DOC-REV-001", fullName: "Dra. Valeria Mendoza", role: "REVIEW_DOCTOR" },
    { id: "DOC-DER-001", fullName: "Dra. Sofía Álvarez", role: "SPECIALIST", specialty: "DERMATOLOGY" },
    { id: "DOC-OFT-001", fullName: "Dr. Andrés Flores", role: "SPECIALIST", specialty: "OPHTHALMOLOGY" },
    { id: "DOC-INT-001", fullName: "Dra. Camila Torres", role: "SPECIALIST", specialty: "INTERNAL_MEDICINE" },
    { id: "DOC-URO-001", fullName: "Dr. Mateo Silva", role: "SPECIALIST", specialty: "UROLOGY" },
  ],
  patients: [
    { id: "PAT-2026-001", carnet: "12345678", registrationCode: "REG-2026-001", fullName: "Daniela Rojas", birthDate: "2003-05-14", career: "Ingeniería de Sistemas", email: "daniela.rojas@demo.com", phone: "+591 700 123 45", academicStatus: "ACTIVE", isRecurrent: false, createdAt: NOW, updatedAt: NOW },
    { id: "PAT-2026-002", carnet: "12345679", registrationCode: "REG-2026-002", fullName: "Mateo Flores", birthDate: "2001-11-03", career: "Medicina", email: "mateo.flores@demo.com", phone: "+591 700 123 46", academicStatus: "ACTIVE", isRecurrent: true, createdAt: NOW, updatedAt: NOW },
    { id: "PAT-2026-003", carnet: "12345680", registrationCode: "REG-2026-003", fullName: "Lucía Quispe", birthDate: "2004-02-19", career: "Derecho", email: "lucia.quispe@demo.com", phone: "+591 700 123 47", academicStatus: "ACTIVE", isRecurrent: false, createdAt: NOW, updatedAt: NOW },
    { id: "PAT-2026-004", carnet: "12345681", registrationCode: "REG-2026-004", fullName: "Andrés Mamani", birthDate: "2002-07-30", career: "Arquitectura", email: "andres.mamani@demo.com", phone: "+591 700 123 48", academicStatus: "ACTIVE", isRecurrent: false, createdAt: NOW, updatedAt: NOW },
  ],
  histories: [
    { id: "HIS-2026-001", patientId: "PAT-2026-001", createdAt: "2026-09-10T10:30:00.000Z", createdBy: "DOC-REV-001", intake: { allergies: "Penicilina", relevantHistory: "Apendicectomía (2018)", chronicConditions: "Ninguna", currentMedications: "Ninguna", emergencyContact: "Madre: 70011122", updatedAt: "2026-09-10T10:30:00.000Z", updatedBy: "ADMIN-001" } },
    { id: "HIS-2026-002", patientId: "PAT-2026-002", createdAt: "2025-03-10T10:30:00.000Z", createdBy: "DOC-REV-001" },
    { id: "HIS-2026-003", patientId: "PAT-2026-003", createdAt: "2026-09-14T11:00:00.000Z", createdBy: "DOC-REV-001" },
    { id: "HIS-2026-004", patientId: "PAT-2026-004", createdAt: "2026-09-16T09:15:00.000Z", createdBy: "DOC-REV-001" },
  ],
  appointments: [
    { id: "APT-2026-001", patientId: "PAT-2026-001", type: "INITIAL", status: "ATTENDED", capacityId: "CAP-REV-001", requestedBy: "ADMIN-001", assignedDoctorId: "DOC-REV-001", scheduledFor: "2026-09-10T10:30:00.000Z", createdAt: "2026-09-09T10:00:00.000Z", updatedAt: "2026-09-10T11:10:00.000Z" },
    { id: "APT-2026-002", patientId: "PAT-2026-002", type: "INITIAL", status: "ATTENDED", capacityId: "CAP-REV-002", requestedBy: "ADMIN-001", assignedDoctorId: "DOC-REV-001", scheduledFor: "2025-03-10T09:00:00.000Z", createdAt: "2025-03-09T10:00:00.000Z", updatedAt: "2025-03-10T09:30:00.000Z" },
    { id: "APT-2026-003", patientId: "PAT-2026-002", type: "INITIAL", status: "ATTENDED", capacityId: "CAP-REV-003", requestedBy: "ADMIN-001", assignedDoctorId: "DOC-REV-001", scheduledFor: "2026-08-21T09:00:00.000Z", createdAt: "2026-08-20T10:00:00.000Z", updatedAt: "2026-08-21T09:30:00.000Z" },
    { id: "APT-2026-004", patientId: "PAT-2026-003", type: "INITIAL", status: "ATTENDED", capacityId: "CAP-REV-004", requestedBy: "ADMIN-001", assignedDoctorId: "DOC-REV-001", scheduledFor: "2026-09-14T11:00:00.000Z", createdAt: "2026-09-13T10:00:00.000Z", updatedAt: "2026-09-14T11:35:00.000Z" },
    { id: "APT-2026-005", patientId: "PAT-2026-004", type: "INITIAL", status: "ATTENDED", capacityId: "CAP-REV-005", requestedBy: "ADMIN-001", assignedDoctorId: "DOC-REV-001", scheduledFor: "2026-09-16T09:15:00.000Z", createdAt: "2026-09-15T10:00:00.000Z", updatedAt: "2026-09-16T09:50:00.000Z" },
    { id: "APT-2026-006", patientId: "PAT-2026-004", type: "REFERRAL", status: "SCHEDULED", capacityId: "CAP-OFT-001", requestedBy: "ADMIN-001", assignedDoctorId: "DOC-OFT-001", referralId: "REF-2026-002", scheduledFor: "2026-09-21T09:00:00.000Z", createdAt: "2026-09-16T10:00:00.000Z", updatedAt: "2026-09-16T10:00:00.000Z" },
    { id: "APT-2026-007", patientId: "PAT-2026-001", type: "INITIAL", status: "SCHEDULED", capacityId: "CAP-REV-006", requestedBy: "ADMIN-001", assignedDoctorId: "DOC-REV-001", scheduledFor: "2026-09-17T14:30:00.000Z", createdAt: "2026-09-17T08:00:00.000Z", updatedAt: "2026-09-17T08:00:00.000Z" },
    { id: "APT-2026-008", patientId: "PAT-2026-003", type: "INITIAL", status: "SCHEDULED", capacityId: "CAP-REV-007", requestedBy: "ADMIN-001", assignedDoctorId: "DOC-REV-001", scheduledFor: "2026-09-17T15:00:00.000Z", createdAt: "2026-09-17T08:15:00.000Z", updatedAt: "2026-09-17T08:15:00.000Z" },
  ],
  encounters: [
    { id: "ENC-2026-001", historyId: "HIS-2026-001", patientId: "PAT-2026-001", appointmentId: "APT-2026-001", doctorId: "DOC-REV-001", type: "INITIAL", status: "CLOSED", occurredAt: "2026-09-10T10:30:00.000Z", chiefComplaint: "Lesiones cutáneas persistentes", assessment: "Evaluación inicial con hallazgos que requieren valoración dermatológica.", instructions: "Presentar resultados adjuntos en la atención especializada.", bloodChemistryStatus: "ATTACHED", closedAt: "2026-09-10T11:10:00.000Z" },
    { id: "ENC-2026-002", historyId: "HIS-2026-002", patientId: "PAT-2026-002", appointmentId: "APT-2026-002", doctorId: "DOC-REV-001", type: "INITIAL", status: "CLOSED", occurredAt: "2025-03-10T09:00:00.000Z", chiefComplaint: "Control médico institucional", assessment: "Atención inicial sin derivación requerida.", instructions: "Seguimiento general si aparecen nuevos síntomas.", bloodChemistryStatus: "NOT_PRESENTED", closedAt: "2025-03-10T09:30:00.000Z" },
    { id: "ENC-2026-003", historyId: "HIS-2026-002", patientId: "PAT-2026-002", appointmentId: "APT-2026-003", doctorId: "DOC-REV-001", type: "INITIAL", status: "CLOSED", occurredAt: "2026-08-21T09:00:00.000Z", chiefComplaint: "Seguimiento de paciente recurrente", assessment: "Control de evolución y actualización de indicaciones.", instructions: "Continuar con las indicaciones previamente registradas.", bloodChemistryStatus: "NOT_PRESENTED", closedAt: "2026-08-21T09:30:00.000Z" },
    { id: "ENC-2026-004", historyId: "HIS-2026-003", patientId: "PAT-2026-003", appointmentId: "APT-2026-004", doctorId: "DOC-REV-001", type: "INITIAL", status: "CLOSED", occurredAt: "2026-09-14T11:00:00.000Z", chiefComplaint: "Consulta general", assessment: "Caso resuelto en revisión estudiantil.", instructions: "Volver a consulta si el malestar persiste.", bloodChemistryStatus: "NOT_PRESENTED", closedAt: "2026-09-14T11:35:00.000Z" },
    { id: "ENC-2026-005", historyId: "HIS-2026-004", patientId: "PAT-2026-004", appointmentId: "APT-2026-005", doctorId: "DOC-REV-001", type: "INITIAL", status: "CLOSED", occurredAt: "2026-09-16T09:15:00.000Z", chiefComplaint: "Dificultad visual reportada", assessment: "Requiere valoración por Oftalmología.", instructions: "Presentar el estudio adjunto en la atención especializada.", bloodChemistryStatus: "PENDING", closedAt: "2026-09-16T09:50:00.000Z" },
  ],
  diagnoses: [
    { id: "DIA-2026-001", encounterId: "ENC-2026-001", code: "DERM-OBS", label: "Lesión cutánea en evaluación", note: "Derivación a Dermatología.", createdAt: "2026-09-10T11:00:00.000Z" },
    { id: "DIA-2026-002", encounterId: "ENC-2026-002", code: "GEN-CONTROL", label: "Control médico general", createdAt: "2025-03-10T09:20:00.000Z" },
    { id: "DIA-2026-003", encounterId: "ENC-2026-003", code: "GEN-SEGUIMIENTO", label: "Seguimiento clínico", createdAt: "2026-08-21T09:20:00.000Z" },
    { id: "DIA-2026-004", encounterId: "ENC-2026-004", code: "GEN-RESUELTO", label: "Consulta general resuelta", createdAt: "2026-09-14T11:20:00.000Z" },
    { id: "DIA-2026-005", encounterId: "ENC-2026-005", code: "OFT-OBS", label: "Alteración visual en evaluación", note: "Derivación a Oftalmología.", createdAt: "2026-09-16T09:40:00.000Z" },
  ],
  measurements: [
    { id: "MEA-2026-001", encounterId: "ENC-2026-001", type: "WEIGHT", value: 58, unit: "kg", measuredAt: "2026-09-10T10:45:00.000Z" },
    { id: "MEA-2026-002", encounterId: "ENC-2026-002", type: "WEIGHT", value: 72, unit: "kg", measuredAt: "2025-03-10T09:10:00.000Z" },
    { id: "MEA-2026-003", encounterId: "ENC-2026-003", type: "WEIGHT", value: 71.5, unit: "kg", measuredAt: "2026-08-21T09:10:00.000Z" },
    { id: "MEA-2026-004", encounterId: "ENC-2026-004", type: "WEIGHT", value: 60, unit: "kg", measuredAt: "2026-09-14T11:10:00.000Z" },
    { id: "MEA-2026-005", encounterId: "ENC-2026-005", type: "WEIGHT", value: 67, unit: "kg", measuredAt: "2026-09-16T09:25:00.000Z" },
  ],
  documents: [
    { id: "DOC-2026-001", patientId: "PAT-2026-001", encounterId: "ENC-2026-001", type: "BLOOD_CHEMISTRY", status: "AVAILABLE", fileName: "quimica-sanguinea-demo.pdf", mimeType: "application/pdf", sizeBytes: 240000, studyDate: "2026-09-08", description: "Resultado de química sanguínea presentado durante la atención inicial.", tags: ["química sanguínea", "laboratorio"], uploadedBy: "DOC-REV-001", uploadedAt: "2026-09-10T10:55:00.000Z" },
    { id: "DOC-2026-002", patientId: "PAT-2026-004", encounterId: "ENC-2026-005", type: "RADIOGRAPH", status: "AVAILABLE", fileName: "estudio-visual-demo.jpg", mimeType: "image/jpeg", sizeBytes: 1840000, studyDate: "2026-09-14", description: "Fotografía de estudio presentada para valoración oftalmológica.", tags: ["imagen", "oftalmología"], uploadedBy: "DOC-REV-001", uploadedAt: "2026-09-16T09:42:00.000Z" },
  ],
  referrals: [
    { id: "REF-2026-001", patientId: "PAT-2026-001", sourceEncounterId: "ENC-2026-001", specialty: "DERMATOLOGY", reason: "Evaluación de lesión cutánea persistente.", commentForSpecialist: "Se adjunta química sanguínea y antecedentes de la atención inicial.", diagnosisIds: ["DIA-2026-001"], documentIds: ["DOC-2026-001"], status: "ASSIGNED", requestedBy: "DOC-REV-001", assignedDoctorId: "DOC-DER-001", createdAt: "2026-09-10T11:05:00.000Z", updatedAt: "2026-09-11T08:00:00.000Z" },
    { id: "REF-2026-002", patientId: "PAT-2026-004", sourceEncounterId: "ENC-2026-005", specialty: "OPHTHALMOLOGY", reason: "Valoración de alteración visual reportada.", commentForSpecialist: "Revisar fotografía de estudio y confirmar conducta de seguimiento.", diagnosisIds: ["DIA-2026-005"], documentIds: ["DOC-2026-002"], status: "PENDING_ASSIGNMENT", requestedBy: "DOC-REV-001", createdAt: "2026-09-16T09:50:00.000Z", updatedAt: "2026-09-16T09:50:00.000Z" },
  ],
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function initialState() {
  return clone(CLINICAL_DEMO_SEED);
}

function readState(): ClinicalDemoState {
  if (typeof window === "undefined") return initialState();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState();
    const parsed = JSON.parse(saved) as Partial<ClinicalDemoState>;
    const seed = initialState();
    return {
      patients: parsed.patients ?? seed.patients,
      histories: parsed.histories ?? seed.histories,
      encounters: parsed.encounters ?? seed.encounters,
      diagnoses: parsed.diagnoses ?? seed.diagnoses,
      measurements: parsed.measurements ?? seed.measurements,
      documents: parsed.documents ?? seed.documents,
      referrals: parsed.referrals ?? seed.referrals,
      appointments: parsed.appointments ?? seed.appointments,
      professionals: parsed.professionals ?? seed.professionals,
    };
  } catch {
    return initialState();
  }
}

function writeState(state: ClinicalDemoState) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextId(prefix: string, existing: { id: string }[]) {
  return `${prefix}-${String(existing.length + 1).padStart(3, "0")}`;
}

function timestamp() {
  return new Date().toISOString();
}

export function getClinicalDemoState() {
  return readState();
}

export function resetClinicalDemoState() {
  const state = initialState();
  writeState(state);
  return state;
}

export function getClinicalPatient(patientId: string) {
  return readState().patients.find((patient) => patient.id === patientId);
}

export function findPatientByIdentity(carnet: string, registrationCode: string) {
  const normalizedCarnet = carnet.trim();
  const normalizedCode = registrationCode.trim();
  return readState().patients.find((patient) => patient.carnet === normalizedCarnet || patient.registrationCode === normalizedCode);
}

export function searchClinicalPatients(query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return readState().patients;
  return readState().patients.filter((patient) => [patient.carnet, patient.registrationCode, patient.fullName].some((value) => value.toLocaleLowerCase().includes(normalized)));
}

export function getClinicalHistory(patientId: string) {
  const state = readState();
  return state.histories.find((history) => history.patientId === patientId);
}

export function updateClinicalIntake(patientId: string, input: Omit<ClinicalIntake, "updatedAt" | "updatedBy">, updatedBy: string): ClinicalStoreResult<ClinicalHistory> {
  const state = readState();
  const history = state.histories.find((item) => item.patientId === patientId);
  if (!history) return { ok: false, code: "NOT_FOUND", message: "No se encontró la historia clínica del estudiante." };
  const intake: ClinicalIntake = { allergies: input.allergies?.trim(), chronicConditions: input.chronicConditions?.trim(), currentMedications: input.currentMedications?.trim(), relevantHistory: input.relevantHistory?.trim(), emergencyContact: input.emergencyContact?.trim(), updatedAt: timestamp(), updatedBy };
  const updated = { ...history, intake };
  writeState({ ...state, histories: state.histories.map((item) => item.id === history.id ? updated : item) });
  return { ok: true, data: updated };
}

export function getPatientClinicalSnapshot(patientId: string) {
  const state = readState();
  const history = state.histories.find((item) => item.patientId === patientId);
  const encounters = state.encounters.filter((item) => item.patientId === patientId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const encounterIds = new Set(encounters.map((item) => item.id));
  return {
    patient: state.patients.find((item) => item.id === patientId),
    history,
    encounters,
    diagnoses: state.diagnoses.filter((item) => encounterIds.has(item.encounterId)),
    measurements: state.measurements.filter((item) => encounterIds.has(item.encounterId)),
    documents: state.documents.filter((item) => item.patientId === patientId),
    referrals: state.referrals.filter((item) => item.patientId === patientId),
    appointments: state.appointments.filter((item) => item.patientId === patientId),
  };
}

export function createClinicalPatient(input: Omit<Patient, "id" | "createdAt" | "updatedAt">, createdBy = "ADMIN-001"): ClinicalStoreResult<{ patient: Patient; history: ClinicalHistory }> {
  const state = readState();
  const carnet = input.carnet.trim();
  const registrationCode = input.registrationCode.trim();
  if (!carnet || !registrationCode || !input.fullName.trim() || !input.career.trim()) return { ok: false, code: "VALIDATION", message: "Carnet, código de registro, nombre completo y carrera son obligatorios." };
  if (state.patients.some((patient) => patient.carnet === carnet || patient.registrationCode === registrationCode)) return { ok: false, code: "CONFLICT", message: "Ya existe un paciente con ese carnet o código de registro." };
  const now = timestamp();
  const patient: Patient = { ...input, id: nextId("PAT-NEW", state.patients), carnet, registrationCode, fullName: input.fullName.trim(), career: input.career.trim(), createdAt: now, updatedAt: now };
  const history: ClinicalHistory = { id: nextId("HIS-NEW", state.histories), patientId: patient.id, createdAt: now, createdBy };
  writeState({ ...state, patients: [...state.patients, patient], histories: [...state.histories, history] });
  return { ok: true, data: { patient, history } };
}

export type AdministrativePatientUpdate = Pick<Patient, "fullName" | "birthDate" | "career" | "email" | "phone" | "academicStatus" | "isRecurrent">;

export function updateAdministrativePatient(patientId: string, input: AdministrativePatientUpdate): ClinicalStoreResult<Patient> {
  const state = readState();
  const patient = state.patients.find((item) => item.id === patientId);
  if (!patient) return { ok: false, code: "NOT_FOUND", message: "No se encontró el estudiante solicitado." };
  if (!input.fullName.trim() || !input.career.trim()) return { ok: false, code: "VALIDATION", message: "Nombre completo y carrera son obligatorios." };
  const updated: Patient = {
    ...patient,
    ...input,
    fullName: input.fullName.trim(),
    career: input.career.trim(),
    email: input.email?.trim(),
    phone: input.phone?.trim(),
    updatedAt: timestamp(),
  };
  writeState({ ...state, patients: state.patients.map((item) => item.id === patientId ? updated : item) });
  return { ok: true, data: updated };
}

export function createClinicalEncounter(input: Omit<ClinicalEncounter, "id" | "historyId" | "status" | "occurredAt"> & { occurredAt?: string }): ClinicalStoreResult<ClinicalEncounter> {
  const state = readState();
  const history = state.histories.find((item) => item.patientId === input.patientId);
  if (!history) return { ok: false, code: "NOT_FOUND", message: "El paciente no tiene una historia clínica disponible." };
  if (!input.chiefComplaint.trim()) return { ok: false, code: "VALIDATION", message: "El motivo de consulta es obligatorio." };
  const encounter: ClinicalEncounter = { ...input, id: nextId("ENC-NEW", state.encounters), historyId: history.id, status: "DRAFT", occurredAt: input.occurredAt ?? timestamp(), chiefComplaint: input.chiefComplaint.trim() };
  writeState({ ...state, encounters: [...state.encounters, encounter] });
  return { ok: true, data: encounter };
}

export function updateClinicalEncounter(encounterId: string, doctorId: string, updates: Partial<Pick<ClinicalEncounter, "chiefComplaint" | "assessment" | "instructions" | "bloodChemistryStatus" | "specialtyData">>): ClinicalStoreResult<ClinicalEncounter> {
  const state = readState();
  const encounter = state.encounters.find((item) => item.id === encounterId && item.doctorId === doctorId);
  if (!encounter) return { ok: false, code: "NOT_FOUND", message: "No se encontró una atención editable para el profesional." };
  if (encounter.status !== "DRAFT") return { ok: false, code: "CONFLICT", message: "La atención ya fue cerrada y no puede ser modificada directamente." };
  
  if (updates.chiefComplaint !== undefined && !updates.chiefComplaint.trim()) {
    return { ok: false, code: "VALIDATION", message: "El motivo de consulta es obligatorio." };
  }

  const updated: ClinicalEncounter = { ...encounter, ...updates };
  if (updates.chiefComplaint !== undefined) updated.chiefComplaint = updates.chiefComplaint.trim();
  
  writeState({ ...state, encounters: state.encounters.map((item) => item.id === encounterId ? updated : item) });
  return { ok: true, data: updated };
}

export function addDiagnosis(encounterId: string, input: Omit<Diagnosis, "id" | "encounterId" | "createdAt">): ClinicalStoreResult<Diagnosis> {
  const state = readState();
  if (!state.encounters.some((encounter) => encounter.id === encounterId)) return { ok: false, code: "NOT_FOUND", message: "No se encontró la atención clínica." };
  if (!input.label.trim()) return { ok: false, code: "VALIDATION", message: "El diagnóstico o etiqueta es obligatorio." };
  const diagnosis: Diagnosis = { ...input, id: nextId("DIA-NEW", state.diagnoses), encounterId, label: input.label.trim(), createdAt: timestamp() };
  writeState({ ...state, diagnoses: [...state.diagnoses, diagnosis] });
  return { ok: true, data: diagnosis };
}

export function addMeasurement(encounterId: string, input: Omit<Measurement, "id" | "encounterId">): ClinicalStoreResult<Measurement> {
  const state = readState();
  if (!state.encounters.some((encounter) => encounter.id === encounterId)) return { ok: false, code: "NOT_FOUND", message: "No se encontró la atención clínica." };
  if (!Number.isFinite(input.value) || !input.unit.trim()) return { ok: false, code: "VALIDATION", message: "La medición debe tener valor y unidad válidos." };
  const measurement: Measurement = { ...input, id: nextId("MEA-NEW", state.measurements), encounterId, unit: input.unit.trim() };
  writeState({ ...state, measurements: [...state.measurements, measurement] });
  return { ok: true, data: measurement };
}

export function addClinicalDocument(input: Omit<ClinicalDocument, "id" | "uploadedAt">): ClinicalStoreResult<ClinicalDocument> {
  const state = readState();
  if (!state.patients.some((patient) => patient.id === input.patientId)) return { ok: false, code: "NOT_FOUND", message: "No se encontró el paciente para el adjunto." };
  if (input.encounterId && !state.encounters.some((encounter) => encounter.id === input.encounterId && encounter.patientId === input.patientId)) return { ok: false, code: "NOT_FOUND", message: "La atención no corresponde al paciente seleccionado." };
  if (!input.fileName.trim() || !input.mimeType.trim() || input.sizeBytes <= 0) return { ok: false, code: "VALIDATION", message: "El adjunto debe incluir nombre, tipo de archivo y tamaño válido." };
  const document: ClinicalDocument = { ...input, id: nextId("DOC-NEW", state.documents), fileName: input.fileName.trim(), mimeType: input.mimeType.trim(), uploadedAt: timestamp() };
  const encounters = input.type === "BLOOD_CHEMISTRY" && input.encounterId ? state.encounters.map((encounter) => encounter.id === input.encounterId ? { ...encounter, bloodChemistryStatus: "ATTACHED" as const } : encounter) : state.encounters;
  writeState({ ...state, documents: [...state.documents, document], encounters });
  return { ok: true, data: document };
}

export function removeClinicalDocument(documentId: string): ClinicalStoreResult<{ success: true }> {
  const state = readState();
  const document = state.documents.find((doc) => doc.id === documentId);
  if (!document) return { ok: false, code: "NOT_FOUND", message: "Documento no encontrado." };
  
  writeState({ 
    ...state, 
    documents: state.documents.filter((doc) => doc.id !== documentId) 
  });
  return { ok: true, data: { success: true } };
}

export function closeClinicalEncounter(encounterId: string, doctorId: string): ClinicalStoreResult<ClinicalEncounter> {
  const state = readState();
  const encounter = state.encounters.find((item) => item.id === encounterId && item.doctorId === doctorId);
  if (!encounter) return { ok: false, code: "NOT_FOUND", message: "No se encontró una atención editable para el profesional." };
  if (encounter.status !== "DRAFT") return { ok: false, code: "CONFLICT", message: "La atención ya fue cerrada y solo admite una adenda." };
  const updated: ClinicalEncounter = { ...encounter, status: "CLOSED", closedAt: timestamp() };
  const appointments = encounter.appointmentId ? state.appointments.map((appointment) => appointment.id === encounter.appointmentId ? { ...appointment, status: "ATTENDED" as const, updatedAt: updated.closedAt! } : appointment) : state.appointments;
  writeState({ ...state, encounters: state.encounters.map((item) => item.id === encounterId ? updated : item), appointments });
  return { ok: true, data: updated };
}

export function createClinicalReferral(input: Omit<Referral, "id" | "createdAt" | "updatedAt" | "status" | "requestedBy"> & { requestedBy: string }): ClinicalStoreResult<Referral> {
  const state = readState();
  const source = state.encounters.find((encounter) => encounter.id === input.sourceEncounterId && encounter.patientId === input.patientId);
  if (!source) return { ok: false, code: "NOT_FOUND", message: "La atención de origen no corresponde al paciente." };
  if (!input.reason.trim() || !input.commentForSpecialist.trim()) return { ok: false, code: "VALIDATION", message: "El motivo y comentario para el especialista son obligatorios." };
  const now = timestamp();
  const referral: Referral = { ...input, id: nextId("REF-NEW", state.referrals), reason: input.reason.trim(), commentForSpecialist: input.commentForSpecialist.trim(), status: input.assignedDoctorId ? "ASSIGNED" : "PENDING_ASSIGNMENT", createdAt: now, updatedAt: now };
  writeState({ ...state, referrals: [...state.referrals, referral] });
  return { ok: true, data: referral };
}

export function createClinicalAppointment(input: Omit<Appointment, "id" | "createdAt" | "updatedAt" | "status"> & { status?: AppointmentStatus }): ClinicalStoreResult<Appointment> {
  const state = readState();
  if (!state.patients.some((patient) => patient.id === input.patientId)) return { ok: false, code: "NOT_FOUND", message: "No se encontró el paciente para la cita." };
  if (input.type === "REFERRAL" && (!input.referralId || !state.referrals.some((referral) => referral.id === input.referralId && referral.patientId === input.patientId))) return { ok: false, code: "VALIDATION", message: "Una cita especializada debe estar vinculada a una derivación válida." };
  const now = timestamp();
  const appointment: Appointment = { ...input, id: nextId("APT-NEW", state.appointments), status: input.status ?? "REQUESTED", createdAt: now, updatedAt: now };
  writeState({ ...state, appointments: [...state.appointments, appointment] });
  return { ok: true, data: appointment };
}

/** Acciones de la gestión mínima de citas por cupo para revisión estudiantil. */
export function getClinicalAppointment(appointmentId: string) {
  return readState().appointments.find((appointment) => appointment.id === appointmentId);
}

export function getPatientClinicalAppointments(patientId: string) {
  return readState().appointments
    .filter((appointment) => appointment.patientId === patientId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function requestInitialClinicalAppointment(patientId: string, requestedBy: string): ClinicalStoreResult<Appointment> {
  const state = readState();
  if (!state.patients.some((patient) => patient.id === patientId)) return { ok: false, code: "NOT_FOUND", message: "No se encontró el estudiante para la solicitud." };
  const active = state.appointments.find((appointment) => appointment.patientId === patientId && appointment.type === "INITIAL" && (appointment.status === "REQUESTED" || appointment.status === "SCHEDULED"));
  if (active) return { ok: false, code: "CONFLICT", message: "Este estudiante ya tiene una solicitud o cita inicial activa." };
  return createClinicalAppointment({ patientId, type: "INITIAL", capacityId: "PENDING_CAPACITY", requestedBy, scheduledFor: timestamp(), status: "REQUESTED" });
}

export function scheduleInitialClinicalAppointment(appointmentId: string, capacity: { id: string; scheduledFor: string; doctorId: string }): ClinicalStoreResult<Appointment> {
  const state = readState();
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return { ok: false, code: "NOT_FOUND", message: "No se encontró la solicitud de cita." };
  if (appointment.type !== "INITIAL" || appointment.status !== "REQUESTED") return { ok: false, code: "CONFLICT", message: "Solo se puede asignar cupo a una solicitud inicial pendiente." };
  const updated: Appointment = { ...appointment, status: "SCHEDULED", capacityId: capacity.id, scheduledFor: capacity.scheduledFor, assignedDoctorId: capacity.doctorId, updatedAt: timestamp() };
  writeState({ ...state, appointments: state.appointments.map((item) => item.id === appointmentId ? updated : item) });
  return { ok: true, data: updated };
}

export function cancelInitialClinicalAppointment(appointmentId: string): ClinicalStoreResult<Appointment> {
  const state = readState();
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return { ok: false, code: "NOT_FOUND", message: "No se encontró la cita." };
  if (!(["REQUESTED", "SCHEDULED"] as AppointmentStatus[]).includes(appointment.status)) return { ok: false, code: "CONFLICT", message: "Esta cita ya no puede cancelarse." };
  const updated: Appointment = { ...appointment, status: "CANCELLED", updatedAt: timestamp() };
  writeState({ ...state, appointments: state.appointments.map((item) => item.id === appointmentId ? updated : item) });
  return { ok: true, data: updated };
}

export function markInitialClinicalAppointmentNoShow(appointmentId: string): ClinicalStoreResult<Appointment> {
  const state = readState();
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return { ok: false, code: "NOT_FOUND", message: "No se encontró la cita." };
  if (appointment.status !== "SCHEDULED") return { ok: false, code: "CONFLICT", message: "Solo una cita programada puede marcarse como inasistencia." };
  const updated: Appointment = { ...appointment, status: "NO_SHOW", updatedAt: timestamp() };
  writeState({ ...state, appointments: state.appointments.map((item) => item.id === appointmentId ? updated : item) });
  return { ok: true, data: updated };
}

/** Inicia el borrador clínico; la cita pasa a ATTENDED únicamente al cerrarlo. */
export function startInitialClinicalEncounter(appointmentId: string, doctorId: string): ClinicalStoreResult<ClinicalEncounter> {
  const state = readState();
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return { ok: false, code: "NOT_FOUND", message: "No se encontró la cita." };
  if (appointment.status !== "SCHEDULED" || appointment.type !== "INITIAL") return { ok: false, code: "CONFLICT", message: "La cita debe estar programada para iniciar una atención." };
  const existing = state.encounters.find((encounter) => encounter.appointmentId === appointmentId);
  if (existing) return { ok: true, data: existing };
  return createClinicalEncounter({ patientId: appointment.patientId, appointmentId, doctorId, type: "INITIAL", chiefComplaint: "Pendiente de evaluación en revisión estudiantil.", bloodChemistryStatus: "PENDING" });
}

export function startSpecialtyClinicalEncounter(referralId: string, doctorId: string, specialty: string): ClinicalStoreResult<ClinicalEncounter> {
  const state = readState();
  const referral = state.referrals.find((item) => item.id === referralId);
  if (!referral) return { ok: false, code: "NOT_FOUND", message: "No se encontró la derivación." };
  if (referral.status !== "ASSIGNED" && referral.status !== "PENDING_ASSIGNMENT") return { ok: false, code: "CONFLICT", message: "La derivación debe estar asignada o pendiente para iniciar la atención." };
  
  const existing = state.encounters.find((encounter) => encounter.referralId === referralId);
  if (existing) return { ok: true, data: existing };
  
  // Mark referral as IN_PROGRESS
  const updatedReferral: Referral = { ...referral, status: "IN_PROGRESS", updatedAt: timestamp() };
  
  // Create draft encounter
  const history = state.histories.find((item) => item.patientId === referral.patientId);
  if (!history) return { ok: false, code: "NOT_FOUND", message: "El paciente no tiene historia clínica." };
  
  const encounter: ClinicalEncounter = { 
    id: nextId("ENC-NEW", state.encounters),
    historyId: history.id,
    patientId: referral.patientId, 
    referralId, 
    doctorId, 
    type: "SPECIALTY", 
    specialty: specialty as any,
    status: "DRAFT",
    occurredAt: timestamp(),
    chiefComplaint: referral.reason,
    bloodChemistryStatus: "NOT_PRESENTED" 
  };

  writeState({ 
    ...state, 
    referrals: state.referrals.map((item) => item.id === referralId ? updatedReferral : item),
    encounters: [...state.encounters, encounter] 
  });
  
  return { ok: true, data: encounter };
}

export function markSpecialtyReferralNoShow(referralId: string): ClinicalStoreResult<Referral> {
  const state = readState();
  const referral = state.referrals.find((item) => item.id === referralId);
  if (!referral) return { ok: false, code: "NOT_FOUND", message: "No se encontró la derivación." };
  if (referral.status !== "ASSIGNED" && referral.status !== "PENDING_ASSIGNMENT") return { ok: false, code: "CONFLICT", message: "Solo una derivación asignada puede marcarse como inasistencia." };
  
  const updated: Referral = { ...referral, status: "RETURNED", closingNote: "Paciente no asistió a la cita de especialidad.", updatedAt: timestamp() };
  writeState({ ...state, referrals: state.referrals.map((item) => item.id === referralId ? updated : item) });
  return { ok: true, data: updated };
}

export function getClinicalReportRows(filter: ReportFilter = {}) {
  const state = readState();
  const patientById = new Map(state.patients.map((patient) => [patient.id, patient]));
  return state.encounters.filter((encounter) => {
    const patient = patientById.get(encounter.patientId);
    const withinDate = (!filter.from || encounter.occurredAt >= filter.from) && (!filter.to || encounter.occurredAt <= `${filter.to}T23:59:59.999Z`);
    const matchesDoctor = !filter.doctorId || encounter.doctorId === filter.doctorId;
    const matchesCareer = !filter.career || patient?.career === filter.career;
    const matchesSpecialty = !filter.specialty || encounter.specialty === filter.specialty;
    const matchesDiagnosis = !filter.diagnosisLabel || state.diagnoses.some((diagnosis) => diagnosis.encounterId === encounter.id && diagnosis.label.toLocaleLowerCase().includes(filter.diagnosisLabel!.toLocaleLowerCase()));
    return withinDate && matchesDoctor && matchesCareer && matchesSpecialty && matchesDiagnosis;
  }).map((encounter) => ({ encounter, patient: patientById.get(encounter.patientId), diagnoses: state.diagnoses.filter((diagnosis) => diagnosis.encounterId === encounter.id), referrals: state.referrals.filter((referral) => referral.sourceEncounterId === encounter.id) }));
}

export type { AppointmentType, ClinicalDocumentStatus, ClinicalDocumentType, ReferralStatus };
