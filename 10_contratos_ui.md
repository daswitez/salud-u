# Contratos de UI y estados operativos

La fuente de contratos del frontend es [`src/lib/ui-contracts.ts`](./src/lib/ui-contracts.ts). El store demo clínico en [`src/lib/demo-clinical-store.ts`](./src/lib/demo-clinical-store.ts) utiliza estas formas y será reemplazable por endpoints sin cambiar las pantallas clínicas.

## Roles y permisos

```ts
type ClinicalRole =
  | "ADMINISTRATIVE"
  | "REVIEW_DOCTOR"
  | "SPECIALIST"
  | "STUDENT";
```

Los permisos son granulares. Separan datos administrativos del paciente, lectura/escritura clínica, adjuntos, derivaciones, reportes y exportaciones. Una pantalla no debe conceder acceso solo por el rol: el backend futuro también debe validar la relación clínica con el paciente.

## Estados compartidos

```ts
type AppointmentStatus =
  | "REQUESTED"
  | "SCHEDULED"
  | "CANCELLED"
  | "NO_SHOW"
  | "ATTENDED";

type ClinicalEncounterStatus = "DRAFT" | "CLOSED" | "AMENDED";
type ClinicalDocumentStatus = "PROCESSING" | "AVAILABLE" | "REJECTED";

type ReferralStatus =
  | "PENDING_ASSIGNMENT"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RETURNED"
  | "CLOSED"
  | "CANCELLED";
```

Los estados se definen como constantes y tipos compartidos; las páginas no deben crear variantes de texto libre como “Finalizado” o “Enviado” para representar el mismo estado de dominio.

## Entidades clínicas

```ts
type Patient = {
  id: string;
  carnet: string;
  registrationCode: string;
  fullName: string;
  birthDate?: string;
  career: string;
  academicStatus: "ACTIVE" | "INACTIVE";
  isRecurrent: boolean;
  createdAt: string;
  updatedAt: string;
};

type ClinicalHistory = {
  id: string;
  patientId: string;
  createdAt: string;
  createdBy: string;
  intake?: {
    allergies?: string;
    chronicConditions?: string;
    currentMedications?: string;
    relevantHistory?: string;
    emergencyContact?: string;
    updatedAt: string;
    updatedBy: string;
  };
};

type ClinicalEncounter = {
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
  specialtyData?: Record<string, any>; // Extensión para datos categóricos propios de la especialidad (ej. agudeza visual, etc.)
};
```

Una historia pertenece a un paciente y tiene muchas atenciones. La atención inicial sirve de base común. Los encuentros de especialidad se extienden con datos específicos (`specialtyData`) para alimentar reportes propios de la rama médica sin perder la conexión con la historia unificada. Una atención cerrada es de solo lectura; una corrección se representa por una nueva atención/adenda que conserva `amendmentOfId`.

## Diagnósticos, mediciones y documentos

```ts
type Diagnosis = {
  id: string;
  encounterId: string;
  code?: string;
  label: string;
  note?: string;
  createdAt: string;
};

type Measurement = {
  id: string;
  encounterId: string;
  type: "WEIGHT" | "HEIGHT" | "BLOOD_PRESSURE" | "OTHER";
  value: number;
  unit: string;
  measuredAt: string;
};

type ClinicalDocument = {
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
```

`ClinicalDocumentType` acepta inicialmente química sanguínea, laboratorio, radiografía, receta, fotografía clínica, documento de derivación y otro. Todo adjunto se relaciona con un paciente y, cuando corresponde, con una atención concreta.

## Derivación y cita

```ts
type Referral = {
  id: string;
  patientId: string;
  sourceEncounterId: string;
  specialty:
    | "DERMATOLOGY"
    | "OPHTHALMOLOGY"
    | "INTERNAL_MEDICINE"
    | "UROLOGY";
  reason: string;
  commentForSpecialist: string;
  diagnosisIds: string[];
  documentIds: string[];
  status: ReferralStatus;
  requestedBy: string;
  assignedDoctorId?: string;
  createdAt: string;
  updatedAt: string;
};

type Appointment = {
  id: string;
  patientId: string;
  type: "INITIAL" | "SPECIALTY" | "REFERRAL";
  status: AppointmentStatus;
  capacityId: string;
  requestedBy: string;
  assignedDoctorId?: string;
  specialty?: Specialty;
  referralId?: string;
  scheduledFor: string;
  createdAt: string;
  updatedAt: string;
};
```

Una derivación no se habilita sin especialidad, motivo y comentario. Una cita `REFERRAL` exige `referralId`; una cita `INITIAL` no permite que el estudiante seleccione directamente una especialidad. `SPECIALTY` representa una reserva directa creada por Administración contra un cupo publicado por el especialista y conserva la especialidad solicitada, sin simular una derivación clínica.

## Filtros y estados de vista

```ts
type ReportFilter = {
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
```

Todas las pantallas que consultan datos contemplan `idle`, `loading`, `success`, `empty`, `error` y `unauthorized`. Las exportaciones muestran filtros/período y solicitan confirmación; el backend debe auditar la operación.

## Compatibilidad temporal

`mock-clinic.ts` es un adaptador de las rutas anteriores y toma pacientes, atenciones y citas iniciales desde el seed clínico. Sus tipos de agenda, cola y teleconsulta solo se conservan temporalmente para no romper pantallas que se migrarán en los siguientes bloques; no son contratos para desarrollo nuevo.
