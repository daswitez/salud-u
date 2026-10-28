# Backlog de integración del frontend Salud-U

Fuente vigente del cierre C: `MSD-Documento proyecto de grado Ver.1.10 u.docx` (27/10/2026). Fuente histórica de la integración: `Proyecto Daniel Mercado v2 db.md`, cuadros 3.16 (RF-01–RF-34), 3.17 (RNF-01–RNF-12), 3.18 (RN-01–RN-32), 3.36 (UC-01–UC-27) y especificaciones críticas de UC-07/12/13/15/17/22. Referencia de implementación: 24 rutas `src/app/api`, Server Actions, consultas directas y SQL de `supabase/migrations`/`complete_schema.sql`.

Estado (2026-10-26): historias FE-CON…FE-INV integradas y FE-CORTE aceptada localmente con datos sintéticos; corte productivo pendiente de validación con el personal del centro y de las condiciones 4–5 de BE-CORTE. La secuencia técnica obligatoria está en [plan-integracion-spring.md](plan-integracion-spring.md). Las referencias SQL sin ruta no se presentan como endpoints HTTP existentes. El contrato final debe caracterizar la última definición de cada RPC y sus políticas, no solo la migración inicial.

## Condición para comenzar

Este backlog se ejecuta después de desarrollar y probar el backend del alcance correspondiente. No incluye implementar dominio/SQL en Next.js. Cada historia frontend está bloqueada hasta que su historia backend tenga contrato y pruebas aceptados. La secuencia principal es backend → validación API → integración frontend; una entrega incremental exige el mismo cierre previo del backend de ese incremento. Supabase ya fue retirado del frontend (FE-CORTE); H-CORTE sigue sin aceptarse para un corte productivo y no se declara paridad institucional hasta completar el ensayo de migración, la estrategia de cuentas y la validación con el centro.

Trabajar exclusivamente en `codigo/salud-u`, rama `backend`; verificar `git branch --show-current` antes de editar. Backend en proyecto separado sin inicializar Git; `codigo` tampoco será repositorio. Leer las guías locales de Next.js antes de cambios de código.

## Épica F0 — Conexión y sesión

### FE-CON · H-CON — Conectar Next.js con API probada

- **Actor:** Desarrollador frontend.
- **Historia:** Como desarrollador, quiero conectar navegador y componentes de servidor a Spring, para consumir la API ya probada.
- **Comportamiento esperado:** configurar acceso de mismo origen o CORS explícito, reenviar sesión/Set-Cookie, enviar CSRF y normalizar los dos contratos de error sin alterar contratos: texto para `/api/**`, objeto detallado para `/api/v1/**`.
- **Dependencias:** T-04, BE-01; contrato backend aceptado.
- **Prioridad:** P0.
- **Aceptación:** credenciales de servidor no aparecen en bundle; cookie llega en navegación y fetch; /api/me usa user, reportes filters; SSR y cliente resuelven mismo actor; caducidad redirige sin perder borrador; error/red recuperable; `GET /api/health` devuelve `service=backend`; `/api/health/supabase` se elimina sin fallback; ninguna regla de routeo captura rutas serverless que aún no fueron migradas.
- **Prueba:** navegador con sesión real Spring, inspección de solicitudes/cookies y compilación/typecheck/lint del frontend.

## Épica F1 — Identidad, sesión y organización

### FE-01 · UC-01

- **Actor:** Usuarios internos y estudiante.
- **Historia:** Como Usuarios internos y estudiante, quiero autenticarme y obtener mi identidad y permisos vigentes desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-01 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-01; RF-01.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-01 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** GET /api/me; src/app/actions/session.ts; demo-session.ts; Supabase Auth.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-01, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-01 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.
- **Estado local (2026-10-18):** implementado y comprobado por HTTP con Spring local: login `200`, identidad/recarga `200`, logout `204`, sesión posterior `401` y credenciales inválidas `401`. Pendiente únicamente la regresión visual automatizada del corte integral FE-CORTE.

### FE-CAT · Administrar catálogos y organización

- **Actor:** Administrativo autorizado. **Historia:** Como Administrativo autorizado, quiero gestionar roles/personal/especialidades/carreras y catálogos clínicos desde la interfaz.
- **Comportamiento esperado:** consumir contratos de BE-CAT y presentar sus estados.
- **Prioridad:** P1. **Dependencia:** BE-CAT probado, FE-CON.
- **Aceptación:** operación válida refleja datos tras recarga; inválida muestra error conservando formulario; permisos y estados de BE-CAT observables; ninguna llamada Supabase en este flujo.
- **Prueba:** navegación, edición y error de permiso/validación.
- **Defecto corregido (2026-10-24):** se corrigió el mapeo `rols AS roles` de `GET /api/v1/admin/principals`, V44 representa cuentas sin roles como `[]` y los fallos internos de persistencia devuelven `500` sanitizado. Chromium comprobó listado `200`, recarga/identidad `200`, estudiante `403` y ausencia de sesión `401`. Pasan 94 pruebas Java. [Evidencia de la corrección](evidencia-fecat-cuentas.md). El cierre completo de las operaciones FE-CAT conserva sus criterios anteriores.

### FE-PER · Perfil y contraseña

- **Actor:** Usuario autenticado. **Historia:** Como Usuario autenticado, quiero actualizar nombre/email y cambiar contraseña comprobando la actual desde la interfaz.
- **Comportamiento esperado:** consumir contratos de BE-PER y presentar sus estados.
- **Prioridad:** P1. **Dependencia:** BE-PER probado, FE-CON.
- **Aceptación:** operación válida refleja datos tras recarga; inválida muestra error conservando formulario; permisos y estados de BE-PER observables; ninguna llamada Supabase en este flujo.
- **Prueba:** navegación, edición y error de permiso/validación.
- **Estado local (2026-10-18):** implementado contra Spring local. Se eliminaron las escrituras Supabase de perfil; actualización y contraseña usan CSRF y contratos `/api/v1/profile`. Se verificaron éxito, contraseña actual inválida, revocación de sesión y reautenticación con datos demo restaurados. Pendiente únicamente la regresión visual automatizada de FE-CORTE.

