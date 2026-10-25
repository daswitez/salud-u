export type EmittedReferral = {
  id: string;
  patient: { id: string; fullName: string; carnet: string };
  specialty: { id: string; name: string };
  priority: "ROUTINE" | "PRIORITY" | "URGENT";
  status: "PENDING_ASSIGNMENT" | "ASSIGNED" | "IN_PROGRESS" | "RETURNED" | "CLOSED" | "CANCELLED";
  reason: string; comment: string; createdAt: string;
  source: { id: string; appointmentId: string; status: "CLOSED"; chiefComplaint: string | null; assessment: string | null; instructions: string | null; followUpText: string | null; reviewHistoryVersion: number | null };
  diagnoses: { id: string; label: string; isPrimary: boolean }[];
  documents: { id: string; documentType: string; filename: string; mimeType: string; sizeBytes: number; studyDate: string | null; description: string | null }[];
};

export type EmittedReferralItem = Omit<EmittedReferral, "source" | "diagnoses" | "documents"> & { sourceAppointmentId: string; sourceEncounterId: string; diagnosisCount: number; documentCount: number };
export const referralPriorityLabel = { ROUTINE: "Rutinaria", PRIORITY: "Prioritaria", URGENT: "Urgente" };
export const referralStatusLabel = { PENDING_ASSIGNMENT: "Pendiente de programación", ASSIGNED: "Programada", IN_PROGRESS: "En atención", RETURNED: "Devuelta", CLOSED: "Resuelta", CANCELLED: "Cancelada" };
