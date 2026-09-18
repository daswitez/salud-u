# Contexto maestro del proyecto para agentes de desarrollo

## Visión

Este proyecto es una **plataforma de gestión clínica universitaria**. Su producto principal no es el agendamiento: es la historia clínica longitudinal y consultable de cada estudiante. El sistema digitaliza la atención inicial, el almacenamiento de exámenes/documentos, la derivación a especialistas y los reportes necesarios para la operación y la investigación autorizada.

## Flujo de atención obligatorio

```text
Administración registra o valida al estudiante
        ↓
Se crea/gestiona una cita por cupo si hace falta
        ↓
Médico de revisión estudiantil realiza atención inicial
        ↓
Historia clínica, diagnóstico(s), mediciones y adjuntos
        ↓
¿Requiere especialidad?
 ├─ no → cerrar atención / seguimiento
 └─ sí → derivación documentada → especialista → evolución y cierre
```

El estudiante no elige una especialidad directamente. La derivación clínica es la puerta clínica habitual hacia Dermatología, Oftalmología, Medicina Interna y Urología; sin embargo, Administración puede registrar una reserva directa de especialidad cuando la solicitud se recibe por el proceso operativo del centro. Esa reserva debe quedar identificada como administrativa/directa y no reemplaza ni inventa una derivación clínica.

## Problema que resuelve

Actualmente la información relevante queda distribuida entre papeles, fichas aisladas y documentos físicos. Esto impide reconstruir con facilidad qué recibió un estudiante, qué examen presentó, cuál fue el diagnóstico, si fue derivado y qué ocurrió después. También vuelve lentos los informes diarios, los controles de cumplimiento de la consulta obligatoria y las consultas para investigación institucional.

La plataforma debe resolver principalmente:

- registro único y encontrable del estudiante cuando llega a Administración;
- continuidad de la historia sin rehacer formularios ni perder antecedentes;
- sustitución gradual del papel por escaneos y fotografías clasificadas;
- derivación clínica con contexto suficiente para el especialista;
- consulta rápida de los pacientes vinculados a cada médico;
- reportes confiables de atenciones, diagnósticos, derivaciones y cumplimiento.

No debe interpretar el proceso como una reserva de servicios independientes. La reserva puede existir, pero el proceso asistencial comienza con la recepción administrativa y la revisión estudiantil.

## Principios del sistema

### La atención inicial es la entrada clínica

El médico de revisión estudiantil es el primer profesional clínico del recorrido. Registra la evaluación inicial, revisa o adjunta estudios disponibles y determina si procede seguimiento general o una derivación. El sistema no ofrece al estudiante un camino de reserva directa hacia una especialidad; Administración sí puede gestionar una solicitud directa cuando el centro la recibe así.

### Administración forma parte del flujo, no es un actor externo

El personal administrativo recibe al estudiante, lo identifica, corrige datos administrativos, crea o confirma la cita por cupo, registra asistencia y genera informes. Esta participación debe estar representada en los estados y en la auditoría, sin asignarle facultades clínicas.

### La historia es longitudinal y no se reemplaza

La primera atención puede crear la historia; cada atención posterior agrega una evolución fechada. La información anterior siempre queda disponible para usuarios autorizados. Un cierre clínico no se edita silenciosamente: cualquier corrección crea una adenda con autor, fecha y motivo.

### Documento clínico y archivo son datos de primera clase

No basta con guardar una URL de archivo. Un examen, fotografía o escaneo requiere clasificación, fecha de estudio, autor de carga, descripción y etiquetas. Así podrá ser recuperado desde la historia y usado en filtros/reportes permitidos.

### Reportar es parte del trabajo diario

Los reportes no son una función final o decorativa. Deben surgir de los datos capturados al atender, derivar y registrar al paciente. El panel debe ofrecer accesos rápidos para la operación cotidiana antes de habilitar análisis complejos.

## Actores y límites

| Actor | Puede | No puede |
|---|---|---|
| Estudiante | Solicitar cita y consultar información que la institución le habilite. | Auto-derivarse ni modificar información clínica. |
| Administrativo | Registrar estudiante, crear citas por cupo, marcar asistencia y generar informes autorizados. | Diagnosticar, editar evoluciones cerradas o alterar una derivación clínica. |
| Médico de revisión | Atender inicialmente, crear historia/evolución, adjuntar estudios y derivar. | Acceder a pacientes sin relación asistencial. |
| Especialista | Atender derivaciones de su especialidad y registrar evolución/cierre. | Convertir una cita general en atención especializada sin derivación o permiso extraordinario. |

