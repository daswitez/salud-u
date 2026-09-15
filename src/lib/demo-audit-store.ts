export type AuditAction = "PUBLICAR_TURNO" | "RESOLVER_SOLICITUD" | "ACTUALIZAR_PROFESIONAL" | "ENVIAR_OFERTA" | "VALIDAR_CHECKIN" | "FINALIZAR_TELECONSULTA";
export type AuditResource = "Turno" | "Solicitud" | "Profesional" | "Lista de espera" | "Check-in" | "Teleconsulta";
export type AuditRecord = { id: string; actor: string; actorRole: "Administrativo" | "Médico"; action: AuditAction; resource: AuditResource; reference: string; status: "Aplicado" | "Rechazado" | "Pendiente"; createdAt: string; summary: string; privacy: "Metadata operativa" };
export const AUDIT_EXPORT_POLICY = { allowed: false, reason: "La exportación está deshabilitada en la demostración; requiere una política y autorización de auditoría explícitas." } as const;

const records: AuditRecord[] = [
  { id: "AUD-2026-001", actor: "María Fernández", actorRole: "Administrativo", action: "PUBLICAR_TURNO", resource: "Turno", reference: "TUR-2026-001", status: "Aplicado", createdAt: "2026-09-04T09:15:00.000Z", summary: "Capacidad publicada con pausas excluidas.", privacy: "Metadata operativa" },
  { id: "AUD-2026-002", actor: "María Fernández", actorRole: "Administrativo", action: "RESOLVER_SOLICITUD", resource: "Solicitud", reference: "SOL-2026-002", status: "Aplicado", createdAt: "2026-09-06T09:15:00.000Z", summary: "Cambio de modalidad aprobado.", privacy: "Metadata operativa" },
  { id: "AUD-2026-003", actor: "Dra. Valeria Mendoza", actorRole: "Médico", action: "VALIDAR_CHECKIN", resource: "Check-in", reference: "CIT-2026-001", status: "Aplicado", createdAt: "2026-09-10T10:20:00.000Z", summary: "Llegada validada sin exponer el token QR.", privacy: "Metadata operativa" },
  { id: "AUD-2026-004", actor: "María Fernández", actorRole: "Administrativo", action: "ENVIAR_OFERTA", resource: "Lista de espera", reference: "OFF-2026-001", status: "Pendiente", createdAt: "2026-09-14T10:00:00.000Z", summary: "Oferta temporal compatible enviada.", privacy: "Metadata operativa" },
  { id: "AUD-2026-005", actor: "María Fernández", actorRole: "Administrativo", action: "ACTUALIZAR_PROFESIONAL", resource: "Profesional", reference: "MED-001", status: "Aplicado", createdAt: "2026-09-03T09:30:00.000Z", summary: "Modalidad teleconsulta habilitada para turnos futuros.", privacy: "Metadata operativa" },
  { id: "AUD-2026-006", actor: "Dra. Valeria Mendoza", actorRole: "Médico", action: "FINALIZAR_TELECONSULTA", resource: "Teleconsulta", reference: "TEL-2026-001", status: "Aplicado", createdAt: "2026-09-10T15:00:00.000Z", summary: "Sesión finalizada; acceso temporal invalidado.", privacy: "Metadata operativa" },
];

export function getAuditRecords() { return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function getOperationalObservability() { return { apiLatency: "380 ms", holdSuccess: "96%", queueMedian: "22 min", waitAccuracy: "± 6 min", waitlistActive: 7, note: "Indicadores operativos agregados; no reemplazan decisiones humanas ni muestran contenido clínico." }; }