## Épica F2 — Admisión y pacientes

### FE-02 · UC-02

- **Actor:** Administrativo.
- **Historia:** Como Administrativo, quiero registrar, buscar y actualizar un paciente con una historia longitudinal única desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-02 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-02; RF-02, RF-03.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-02 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** GET/POST /api/patients; GET/PATCH /api/patients/{id}; rpc_register_or_update_patient.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-02, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-02 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.
- **Estado local (2026-10-18):** implementado contra Spring local. `/api/careers`, `GET/POST /api/patients` y `GET/PATCH /api/patients/{id}` se reenvían al backend; los Route Handlers Supabase de pacientes fueron eliminados. Se validaron listado, creación, detalle, edición, error `400` y rechazo `403` a estudiante. Pendiente únicamente la regresión visual automatizada de FE-CORTE.

## Épica F3 — Disponibilidad, solicitudes y citas

### FE-04 · UC-04

**Corrección verificada (2026-10-26):** `/api/my-specialties` se reenvía exactamente a Spring, con afiliaciones propias activas y permisos; retirado el handler Supabase. Se corrigió además la adaptación de los nombres internos de jornadas/bloqueos/cupos al contrato de gestión. Jornada de especialista guardada desde pantalla y recuperada tras recarga. [Ensayo FE-24](evidencia-fe24.md).

- **Actor:** Médico de revisión / especialista.
- **Historia:** Como Médico de revisión / especialista, quiero configurar jornadas, bloqueos y cupos publicados para mi disponibilidad desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-04 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-04; RF-05.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-04 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** GET/POST/DELETE /api/availability-slots; rpc_replace_my_availability_schedule, rpc_publish_availability_slot, rpc_create_my_availability_block, rpc_delete_my_availability_block.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-04, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-04 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.
- **Estado local (2026-10-18):** implementado contra Spring local. `GET/POST/DELETE /api/availability-slots` se reenvía al backend y el Route Handler Supabase fue eliminado. Se validaron gestión, jornada, cupos, creación/eliminación de bloqueo y rechazo `403` a Administración. Pendiente únicamente la regresión visual automatizada de FE-CORTE.

### FE-05 · UC-05

- **Actor:** Estudiante / Administrativo.
- **Historia:** Como Estudiante / Administrativo, quiero solicitar una revisión y consultar o cancelar mi solicitud pendiente desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-05 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-05; RF-06.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-05 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** GET/POST /api/appointment-requests; PATCH /api/appointment-requests/{id}; rpc_create_initial_appointment_request, rpc_create_appointment_request_for_patient, rpc_cancel_appointment_request.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-05, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-05 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.
- **Estado local (2026-10-18):** implementado contra Spring local. `GET/POST /api/appointment-requests` y `PATCH /api/appointment-requests/{id}` se reenvían al backend; se eliminaron los Route Handlers Supabase de listado/alta/cancelación y se preservó `/assign` para FE-07. Spring ahora entrega motivo de cancelación y, cuando existe, datos de la cita asignada. A través de Next, con cuenta estudiantil y paciente de prueba vinculados, se validó `200` listado, `201` creación, recarga `200`, cancelación `200` y la persistencia del motivo; médico ajeno recibe `403`. TypeScript y ESLint focalizados pasan. Pendiente únicamente la regresión visual automatizada de FE-CORTE.

### FE-06 · UC-06

- **Actor:** Administrativo.
- **Historia:** Como Administrativo, quiero crear una solicitud de especialidad directa diferenciada de una derivación desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-06 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-06; RF-06.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-06 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** POST /api/appointment-requests; rpc_create_appointment_request_for_patient.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-06, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-06 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.
- **Estado local (2026-10-18):** implementado contra Spring local desde la pantalla administrativa de programación. `POST /api/appointment-requests` acepta ahora `appointmentType: "SPECIALTY"` con paciente y especialidad; el listado devuelve `specialty_id` para conservar la selección tras recargar. `/api/specialties` se reenvía a Spring y su Route Handler Supabase fue eliminado. A través de Next se validaron catálogo `200`, error sin especialidad `400`, creación `201`, recarga `200` con especialidad persistida, cancelación de limpieza `200` y rechazo `403` a estudiante. TypeScript y ESLint focalizados pasan. Pendiente únicamente la regresión visual automatizada de FE-CORTE.

### FE-07 · UC-07

- **Actor:** Administrativo.
- **Historia:** Como Administrativo, quiero asignar una solicitud pendiente a un médico y cupo compatibles desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-07 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-07; RF-07.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-07 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** POST /api/appointment-requests/{id}/assign; rpc_assign_appointment_request.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-07, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-07 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.
- **Estado local (2026-10-18):** implementado contra Spring local. La ruta exacta `POST /api/appointment-requests/{id}/assign` se reenvía a Spring y se eliminó su Route Handler Supabase; la pantalla administrativa existente conserva estado de carga, mensaje recuperable y recarga de la bandeja. El recorrido vía Next comprobó alta de solicitud `201`, asignación `200` con `data.appointmentId`, recarga `ASSIGNED/SCHEDULED` y cupo reservado (`bookedCount: 1`); cupo vacío devuelve `400`, una repetición devuelve `409` sin nueva reserva y un estudiante recibe `403`. Spring traduce ahora los conflictos SQL de asignación a mensajes del contrato legado. `mvn clean test` (81 pruebas), TypeScript y ESLint focalizados pasan. La cita sintética creada queda como semilla local; pendiente únicamente la regresión visual automatizada de FE-CORTE.

