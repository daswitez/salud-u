export type AuditEventResource = "STUDENT" | "ENCOUNTER" | "DOCUMENT" | "REFERRAL" | "REPORT" | "SYSTEM";
export type AuditEventAction = "CREATE" | "READ" | "UPDATE" | "DELETE" | "EXPORT" | "STATUS_CHANGE";
export type AuditEventResult = "SUCCESS" | "FAILURE" | "DENIED";

export type AuditEvent = {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  resource: AuditEventResource;
  resourceId?: string;
  action: AuditEventAction;
  result: AuditEventResult;
  context: string;
};

// Initial mock data
export const DEMO_AUDIT_LOG: AuditEvent[] = [
  {
    id: "AUD-1001",
    timestamp: "2026-09-17T08:30:00.000Z",
    actor: { id: "ADMIN-001", name: "María Fernández", role: "ADMINISTRATIVE" },
    resource: "STUDENT",
    resourceId: "PAT-2026-004",
    action: "CREATE",
    result: "SUCCESS",
    context: "Registro administrativo inicial del estudiante en el sistema."
  },
  {
    id: "AUD-1002",
    timestamp: "2026-09-17T09:15:00.000Z",
    actor: { id: "DOC-REV-001", name: "Dra. Valeria Mendoza", role: "REVIEW_DOCTOR" },
    resource: "ENCOUNTER",
    resourceId: "ENC-2026-005",
    action: "CREATE",
    result: "SUCCESS",
    context: "Apertura de atención inicial vinculada a la cita APT-2026-005."
  },
  {
    id: "AUD-1003",
    timestamp: "2026-09-17T09:42:00.000Z",
    actor: { id: "DOC-REV-001", name: "Dra. Valeria Mendoza", role: "REVIEW_DOCTOR" },
    resource: "DOCUMENT",
    resourceId: "DOC-2026-002",
    action: "CREATE",
    result: "SUCCESS",
    context: "Carga de documento adjunto (Radiografía/Estudio Visual)."
  },
  {
    id: "AUD-1004",
    timestamp: "2026-09-17T09:50:00.000Z",
    actor: { id: "DOC-REV-001", name: "Dra. Valeria Mendoza", role: "REVIEW_DOCTOR" },
    resource: "ENCOUNTER",
    resourceId: "ENC-2026-005",
    action: "STATUS_CHANGE",
    result: "SUCCESS",
    context: "Cierre de la atención inicial con estado CLOSED."
  },
  {
    id: "AUD-1005",
    timestamp: "2026-09-17T10:00:00.000Z",
    actor: { id: "DOC-REV-001", name: "Dra. Valeria Mendoza", role: "REVIEW_DOCTOR" },
    resource: "REFERRAL",
    resourceId: "REF-2026-002",
    action: "CREATE",
    result: "SUCCESS",
    context: "Derivación médica creada hacia Oftalmología."
  },
  {
    id: "AUD-1006",
    timestamp: "2026-09-17T14:45:00.000Z",
    actor: { id: "DOC-REV-001", name: "Dra. Valeria Mendoza", role: "REVIEW_DOCTOR" },
    resource: "ENCOUNTER",
    resourceId: "ENC-2026-006",
    action: "STATUS_CHANGE",
    result: "SUCCESS",
    context: "Cierre de la atención inicial con estado CLOSED."
  }
];

export function getAuditDemoLog(): AuditEvent[] {
  if (typeof window === "undefined") return DEMO_AUDIT_LOG;
  const stored = localStorage.getItem("salud-universitaria-audit-log-v2");
  if (stored) return JSON.parse(stored);
  localStorage.setItem("salud-universitaria-audit-log-v2", JSON.stringify(DEMO_AUDIT_LOG));
  return DEMO_AUDIT_LOG;
}

export function logAuditEvent(event: Omit<AuditEvent, "id" | "timestamp">) {
  if (typeof window === "undefined") return;
  const log = getAuditDemoLog();
  const newEvent: AuditEvent = {
    ...event,
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  log.unshift(newEvent); // Add to beginning
  localStorage.setItem("salud-universitaria-audit-log-v2", JSON.stringify(log));
}
