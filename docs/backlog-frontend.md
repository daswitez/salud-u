# Backlog de integración del frontend Salud-U

Fuente principal: `Proyecto Daniel Mercado v2 db.md`, cuadros 3.16 (RF-01–RF-34), 3.17 (RNF-01–RNF-12), 3.18 (RN-01–RN-32), 3.36 (UC-01–UC-27) y especificaciones críticas de UC-07/12/13/15/17/22. Referencia de implementación: 24 rutas `src/app/api`, Server Actions, consultas directas y SQL de `supabase/migrations`/`complete_schema.sql`.

Estado: pendiente. Se inspeccionó código/documento; todavía no se capturaron respuestas reales ni se ejecutaron pruebas de paridad. Las referencias SQL sin ruta no se presentan como endpoints HTTP existentes. El contrato final debe caracterizar la última definición de cada RPC y sus políticas, no solo la migración inicial.

## Condición para comenzar

Este backlog se ejecuta después de desarrollar y probar el backend del alcance correspondiente. No incluye implementar dominio/SQL en Next.js. Cada historia frontend está bloqueada hasta que su historia backend tenga contrato y pruebas aceptados. La secuencia principal es backend → validación API → integración frontend; una entrega incremental exige el mismo cierre previo del backend de ese incremento.

Trabajar exclusivamente en `codigo/salud-u`, rama `backend`; verificar `git branch --show-current` antes de editar. Backend en proyecto separado sin inicializar Git; `codigo` tampoco será repositorio. Leer las guías locales de Next.js antes de cambios de código.

## Épica F0 — Conexión y sesión

### FE-CON · H-CON — Conectar Next.js con API probada

- **Actor:** Desarrollador frontend.
- **Historia:** Como desarrollador, quiero conectar navegador y componentes de servidor a Spring, para consumir la API ya probada.
- **Comportamiento esperado:** configurar acceso de mismo origen o CORS explícito, reenviar sesión/Set-Cookie, enviar CSRF y convertir errores sin alterar contratos.
- **Dependencias:** T-04, BE-01; contrato backend aceptado.
- **Prioridad:** P0.
- **Aceptación:** credenciales de servidor no aparecen en bundle; cookie llega en navegación y fetch; /api/me usa user, reportes filters; SSR y cliente resuelven mismo actor; caducidad redirige sin perder borrador; error/red recuperable; /api/health/supabase se reemplaza en sus consumidores explícitamente.
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

### FE-CAT · Administrar catálogos y organización

- **Actor:** Administrativo autorizado. **Historia:** Como Administrativo autorizado, quiero gestionar roles/personal/especialidades/carreras y catálogos clínicos desde la interfaz.
- **Comportamiento esperado:** consumir contratos de BE-CAT y presentar sus estados.
- **Prioridad:** P1. **Dependencia:** BE-CAT probado, FE-CON.
- **Aceptación:** operación válida refleja datos tras recarga; inválida muestra error conservando formulario; permisos y estados de BE-CAT observables; ninguna llamada Supabase en este flujo.
- **Prueba:** navegación, edición y error de permiso/validación.

### FE-PER · Perfil y contraseña

- **Actor:** Usuario autenticado. **Historia:** Como Usuario autenticado, quiero actualizar nombre/email y cambiar contraseña comprobando la actual desde la interfaz.
- **Comportamiento esperado:** consumir contratos de BE-PER y presentar sus estados.
- **Prioridad:** P1. **Dependencia:** BE-PER probado, FE-CON.
- **Aceptación:** operación válida refleja datos tras recarga; inválida muestra error conservando formulario; permisos y estados de BE-PER observables; ninguna llamada Supabase en este flujo.
- **Prueba:** navegación, edición y error de permiso/validación.

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

## Épica F3 — Disponibilidad, solicitudes y citas

### FE-04 · UC-04

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

### FE-10 · UC-10

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

- **Actor:** Médico autorizado.
- **Historia:** Como Médico autorizado, quiero exportar una ficha individual a Word desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-20 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-20; RF-21.
- **Prioridad:** P2. **Dependencias:** FE-CON, BE-20 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** src/lib/clinical-word-export.ts y generación docx actual; descarga backend a definir.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-20, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-20 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

## Épica F7 — Reportes, cumplimiento y auditoría

### FE-21 · UC-21

- **Actor:** Médico / responsable de Reportes.
- **Historia:** Como Médico / responsable de Reportes, quiero construir reporte por período, múltiples filtros, columnas y agrupaciones desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-21 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-21; RF-22, RF-23, RF-33.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-21 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** GET /api/reports/clinical; rpc_clinical_report; clinical-report-builder.ts.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-21, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-21 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-22 · UC-22

- **Actor:** Usuario autorizado para exportar.
- **Historia:** Como Usuario autorizado para exportar, quiero exportar el conjunto permitido en CSV/XLSX/PDF con finalidad desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-22 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-22; RF-24.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-22 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** POST /api/reports/clinical; rpc_log_clinical_report_export; xlsx/jspdf frontend; rpc_request_report_export SQL.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-22, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-22 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-23 · UC-23