### FE-08 · UC-08

- **Actor:** Administrativo; estudiante para cancelar su solicitud.
- **Historia:** Como Administrativo; estudiante para cancelar su solicitud, quiero registrar llegada o ausencia y cancelar en las condiciones permitidas desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-08 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-08; RF-08.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-08 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** POST /api/appointments/{id}/check-in, /no-show; PATCH /api/appointment-requests/{id}; rpc_check_in_appointment, rpc_mark_appointment_no_show, rpc_cancel_appointment_request.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-08, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-08 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.
- **Estado local (2026-10-24):** cerrada localmente. Recorrido Chromium aprobado contra Spring: llegada, ausencia, cancelación pendiente/asignada, persistencia tras recarga, teclado, error de red conservando motivo, conflicto `409`, permiso `403`, solicitud ajena `404` y ausencia de llamadas Supabase del navegador. Se retiraron los handlers de llegada/ausencia; Flyway V42 completa la paridad de fechas, motivos y cancelación atómica. Pasan 87 pruebas Java (incluida concurrencia PostgreSQL), typecheck, lint focalizado y build de producción. Evidencia y comandos en [evidencia-fe08.md](evidencia-fe08.md). El corte integral de los demás módulos continúa en FE-CORTE.

## Épica F4 — Revisión clínica, antecedentes y documentos

### FE-09 · UC-09

- **Actor:** Médico asignado.
- **Historia:** Como Médico asignado, quiero iniciar o recuperar el encuentro borrador de una cita asignada desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-09 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-09; RF-09.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-09 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** GET /api/medical/appointments; POST /api/medical/appointments/{id}/start; rpc_open_encounter.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-09, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-09 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.
- **Estado local (2026-10-24):** cerrada localmente. Agenda y apertura/recuperación consumen Spring por rewrites exactos; handlers Supabase retirados. V43 completa identidad/null de agenda y documenta `encounter` como extensión de lectura. Chromium aprobó revisión/especialidad, `201/200` con UUID estable, teclado, recarga, respuesta perdida después de commit, permisos, cita ajena, conflicto y sesión caducada. Pasan 91 pruebas Java (incluida apertura concurrente), typecheck, lint focalizado y build. La etapa de apertura enlaza a la ficha existente; sus operaciones siguen en FE-03/10/11/12/15 y la historia en FE-17. [Evidencia y comandos](evidencia-fe09.md).

### FE-03 · UC-03

- **Actor:** Médico autorizado.
- **Historia:** Como Médico autorizado, quiero consultar y actualizar antecedentes globales con motivo y versiones desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-03 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-03; RF-04, RF-20.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-03 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** GET/PATCH /api/medical/patients/{id}/clinical-background; rpc_get_clinical_background, rpc_save_clinical_background.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-03, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-03 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.
- **Estado local (2026-10-24):** cerrada localmente. GET/PATCH de antecedentes consumen Spring por rewrite exacto y el handler Supabase fue retirado. El panel común ofrece consulta/edición, motivo, autor/fecha/versiones y comparación explícita ante `409` conservando el formulario. V45 completa el contrato `current/encounter`, normalización de listas y snapshot inmutable. Chromium aprobó éxito/recarga, teclado, red, concurrencia, permisos, especialista y atención cerrada; pasan 100 pruebas Java, typecheck, lint y build. [Evidencia y comandos](evidencia-fe03.md).

### FE-10 · UC-10

**Cambio transversal posterior:** JSON clínico en español en almacenamiento, respuestas y solicitudes, con migración y regresión de antecedentes/revisión/especialidad. [Contrato y evidencia](json-clinico-espanol.md).

**Estado local (2026-10-24):** cerrada localmente. Formulario de revisión conectado a Spring, antecedentes precargados, diagnóstico, mediciones e indicaciones; recarga de ficha cerrada y recuperación de respuestas perdidas. Se retiró el handler Supabase de finalización; Java normaliza el contrato y V46 corrige versiones longitudinales, talla e IMC. Chromium aprobó cinco grupos de escenarios, permisos, sesión/red y preservación del formulario; pasan 106 pruebas Java, typecheck, lint y build. [Evidencia y comandos](evidencia-fe10.md).

- **Actor:** Médico de revisión.
- **Historia:** Como Médico de revisión, quiero completar ficha estructurada, diagnósticos, mediciones e indicaciones de revisión desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-10 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-10; RF-10, RF-12.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-10 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** POST /api/medical/encounters/{id}/finalize, campo reviewHistory; review-history.ts; rpc_finalize_initial_encounter.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-10, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-10 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-11 · UC-11

**Estado local (2026-10-25):** cerrada localmente. Carga/clasificación, lista, vista previa PDF/imagen y descarga privadas mediante Spring, con rewrites exactos y sin handlers Supabase. Chromium aprobó seis grupos de escenarios: permisos, metadatos/recarga, 15 MiB, sesión/CSRF/red, respuesta perdida, cierre y caducidad real de 60 s. V49 completa listado y serialización carga/cierre; pasan 114 pruebas Java, regresión FE-10, typecheck, lint y build. [Evidencia y comandos](evidencia-fe11.md).

- **Actor:** Médico autorizado.
- **Historia:** Como Médico autorizado, quiero adjuntar, clasificar, previsualizar y descargar documentos privados de la atención desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-11 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-11; RF-17.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-11 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** POST /api/medical/documents; GET /api/medical/documents/{id}/download; rpc_create_document_upload, rpc_finalize_document_upload; Storage clinical-documents.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-11, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-11 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-12 · UC-12