### Permisos administrativos recomendados

No es necesario crear un rol humano adicional de coordinación. Los permisos pueden modular el rol administrativo, por ejemplo:

```text
REGISTER_PATIENT
UPDATE_ADMINISTRATIVE_PATIENT_DATA
MANAGE_APPOINTMENT_CAPACITY
MANAGE_APPOINTMENTS
VIEW_OPERATIONAL_REPORTS
EXPORT_AUTHORIZED_REPORTS
VIEW_AUDIT
```

Tener permiso de reporte no concede automáticamente acceso al texto clínico ni a imágenes. La visualización nominal o agregada depende del propósito y autorización institucional.

### Especialidades iniciales

Las especialidades configuradas para la primera versión son:

1. Dermatología.
2. Oftalmología.
3. Medicina Interna.
4. Urología.

El núcleo de la historia (revisión general) es la base común. Sobre ella, **cada especialidad tiene su propio historial o formulario específico** que captura datos categóricos propios (ej. exámenes de ginecología vs oftalmología). Esta separación estructural es fundamental para que cada especialista pueda generar reportes específicos y precisos de su área, aunque todos mantengan la capacidad de consultar el historial global completo unificado a través de la relación de estas especialidades con la atención base.


## Datos que deben existir

### Paciente

`carnet` y `código de registro` son identificadores únicos. Conservar: nombre completo, fecha de nacimiento o edad, carrera, contacto, estado académico y mediciones históricas como peso.

El número de carnet y el código de registro deben buscarse por coincidencia exacta y validarse al crear/editar. El nombre completo ayuda a localizar, pero no es suficiente para deduplicar. Si un estudiante ya existe, Administración actualiza únicamente datos administrativos permitidos y el sistema mantiene su historial.

### Datos de ingreso y datos clínicos

Conviene separar los campos para evitar que un ajuste administrativo modifique un dato médico:

| Grupo | Ejemplos | Responsable habitual |
|---|---|---|
| Identificación | carnet, código de registro, nombre, fecha de nacimiento | Administración |
| Académico | carrera, gestión/estado académico | Administración o integración institucional |
| Contacto | teléfono, correo, dirección si aplica | Administración/estudiante |
| Medición clínica | peso, presión u otra medida, fecha y unidad | Médico durante una atención |
| Contenido clínico | motivo, evaluación, diagnósticos, indicaciones | Médico |

La edad puede calcularse desde la fecha de nacimiento para evitar que envejezca como un dato estático. Si se guarda un valor por compatibilidad, debe indicar fecha de captura.

### Historia y atención

Hay una historia por paciente y muchas atenciones/evoluciones. Cada atención registra profesional, fecha, tipo inicial/especializada, motivo, evaluación, diagnósticos, indicaciones, mediciones, adjuntos y estado. Cerrar una atención no destruye lo anterior; una corrección se modela como adenda.

### Adjuntos

Los médicos pueden subir escaneos o fotografías. Cada adjunto tiene tipo (química sanguínea, radiografía, laboratorio, receta u otro), descripción, fecha del estudio, etiquetas, autor y relación con paciente/atención. Debe almacenarse de forma privada.

### Derivación

Una derivación tiene atención origen, paciente, especialidad destino, motivo de consulta, comentario para el especialista, médico emisor, especialista asignado opcional, fechas y estado. Estados: `PENDING_ASSIGNMENT`, `ASSIGNED`, `IN_PROGRESS`, `RETURNED`, `CLOSED`, `CANCELLED`.

### Cita y cupo

Las citas siguen existiendo para la organización administrativa. Pueden ser solicitadas por el estudiante o creadas por Administración y se limitan a cupos disponibles; los pacientes recurrentes usan los cupos habilitados. Estados: `REQUESTED`, `SCHEDULED`, `CANCELLED`, `NO_SHOW`, `ATTENDED`. Una cita atendida debe enlazarse a una atención clínica, pero no sustituye la historia.

Un cupo representa capacidad disponible para una atención, no un diagnóstico ni una especialidad elegida libremente por el estudiante. Cada médico publica sus días, rangos horarios, duración de cita y bloqueos; el sistema genera los turnos disponibles a partir de esa configuración. Administración usa esos turnos para reservar revisión o especialidad, sin sobre-reserva.

## Conceptos de dominio que no deben confundirse

