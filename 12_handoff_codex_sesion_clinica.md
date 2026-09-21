# Handoff Codex: agenda, derivaciones e historial clínico

## Propósito

Este documento deja el contexto operativo para continuar el desarrollo del sistema de Salud Universitaria. La aplicación usa Next.js, React y Supabase; la fuente consolidada del modelo es `supabase/complete_schema.sql` y las migraciones incrementales están en `supabase/migrations/`.

## Modelo clínico relevante

- `patient` representa al estudiante/paciente.
- `clinical_history` e `history_intake_version` contienen la historia clínica longitudinal y el cuestionario inicial administrativo.
- `clinical_encounter` representa una atención concreta. Una atención `INITIAL` corresponde a revisión estudiantil; una `SPECIALTY` corresponde a atención especializada.
- `clinical_document` almacena los documentos y multimedia, vinculables a una atención mediante `encounter_id`.
- `referral` es una derivación clínica: la crea el médico de revisión, conserva motivo, prioridad y comentario para el especialista, y apunta a su atención de origen (`source_encounter_id`).
- `specialty_clinical_history` es la ficha longitudinal por combinación `patient_id + specialty_id`.
- `specialty_history_intake_version` guarda versiones JSON de datos propios de una especialidad y puede referenciar un `specialty_form_template`.
- `appointment_request` representa la intención administrativa de agenda. `INITIAL` es revisión, `REFERRAL` nace de una derivación y `SPECIALTY` es una solicitud directa para una especialidad.
- `appointment` es la cita confirmada en un `availability_slot`. Una cita `REFERRAL` tiene `referral_id`; una `SPECIALTY` directa no lo tiene.

## Flujos actuales

### Disponibilidad

El médico configura reglas semanales, duración promedio por cupo y bloqueos recurrentes o por fecha. Las reglas generan `availability_slot` materializados, para preservar reservas y concurrencia. Los bloqueos evitan generar cupos y el calendario muestra cupos, citas y bloqueos.

### Revisión estudiantil

1. Administración crea una solicitud `INITIAL` y selecciona un cupo de médico de revisión.
2. El médico abre la cita desde su agenda o desde la ficha del paciente con el botón **Iniciar atención pendiente**.
3. Se crea un `clinical_encounter` en borrador.
4. Al finalizar se registra evolución, diagnóstico, indicaciones, documentos y, si corresponde, una derivación.

### Atención directa de especialidad

1. Administración puede crear una solicitud `SPECIALTY`, seleccionando una especialidad activa, sin derivación clínica.
2. Sólo se muestran cupos de esa especialidad.
3. El especialista inicia y cierra la atención; al abrirse se crea/recupera la `specialty_clinical_history` del paciente para esa especialidad.

### Derivación clínica

1. El médico de revisión finaliza una atención y crea la `referral` con especialidad, prioridad, motivo y resumen clínico.
2. Administración la ve en **Administrativo → Derivaciones**. La bandeja separa pendientes del historial, muestra estudiante, solicitante, motivo, resumen y prioridad.
3. El botón **Asignar especialista y horario** abre `Citas y asistencia` con estudiante y derivación preseleccionados; allí se crea la solicitud `REFERRAL` y se escoge un cupo compatible. Esta reutilización es intencional: mantiene una única UX de asignación de cupos.
4. El especialista abre la cita. Tiene acceso a la historia general, cuestionario inicial, atenciones anteriores y archivos. La atención especializada lleva además su ficha de especialidad.

## Ficha del paciente para médicos

`src/components/medical-patient-record.tsx` debe conservar siempre estas capacidades simultáneamente:

- cuestionario inicial visible;
- listado global de archivos/exámenes multimedia;
- buscador transversal de información clínica;
- lista de atenciones previas con apertura de detalle/modal;
- adjuntos vinculados específicamente a cada atención;
- acceso para iniciar una cita activa asignada al médico.

No reemplazar una vista por otra: el buscador y el detalle por atención complementan el cuestionario y la biblioteca completa de archivos.

## Cambios realizados en esta sesión

- Se corrigió el error de hidratación identificado como atributos inyectados por Grammarly en `body`; no era un error de lógica de React.
- Se implementó la agenda recurrente, bloqueo horario/diario y calendario de disponibilidad.
- Se extendió la agenda administrativa para soportar revisión, especialidad directa y derivación.
- Se habilitó inicio/cierre de citas para especialistas; la ruta `/medico/citas/[appointmentId]` acepta `REVIEW_DOCTOR` y `SPECIALIST`.
- Se creó la bandeja administrativa de derivaciones y su API `/api/administrative/referrals`.
- Se mejoró la ficha médica con búsqueda, detalle de atención, archivos por atención y botón de inicio de cita activa.

## Migraciones nuevas y orden obligatorio

Las migraciones nuevas ya están incluidas, en este orden, en `supabase/complete_schema.sql`:

1. `20260920130000_recurring_availability.sql`
2. `20260920140000_administrative_referral_appointments.sql`
3. `20260920150000_add_specialty_appointment_type.sql`
4. `20260920150100_direct_specialty_and_specialty_history.sql`
5. `20260920150200_administrative_referral_inbox.sql`

La migración `20260920150000_add_specialty_appointment_type.sql` debe ejecutarse y confirmarse por separado antes de `20260920150100...`: PostgreSQL no permite utilizar un nuevo valor de enum (`SPECIALTY`) dentro de la misma transacción que lo crea. Después de ejecutar la bandeja de derivaciones, `NOTIFY pgrst, 'reload schema';` refresca el caché de PostgREST.

## Verificación usada

`pnpm typecheck` pasó después de los cambios. El build de producción había compilado anteriormente y luego falló sólo al crear un proceso TypeScript por `EPERM` del entorno.

