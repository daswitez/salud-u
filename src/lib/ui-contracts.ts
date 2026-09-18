/**
 * Contratos compartidos entre la UI, los stores demo y los futuros endpoints.
 * Los identificadores y estados del dominio clínico se definen aquí para no
 * repartir texto libre ni reglas de permisos entre pantallas.
 */

export type ApiErrorCode = "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "EXPIRED" | "UNAUTHORIZED" | "NETWORK" | "UNAVAILABLE";
export type ApiError = { code: ApiErrorCode; message: string; recoverable: boolean; retryAfter?: number };
export type ApiSuccess<T> = { ok: true; data: T; requestId: string };
export type ApiFailure = { ok: false; error: ApiError; requestId: string };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type AsyncView<T> =
  | { state: "idle"; data?: T }
  | { state: "loading"; data?: T }
  | { state: "success"; data: T }
  | { state: "empty"; message: string; actionLabel?: string }
  | { state: "error"; error: ApiError; data?: T }
  | { state: "unauthorized"; message: string };

export const recoveryCopy: Record<ApiErrorCode, string> = {
  VALIDATION: "Revisa los datos indicados y vuelve a intentarlo.",
  NOT_FOUND: "El recurso ya no está disponible. Vuelve a la lista anterior.",
  CONFLICT: "El registro cambió mientras trabajabas. Actualiza los datos y vuelve a intentarlo.",
  EXPIRED: "La acción ya no está disponible. Vuelve a iniciar el proceso.",
  UNAUTHORIZED: "No tienes permisos para realizar esta acción.",
  NETWORK: "No pudimos conectarnos. Revisa tu conexión y vuelve a intentarlo.",
  UNAVAILABLE: "El servicio no está disponible temporalmente. Intenta nuevamente más tarde.",
};

export const CLINICAL_ROLES = ["ADMINISTRATIVE", "REVIEW_DOCTOR", "SPECIALIST", "STUDENT"] as const;
export type ClinicalRole = (typeof CLINICAL_ROLES)[number];