| Concepto | Definición | No es |
|---|---|---|
| Perfil de paciente | Identidad y datos base del estudiante. | Una atención clínica. |
| Historia clínica | Expediente longitudinal del paciente. | Un único formulario editable. |
| Atención/evolución | Registro clínico de una consulta concreta. | Una cita ni una derivación. |
| Cita | Organización operativa de un cupo y asistencia. | Prueba de que se realizó una consulta. |
| Adjunto clínico | Archivo y metadatos vinculados a paciente/atención. | Una nota de texto sin origen. |
| Diagnóstico | Problema clínico codificado o etiquetado y su descripción. | La derivación. |
| Derivación | Solicitud clínica documentada hacia una especialidad. | Una reserva directa del estudiante. |
| Reporte | Vista filtrada para gestión, seguimiento o investigación autorizada. | Acceso libre a toda la historia. |

## Macroprocesos

### A. Admisión administrativa

Objetivo: identificar de forma segura al estudiante y dejarlo listo para atención sin crear fichas repetidas.

Incluye búsqueda, registro, actualización permitida de datos, creación de solicitud/cita por cupo, confirmación de llegada y consulta de restricciones de cumplimiento institucional.

### B. Atención inicial y expediente clínico

Objetivo: registrar la consulta de revisión estudiantil y consolidar el historial.

Incluye antecedentes autorizados, motivo de consulta, evaluación, mediciones, diagnósticos, indicaciones, documentos y cierre de la atención.

### C. Derivación y atención especializada

Objetivo: trasladar el caso al especialista con información clínica completa y trazable.

Incluye creación de derivación, asignación, gestión de cita especializada si aplica, evolución del especialista, devolución para seguimiento o cierre.

### D. Consulta y reportes

Objetivo: permitir a médicos y Administración encontrar información útil con rapidez y producir informes consistentes.

Incluye “Mis pacientes”, historial por filtros, accesos rápidos diarios, cumplimiento de consulta obligatoria, reportes de gestión e investigación autorizada.

### E. Seguridad y auditoría

Objetivo: proteger datos sensibles y poder responder quién accedió o modificó qué información y cuándo.

Incluye control de acceso, archivos privados, adendas, bitácora de consulta/descarga/exportación y retención de datos conforme a la política institucional.

## Proceso detallado de admisión administrativa

**Disparadores posibles:** estudiante llega presencialmente, llama/escribe solicitando atención o envía una solicitud desde su portal.

1. Administración busca al estudiante por carnet, código de registro o nombre.
2. Si encuentra coincidencia, confirma identidad y revisa datos administrativos mínimos.
3. Si no existe, registra al estudiante con carnet, código, nombres, fecha de nacimiento/edad, carrera y contacto.
4. El sistema bloquea el registro si carnet o código pertenecen a otro paciente.
5. Administración consulta el estado de cumplimiento de consulta obligatoria como información operativa, sin editarlo manualmente.
6. Se crea una solicitud o cita para atención inicial contra un cupo disponible.
7. Al llegar a la consulta, Administración registra asistencia o el médico confirma el inicio de la atención según el flujo definido.
8. Toda creación o actualización administrativa deja auditoría.

### Pacientes recurrentes

Un paciente recurrente no pierde su historia ni se registra nuevamente. Administración recupera el perfil existente, consulta atenciones y derivaciones solo en el nivel permitido, y gestiona la siguiente cita con los cupos disponibles. El sistema puede marcarlo como recurrente para filtros operativos, pero esta marca no debe alterar el criterio médico ni permitir sobrepasar cupos.

## Proceso detallado de atención inicial

**Disparador:** el estudiante con ingreso registrado llega a revisión estudiantil o el médico abre un paciente asignado.

1. El médico verifica identidad y abre el resumen clínico autorizado.
2. Revisa la línea de tiempo: atenciones, diagnósticos, mediciones, adjuntos y derivaciones previas.
3. Crea una nueva atención de tipo `INITIAL` en estado `DRAFT`.
4. Registra el motivo de consulta y los datos de evaluación necesarios.
5. Registra peso y otras mediciones con valor, unidad y fecha, sin sustituir mediciones históricas.
6. Añade uno o varios diagnósticos o problemas clínicos mediante etiqueta/catálogo y observación complementaria.
7. Registra indicaciones y, si corresponde, seguimiento esperado.
8. Adjunta el examen de química sanguínea si el estudiante lo presenta. Si no está disponible, marca `pendiente/no presentado` con su contexto.
9. Puede adjuntar otros documentos o fotografías, como radiografías, resultados de laboratorio o recetas.
10. Decide si el caso se cierra en revisión, requiere seguimiento o requiere derivación.
11. Cierra la atención. Después de este punto, el contenido principal es de solo lectura y cualquier corrección se realiza como adenda.