- **Actor:** Administrativo / Reportes.
- **Historia:** Como Administrativo / Reportes, quiero consultar cumplimiento institucional de atención obligatoria desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-23 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-23; RF-25.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-23 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** rpc_compliance_report, rpc_daily_activity; src/app/administrativo/page.tsx y reportes/cumplimiento/page.tsx.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-23, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-23 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-24 · UC-24

- **Actor:** Auditor.
- **Historia:** Como Auditor, quiero consultar eventos de accesos, cambios y exportaciones sin modificar evidencia desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-24 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-24; RF-26, RF-27.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-24 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** evento auditoría en SQL; demo-audit-store.ts requiere distinguir demo de persistencia; ruta real por confirmar.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-24, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-24 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

## Épica F8 — Vacunación e investigación

### FE-25 · UC-25

- **Actor:** Administrativo.
- **Historia:** Como Administrativo, quiero gestionar vacunas activas y sus dosis/intervalos desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-25 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-25; RF-29.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-25 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** Documento incremento 6; endpoint/RPC productivos no confirmados.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-25, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-25 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-26 · UC-26

- **Actor:** Administrativo; médico de revisión como aplicador.
- **Historia:** Como Administrativo; médico de revisión como aplicador, quiero registrar dosis aplicada conservando lote, fecha y responsables desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-26 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-26; RF-30.
- **Prioridad:** P1. **Dependencias:** FE-CON, BE-26 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** Documento incremento 6; endpoint/RPC productivos no confirmados.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-26, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-26 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-27 · UC-27

- **Actor:** Administrativo / Estudiante / Reportes.
- **Historia:** Como Administrativo / Estudiante / Reportes, quiero consultar carnet, estado de esquema y cobertura institucional desde la interfaz, para completar el caso de uso con el backend nuevo.
- **Comportamiento esperado:** conectar vistas/formularios del caso UC-27 a Spring; conservar navegación y datos observables actuales y presentar funciones documentales nuevas donde no haya pantalla equivalente.
- **Trazabilidad:** BE-27; RF-31, RF-32.
- **Prioridad:** P2. **Dependencias:** FE-CON, BE-27 terminado y probado; casos anteriores del flujo cuando apliquen.
- **Consumo/referencia a sustituir:** Documento incremento 6; endpoint/RPC productivos no confirmados.
- **Criterios de aceptación por caso:**
  - Dado el actor autorizado, cuando ejecuta UC-27, la pantalla envía parámetros/cuerpo compatibles, muestra los datos devueltos y refleja el estado persistido después de recargar.
  - Dado un error de validación, permiso, sesión o red, la interfaz muestra el mensaje correspondiente, permite recuperar el flujo y no anuncia éxito ni descarta silenciosamente el borrador.
  - Las restricciones y escenarios de BE-27 se comprueban también desde pantalla; no se reproducen reglas de negocio en API Next ni se mantiene acceso Supabase de este caso.
  - Listas vacías, carga, null y orden se representan correctamente; teclado, foco y etiquetas permiten completar el caso.
- **Prueba:** recorrido de navegador éxito y alternativa/error con semillas backend; comprobación de requests/respuestas y ausencia de llamadas Supabase del caso.

### FE-INV · H-INV — Investigación

- **Actor:** Reportes / investigador autorizado.
- **Historia:** Como usuario autorizado, quiero seleccionar finalidad y descargar datos seudonimizados con diccionario.
- **Comportamiento esperado:** consumir BE-INV, mostrar modo de exportación y estado/resultado sin introducir aprobaciones no exigidas.
- **Prioridad:** P1. **Dependencias:** BE-INV probado, FE-21/22.
- **Aceptación:** descarga contiene diccionario y campos permitidos; no aparecen identificadores excluidos; finalidad enviada y confirmada; error no descarga fichero incompleto; filtros/selección permanecen.
- **Prueba:** exportación desde navegador, inspección de archivo y rechazo de rol ajeno.

## Épica F9 — Retirada de Supabase y regresión

### FE-CORTE · H-CORTE — Integración completa

- **Actor:** Desarrollador / QA / usuarios de validación.
- **Historia:** Como equipo, quiero completar el flujo usando exclusivamente el backend probado.
- **Comportamiento esperado:** reemplazar también Server Actions, proxy de sesión, consultas SSR de dashboard/cumplimiento, exportación frontend y stores demo con comportamiento productivo cuando corresponda.
- **Prioridad:** P0. **Dependencias:** BE-CORTE y todas las FE del alcance aceptadas.
- **Aceptación:** recorrido completo estudiante/administración/revisión/especialista/reportes/auditor; no imports/consultas de Supabase ni claves necesarias en ejecución; no API de negocio serverless restante, solo reenvío si la integración acordada lo necesita; rama backend; regresión de pantallas/datos, accesibilidad y navegadores esenciales; pruebas de corte y recuperación; datos y archivos conciliados, sin escrituras divididas.
- **Prueba:** inventario de src/dependencias/configuración, build/typecheck/lint y recorrido automatizado/manual completo con registros de red. Probar RNF-07–10 y validar con personal del centro.

## Definición de terminado del frontend

Historia backend aprobada + consumo API conectado + carga/vacío/error/permisos + recorrido de caso principal y alternativas + comprobación de datos al recargar + pruebas del proyecto + ausencia de Supabase en el flujo migrado. El cierre se registra por historia, con evidencia; no se considera cumplido porque la pantalla cargue datos simulados.