**Estado local (2026-10-25):** cerrada localmente. Cierre Spring con confirmación CLOSED/ATTENDED, versión y ficha; protección contra doble envío, consulta inmutable y navegación por agenda. Chromium aprobó seis grupos: campos obligatorios, ATTACHED, recarga, dos pestañas concurrentes, rollback tardío, confirmación inconsistente, sesión y permisos. PostgreSQL verificó una versión/evento/auditoría por cierre y cero datos parciales en el rechazo. Pasan 114 pruebas Java, regresión FE-10, typecheck, lint y build. [Evidencia y comandos](evidencia-fe12.md).

- **Actor:** Médico de revisión.
- **Historia:** Como Médico de revisión, quiero cerrar revisión conservando ficha inmutable y cita atendida desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-12 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-12; RF-13.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-12 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** POST /api/medical/encounters/{id}/finalize; rpc_finalize_initial_encounter.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-12, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-12 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

## Épica F5 — Derivaciones y atención especializada

### FE-13 · UC-13

**Estado local (2026-10-25):** cerrada localmente. Emisión atómica con prioridad, contexto y elementos compartidos; listado/detalle propios conectados a Spring, recuperación al recargar y errores sin perder el borrador. V50 completa lectura, evento y auditoría de emisión. Chromium aprobó seis grupos y la regresión FE-12; pasan 118 pruebas Java, typecheck, lint y build. [Evidencia, alcance de compartición y comandos](evidencia-fe13.md).

- **Actor:** Médico de revisión.
- **Historia:** Como Médico de revisión, quiero emitir derivación con contexto de revisión, prioridad y elementos compartidos desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-13 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-13; RF-15, RF-16.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-13 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** finalize con referralSpecialtyId/reason/comment/priority; rpc_finalize_initial_encounter; rpc_create_referral en SQL.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-13, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-13 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-14 · UC-14

**Estado local (2026-10-25):** implementada y comprobada con Spring/PostgreSQL y Chromium. Bandeja/historial y opciones consumen Spring sin Supabase; creación/asignación REFERRAL conserva contratos y origen clínico. Recuperación de red/sesión/respuestas perdidas, cupo incompatible/ocupado y carrera entre pestañas comprobados. Cinco grupos de aceptación y regresión FE-08 aprobados; 124 pruebas Java y controles frontend pasan. [Evidencia y comandos](evidencia-fe14.md). El recorrido integral permanece en FE-CORTE.

- **Actor:** Administrativo.
- **Historia:** Como Administrativo, quiero programar una derivación activa sin cambiar su contenido clínico desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-14 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-14; RF-06, RF-07, RF-15.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-14 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** GET /api/administrative/referrals; GET /api/patients/{id}/referrals; solicitudes REFERRAL y assign; rpc_list_referrals_for_administration, rpc_list_patient_referrals_for_appointment, rpc_assign_appointment_request.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-14, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-14 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-15 · UC-15

**Estado local (2026-10-25):** implementada y comprobada con la compilación de producción de Next, sesiones Spring y PostgreSQL. Inicio/recuperación, atención directa/derivada, contexto y documentos compartidos, campos de especialidad, plantilla histórica y cierre inmutable funcionan sin Supabase. Seis grupos Chromium, regresión FE-14, 126 pruebas Java y controles frontend aprobados. V52/V53 completan persistencia/consulta y corrigen el inicio derivado. [Evidencia y comandos](evidencia-fe15.md). La aceptación integral permanece en FE-CORTE.

- **Actor:** Especialista asignado.
- **Historia:** Como Especialista asignado, quiero completar y cerrar ficha del área usando plantilla versionada desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-15 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-15; RF-11, RF-12, RF-13.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-15 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** start y finalize para SPECIALTY; rpc_finalize_specialty_encounter; specialty-history.ts.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-15, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-15 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-16 · UC-16

**Estado local (2026-10-25):** implementada y comprobada con Next en producción y sesiones Spring/PostgreSQL. Bandeja propia del especialista, resolución/devolución y seguimiento persistido consumen Spring sin Supabase. Validación, sesión/red, respuesta perdida, carrera entre acciones y permisos comprobados. Pasan cinco grupos Chromium, seis de regresión FE-15, 130 pruebas Java y controles frontend. [Evidencia y comandos](evidencia-fe16.md). La aceptación integral permanece en FE-CORTE.

- **Actor:** Especialista asignado.
- **Historia:** Como Especialista asignado, quiero resolver o devolver una derivación dejando motivo y seguimiento desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-16 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-16; RF-15.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-16 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** rpc_close_referral, rpc_assign_referral presentes en SQL; ruta HTTP dedicada no confirmada.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-16, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-16 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

## Épica F6 — Historia longitudinal y correcciones

### FE-17 · UC-17

**Estado local (2026-10-25):** implementada y comprobada con Next en producción y Spring/PostgreSQL. Historia, origen remitido, citas, versiones y archivos consumen Spring sin Supabase; autorización por relación/área aplicada en PostgreSQL y retirada del filtrado de permisos del cliente. Cuatro grupos Chromium, regresión FE-16, 133 pruebas Java, build, typecheck y lint aprobados. V55–V57 completan paridad, autorización y campos secundarios del contrato. [Evidencia y comandos](evidencia-fe17.md). La aceptación integral permanece en FE-CORTE.

- **Actor:** Médico con relación clínica.
- **Historia:** Como Médico con relación clínica, quiero consultar la historia longitudinal permitida por mi área desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-17 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-17; RF-03, RF-18.
- **Prioridad:** P0. **Dependencias:** FE-CON, BE-17 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** GET /api/medical/patients/{id}; tablas y políticas RLS.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-17, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-17 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-18 · UC-18