## Gestión de documentos y fotografías

Los documentos físicos se digitalizan desde la atención para evitar su dispersión. El sistema debe soportar un escaneo o una fotografía tomada con suficiente calidad; no debe exigir que todo documento sea escaneado formalmente si una imagen es más apropiada, como puede suceder con una radiografía.

### Metadatos mínimos de un adjunto

```text
patientId
encounterId (opcional si se adjunta al historial general)
type
studyDate
description
tags
uploadedBy
uploadedAt
storageReference
status
```

Tipos iniciales recomendados: `BLOOD_CHEMISTRY`, `LAB_RESULT`, `RADIOGRAPH`, `PRESCRIPTION`, `CLINICAL_PHOTO`, `REFERRAL_DOCUMENT`, `OTHER`.

### Reglas para archivos

- Validar formato, tamaño y legibilidad antes de marcarlo disponible.
- Permitir descripción para explicar por qué es clínicamente relevante.
- Mostrar al especialista únicamente los adjuntos vinculados/autorizados para su derivación o historial.
- Conservar el original; si se reemplaza una versión, mantener la relación entre versiones y la auditoría.
- No incrustar archivos privados en enlaces públicos ni enviarlos por notificaciones.

## Proceso detallado de derivación

**Precondición:** existe una atención inicial abierta o cerrada que fundamenta la necesidad clínica.

1. El médico de revisión selecciona “Derivar” desde la atención.
2. Selecciona una de las especialidades habilitadas.
3. Registra un motivo de consulta claro: qué se observó, qué se requiere evaluar y cuál es el problema relevante.
4. Añade un comentario dirigido al especialista con antecedentes, preguntas clínicas o indicaciones de continuidad.
5. Selecciona diagnósticos y adjuntos relevantes que quedarán contextualizados para el especialista.
6. El sistema crea la derivación en `PENDING_ASSIGNMENT` y registra emisor, fecha y atención origen.
7. Administración gestiona, si corresponde, el cupo/cita de la atención especializada; no edita el motivo ni el comentario clínico.
8. Al asignarse un profesional, la derivación pasa a `ASSIGNED`.
9. El especialista la inicia (`IN_PROGRESS`), registra su evolución y decide `CLOSED` o `RETURNED`.
10. Una devolución debe incluir una nota clínica y no borra el registro original de derivación.

### Calidad del motivo y comentario

El motivo y comentario no son la misma cosa. El motivo identifica la razón de derivar; el comentario entrega contexto o solicitud al especialista. Ambos son obligatorios para evitar que la derivación se convierta en una simple selección de especialidad sin información clínica.

## Proceso detallado de atención especializada

1. El especialista abre únicamente derivaciones asignadas a su especialidad y pacientes con relación clínica autorizada.
2. Visualiza el motivo, comentario, atención origen, diagnósticos y adjuntos relacionados.
3. Crea una atención `SPECIALTY` vinculada a la derivación; no sobrescribe la evaluación inicial.
4. Registra evolución, diagnósticos adicionales/actualizados, indicaciones, estudios y documentos.
5. Puede solicitar continuidad dentro de su atención según reglas institucionales o devolver el caso al médico de revisión.
6. Al cerrar, el sistema actualiza el estado de derivación y conserva ambas atenciones en la línea de tiempo del paciente.

## Historial y cartera de pacientes del médico

La pantalla “Mis pacientes” es una función central para cada médico. No debe mostrar una lista global sin control, sino los pacientes que el médico:

- tiene asignados para atención;
- atendió previamente;
- recibió mediante derivación;
- debe seguir por una derivación devuelta, si la política lo permite.

### Columnas recomendadas

```text
Paciente | Carnet/código | Carrera | Edad | Última atención |
Último diagnóstico | Estado de derivación | Próxima acción autorizada
```

### Filtros recomendados

- texto por nombre, carnet o código;
- fecha o rango de atenciones;
- diagnóstico/enfermedad o etiqueta;
- médico y especialidad, cuando el permiso lo permita;
- carrera;
- rango de edad;
- paciente recurrente;
- estado de atención y estado de derivación;
- tipo de documento adjunto.

Los filtros deben poder combinarse y conservarse durante la navegación de vuelta desde una ficha. El sistema debe indicar claramente cuando no hay resultados y no confundir “sin pacientes autorizados” con “filtro sin coincidencias”.

## Reportes y accesos rápidos

### Reportes operativos diarios

Los reportes que el personal necesita todos los días son:

1. Pacientes atendidos hoy, con fecha, médico y estado.
2. Diagnósticos registrados hoy y su frecuencia.
3. Derivaciones creadas hoy, pendientes de asignación, en curso, devueltas y cerradas.
4. Pacientes recurrentes atendidos o con cita vigente, respetando cupos.
5. Documentos/exámenes cargados o pendientes, cuando sea pertinente para seguimiento.

### Cumplimiento de consulta médica obligatoria

Una consulta cuenta solo cuando existe una atención clínica cerrada. El reporte debe permitir filtrar por carrera, gestión o período y separar estudiantes cumplidos de pendientes. Administración podrá usarlo como insumo para el proceso institucional de inscripción; una integración externa sería la responsable de cualquier bloqueo académico, nunca una acción implícita del frontend.

### Investigación y análisis autorizado

Los médicos que además realizan investigación pueden requerir datos como edad, carrera, peso, diagnóstico y fecha. El sistema debe permitir filtros y exportaciones autorizadas, pero ofrecer por defecto la mínima identificación necesaria y preferir resultados agregados o seudonimizados cuando el estudio lo permita. Siempre registrar finalidad, solicitante, filtros y fecha de exportación.

## Estados y transiciones relevantes

### Atención clínica

```text
DRAFT → CLOSED
CLOSED → AMENDED (mediante adenda, sin borrar el cierre)
```

Una atención `DRAFT` solo está visible para el profesional autorizado y colaboradores explícitos según política. Una atención `CLOSED` entra al historial y puede contar para cumplimiento institucional.

### Derivación

```text
PENDING_ASSIGNMENT → ASSIGNED → IN_PROGRESS → CLOSED
                                      └──────→ RETURNED
PENDING_ASSIGNMENT / ASSIGNED → CANCELLED (con motivo y auditoría)
```

### Cita

```text
REQUESTED → SCHEDULED → ATTENDED
           ├──────────→ CANCELLED
           └──────────→ NO_SHOW
```

La transición a `ATTENDED` exige una atención clínica vinculada, salvo un estado técnico transitorio definido por backend para evitar inconsistencias durante el guardado.

## Casos de uso prioritarios

1. Administración busca por carnet/código, registra o actualiza al estudiante y gestiona un cupo.
2. Médico abre “Mis pacientes”, encuentra sus pacientes asignados/atendidos/derivados y filtra por diagnóstico, fecha, carrera, edad y estado.
3. Médico crea una atención inicial con diagnóstico, peso, indicaciones y examen de química sanguínea adjunto o marcado pendiente.
4. Médico adjunta documentos escaneados y fotos de radiografías u otros estudios.
5. Médico de revisión crea derivación con motivo y comentario; especialista recibe, evoluciona y cierra/devuelve.
6. Personal autorizado consulta reportes de atendidos hoy, diagnósticos, derivaciones y cumplimiento de consulta obligatoria.

## Reportes

Los accesos rápidos mínimos son: pacientes atendidos hoy, diagnósticos del día, derivaciones creadas/pendientes/cerradas y cumplimiento de consulta médica obligatoria. Los filtros incluyen fecha, médico, especialidad, diagnóstico/etiqueta, carrera, rango de edad, estado de derivación, asistencia y paciente recurrente. Las exportaciones deben registrar actor, fecha, filtros y finalidad.

La consulta médica obligatoria queda cumplida solo si existe al menos una atención clínica cerrada durante la carrera. El reporte sirve de insumo administrativo; el sistema no debe ejecutar bloqueos académicos por sí mismo sin integración y decisión institucional explícita.

## Seguridad y auditoría

- Aplicar permisos por rol **y** relación clínica con el paciente.
- Cifrar datos en tránsito y reposo; no registrar contenido clínico en logs.
- Usar almacenamiento de objetos privado para adjuntos, validación de tipo/tamaño y enlaces temporales.
- Auditar creación/cierre/adenda de atención, acceso a historia, descarga de adjunto, cambios de derivación y exportación de reportes.
- Minimizar datos en reportes de investigación y seudonimizar cuando el propósito lo permita.

## Arquitectura guía

El backend es la fuente de verdad para permisos, historial, estados y auditoría. Separar dominios `patients`, `appointments`, `clinical`, `documents`, `referrals`, `reporting`, `identity` y `audit`. Para consultas relevantes, indexar carnet, código de registro, paciente+fecha, médico+fecha, especialidad+estado y diagnóstico/etiqueta+fecha.

### Responsabilidad de frontend y backend