export const CLINICAL_PERMISSIONS = [
  "PATIENT_READ_ADMINISTRATIVE",
  "PATIENT_WRITE_ADMINISTRATIVE",
  "APPOINTMENT_REQUEST",
  "APPOINTMENT_MANAGE_CAPACITY",
  "APPOINTMENT_MARK_ATTENDED",
  "CLINICAL_HISTORY_READ_ASSIGNED",
  "CLINICAL_ENCOUNTER_CREATE",
  "CLINICAL_ENCOUNTER_CLOSE",
  "CLINICAL_ENCOUNTER_AMEND",
  "CLINICAL_DOCUMENT_UPLOAD",
  "CLINICAL_DOCUMENT_READ_ASSIGNED",
  "REFERRAL_CREATE",
  "REFERRAL_READ_ASSIGNED",
  "REFERRAL_MANAGE_ASSIGNED",
  "REPORT_VIEW_OPERATIONAL",
  "REPORT_EXPORT_AUTHORIZED",
  "AUDIT_VIEW",
] as const;
export type ClinicalPermission = (typeof CLINICAL_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<ClinicalRole, readonly ClinicalPermission[]> = {
  ADMINISTRATIVE: ["PATIENT_READ_ADMINISTRATIVE", "PATIENT_WRITE_ADMINISTRATIVE", "APPOINTMENT_MANAGE_CAPACITY", "APPOINTMENT_MARK_ATTENDED", "REPORT_VIEW_OPERATIONAL", "REPORT_EXPORT_AUTHORIZED"],
  REVIEW_DOCTOR: ["CLINICAL_HISTORY_READ_ASSIGNED", "CLINICAL_ENCOUNTER_CREATE", "CLINICAL_ENCOUNTER_CLOSE", "CLINICAL_ENCOUNTER_AMEND", "CLINICAL_DOCUMENT_UPLOAD", "CLINICAL_DOCUMENT_READ_ASSIGNED", "REFERRAL_CREATE", "REFERRAL_READ_ASSIGNED", "REPORT_VIEW_OPERATIONAL"],
  SPECIALIST: ["CLINICAL_HISTORY_READ_ASSIGNED", "CLINICAL_ENCOUNTER_CREATE", "CLINICAL_ENCOUNTER_CLOSE", "CLINICAL_ENCOUNTER_AMEND", "CLINICAL_DOCUMENT_UPLOAD", "CLINICAL_DOCUMENT_READ_ASSIGNED", "REFERRAL_READ_ASSIGNED", "REFERRAL_MANAGE_ASSIGNED", "REPORT_VIEW_OPERATIONAL"],
  STUDENT: ["APPOINTMENT_REQUEST"],
};

export function hasClinicalPermission(role: ClinicalRole, permission: ClinicalPermission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const APPOINTMENT_STATUSES = ["REQUESTED", "SCHEDULED", "CANCELLED", "NO_SHOW", "ATTENDED"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export const APPOINTMENT_TYPES = ["INITIAL", "SPECIALTY", "REFERRAL"] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];
export const CLINICAL_ENCOUNTER_STATUSES = ["DRAFT", "CLOSED", "AMENDED"] as const;
export type ClinicalEncounterStatus = (typeof CLINICAL_ENCOUNTER_STATUSES)[number];
export const CLINICAL_DOCUMENT_STATUSES = ["PROCESSING", "AVAILABLE", "REJECTED"] as const;
export type ClinicalDocumentStatus = (typeof CLINICAL_DOCUMENT_STATUSES)[number];
export const CLINICAL_DOCUMENT_TYPES = ["BLOOD_CHEMISTRY", "LAB_RESULT", "RADIOGRAPH", "PRESCRIPTION", "CLINICAL_PHOTO", "REFERRAL_DOCUMENT", "OTHER"] as const;
export type ClinicalDocumentType = (typeof CLINICAL_DOCUMENT_TYPES)[number];
export const REFERRAL_STATUSES = ["PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS", "RETURNED", "CLOSED", "CANCELLED"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];
export const SPECIALTIES = ["DERMATOLOGY", "OPHTHALMOLOGY", "INTERNAL_MEDICINE", "UROLOGY", "GYNECOLOGY"] as const;
export type Specialty = (typeof SPECIALTIES)[number];

export type Patient = {
  id: string;
  carnet: string;
  registrationCode: string;
  fullName: string;
  birthDate?: string;
  career: string;
  email?: string;
  phone?: string;
  academicStatus: "ACTIVE" | "INACTIVE";
  isRecurrent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClinicalIntake = {
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
  relevantHistory?: string;
  emergencyContact?: string;
  updatedAt: string;
  updatedBy: string;
};
export type ClinicalHistory = { id: string; patientId: string; createdAt: string; createdBy: string; intake?: ClinicalIntake };
export type Diagnosis = { id: string; encounterId: string; code?: string; label: string; note?: string; createdAt: string };
export type Measurement = { id: string; encounterId: string; type: "WEIGHT" | "HEIGHT" | "BLOOD_PRESSURE" | "OTHER"; value: number; unit: string; measuredAt: string };

export type ClinicalDocument = {
  id: string;
  patientId: string;
  encounterId?: string;
  type: ClinicalDocumentType;
  status: ClinicalDocumentStatus;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  studyDate?: string;
  description?: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
};

export type ClinicalEncounter = {
  id: string;
  historyId: string;
  patientId: string;
  appointmentId?: string;
  referralId?: string;
  doctorId: string;
  type: "INITIAL" | "SPECIALTY";
  specialty?: Specialty;
  status: ClinicalEncounterStatus;
  occurredAt: string;
  chiefComplaint: string;
  assessment?: string;
  instructions?: string;
  bloodChemistryStatus: "ATTACHED" | "PENDING" | "NOT_PRESENTED";
  closedAt?: string;
  amendmentOfId?: string;
  specialtyData?: Record<string, any>;
};

export type Referral = {
  id: string;
  patientId: string;
  sourceEncounterId: string;
  specialty: Specialty;
  reason: string;
  commentForSpecialist: string;
  diagnosisIds: string[];
  documentIds: string[];
  status: ReferralStatus;
  requestedBy: string;
  assignedDoctorId?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closingNote?: string;
};

export type Appointment = {
  id: string;
  patientId: string;
  type: AppointmentType;
  status: AppointmentStatus;
  capacityId: string;
  requestedBy: string;
  assignedDoctorId?: string;
  /** Solo aplica a reservas directas en una especialidad. */
  specialty?: Specialty;
  referralId?: string;
  scheduledFor: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportFilter = {
  from?: string;
  to?: string;
  doctorId?: string;
  specialty?: Specialty;
  diagnosisLabel?: string;
  career?: string;
  ageFrom?: number;
  ageTo?: number;
  appointmentStatus?: AppointmentStatus;
  referralStatus?: ReferralStatus;
  recurrentOnly?: boolean;
  aggregated?: boolean;
};