**Estado local (2026-10-25):** implementada y comprobada con Next en producción y Spring/PostgreSQL. Búsqueda por texto normalizado y fechas inclusivas de Bolivia, con filtros persistidos en URL, recuperación de errores y ámbito autorizado de FE-17. Pasan cuatro grupos Chromium, regresión FE-17, 136 pruebas Java y controles frontend. Se midieron historiales sintéticos de 1.001 atenciones y ráfagas con concurrencia 10; el perfil institucional aún no tiene volumen numérico definido. [Evidencia y comandos](evidencia-fe18.md). La carga conjunta con reportes mensuales queda en FE-CORTE.

- **Actor:** Médico con relación clínica.
- **Historia:** Como Médico con relación clínica, quiero buscar por fechas y contenido dentro de la historia autorizada desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-18 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-18; RF-19.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-18 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** ficha médica y filtros de UI; endpoint servidor de búsqueda por definir si no existe.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-18, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-18 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-19 · UC-19

**Estado local (2026-10-25):** implementada y comprobada con Next en producción y Spring/PostgreSQL. Correcciones en revisión, especialidad e historia; escritura del autor y lectura autorizada por área/origen. V60 agrega auditoría atómica, inmutabilidad y reintento por clave sin duplicados. Pasan cinco grupos Chromium, regresión FE-18, 140 pruebas Java, build, typecheck y lint. Hash original intacto; borrador conservado ante errores/cierre y respuesta perdida. [Evidencia y comandos](evidencia-fe19.md). La aceptación integral permanece en FE-CORTE.

- **Actor:** Médico autorizado.
- **Historia:** Como Médico autorizado, quiero añadir una corrección auditable sin reescribir la atención cerrada desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-19 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-19; RF-14.
- **Prioridad:** P2. **Dependencias:** FE-CON, BE-19 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** rpc_add_encounter_amendment en SQL; ruta HTTP dedicada no confirmada.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-19, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-19 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-20 · UC-20

**Estado local (2026-10-26):** implementada y comprobada con Next en producción, Spring/PostgreSQL y LibreOffice. El botón consume el DOCX privado de Spring con finalidad; V61 completa ficha/versiones/antecedentes vinculados/diagnósticos/mediciones/documentos y adendas separadas con motivo, autor y fecha. Se conservan finalidad y borrador ante errores y sesión perdida; no hay Supabase ni generación clínica en Next. Pasan cuatro grupos Chromium, regresión FE-19 completa, 147 pruebas Java, build, typecheck y lint. Siete archivos DOCX abren en LibreOffice; clínica/adendas originales sin cambios. [Evidencia y comandos](evidencia-fe20.md). La aceptación integral permanece en FE-CORTE.

**Nota de integración FE-19 resuelta:** el Word incluye las adendas autorizadas separadas del registro original, con motivo, contenido, autor y fecha; la exportación conserva la ficha cerrada intacta.

- **Actor:** Médico autorizado.
- **Historia:** Como Médico autorizado, quiero exportar una ficha individual a Word desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-20 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-20; RF-21.
- **Prioridad:** P2. **Dependencias:** FE-CON, BE-20 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo integrado:** `GET /api/medical/encounters/{id}/export.docx?purpose=...`; `src/lib/clinical-word-export.ts` descarga el binario de Spring y deja de generarlo en el navegador.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-20, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-20 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

## Épica F7 — Reportes, cumplimiento y auditoría

### FE-21 · UC-21

**Estado local (2026-10-26):** implementada y comprobada con Next en producción y Spring/PostgreSQL. Reporte por filtros/listas AND normalizados, columnas y hasta dos agrupaciones calculadas en servidor; URL conserva selección y errores mantienen el borrador sin mostrar filas obsoletas. V62 restaura antecedentes/ficha/17 campos de referencia y habilita REPORTING_OFFICER sin personal, sin ampliar permisos de administración. Pasan cuatro grupos Chromium, regresión FE-20, 155 pruebas Java, build, typecheck y lint. [Evidencia, diferencias contractuales y comandos](evidencia-fe21.md). Los archivos de exportación se integran en FE-22; el rendimiento institucional/carga mixta permanece en FE-CORTE.

- **Actor:** Médico / responsable de Reportes.
- **Historia:** Como Médico / responsable de Reportes, quiero construir reporte por período, múltiples filtros, columnas y agrupaciones desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-21 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-21; RF-22, RF-23, RF-33.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-21 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo integrado:** `GET /api/reports/clinical` en Spring; `clinical-report-builder.tsx` conserva `ok/data/filters` y solicita `presentation` para columnas/grupos. Sin Route Handler ni RPC Supabase del caso.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-21, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-21 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-22 · UC-22

**Estado local (2026-10-26):** implementada y comprobada con Next en producción y Spring/PostgreSQL. CSV/XLSX/PDF generados en backend, con finalidad, filas recalculadas y columnas/grupos aplicados; cliente verifica SHA-256 antes de descargar. V63 conserva procedencia privada COMPLETED/FAILED y auditoría atómica; constancia/finalidad recuperadas tras recargar. Sin generación local ni Supabase del caso. Pasan cuatro grupos Chromium, regresión FE-21, 167 pruebas Java, build, typecheck y lint. [Evidencia, contratos, límites tipográficos y comandos](evidencia-fe22.md). La aceptación integral permanece en FE-CORTE.

- **Actor:** Usuario autorizado para exportar.
- **Historia:** Como Usuario autorizado para exportar, quiero exportar el conjunto permitido en CSV/XLSX/PDF con finalidad desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-22 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-22; RF-24.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-22 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo integrado:** `POST /api/reports/clinical/export` y `GET /api/reports/clinical/exports/{id}`; `POST /api/reports/clinical` conserva 201/data.id para compatibilidad de registro. Se retiró la generación xlsx/jsPDF de este flujo.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-22, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-22 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-23 · UC-23