El frontend guía los flujos, valida campos evidentes y evita errores de captura, pero no es fuente de verdad de permisos, cupos, estados ni auditoría. El backend debe volver a validar toda operación sensible y responder con estados normalizados.

```text
Frontend web/móvil
        │ HTTPS
        ▼
Backend transaccional
 ├── identidad y autorización
 ├── pacientes y citas
 ├── historia, diagnósticos y mediciones
 ├── documentos privados
 ├── derivaciones
 ├── reportes y exportaciones
 └── auditoría
        │
        ├── Base de datos relacional
        └── Almacenamiento privado de archivos
```

El proyecto puede implementarse como un monolito modular. No se requiere un microservicio de IA para el alcance actual. Si en el futuro existe una integración académica para consulta de carrera o cumplimiento, debe ser explícita, tolerante a fallos y no bloquear el registro clínico.

### Relación entre entidades

```text
Patient 1 ─── 1 ClinicalHistory
Patient 1 ─── N Appointment
Patient 1 ─── N ClinicalEncounter
ClinicalHistory 1 ─── N ClinicalEncounter
ClinicalEncounter 1 ─── N Diagnosis
ClinicalEncounter 1 ─── N Measurement
ClinicalEncounter 1 ─── N ClinicalDocument
ClinicalEncounter 1 ─── N Referral (origen)
Referral N ─── 1 Specialty
Referral 0..1 ─── 1 ClinicalEncounter (atención especializada)
Patient 1 ─── N ClinicalDocument (adjunto general permitido)
```

Una derivación puede requerir más de una atención especializada si el negocio lo autoriza; en ese caso la relación debe modelarse como evoluciones vinculadas a la misma derivación, sin perder el primer encuentro.

### Servicios de aplicación sugeridos

| Servicio | Responsabilidad |
|---|---|
| `PatientService` | Alta, búsqueda, deduplicación y actualización administrativa segura. |
| `AppointmentService` | Solicitudes, cupos, estados, asistencia y vínculo con atención. |
| `ClinicalHistoryService` | Lectura de resumen/historial y creación de atenciones/adendas. |
| `DocumentService` | Carga, validación, acceso temporal, metadatos y clasificación de adjuntos. |
| `ReferralService` | Creación, asignación, transiciones y vínculo a atención especializada. |
| `ReportService` | Consultas rápidas, filtros, agregación, exportación y minimización de datos. |
| `AuditService` | Bitácora inmutable de acciones sensibles. |

## Contratos de API de referencia

Los nombres son orientativos. La API definitiva puede variar, pero debe conservar los límites de responsabilidad y los campos clínicos esenciales.

### Pacientes y admisión

```http
GET  /api/v1/patients?carnet=&registrationCode=&query=
POST /api/v1/patients
GET  /api/v1/patients/{patientId}
PATCH /api/v1/patients/{patientId}
POST /api/v1/appointments
POST /api/v1/appointments/{appointmentId}/mark-attended
```

La creación de paciente debe devolver un error de conflicto legible cuando carnet o código ya estén registrados. La consulta por nombre debe restringirse por permisos y usar paginación.

### Historia y documentos

```http
GET   /api/v1/patients/{patientId}/history
POST  /api/v1/patients/{patientId}/encounters
GET   /api/v1/encounters/{encounterId}
PATCH /api/v1/encounters/{encounterId}
POST  /api/v1/encounters/{encounterId}/close
POST  /api/v1/encounters/{encounterId}/amendments
POST  /api/v1/encounters/{encounterId}/documents
GET   /api/v1/documents/{documentId}/access
```

`PATCH` solo funciona sobre borradores. Para una atención cerrada, el endpoint de adenda crea un registro adicional y no reescribe el cuerpo original.

### Derivaciones y cartera médica

```http
POST      /api/v1/encounters/{encounterId}/referrals
GET       /api/v1/referrals?status=&specialty=&assignedDoctorId=
GET       /api/v1/referrals/{referralId}
POST      /api/v1/referrals/{referralId}/assign
POST      /api/v1/referrals/{referralId}/start
POST      /api/v1/referrals/{referralId}/return
POST      /api/v1/referrals/{referralId}/close
GET       /api/v1/doctors/me/patients?diagnosis=&from=&to=&career=&ageFrom=&ageTo=
```

El endpoint de “Mis pacientes” debe aplicar el alcance del médico en backend, incluso si el frontend oculta filtros no permitidos.

### Reportes

