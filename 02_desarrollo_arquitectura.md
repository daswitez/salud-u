# Información para desarrollo y arquitectura

## Decisión arquitectónica

El núcleo transaccional es la historia clínica longitudinal, no la agenda. Una cita es un registro operativo que puede terminar en atención, cancelación o inasistencia. Toda atención, documento, diagnóstico y derivación debe apuntar al paciente y conservar autor, fecha, estado y auditoría.

## Dominios principales

| Dominio | Responsabilidad |
|---|---|
| identity | Usuarios, roles y permisos. |
| patients | Perfil del estudiante, carnet, código de registro, carrera y datos de contacto. |
| appointments | Solicitudes, cupos, citas y asistencia; siempre para atención inicial salvo derivación. |
| clinical | Historia clínica, atenciones, evoluciones, diagnósticos, etiquetas, mediciones e indicaciones. |
| documents | Archivos privados, metadatos, clasificación de estudio y relación con la atención. |
| referrals | Derivaciones, especialidad destino, motivo, comentario, asignación y ciclo de vida. |
| reporting | Consultas agregadas, accesos rápidos, exportaciones y cumplimiento institucional. |
| audit | Registro inmutable de accesos, modificaciones y exportaciones. |

## Modelo de datos mínimo

- `Patient`: id, carnet único, códigoRegistro único, nombres, fechaNacimiento, carrera, contacto y estado.
- `ClinicalHistory`: id, patientId y metadatos de creación; no contiene un resumen editable como única fuente de verdad.
- `ClinicalEncounter`: id, historyId, appointmentId opcional, doctorId, tipo (`INITIAL` o `SPECIALTY`), fecha, motivo, evaluación, estado.
- `Diagnosis`: id, encounterId, catálogo/etiqueta normalizada, descripción y estado.
- `Measurement`: id, encounterId, tipo, valor, unidad y fecha; peso es histórico, no un campo que se pisa.
- `ClinicalDocument`: id, patientId, encounterId opcional, almacenamiento privado, tipo, fechaEstudio, descripción, etiquetas y autor.
- `Referral`: id, encounterId origen, patientId, especialidad destino, motivo, comentario, estado, especialista asignado y fechas.
- `Appointment`: id, patientId, cupoId, tipo (`INITIAL`/`REFERRAL`), estado y referencia a derivación cuando aplique.
- `AuditEvent`: actor, acción, recurso, fecha, contexto mínimo y resultado.

## Estados recomendados

| Recurso | Estados |
|---|---|
| Cita | `REQUESTED`, `SCHEDULED`, `CANCELLED`, `NO_SHOW`, `ATTENDED` |
| Atención | `DRAFT`, `CLOSED`, `AMENDED` |
| Derivación | `PENDING_ASSIGNMENT`, `ASSIGNED`, `IN_PROGRESS`, `RETURNED`, `CLOSED`, `CANCELLED` |
| Documento | `PROCESSING`, `AVAILABLE`, `REJECTED` |

## API sugerida

```text
GET/POST   /patients
GET/PATCH  /patients/{id}
GET        /patients/{id}/history
POST       /patients/{id}/encounters
PATCH      /encounters/{id}
POST       /encounters/{id}/documents
POST       /encounters/{id}/referrals
GET/PATCH  /referrals/{id}
GET        /doctors/me/patients?diagnosis=&from=&to=&career=&referralStatus=
GET        /reports/daily-attended
GET        /reports/clinical
POST       /reports/exports
```

## Seguridad y adjuntos

- Usar autorización por rol y relación clínica: el médico no navega pacientes ajenos.
- Guardar archivos fuera de la base de datos, en almacenamiento privado; la BD conserva referencia y metadatos.
- Validar MIME, tamaño, antivirus si está disponible y usar URL temporal para descarga/previsualización.
- No incluir adjuntos ni texto clínico en logs de aplicación.
- Registrar lectura de historia, descarga de documentos, creación de adenda y exportación de reporte.

## Consultas e índices prioritarios

- Índices únicos para carnet y código de registro.
- Índices por `patientId + fecha` en atención y documentos.
- Índices por `doctorId + fecha`, `specialty + status` en derivaciones.
- Índices para filtros de reporte por fecha, médico, especialidad, diagnóstico/etiqueta y carrera.

## Pruebas críticas

- Duplicados de carnet/código y actualización administrativa segura.
- Permisos al abrir historia o descargar un adjunto.
- Persistencia de una evolución anterior al crear otra.
- Derivación incompleta o dirigida a especialidad no habilitada.
- Relación consistente entre cita atendida y atención clínica cerrada.
- Filtros combinados de “Mis pacientes” y reportes diarios.
- Auditoría de cambios clínicos y exportaciones.