**Estado local (2026-10-26):** implementada y comprobada con Next en producción y Spring/PostgreSQL. Cumplimiento y actividad por endpoints Spring, filtros persistidos, acceso Administrativo/Reportes y panorama administrativo sin Supabase ni contenido clínico. V64 unifica fechas Bolivia y conteos; carga/error no generan falsos ceros y sesión/red conservan criterios. Pasan cuatro grupos Chromium, regresión FE-22, 169 pruebas Java, build, typecheck y lint. [Evidencia, regla vigente y comandos](evidencia-fe23.md). Validación institucional de regla/volumen y aceptación integral pendientes en FE-CORTE.

- **Actor:** Administrativo / Reportes.
- **Historia:** Como Administrativo / Reportes, quiero consultar cumplimiento institucional de atención obligatoria desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-23 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-23; RF-25.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-23 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo integrado:** GET `/api/reports/compliance`, `/api/reports/daily-activity` y `/api/reports/administrative-summary`; páginas de cumplimiento e inicio administrativo sin consultas Supabase.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-23, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-23 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-24 · UC-24

**Estado local (2026-10-26):** implementado y verificado con Spring/PostgreSQL y Chromium en producción. Consulta persistida exclusiva para Auditor, filtros servidor, paginación estable, recarga y recuperación de errores/sesión. Cinco grupos de aceptación aprobados, regresión FE-23 completa y 174 pruebas Java sin fallos. [Evidencia y comandos](evidencia-fe24.md).

- **Actor:** Auditor.
- **Historia:** Como Auditor, quiero consultar eventos de accesos, cambios y exportaciones sin modificar evidencia desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-24 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-24; RF-26, RF-27.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-24 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** GET /api/audit-events de Spring, documentado en OpenAPI; demo-audit-store.ts retirado. No hay handler Next ni Supabase en este recorrido.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-24, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-24 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

## Épica F8 — Vacunación e investigación

### FE-25 · UC-25

**Estado local (2026-10-26):** implementado y verificado con Spring/PostgreSQL y Chromium en producción. Pantalla nueva `/administrativo/vacunas` (sin equivalente previo ni Supabase) con rewrites exactos a `/api/vaccines`. Crear, editar con versión esperada, desactivar/reactivar sin borrar dosis ni versiones; duplicado, versión desactualizada e intervalos inválidos rechazados por Spring conservando el borrador. Seis grupos Chromium, regresiones FE-23/FE-24 y 176 pruebas Java aprobadas. [Evidencia y comandos](evidencia-fe25.md).

- **Actor:** Administrativo.
- **Historia:** Como Administrativo, quiero gestionar vacunas activas y sus dosis/intervalos desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-25 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-25; RF-29.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-25 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo integrado:** GET/POST `/api/vaccines` y PUT `/api/vaccines/{id}` de Spring con `expectedSchemaVersion`; no existía consumo Supabase previo.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-25, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-25 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-26 · UC-26

**Estado local (2026-10-26):** implementado y verificado con Spring/PostgreSQL y Chromium en producción. Sección "Vacunación" en la ficha administrativa del estudiante y en la ficha del médico de revisión, con rewrites exactos a `/api/vaccinations` y `/api/vaccinations/context`. Lote, fecha, aplicador y registrador persistidos; duplicado, orden, fechas e intervalo decididos en Spring (422 pide justificación); el médico solo registra para pacientes de su atención. Siete grupos Chromium, regresión FE-25 y 179 pruebas Java aprobadas. [Evidencia y comandos](evidencia-fe26.md).

- **Actor:** Administrativo; médico de revisión como aplicador.
- **Historia:** Como Administrativo; médico de revisión como aplicador, quiero registrar dosis aplicada conservando lote, fecha y responsables desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-26 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-26; RF-30.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-26 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo integrado:** GET `/api/vaccinations/context` y POST `/api/vaccinations` de Spring; no existía consumo Supabase previo.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-26, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-26 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-27 · UC-27

**Estado local (2026-10-26):** implementado y verificado con Spring/PostgreSQL y Chromium en producción. Carnet propio en `/estudiante/vacunas`, carnet imprimible desde la ficha administrativa y cobertura en `/administrativo/reportes/vacunacion` (Administrativo/Reportes), con rewrites exactos y sin Supabase. Estado y porcentajes calculados en PostgreSQL; V68 añade lote/aplicador, día de Bolivia, conteo sin duplicados y auditoría de lecturas. Seis grupos Chromium, regresiones FE-23…FE-26 y 180 pruebas Java aprobadas. [Evidencia y comandos](evidencia-fe27.md).

- **Actor:** Administrativo / Estudiante / Reportes.
- **Historia:** Como Administrativo / Estudiante / Reportes, quiero consultar carnet, estado de esquema y cobertura institucional desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-27 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-27; RF-31, RF-32.
- **Prioridad:** P2. **Dependencias:** FE-CON, BE-27 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo integrado:** GET `/api/vaccination-card` (Estudiante propio / Administración con `patientId`) y GET `/api/reports/vaccination-coverage` de Spring; no existía consumo Supabase previo.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-27, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-27 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-INV · H-INV — Investigación

**Estado local (2026-10-26):** implementado y verificado con Spring/PostgreSQL y Chromium en producción. `/administrativo/reportes/investigacion` (Administración/Reportes) muestra el modo seudonimizado `MONTHLY-V1` sin aprobación previa, envía finalidad/filtros/formato, descarga sólo archivos íntegros (SHA-256, ZIP/XLSX con datos y diccionario) y confirma la finalidad con la constancia de Spring; filtros, formato y constancia sobreviven a la recarga. V69 aplica día de Bolivia, filtros cerrados, checksum/mes en la procedencia, constancia propia y lectura del catálogo de vacunas para Reportes. Cinco grupos Chromium, regresiones FE-21…FE-27 y 183 pruebas Java aprobadas. [Evidencia y comandos](evidencia-feinv.md).
- **Consumo integrado:** POST `/api/research/exports` y GET `/api/research/exports/{id}` de Spring, más `/api/careers`, `/api/specialties` y `/api/vaccines?includeInactive=true` para filtros; no existía consumo Supabase previo.