```http
GET  /api/v1/reports/daily-attended?date=
GET  /api/v1/reports/daily-diagnoses?date=
GET  /api/v1/reports/referrals?from=&to=&status=&specialty=
GET  /api/v1/reports/mandatory-consultation?career=&term=
POST /api/v1/reports/exports
```

Una exportación debe conservar los filtros usados, el formato solicitado, la finalidad y el actor. Si el rol solo puede ver agregados, la exportación tampoco debe contener filas nominales.

## Integridad, concurrencia y errores

### Identidad única del paciente

La base de datos debe imponer restricciones únicas para carnet y código de registro. El flujo recomendado es:

1. Buscar antes de crear para una buena experiencia.
2. Intentar crear dentro de transacción.
3. Capturar violación de unicidad si dos operadores registran al mismo estudiante a la vez.
4. Mostrar el perfil existente sin revelar información excesiva a un rol sin permiso.

### Cupos limitados

Los cupos se validan en backend dentro de una transacción. Dos operadores no deben poder confirmar más citas que la capacidad habilitada. Cuando el sistema no pueda confirmar, debe devolver un conflicto y sugerir volver a la lista/alternativas administrativas, no crear una cita “pendiente” invisible.

### Cierre clínico

Antes de cerrar una atención, el backend valida paciente, médico responsable, motivo, estado de evaluación, diagnósticos cuando aplique y la coherencia de adjuntos. No debe exigir un examen de química sanguínea si la operación permite que esté pendiente, pero sí debe guardar claramente dicho estado.

### Derivación

No se puede derivar sin especialidad, motivo ni comentario. Tampoco se puede iniciar una derivación cancelada/cerrada, ni cerrar una que no fue iniciada sin una transición administrativa/clinica explícita y auditada.

### Estados de UI

Todas las pantallas de datos deben contemplar `loading`, `success`, `empty`, `error` y `unauthorized`. Un error recuperable debe indicar qué hacer: corregir datos, reintentar, volver a la lista o pedir permisos. Nunca mostrar detalles clínicos en el mensaje de error de un permiso denegado.

## Eventos de dominio y auditoría

No es obligatorio adoptar un bus de eventos externo en el MVP; estos pueden ser eventos internos y trabajos asíncronos. Sin embargo, son útiles para desacoplar auditoría, notificaciones no clínicas y actualización de reportes.

```text
PATIENT_REGISTERED
PATIENT_ADMIN_DATA_UPDATED
APPOINTMENT_CREATED
APPOINTMENT_STATUS_CHANGED
ENCOUNTER_CREATED
ENCOUNTER_CLOSED
ENCOUNTER_AMENDED
CLINICAL_DOCUMENT_UPLOADED
CLINICAL_DOCUMENT_ACCESSED
REFERRAL_CREATED
REFERRAL_ASSIGNED
REFERRAL_STARTED
REFERRAL_RETURNED
REFERRAL_CLOSED
REPORT_EXPORTED
```

Cada evento clínico debe almacenar el identificador de recurso, actor, momento, resultado y `requestId`/correlación. El log de auditoría no debe duplicar el texto completo de la evaluación, diagnóstico o documento.

## Seguridad, privacidad y retención

### Autorización contextual

El RBAC por sí solo no basta. El sistema necesita combinar rol, especialidad cuando aplique y relación con el paciente. Por ejemplo, un especialista de Dermatología no debe abrir una derivación de Urología solo por tener el rol “médico”.

### Protección de adjuntos

- Almacenar los archivos fuera de la BD, en contenedor privado.
- Validar MIME real y extensión; limitar tamaño y resolver cargas fallidas.
- Analizar malware cuando la infraestructura lo permita.
- Emitir enlaces firmados de duración corta en vez de URL públicas persistentes.
- Registrar cada descarga, previsualización sensible y rechazo de archivo.

### Protección en interfaz

- No mostrar diagnósticos, nombres ni carnet en notificaciones genéricas.
- Limpiar datos sensibles al cerrar sesión o cambiar de usuario en un dispositivo compartido.
- Ocultar acciones sin permiso; aun así, el backend debe rechazarlas.
- Evitar enlaces compartibles de historia clínica y parámetros URL con contenido sensible.

### Retención y eliminación

La política de retención debe ser definida por la institución. Mientras no exista una política aprobada, el sistema no debe implementar borrado físico de atenciones, diagnósticos, derivaciones ni adjuntos. Las bajas operativas se realizan por estado, revocación de acceso o archivo lógico conforme a las normas aplicables.

## Experiencia de usuario y pantallas

### Inicio administrativo

