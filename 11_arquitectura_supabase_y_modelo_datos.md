# Arquitectura objetivo y modelo de datos para Supabase

> **Propósito.** Este documento convierte el flujo UML actual en una base implementable con PostgreSQL y Supabase. Complementa, no reemplaza, los requisitos de negocio de `01_requisitos_y_procesos.md` ni los contratos de UI de `10_contratos_ui.md`.

## 1. Dictamen sobre el UML actual

El diagrama actual describe correctamente el recorrido clínico principal: admisión, atención inicial, historia longitudinal, derivación, atención especializada y reportes. También acierta al separar la cita (operativa) de la atención clínica (asistencial).

Para construir un backend real faltan decisiones que el diagrama no puede expresar por sí solo:

| Área | Falta concretar | Decisión propuesta |
|---|---|---|
| Identidad | Cómo se enlaza una cuenta autenticada con estudiante, personal administrativo o médico. | `auth.users` de Supabase se enlaza 1:1 a `app.profile`; el perfil se relaciona opcionalmente con paciente o profesional. |
| Ciclo académico | "Una consulta durante la carrera" no tiene período ni matrícula. | Conservar `academic_enrollment` por carrera/gestión. El cumplimiento se calcula contra una matrícula, nunca contra un booleano persistente. |
| Cupos | El UML crea una cita, pero no define agenda, bloqueo de concurrencia ni qué ocurre con cancelaciones. | Publicar `availability_slot`; reservar mediante una RPC transaccional que bloquea la fila del cupo. |
| Excepciones | La regla admite una atención especializada extraordinaria, pero no se modela quién la autorizó. | Registrar `exception_authorization` con motivo, autorizador y auditoría; no usar una cita especializada como sustituto de una derivación. |
| Relación clínica | "Médico asignado/atendió/recibió derivación" debe evaluarse de forma consistente. | Centralizarla en funciones PostgreSQL usadas por RLS; no confiar en filtros del frontend. |
| Contenido cerrado | Se dice que no se edita, pero no se describe cómo se corrige. | Atención cerrada inmutable; una `clinical_amendment` o nueva evolución referencia la atención original y explica la corrección. |
| Especialidades | El UML incluye Ginecología; los requisitos iniciales enumeran cuatro especialidades. | Tratar Ginecología como **no habilitada inicialmente** hasta aprobación. El catálogo, no un enum rígido, controla qué especialidades están activas. |
| Adjuntos | El UML no separa archivo, metadatos, relación clínica y acceso. | Archivo privado en Supabase Storage; metadatos y vínculos en PostgreSQL; acceso validado tanto en BD como en Storage. |
| Auditoría | Registrar cambios no basta si un usuario operativo puede modificar la bitácora. | Tabla append-only, inserción mediante trigger/RPC y sin permisos DML para usuarios de aplicación. |
| Reportes | No diferencia resultados nominales, agregados, seudonimizados y exportados. | Vistas/RPC separadas por propósito; cada exportación es un `report_export` auditable con filtros y finalidad. |
| Privacidad | Faltan consentimiento, minimización y retención. | Versionar consentimientos; limitar datos visibles por propósito; definir retención y baja lógica institucional antes de producción. |

### Inconsistencia a resolver antes de migrar

`10_contratos_ui.md` permite una cita `SPECIALTY` directa creada por Administración. Esto contradice la regla de negocio y el flujo principal: una atención especializada requiere derivación activa, salvo excepción autorizada. Para el backend se recomienda:

1. Conservar sólo `INITIAL` y `REFERRAL` como tipos de cita.
2. Exigir `referral_id` para una cita `REFERRAL`.
3. Representar el caso extraordinario en `exception_authorization`, aprobado por un rol definido, y generar desde allí una derivación de excepción o una cita marcada con esa autorización. Nunca dejarlo como reserva directa sin trazabilidad.

## 2. Arquitectura propuesta

```text
Next.js (pantallas existentes)
  ├─ Supabase Auth: sesión, MFA para personal con privilegios altos
  ├─ Supabase client con clave pública: consultas permitidas por RLS
  ├─ RPC PostgreSQL: operaciones de negocio atómicas
  │    registrar paciente · reservar cupo · iniciar/cerrar atención
  │    crear/asignar/cerrar derivación · solicitar exportación
  └─ Edge Functions / rutas servidor: antivirus, notificaciones y exportaciones
                         │
Supabase
  ├─ PostgreSQL: esquema `app` (operativo), `private` (helpers), `reporting` (vistas)
  ├─ Auth: `auth.users` como identidad técnica
  ├─ Storage privado: bucket `clinical-documents`
  ├─ Realtime: sólo avisos no sensibles de cambios de estado
  └─ Backups, migraciones SQL y pruebas de RLS
```

### Principios de implementación