- **Actor:** Reportes / investigador autorizado.
- **Historia:** Como usuario autorizado, quiero seleccionar finalidad y descargar datos seudonimizados con diccionario.
- **Comportamiento esperado:** consumir BE-INV, mostrar modo de exportación y estado/resultado sin introducir aprobaciones no exigidas.
- **Prioridad:** P1. **Dependencias:** BE-INV probado, FE-21/22.
- **Aceptación:** descarga contiene diccionario y campos permitidos; no aparecen identificadores excluidos; finalidad enviada y confirmada; error no descarga fichero incompleto; filtros/selección permanecen.
- **Prueba:** exportación desde navegador, inspección de archivo y rechazo de rol ajeno.

## Épica F9 — Retirada de Supabase y regresión

### FE-CORTE · H-CORTE — Integración completa

**Perfil operativo indicado (2026-10-25):** centro pequeño con días de alta demanda y reportes de varias áreas a fin de mes; volumen institucional numérico aún sin definir. Incluir ensayo de búsquedas y reportes mensuales simultáneos, con actores/áreas distintos, sobre el hardware de despliegue. Tomar las mediciones sintéticas de FE-18 como referencia inicial y acordar el volumen antes de acreditar tiempos institucionales.

- **Actor:** Desarrollador / QA / usuarios de validación.
- **Historia:** Como equipo, quiero completar el flujo usando exclusivamente el backend probado.
- **Comportamiento esperado:** reemplazar también Server Actions, proxy de sesión, consultas SSR de dashboard/cumplimiento, exportación frontend y stores demo con comportamiento productivo cuando corresponda.
- **Prioridad:** P0. **Dependencias:** BE-CORTE y todas las FE del alcance aceptadas.
- **Aceptación:** recorrido completo estudiante/administración/revisión/especialista/reportes/auditor; no imports/consultas de Supabase ni claves necesarias en ejecución; no API de negocio serverless restante, solo reenvío si la integración acordada lo necesita; rama backend; regresión de pantallas/datos, accesibilidad y navegadores esenciales; pruebas de corte y recuperación; datos y archivos conciliados, sin escrituras divididas.
- **Prueba:** inventario de src/dependencias/configuración, build/typecheck/lint y recorrido automatizado/manual completo con registros de red. Probar RNF-07–10 y validar con personal del centro.

**Estado local (2026-10-26):** aceptada localmente con Next en producción, Spring/PostgreSQL y datos sintéticos. Inventario sin Supabase, Route Handlers ni Server Actions (49 rewrites exactos); stores demo y exportación frontend retirados. Recorrido integral de seis perfiles con registro de red (8 grupos), corte de Spring/PostgreSQL/Next con borrador conservado y escrituras únicas, conciliación de documentos por SHA-256 y carga mixta de fin de mes (3.000 pacientes, concurrencia 20, p95 695 ms). RNF-08 con historia clínica en diálogo dentro de la atención; RNF-09/10 con axe WCAG 2.1 A/AA y teclado en 24 pantallas, Chromium y Firefox a tres resoluciones. V70 corrige la agenda médica con más de 200 citas y V71 el límite de 100 cupos publicados; Spring responde 503 (no 401) ante caída de PostgreSQL. Regresión FE-03…FE-INV y 186 pruebas Java aprobadas. Pendientes: validación con el personal del centro, volumen y hardware institucional, WebKit, ensayo de migración y estrategia de cuentas (BE-CORTE 4–5) y respaldo del volumen de documentos. [Evidencia y comandos](evidencia-fecorte.md).

## Definición de terminado del frontend

Historia backend aprobada + consumo API conectado + carga/vacío/error/permisos + recorrido de caso principal y alternativas + comprobación de datos al recargar + pruebas del proyecto + ausencia de Supabase en el flujo migrado. El cierre se registra por historia, con evidencia; no se considera cumplido porque la pantalla cargue datos simulados.

## Compatibilidad con la traducción de la base — ES-08

**Estado (26/10/2026): validada localmente contra V79.** Auditoría muestra los códigos actuales en español; conserva etiquetas y filtros HTTP de resultado. Ayuda de filtros y aviso de historia inmutable actualizados. Regresión Chromium FE-24 aprobada y comprobación adicional del código fuente actualizado: 25 eventos y mismos IDs usando filtros históricos o actuales. Typecheck y lint de los cambios aprobados. Las aserciones SQL de auditoría de los scripts existentes se adaptaron a los códigos nuevos.

Evidencia y alcance de la comprobación: [ES-08 · Auditoría con códigos en español](evidencia-es08-auditoria.md).

## Compatibilidad con nombres SQL y cierre — ES-09/ES-10

**Estado (26/10/2026): validada contra V81.** Los ajustes de nombres y códigos internos se resolvieron en Java conservando HTTP. `scripts/test-es10.mjs` aprobó el login y recorrido de nueve vistas de los seis roles, pacientes/derivaciones, agenda/horarios, carnet, reportes/CSV y auditoría; permisos cruzados 403, vacuna duplicada 409 y logout 401. Typecheck, lint del script y diff check aprobados. No se modifican pantallas para adaptar nombres internos de SQL. Es un recorrido automatizado del agente, sin sustituir validación humana ni SUS.

Evidencia: [ES-10 · Cierre por rol](evidencia-es10-cierre.md).

## Incremento 7 — N-02 · Acceso por proxy a la API de bandeja