Debe priorizar búsqueda de estudiante, alta rápida, próximas solicitudes/citas por cupo, asistencias del día y atajos a reportes. El administrativo necesita completar la toma de datos sin navegar por información clínica no autorizada.

### Inicio médico

Debe priorizar pacientes pendientes/asignados, botón “Nueva atención”, derivaciones pendientes, atenciones cerradas hoy y accesos a reportes personales. No debe iniciar en una vista de programación operativa.

### Ficha del paciente

Debe contener una cabecera persistente con nombre, carnet, código, edad, carrera y alertas permitidas; debajo, pestañas o secciones para línea de tiempo, diagnósticos, documentos, derivaciones y nueva atención. La vista debe dejar claro qué información es de solo lectura y cuál puede editarse.

### Formulario de atención

El formulario común debe seguir un orden clínico entendible: motivo, evaluación, mediciones, diagnósticos, indicaciones, adjuntos, derivación opcional y cierre. Guardar borrador debe ser visible y no cerrar la atención de forma automática.

### Panel de derivaciones

Debe permitir diferenciar fácilmente pendientes de asignación, asignadas, en curso, devueltas y cerradas. Cada fila muestra paciente, especialidad, fecha, médico emisor, motivo resumido y próxima acción; el detalle completo se abre solo con permiso.

### Reportes

El reporte inicia con accesos rápidos diarios, período visible y filtros. Las columnas nominales deben depender del rol; los gráficos agregados nunca sustituyen las tablas cuando la operación necesita identificar pacientes autorizados.

## Requisitos no funcionales de referencia

- Las búsquedas comunes por carnet/código y “Mis pacientes” deben responder en menos de tres segundos bajo la carga objetivo.
- La creación de una atención, derivación o adjunto debe ser atómica desde la perspectiva del usuario: éxito confirmado o error claro, sin duplicados silenciosos.
- Las cargas de archivos deben poder reintentarse sin duplicar el documento.
- La aplicación debe mantener trazabilidad de cambios y exportaciones aun si los servicios de notificación fallan.
- Formularios y tablas deben funcionar con teclado, lectores de pantalla y contraste suficiente.
- El sistema debe aplicar paginación y filtros en backend; no descargar historiales masivos al navegador.

## Estrategia de pruebas

### Pruebas de negocio

- Registro de paciente nuevo y rechazo de carnet/código duplicado.
- Paciente recurrente que conserva todas sus atenciones previas.
- Atención inicial cerrada con examen adjunto y con examen pendiente/no presentado.
- Derivación válida y rechazo de motivo/comentario/especialidad faltante.
- Especialista que solo abre derivaciones asignadas/autorizadas.
- Adenda que preserva el texto de la atención cerrada.
- Cumplimiento obligatorio calculado solo con atención cerrada.

### Pruebas de permisos

- Administrativo que intenta modificar contenido clínico.
- Médico que intenta abrir paciente sin relación asistencial.
- Especialista que intenta abrir derivación de otra especialidad.
- Usuario con reporte agregado que intenta exportar detalle nominal.
- Acceso y descarga de adjunto sin permiso.

### Pruebas de integración y carga

- Dos registros simultáneos con el mismo carnet/código.
- Dos intentos de usar el último cupo disponible.
- Carga de documento, fallo de procesamiento y reintento idempotente.
- Filtros combinados en cartera médica y reportes con paginación.

## Convenciones de implementación

- Usar los términos `patient`, `clinicalEncounter`, `clinicalHistory`, `referral`, `clinicalDocument` y `appointment`; evitar reutilizar “cita” como nombre de historia o atención.
- Mantener diagnóstico/etiqueta normalizada y texto libre complementario.
- Validar y mostrar claramente datos ausentes: “pendiente/no presentado” para estudios no disponibles, nunca un valor inventado.
- Diseñar primero el formulario clínico común; las secciones propias de cada especialidad son extensiones, no historias separadas.
- Toda pantalla clínica debe indicar paciente, identificador, contexto, estado y permisos de acción.

## Fuera de alcance

No implementar reserva directa por especialidad ni mecanismos ajenos al núcleo de gestión clínica. Tampoco eliminar físicamente evoluciones, diagnósticos o adjuntos clínicos.

## Orden de implementación

1. Identidad y registro único de estudiante.
2. Historia clínica, atención/evolución, diagnósticos y mediciones.
3. Adjuntos clínicos privados.
4. Derivaciones y atención especializada.
5. Citas por cupo como apoyo administrativo.
6. Mis pacientes, filtros, reportes diarios, cumplimiento y auditoría.