- El navegador usa la clave pública de Supabase y **nunca** recibe `service_role`.
- Toda tabla expuesta tiene RLS habilitado y políticas explícitas. Las funciones con `security definer` viven en `private`, fijan `search_path = ''`, califican los objetos por esquema y tienen permisos de ejecución mínimos. Supabase recomienda este patrón para no abrir una función privilegiada a la Data API. [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Usar RPC PostgreSQL para transiciones que afectan varias filas o requieren invariantes; por ejemplo, reservar un cupo y crear la cita en una sola transacción. Las consultas simples pueden ir por la API de Supabase protegida por RLS.
- Las tareas que impliquen I/O externo o secretos (antivirus, correo, generación de CSV/PDF, integración académica) se ejecutan en una Edge Function o backend servidor; no en un trigger sin control. Los webhooks de base son asíncronos y se apoyan en `pg_net`, por lo que no deben ser la única garantía del flujo clínico. [Webhooks de base](https://supabase.com/docs/guides/database/webhooks)
- Los archivos clínicos se guardan en bucket privado. La descarga exige RLS o una URL firmada breve; un bucket público sería inaceptable para estos documentos. [Buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals)

## 3. Flujo TO-BE completado

### 3.1 Admisión y cita inicial

1. Administración busca por carnet o código de registro normalizados. Si hay coincidencia, actualiza únicamente atributos administrativos permitidos.
2. Si no existe, registra paciente, crea su historia clínica vacía y, si corresponde, una matrícula académica vigente.
3. Estudiante o Administración solicita atención inicial. Administración reserva un `availability_slot` disponible mediante `book_appointment`; la función bloquea el cupo, verifica vigencia y crea la cita.
4. En ingreso, la cita pasa a `CHECKED_IN` (estado operativo recomendado) y se asigna/valida el médico. Si no asiste, pasa a `NO_SHOW`; si se cancela, el cupo vuelve a estar disponible según la política institucional.
5. Una atención `CLOSED` enlazada a la cita la lleva a `ATTENDED`. No se permite marcar una cita como atendida sin atención clínica cerrada.

### 3.2 Atención y cierre clínico

1. El médico sólo abre el paciente si existe relación clínica vigente: cita asignada, atención propia, derivación asignada o autorización explícita.
2. Crea una atención `DRAFT`; captura núcleo común, diagnósticos, mediciones, indicaciones y adjuntos. Cada elemento conserva autor y fecha.
3. El médico puede guardar borrador. Aún no cuenta para cumplimiento, reporte clínico cerrado ni atención de cita.
4. `close_encounter` verifica diagnóstico/justificación conforme a la política, autor responsable, origen de la atención y consistencia con cita o derivación; sella `closed_at` y bloquea edición directa.
5. Una corrección posterior crea una adenda vinculada a la atención cerrada. La adenda no borra ni reescribe el texto original.

### 3.3 Derivación y especialidad

1. Sólo un médico de revisión puede crear una derivación desde una atención inicial cerrada (o una excepción autorizada). Debe incluir especialidad habilitada, prioridad, motivo y comentario.
2. Diagnósticos y documentos relevantes se vinculan mediante tablas de unión; así se conserva exactamente qué contexto se entregó al especialista aunque luego cambie el historial.
3. Administración asigna cita en un cupo de la especialidad. El especialista asignado acepta (`ASSIGNED` → `IN_PROGRESS`) al abrir el caso.
4. El especialista crea una atención de tipo `SPECIALTY`, vinculada tanto a la derivación como a la cita. Puede solicitar seguimiento, devolver o cerrar con nota clínica.
5. No hay dos derivaciones abiertas con la misma finalidad clínica salvo que un médico lo justifique; la base impide duplicados simples mediante una restricción parcial y el caso no simple se audita.

### 3.4 Reportes, investigación y exportación

1. Las vistas operativas se consultan con filtros, período y alcance del actor.
2. Los reportes nominales se habilitan sólo a roles y propósitos autorizados. Los de investigación parten de vistas agregadas o seudonimizadas.
3. Una exportación genera un registro `report_export` con finalidad declarada, filtros, columnas y estado. La Edge Function construye el archivo temporalmente; nunca deja el CSV en un bucket público.
4. Toda consulta de historia, descarga de documento y exportación emite `audit_event` sin copiar el texto clínico ni el binario del archivo.

## 4. Convenciones de datos

- Usar `uuid` como PK (`gen_random_uuid()`), `timestamptz` en UTC y `date` sólo para fechas sin hora (nacimiento, estudio, gestión académica).
- Nombres `snake_case`, claves foráneas explícitas y `created_at`, `created_by`, `updated_at`, `updated_by` cuando sea modificable.
- Evitar borrar datos clínicos. Usar `status`, `cancelled_at`, `archived_at` o registros de corrección. Sólo un proceso de retención institucional puede anonimizar/purgar tras aprobación.
- Normalizar identificadores de búsqueda con columnas `carnet_normalized` y `registration_code_normalized` (trim, mayúsculas y sin formato permitido); protegerlas con `unique`.
- No guardar edad: se deriva de `birth_date` para no quedar desactualizada. Tampoco guardar peso en `patient`: va en mediciones con fecha.
- Los textos clínicos se conservan como `text`; no se registran en logs de aplicación ni en eventos de auditoría.
- Usar catálogos con `is_active`, no enums, cuando la institución podría modificar el valor: carrera, especialidad, tipo documental, etiqueta, prioridad. Los estados internos sí pueden ser `enum` o `check` porque son parte del contrato de software.

## 5. Esquema lógico detallado

Los nombres siguientes son propuestos para el esquema `app`. Las PK son `id uuid`; todas las FK usan `on delete restrict` para datos clínicos, salvo tablas de unión o datos temporales donde se indique otra cosa.

### 5.1 Identidad, personas y organización

| Tabla | Campos clave | Reglas y finalidad |
|---|---|---|
| `profile` | `id` FK `auth.users`, `display_name`, `status`, `created_at` | Perfil técnico mínimo. No duplica contraseña ni tokens de Auth. |
| `role` | `code`, `name`, `is_active` | `ADMINISTRATIVE`, `REVIEW_DOCTOR`, `SPECIALIST`, `STUDENT`, `AUDITOR`, `REPORTING_OFFICER`. |
| `profile_role` | `profile_id`, `role_code`, `granted_at`, `revoked_at`, `granted_by` | Roles con vigencia; no asumir un único rol por persona. |
| `staff_member` | `profile_id`, `employee_code`, `professional_license`, `is_active` | Datos laborales de personal. La licencia puede requerir cifrado/visibilidad restringida según norma local. |
| `specialty` | `id`, `code`, `name`, `is_enabled` | Inicialmente habilitar Dermatología, Oftalmología, Medicina Interna y Urología. Ginecología queda inactiva hasta aprobación. |
| `staff_specialty` | `staff_member_id`, `specialty_id`, `is_primary`, `active_from`, `active_to` | Un especialista sólo recibe derivaciones/cupos de su especialidad vigente. |
| `career` | `id`, `code`, `name`, `is_active` | Catálogo académico; evita carrera como texto libre. |

### 5.2 Paciente y ciclo académico

| Tabla | Campos clave | Reglas y finalidad |
|---|---|---|
| `patient` | `profile_id` nullable unique, `carnet`, `carnet_normalized`, `registration_code`, `registration_code_normalized`, `given_names`, `family_names`, `birth_date`, `phone`, `email`, `academic_status`, `created_by` | Identidad clínica-administrativa. `profile_id` se llena sólo cuando el estudiante tiene cuenta. Únicos parciales para identificadores activos. |
| `patient_contact` | `patient_id`, `type`, `value`, `is_primary`, `verified_at` | Permite varios contactos y evita meter datos de emergencia dentro de una nota clínica. |
| `emergency_contact` | `patient_id`, `full_name`, `relationship`, `phone`, `created_at` | Contacto de emergencia separado y con RLS más restrictiva. |
| `academic_enrollment` | `patient_id`, `career_id`, `academic_period`, `started_on`, `ended_on`, `status`, `source` | Matrícula/historial de carrera. Base para cumplimiento "durante la carrera". Un `unique(patient_id, career_id, academic_period)` evita duplicado de carga. |
| `consent` | `patient_id`, `consent_type`, `version`, `granted_at`, `withdrawn_at`, `evidence_document_id`, `captured_by` | Consentimiento informado, uso de foto, investigación, comunicaciones, etc. No usar un único booleano. |

### 5.3 Historia y contenido clínico longitudinal

| Tabla | Campos clave | Reglas y finalidad |
|---|---|---|
| `clinical_history` | `patient_id unique`, `opened_at`, `opened_by` | Una sola historia longitudinal por paciente. Sin campo de resumen editable que sustituya las evoluciones. |
| `history_intake_version` | `history_id`, `version_no`, `allergies`, `chronic_conditions`, `current_medications`, `relevant_history`, `recorded_at`, `recorded_by` | Antecedentes versionados; una edición crea versión nueva. Datos que ameriten estructura futura pueden normalizarse sin perder este historial. |
| `clinical_encounter` | `history_id`, `patient_id`, `appointment_id` nullable, `referral_id` nullable, `responsible_staff_id`, `encounter_type`, `specialty_id` nullable, `status`, `occurred_at`, `chief_complaint`, `assessment`, `instructions`, `follow_up_text`, `closed_at`, `amends_encounter_id` nullable | Núcleo de toda evolución. `patient_id` se verifica igual al de `history_id`. Inicial no tiene especialidad; especializada exige especialidad y derivación. |
| `clinical_amendment` | `encounter_id`, `amendment_no`, `reason`, `content`, `created_at`, `created_by` | Corrección de una atención cerrada. Inmutable y no reemplaza columnas originales. Si se requiere una evolución clínica nueva, se crea otro `clinical_encounter`. |
| `clinical_condition_catalog` | `id`, `coding_system`, `code`, `display_name`, `is_active` | Catálogo administrable (ICD-10 u otro que la institución autorice). `unique(coding_system, code)`. |
| `encounter_diagnosis` | `encounter_id`, `condition_id` nullable, `free_text`, `diagnosis_kind`, `is_primary`, `created_at`, `created_by` | Exige catálogo o texto libre; una sola primaria por atención mediante índice parcial. |
| `measurement_type` | `code`, `name`, `default_unit`, `value_kind`, `is_active` | Peso, talla, presión arterial, temperatura, etc. |
| `clinical_measurement` | `encounter_id`, `measurement_type_code`, `value_numeric` nullable, `value_text` nullable, `unit`, `measured_at`, `recorded_by` | No mezclar peso con datos del paciente. Restricción: exactamente un tipo de valor según `value_kind`. Presión puede modelarse como dos mediciones o campos sistólica/diastólica tipados. |
| `encounter_tag` / `tag_catalog` | `encounter_id`, `tag_id` | Etiquetas para búsqueda, separadas de diagnósticos. |
| `specialty_form_template` | `id`, `specialty_id`, `version`, `schema_json`, `is_active` | Define la versión de formulario por especialidad. Se aprueba y no se modifica en lugar. |
| `encounter_specialty_data` | `encounter_id unique`, `template_id`, `data jsonb`, `validated_at`, `validated_by` | Extensión versionada del encuentro especializado. `data` se valida en RPC contra el esquema de plantilla. Para variables que entren a reportes recurrentes, duplicar en tablas tipadas, no depender de JSONB libre. |

#### Reglas de integridad clínicas imprescindibles

- `clinical_encounter.patient_id` debe coincidir con el paciente de `clinical_history`, `appointment` y `referral` si existen.
- Una atención `SPECIALTY` exige `referral_id`, `specialty_id`, profesional con esa especialidad activa y una derivación compatible.
- Una atención `CLOSED` exige `closed_at`, `responsible_staff_id` y no puede actualizar su contenido base. Sólo se permite insertar adendas o crear otra evolución.
- Una adenda sólo apunta a una atención `CLOSED`; `unique(encounter_id, amendment_no)` mantiene su orden.
- El estado del examen de química sanguínea debe ser `ATTACHED`, `PENDING` o `NOT_PRESENTED`. Si es `ATTACHED`, debe existir al menos un documento de tipo `BLOOD_CHEMISTRY` asociado antes del cierre. Esta validación va en `close_encounter`, no en una política de UI.

### 5.4 Documentos y almacenamiento

| Tabla | Campos clave | Reglas y finalidad |
|---|---|---|
| `document_type` | `code`, `name`, `is_active` | `BLOOD_CHEMISTRY`, `LAB_RESULT`, `RADIOGRAPH`, `PRESCRIPTION`, `CLINICAL_PHOTO`, `REFERRAL_DOCUMENT`, `OTHER`. |
| `clinical_document` | `patient_id`, `encounter_id` nullable, `document_type_code`, `status`, `bucket`, `object_path unique`, `original_filename`, `mime_type`, `size_bytes`, `checksum_sha256`, `study_date`, `description`, `uploaded_by`, `uploaded_at`, `available_at`, `rejected_reason` | Sólo metadatos y referencia al Storage privado. El binario no va en PostgreSQL. El checksum evita carga duplicada accidental y aporta trazabilidad. |
| `document_tag` | `document_id`, `tag_id` | Etiquetas normalizadas de adjuntos. |
| `document_access_grant` | `document_id`, `profile_id` o `role_code`, `purpose`, `expires_at`, `granted_by` | Sólo si se requieren excepciones explícitas; la norma es heredar acceso desde el paciente/atención. |

Ruta de objeto recomendada: `patient/{patient_id}/{yyyy}/{document_id}/{safe_filename}`. El nombre no contiene carnet, diagnóstico ni nombre completo. Primero se crea el registro `PROCESSING`, luego se carga; una función de validación marca `AVAILABLE` o `REJECTED`. El cliente sólo puede previsualizar/descargar archivos disponibles y autorizados.

### 5.5 Agenda, cupos y asistencia

| Tabla | Campos clave | Reglas y finalidad |
|---|---|---|
| `availability_slot` | `staff_member_id`, `specialty_id` nullable, `starts_at`, `ends_at`, `capacity`, `booked_count`, `status`, `published_at` | Unidad reservable. Para revisión `specialty_id` es nulo; para especialista coincide con su especialidad. No exponer cupos no publicados. |
| `appointment` | `patient_id`, `slot_id`, `appointment_type`, `status`, `referral_id` nullable, `assigned_staff_id`, `requested_by`, `scheduled_for`, `checked_in_at`, `cancelled_at`, `cancellation_reason`, `created_at` | Cita operativa. `REFERRAL` exige derivación activa; `INITIAL` no la admite. |
| `appointment_status_event` | `appointment_id`, `from_status`, `to_status`, `reason`, `occurred_at`, `actor_id` | Trazabilidad de estados, incluida cancelación/no asistencia. |
| `exception_authorization` | `patient_id`, `specialty_id`, `reason`, `authorized_by`, `authorized_at`, `expires_at`, `status` | Soporta la excepción al flujo normal; debe ser aprobada por rol de alto privilegio y consumida una sola vez. |

**Concurrencia:** `book_appointment(patient_id, slot_id, ...)` usa `SELECT ... FOR UPDATE` sobre el cupo, valida `booked_count < capacity`, evita una cita activa solapada para el paciente y luego incrementa el contador. Al cancelar, una función transaccional decremente el contador sólo si la política permite liberar el cupo. No calcular disponibilidad únicamente contando citas desde el cliente.

### 5.6 Derivaciones y seguimiento

| Tabla | Campos clave | Reglas y finalidad |
|---|---|---|
| `referral` | `patient_id`, `source_encounter_id`, `specialty_id`, `priority_code`, `reason`, `comment_for_specialist`, `status`, `requested_by`, `assigned_staff_id`, `created_at`, `accepted_at`, `closed_at`, `return_note` | Puente clínico. El médico emisor no puede modificar motivo/comentario después de emisión: agrega adenda si corresponde. |
| `referral_diagnosis` | `referral_id`, `encounter_diagnosis_id` | Captura diagnósticos elegidos para la derivación. |
| `referral_document` | `referral_id`, `document_id` | Captura adjuntos entregados; se verifica que sean del mismo paciente. |
| `referral_status_event` | `referral_id`, `from_status`, `to_status`, `note`, `actor_id`, `occurred_at` | Bitácora clínica-operativa de transición. |
| `referral_follow_up` | `referral_id`, `due_on`, `status`, `note`, `created_by`, `closed_at` | Seguimientos que no deben perderse dentro de texto libre. |

Estados: `PENDING_ASSIGNMENT` → `ASSIGNED` → `IN_PROGRESS` → `CLOSED`; desde `IN_PROGRESS` puede pasar a `RETURNED`; `CANCELLED` requiere motivo. Ninguna transición salta a `CLOSED` sin nota/resolución y, cuando hubo atención, sin atención especializada cerrada asociada.

### 5.7 Auditoría, reportes e integración

| Tabla / vista | Campos clave | Reglas y finalidad |
|---|---|---|
| `audit_event` | `id`, `occurred_at`, `actor_profile_id`, `action`, `resource_type`, `resource_id`, `patient_id` nullable, `outcome`, `request_id`, `ip_hash` opcional, `metadata jsonb` | Append-only. Metadatos sin nota clínica, diagnóstico libre, URL firmada ni binario. |
| `report_export` | `requested_by`, `report_code`, `purpose`, `filters jsonb`, `field_set`, `result_mode`, `status`, `row_count`, `requested_at`, `completed_at`, `file_document_id` nullable | Solicitud y resultado de exportación; permite aprobar/rechazar y auditar. |
| `integration_outbox` | `event_type`, `aggregate_type`, `aggregate_id`, `payload jsonb`, `status`, `attempts`, `available_at` | Patrón outbox para avisos o integración académica. Evita perder eventos si la transacción sí confirmó y el envío externo falla. |
| `reporting.v_daily_activity` | día, profesional, tipo, totales | Vista agregada sin texto clínico. |
| `reporting.v_compliance_by_enrollment` | matrícula, primera atención cerrada, estado | Calcula cumplimiento por carrera/período. |
| `reporting.v_research_pseudonymized` | seudónimo rotatorio, período, dimensiones aprobadas | Sin carnet, nombre, teléfono ni texto libre. Acceso exclusivo a rol/proceso de investigación autorizado. |

## 6. Estados y transiciones que debe imponer la base

| Recurso | Estados | Transiciones permitidas relevantes |
|---|---|---|
| Cita | `REQUESTED`, `SCHEDULED`, `CHECKED_IN`, `CANCELLED`, `NO_SHOW`, `ATTENDED` | `REQUESTED→SCHEDULED`; `SCHEDULED→CHECKED_IN/CANCELLED/NO_SHOW`; `CHECKED_IN→ATTENDED/NO_SHOW`; `ATTENDED` sólo desde cierre clínico. |
| Atención | `DRAFT`, `CLOSED`, `VOIDED` | `DRAFT→CLOSED`; `DRAFT→VOIDED` con razón. No `CLOSED→DRAFT`; correcciones vía `clinical_amendment`. |
| Documento | `PROCESSING`, `AVAILABLE`, `REJECTED`, `ARCHIVED` | `PROCESSING→AVAILABLE/REJECTED`; no servir archivos que no estén `AVAILABLE`. |
| Derivación | `PENDING_ASSIGNMENT`, `ASSIGNED`, `IN_PROGRESS`, `RETURNED`, `CLOSED`, `CANCELLED` | Sólo especialista asignado inicia/cierra/devuelve; cancelación y devolución requieren nota. |
| Exportación | `REQUESTED`, `APPROVED`, `GENERATING`, `AVAILABLE`, `REJECTED`, `EXPIRED` | Separar autorización de generación cuando el reporte contenga identificadores. |

El contrato actual usa `AMENDED` como estado de atención. Para evitar ambigüedad, se recomienda eliminarlo en la BD: una atención original continúa `CLOSED` y las correcciones viven en `clinical_amendment`. La UI puede mostrar visualmente "tiene adendas".

## 7. Autorización: matriz y RLS

RLS no debe basarse exclusivamente en un claim de JWT con roles, porque revocar un rol podría no reflejarse hasta que caduque el token. Las funciones privadas consultan `profile_role` y `staff_specialty` vigentes.

| Actor | Puede leer | Puede escribir | Restricciones adicionales |
|---|---|---|---|
| Estudiante | Su perfil, sus citas, información que se habilite expresamente | Solicitud/cancelación de cita permitida, datos de contacto | No lee notas, diagnósticos, adjuntos ni derivaciones salvo publicación clínica explícita futura. |
| Administrativo | Datos administrativos, cupos, citas, indicadores operativos | Paciente administrativo, cita, asistencia | No edita ni lee texto clínico, documentos, diagnósticos o antecedentes. |
| Médico de revisión | Pacientes asignados/atendidos/derivados bajo su cuidado | Borradores, cierre, adjuntos, derivaciones de revisión | Sólo relación clínica; no puede editar atención cerrada ajena. |
| Especialista | Derivaciones asignadas o de su especialidad autorizadas, contexto derivado y continuidad permitida | Evolución especializada y resolución | La especialidad del usuario debe coincidir con la derivación. |
| Auditor | Eventos y metadatos mínimos | Ninguno | No requiere contenido clínico. |
| Responsable de reportes | Vistas de reporte permitidas | Solicitud/aprobación de exportación | Separar exportación nominal de agregada/investigación. |

### Helpers privados sugeridos

```sql
-- Ejemplos de intención; crear en migraciones, no copiar sin pruebas.
private.has_active_role(p_role_code text) returns boolean
private.current_staff_id() returns uuid
private.can_access_patient(p_patient_id uuid, p_purpose text) returns boolean
private.can_manage_referral(p_referral_id uuid) returns boolean
private.can_read_document(p_document_id uuid) returns boolean
private.is_assigned_to_slot(p_slot_id uuid) returns boolean
```

Una política típica de lectura clínica utiliza `(select private.can_access_patient(patient_id, 'clinical_read'))`. Al envolver la llamada en `select`, PostgreSQL puede evaluarla una vez por consulta cuando sea aplicable. Cada helper `security definer` debe tener `search_path` vacío, objetos calificados y `execute` revocado para `public`; sólo se concede a `authenticated` si forma parte de una política. [Funciones de base de Supabase](https://supabase.com/docs/guides/database/functions)

### Escrituras que deben ser RPC, no `insert/update` directo

- `register_or_update_patient`
- `book_appointment`, `cancel_appointment`, `check_in_appointment`
- `open_encounter`, `close_encounter`, `add_encounter_amendment`
- `create_referral`, `assign_referral`, `start_referral`, `return_referral`, `close_referral`
- `request_report_export`, `approve_report_export`
- `issue_document_download` (si se centraliza la URL firmada y el evento de auditoría)

Las RPC verifican rol, pertenencia de paciente, transición de estado, datos obligatorios y escriben el evento de auditoría en la misma transacción. Una Edge Function puede invocarlas con la identidad del usuario o realizar tareas administrativas con una cuenta de servicio, pero esa clave nunca se expone al cliente.

## 8. RLS de Storage y ciclo seguro del adjunto

1. El médico autorizado solicita `create_document_upload`; la RPC crea metadatos `PROCESSING`, asigna `document_id` y devuelve una ruta permitida.
2. La política `INSERT` de `storage.objects` valida bucket, primer segmento de ruta (`patient/{id}`) y autorización clínica. Limita MIME y tamaño en el bucket, además de validarlo en servidor. Supabase aplica las políticas de Storage sobre `storage.objects`. [Control de acceso de Storage](https://supabase.com/docs/guides/storage/security/access-control)
3. Un proceso de validación comprueba tamaño, firma real de archivo, antivirus si está disponible y checksum. Luego actualiza a `AVAILABLE` o `REJECTED`.
4. Para descargar, se verifica `can_read_document`, se audita `DOCUMENT_VIEWED`/`DOCUMENT_DOWNLOADED` y se emite URL firmada de minutos, no horas o días. Considerar que una URL firmada ya emitida no se revoca individualmente de forma inmediata; reducir TTL y no compartirla en logs.
5. No permitir `DELETE` físico al usuario. La eliminación funcional marca `ARCHIVED`, registra motivo y la retención técnica se ejecuta por procedimiento aprobado.

## 9. Restricciones e índices prioritarios

### Restricciones

- `unique(patient.carnet_normalized)` y `unique(patient.registration_code_normalized)` para pacientes activos.
- `unique(clinical_history.patient_id)`.
- `unique(clinical_encounter.appointment_id) where appointment_id is not null` si una cita sólo produce una atención principal.
- `unique(clinical_encounter.referral_id) where encounter_type = 'SPECIALTY' and status <> 'VOIDED'` si cada derivación admite una sola resolución principal; permitir seguimientos en nuevas derivaciones o bajo regla explícita.
- `unique(referral_id, document_id)` y `unique(referral_id, encounter_diagnosis_id)`.
- Índice parcial para impedir dos derivaciones activas del mismo paciente, especialidad y atención fuente: estados `PENDING_ASSIGNMENT`, `ASSIGNED`, `IN_PROGRESS`.
- `check(ends_at > starts_at)`, `check(capacity > 0)`, `check(booked_count between 0 and capacity)` en cupos.
- Restricción de exclusión por profesional y rango de tiempo para impedir solapamientos de cupos publicados cuando corresponda (`btree_gist` + `tstzrange`).
- `check(study_date <= current_date)` sólo si la institución confirma que no necesita cargar estudios futuros programados.

### Índices de acceso

| Consulta | Índice propuesto |
|---|---|
| Búsqueda administrativa | B-tree únicos en identificadores normalizados; `pg_trgm` GIN en nombre normalizado si se habilita búsqueda parcial. |
| Línea de tiempo | `clinical_encounter(patient_id, occurred_at desc)` con condición `status <> 'VOIDED'`. |
| Cartera del médico | `clinical_encounter(responsible_staff_id, occurred_at desc)` y `referral(assigned_staff_id, status, created_at desc)`. |
| Bandeja por especialidad | `referral(specialty_id, status, created_at)` parcial para estados activos. |
| Citas | `appointment(slot_id, status)`, `appointment(patient_id, scheduled_for desc)`. |
| Documentos | `clinical_document(patient_id, uploaded_at desc)` y `clinical_document(encounter_id)` parcial no nulo. |
| Diagnóstico y etiquetas | `encounter_diagnosis(condition_id, encounter_id)` y `encounter_tag(tag_id, encounter_id)`. |
| Reportes | Índices sobre fechas y FKs de tablas fuente; crear vistas materializadas sólo después de medir. |

No crear índices sobre cada columna por intuición: medir planes con datos representativos y mantener los índices compatibles con las expresiones de RLS.

## 10. Cumplimiento académico: cálculo correcto

No almacenar `patient.is_compliant` como fuente de verdad. Es un resultado derivado que puede cambiar si se anula una atención o se corrige una matrícula.

Una matrícula cumple si existe al menos una atención `CLOSED`, de tipo permitido, cuya fecha cae entre `academic_enrollment.started_on` y `coalesce(ended_on, fecha_actual)`. La vista de cumplimiento debe devolver además:

- `first_closed_encounter_at` y el período/carrera evaluados;
- motivo de pendiente (`NO_CLOSED_ENCOUNTER`, `NO_ACTIVE_ENROLLMENT`, etc.);
- fecha de cálculo y versión de regla;
- sólo los datos nominales necesarios para la operación autorizada.

Si la regla institucional significa "en cualquier momento de toda la carrera" y no "por gestión", usar la carrera como agrupación y todas sus matrículas vinculadas. Esa definición debe aprobarse antes de habilitar bloqueos administrativos; el requisito actual explícitamente indica que el reporte no bloquea matrícula automáticamente.

## 11. Migración desde los stores demo al backend

1. Crear proyecto Supabase, ambientes `dev`, `staging` y `prod`, y versionar todas las migraciones en `supabase/migrations`.
2. Crear primero catálogos, roles, perfiles, pacientes, historias y datos demo desidentificados. Importar fechas en UTC y validar duplicados antes de cargar.
3. Implementar Auth y el mapeo de sesiones a `profile`; mantener los roles demo sólo como adaptador de frontend hasta que las consultas reales estén listas.
4. Reemplazar el store por un repositorio/interfaz (`ClinicalRepository`) con dos implementaciones: demo y Supabase. Así las pantallas no dependen de detalles de `supabase-js`.
5. Migrar en este orden: admisión → historia/encuentro → adjuntos → derivación → cupos/citas → reportes → auditoría.
6. Activar RLS antes de conectar cada tabla a la UI. Probar acceso permitido y denegado con usuarios de cada rol en pruebas SQL.
7. Cargar archivos de prueba exclusivamente desidentificados en el bucket privado; no subir material clínico real durante desarrollo.
8. Retirar rutas demo de agenda/cola/teleconsulta sólo cuando sus sustitutos usen datos reales y los enlaces hayan sido auditados.

### Contratos de frontend que deben ajustarse

- Retirar `Appointment.type = "SPECIALTY"`; conservar `INITIAL | REFERRAL` y añadir `CHECKED_IN` a `AppointmentStatus` si se modela ingreso.
- Cambiar `ClinicalEncounterStatus = "DRAFT" | "CLOSED" | "AMENDED"` por `DRAFT | CLOSED | VOIDED`; exponer adendas como entidad, no estado.
- Cambiar arrays `Referral.diagnosisIds` y `documentIds` por relaciones en respuesta (`referral_diagnoses`, `referral_documents`) o DTO anidado; no persistir arrays de UUID como modelo relacional.
- Agregar `AcademicEnrollment`, `Consent`, `ClinicalAmendment`, `AppointmentStatusEvent`, `ReferralStatusEvent` y `ReportExport`.
- Sustituir `specialtyData?: Record<string, any>` por `specialtyTemplateId` y `specialtyData: Json` validado; crear DTOs tipados por especialidad para formularios/reportes críticos.

## 12. Pruebas de aceptación y seguridad antes de producción

### Flujos E2E

1. Registrar paciente con identificadores duplicados y comprobar que no crea una segunda historia.
2. Dos administrativos intentan reservar el último cupo al mismo tiempo: sólo una transacción tiene éxito.
3. Cerrar atención inicial con química sanguínea `ATTACHED` sin documento: falla; con documento disponible: cierra y la cita queda `ATTENDED`.
4. Intentar editar una atención cerrada: falla; crear una adenda: queda visible y auditada.
5. Crear derivación, seleccionar adjunto/diagnóstico del mismo paciente, asignarla, crear atención especializada y cerrarla.
6. Intentar crear atención especializada sin derivación ni autorización excepcional: falla en RPC y en acceso directo.
7. Calcular cumplimiento para cambio de carrera/período y verificar que no se use un booleano desactualizado.

### Pruebas de RLS y Storage

- Estudiante A no puede obtener paciente, cita, documento ni URL de Estudiante B.
- Administrativo no puede leer `assessment`, antecedentes, diagnósticos libres ni objeto de Storage.
- Especialista de Oftalmología no puede abrir derivación de Dermatología.
- Médico que ya atendió a un paciente conserva sólo el acceso definido por política, no acceso global a todos los estudiantes.
- Auditor ve evento de descarga, pero no la URL firmada ni el contenido descargado.
- Rol revocado pierde acceso con una sesión renovada; los helpers no dependen únicamente del JWT.
- No existe `service_role` en variables expuestas con prefijo `NEXT_PUBLIC_` ni en el bundle web.

### Operación y recuperación

- Definir responsable institucional de datos, matriz de acceso, política de retención, procedimiento de incidente y revisión periódica de permisos antes de usar datos reales.
- Ensayar restauración de base y documentos en un ambiente aislado; un backup no probado no es una estrategia de recuperación.
- Registrar métricas sin PII: latencia de RPC, errores de autorización, fallos de carga y colas de exportación.
- Revisar requisitos legales, consentimiento informado y residencia de datos aplicables a la universidad y jurisdicción antes de producción. Este documento no sustituye esa validación.

## 13. Decisiones que requieren aprobación institucional

1. ¿Ginecología entra en el MVP o queda inactiva como plantea la lista de especialidades iniciales?
2. ¿Qué rol puede aprobar una excepción a la derivación y con qué vigencia?
3. ¿Qué contenido clínico puede ver el estudiante y bajo qué consentimiento?
4. ¿Cuál es la definición oficial de "durante la carrera" para cumplimiento: carrera completa, gestión vigente o ambas?
5. ¿Se usarán códigos diagnósticos oficiales (por ejemplo, CIE-10) y quién administra el catálogo?
6. ¿Qué tipos/tamaños de archivo se permiten, cuánto se retienen y quién puede archivarlos?
7. ¿Qué reportes nominales, agregados y seudonimizados están autorizados y quién aprueba las exportaciones?
8. ¿Qué sistema académico se integrará y cuál será el contrato mínimo de datos?

Hasta resolver estos puntos, el backend debe usar configuraciones conservadoras: especialidades habilitadas explícitamente, acceso mínimo, ningún bucket público, ninguna exportación nominal automática y ninguna regla que bloquee la matrícula.