**Estado (27/10/2026): proxy preparado y validado contra V83.** Reglas de notificaciones, lectura y preferencias en next.config.ts, sin lógica de dominio en Next. `scripts/test-n02.mjs` aprobó sesiones reales, CSRF, paginación/contador, 404 sin fuga y preferencias aisladas en una instancia temporal con la configuración actualizada. Typecheck, lint y diff check aprobados. Esa instancia se detuvo; el servidor ya compilado necesita recompilarse/reiniciarse para activar las reglas nuevas. F-01/F-02 aún deben construir la interfaz.

Evidencia: [N-02 · API de bandeja](evidencia-n02-api.md).


## Épica F — F-01 y F-02 · Bandeja y preferencias

**Estado (27/10/2026): terminadas y verificadas localmente**, rama `backend`, contra backend V96 sin modificarlo. Esta épica continúa el backlog nuevo; sus IDs F-01/F-02 no sustituyen las historias anteriores FE-01/FE-02.

- **F-01:** `/estudiante/avisos` reemplaza su redirección; nuevas `/medico/avisos` y `/administrativo/avisos`, para los seis roles. Campana con contador real y acceso desde menú, cursor de 20, lectura propia confirmada por servidor, fechas de Bolivia y estados de carga/vacío/error/sesión. Proveedor en memoria por sesión; consulta cada minuto visible, al volver a la pestaña/conexión y después de leer. No cambia la lista mientras se leen páginas: el botón actualiza la primera página. [Evidencia F-01](evidencia-fe28.md).
- **F-02:** `/perfil` carga/guarda dos preferencias reales mediante GET/PUT, independientemente de datos y contraseña; retira `notifications`/`waitlist` ficticios de sesión. Sin defaults visuales hasta recibir respuesta; borrador conservado ante error, reintento y persistencia al recargar. [Evidencia F-02](evidencia-fe29.md).

Las reglas exactas de proxy de N-02 se reutilizan y quedan identificadas en next.config.ts. `scripts/test-fe01-fe02.mjs`: cinco grupos Chromium con sesiones y datos sintéticos reales, 28 avisos, seis roles, aislamiento/404, cursor, contador, lectura, preferencias, dobles clics, fallos recuperables, móvil/teclado/axe. Backend 312/0/0/0; lint completo, typecheck, build, inventario frontend (64 rewrites exactos) y diff check aprobados. Regresión ES-10 de nueve vistas y seis perfiles aprobada. Next de producción activo localmente en 3000; salud backend UP. Las capturas, resultados y red se reproducen con los comandos de evidencia.

Siguiente historia: F-03, calendario y valores iniciales. F-03…F-10 siguen pendientes; la validación con personal y SUS permanece en C-03.


## Épica C — Cierre técnico y evidencias (27/10/2026)

**C-01 terminada; C-02 ejecutada con observación PA-23; C-03 parcial.** Fuente vigente confirmada por el usuario: MSD-Documento proyecto de grado Ver.1.10 u.docx. Se preservaron los cambios F-01/F-02 y no se implementaron pantallas pendientes durante el cierre.

- Backend: estados explícitos de 25 historias BE-05…BE-27/BE-INV/BE-CORTE; 312 pruebas actuales sin fallos, errores ni omisiones. Registro A.6 con versión/huellas/entorno y diez criterios. SMTP original fuera del alcance vigente; PA-23 observada por consulta de derivacion en O-05. [C-01/C-02](../../salud-u-backend/docs/operations/cierre-c01-c02.md).
- C-03: ocho grupos de recorrido mixto UI/API, seis roles y 47 respuestas Spring aprobados. Ocho PNG versionados de seis figuras y dos complementos; 3.54 sin lista de espera. Figura 3.61 pendiente de F-04. Instrumento SUS y nueve tareas humanas listos, planillas vacías y calculador comprobado; el usuario confirmó que no tiene respuestas reales. No se acredita SUS ni aceptación humana. [Evidencia C-03](evidencia-cierre-c03.md).

Lint completo, typecheck e inventario frontend aprobados; el build vigente no cambia porque solo se modifican scripts/documentación/evidencias. El recorrido antiguo se adapta a CERRADA/ATENDIDA en SQL conservando HTTP. Los límites de BE-CORTE y F-03…F-10 permanecen explícitos.


## Épica F — F-04 · Sugerencias de la jornada y alertas

**Estado (27/10/2026): implementada y verificada localmente con observaciones.** Administración dispone de `/administrativo/planificacion`, accesible desde el menú y desde el inicio en móvil. Consulta O-04 por fecha; presenta explicaciones y fuente disponible, sugerencias de jornada/sobrecupo y alertas de exceso/defecto. O-06 registra aceptación, modificación del sobrecupo o rechazo, con persistencia y resultado visible. Carga, vacío, error, 401/403 y conflictos cubiertos; sin SMTP ni reglas nuevas de dominio en Next. Las rutas de consulta/decisión ya estaban en el proxy y se identificaron para F-04.

Nueve grupos Chromium con datos sintéticos, incluyendo recarga, 400 por sobrecupo, 409 concurrente y casos de nombres duplicados; 312 pruebas backend y lint/typecheck/build frontend en verde. Figura 3.61 con explicación y decisión persistida. [Evidencia FE-30](evidencia-fe30.md); [entrega F-04](../../../ENTREGAS_CODEX/F-04/resumen.md).


## Épica F — F-03 · Calendario académico y valores iniciales

**Estado (27/10/2026): implementada y verificada localmente.** Administración dispone de `/administrativo/calendario` para consultar y registrar períodos y configurar valores iniciales por área o especialidad y tipo de período. Las referencias predeterminadas se distinguen de los valores guardados; no se han cargado cifras reales del área. [Evidencia](evidencia-fe31.md).
