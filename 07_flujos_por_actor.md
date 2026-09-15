# Flujos de usuario por actor

> Documento derivado de `00_contexto_maestro_para_agentes.md` a `06_paleta_colores_y_design_tokens.md`. Describe la experiencia objetivo de cada actor; no sustituye las reglas de negocio del backend.

## 1. Principios transversales

- La sesión inicia en **P01 Inicio de sesión** y el sistema redirige según el rol autorizado: estudiante, médico o administrativo.
- **P02 Perfil y preferencias** está disponible para todos los actores desde su navegación principal.
- La disponibilidad, la reserva, el estado de la cita y la cola siempre provienen del backend. La interfaz solo presenta el estado y solicita acciones.
- Toda acción relevante debe mostrar progreso, éxito, error o expiración. No se comunica un estado importante únicamente con color.
- Los permisos del rol administrativo son granulares; no se crea el rol “Coordinador de Salud”.

## 2. Mapa de pantallas

| Código | Pantalla | Actor principal |
|---|---|---|
| P01–P02 | Inicio de sesión; Perfil y preferencias | Compartida |
| P03–P12 | Inicio, búsqueda, reserva, citas, Tipo A, lista, cola, teleconsulta y avisos | Estudiante |
| P13–P23 | Inicio, agenda, solicitudes, cola, paciente, resumen e historias clínicas, teleconsulta | Médico |
| P24–P32 | Dashboard, médicos, turnos, solicitudes, capacidad, campañas, citas/lista, check-in y auditoría | Administrativo |

## 3. Flujo habitual: estudiante

El estudiante utiliza una navegación mobile-first: **Inicio → Buscar → Mis citas → Avisos → Perfil**. El punto de retorno habitual después de reservar, cancelar o recibir una novedad es Inicio o Detalle de cita.

### 3.1 Recorrido habitual de reserva Tipo B

```text
P03 Inicio del estudiante
  → P04 Buscar atención
  → aplicar filtros y elegir disponibilidad
  → P05 Confirmación de reserva (retención temporal de 10 min)
  → confirmar
  → P07 Detalle de cita
  → QR presencial o acceso de teleconsulta
```

| Paso | Pantalla | Lo que ve y hace el estudiante | Resultado esperado |
|---|---|---|---|
| 1 | P03 Inicio | Próxima cita, estado de cola si existe, chequeo obligatorio, lista de espera y acción **Buscar atención**. | Comprende su prioridad actual sin navegar por varias vistas. |
| 2 | P04 Buscar atención | Selecciona Especialidad 1–4, médico opcional, modalidad y fecha/rango; ve slots disponibles junto con demanda y rango de espera cuando aplique. | Elige una hora publicada y disponible. |
| 3 | P05 Confirmación | Ve especialidad, médico, fecha, hora, modalidad y contador visible de 10 minutos; confirma o abandona. | Si confirma antes de expirar, se crea una cita; si no, el cupo se libera. |
| 4 | P07 Detalle de cita | Ve estado e instrucciones. Para presencial obtiene QR; para teleconsulta obtiene acceso dentro de su ventana permitida. | Cuenta con comprobante o acceso seguro. |

**Alternativas y excepciones**

- Sin resultados compatibles en P04: se ofrece entrar a **P09 Lista de espera** con preferencias de fecha, franja, modalidad y médico si aplica.
- El contador vence en P05: se informa que el horario fue liberado y se ofrece volver a P04; no se simula una reserva confirmada.
- Conflicto o cambio de disponibilidad al confirmar: se informa con lenguaje claro, se preservan los filtros y se vuelve a P04.

### 3.2 Gestión de citas, cancelación y reprogramación

```text
P03 Inicio o P06 Mis citas → P07 Detalle de cita
  ├─ cancelar → cita cancelada + cupo liberado + P06 actualizado
  └─ reprogramar → P04 Buscar → P05 nuevo hold → confirmar nuevo horario → P07
```

| Pantalla | Acción principal | Regla de experiencia |
|---|---|---|
| P06 Mis citas | Filtrar futuras, anteriores, canceladas y completadas; abrir detalle. | Los estados son legibles y no dependen solo del color. |
| P07 Detalle de cita | Cancelar, reprogramar, ver QR o teleconsulta e instrucciones. | La reprogramación nunca cancela primero la cita vigente; solo se libera al confirmar la nueva. |
| P12 Notificaciones | Leer recordatorios, cambios, cancelaciones y ofertas de lista de espera. | Una notificación lleva al contexto accionable correspondiente. |

### 3.3 Chequeo obligatorio Tipo A

```text
P03 Inicio → P08 Chequeo obligatorio Tipo A → campaña elegible → confirmar cupo → P07 Detalle de cita
```

En **P08**, el estudiante ve si ya completó el chequeo, campañas activas y cupos propios de campaña. Si fue completado antes, la pantalla explica que no puede volver a programarlo como Tipo A. Esta capacidad nunca se mezcla visual ni funcionalmente con los turnos de Especialidad 1–4.

### 3.4 Atención presencial y cola digital

```text
P07 Detalle de cita → presenta QR → P31 Recepción/check-in (administrativo)
  → P10 Cola digital → médico llama → consulta finalizada
```

| Momento | Experiencia del estudiante |
|---|---|
| Antes de llegar | En P07 consulta QR, fecha, hora e instrucciones. |
| Check-in | P31 valida el QR o localiza la cita; el estudiante recibe confirmación de llegada registrada. |
| Espera | P10 muestra “Estás registrado”, estado de cola, rango de espera estimado, demanda y hora de actualización. No promete una hora exacta. |
| Llamado/atención | El estado cambia en tiempo cercano a real; después puede consultar la cita completada desde P06. |

### 3.5 Teleconsulta

```text
P07 Detalle de cita → P11 Teleconsulta (ventana válida) → sala de espera
  → admisión del médico → consulta → sesión cerrada
```

En **P11**, el estudiante solo puede entrar cuando el acceso sea válido. Ve el estado de sala de espera, las instrucciones de privacidad y el resultado de conexión. Al finalizar, no puede reutilizar el token de sesión.

### 3.6 Lista de espera

```text
P04 Sin disponibilidad → P09 Lista de espera → oferta temporal por P12
  → aceptar → P05/P07 cita confirmada
  └─ rechazar o expirar → continúa esperando o se actualizan preferencias
```

P09 presenta las preferencias y el estado de la solicitud, sin prometer una posición absoluta cuando se aplican filtros de compatibilidad. La oferta incluye horario, modalidad, vencimiento y opciones **Aceptar** / **No me sirve**.

## 4. Flujo habitual: personal médico

El médico trabaja desktop/tablet-first. Su recorrido diario prioriza agenda, cola, paciente actual y registro clínico.

### 4.1 Inicio de jornada y agenda

```text
P13 Inicio médico → P14 Mi agenda → detalle de cita/paciente (P17)
```

| Pantalla | Lo que ve y hace |
|---|---|
| P13 Inicio médico | Resumen del día: próximos turnos, pacientes con check-in, pacientes en espera, teleconsultas y accesos operativos. |
| P14 Mi agenda | Cambia entre día, semana y mes; distingue citas, modalidad, bloques y turnos. Abre una cita autorizada. |
| P17 Detalle paciente/cita | Consulta contexto indispensable para atención, estado de llegada, modalidad y acceso a resumen clínico. |

### 4.2 Cambio o bloqueo de agenda

```text
P14 Mi agenda → P15 Solicitudes de agenda → crear solicitud → impacto visible
  → estado pendiente/aprobado/rechazado → notificación del resultado
```

P15 permite solicitar cambio de horario, bloqueo, ausencia, turno adicional, cambio de modalidad o intercambio. Antes de enviar, muestra citas potencialmente afectadas. El médico no publica ni elimina unilateralmente un turno institucional con citas activas.

### 4.3 Atención presencial y registro clínico

```text
P16 Cola de pacientes → llamar siguiente → P17 Detalle paciente/cita
  → P18 Resumen clínico → P19/P20/P21/P22 Historia especializada
  → guardar borrador o finalizar encuentro → cola actualizada
```

| Paso | Acción | Resultado |
|---|---|---|
| P16 Cola de pacientes | Consulta pacientes con check-in y tiempo esperando; llama al siguiente e inicia atención. | Estados de cola pasan de WAITING a CALLED e IN_CONSULTATION según acción. |
| P17/P18 | Revisa los datos permitidos y encuentros previos autorizados. | Tiene contexto clínico sin exponer información no autorizada. |
| P19–P22 | Abre únicamente la ficha de la especialidad atendida, registra hallazgos y plan. | Puede guardar borrador o finalizar. La ficha no es un formulario genérico opcional. |
| Finalizar | Cierra encuentro y registra final de consulta. | La entrada de cola queda completada y se actualizan métricas de espera. |

### 4.4 Teleconsulta médica

```text
P13/P14 → P23 Teleconsulta médica → paciente conectado → admitir → consulta
  → ficha especializada → finalizar e invalidar sesión
```

P23 muestra pacientes conectados y acciones de admisión. El médico conserva el mismo flujo clínico de P17 a P22, respetando permisos y auditoría.

## 5. Flujo habitual: personal administrativo

El administrativo trabaja desktop-first, orientado a operación y planificación. Las capacidades disponibles dependen de permisos como `MANAGE_MEDICAL_STAFF`, `MANAGE_SCHEDULES`, `MANAGE_CAMPAIGNS`, `MANAGE_APPOINTMENTS`, `VIEW_OPERATIONAL_REPORTS` y `VIEW_AUDIT`.

### 5.1 Gestión de personal y oferta médica

```text
P24 Dashboard → P25 Gestión de personal médico → configurar especialidades/modalidades
  → P26 Planificación de agenda y turnos → preview → publicar → slots disponibles
```

| Pantalla | Acción y resultado |
|---|---|
| P25 Gestión de personal médico | Busca, crea, edita, activa/inactiva profesionales; vincula especialidades y modalidad. Inactivar no borra historial y muestra impacto futuro. |
| P26 Planificación de agenda y turnos | Selecciona especialidad y médico elegible, define periodo, horario, modalidad, duración de slot, pausas y bloqueos; revisa conflictos y preview. Publicar genera slots reservables. |
| P24 Dashboard administrativo | Detecta citas, cola, médicos activos, incidencias y saturación; conduce a P25, P26 o P28 según necesidad. |

### 5.2 Planificación basada en capacidad y demanda

```text
P24 Dashboard → P28 Capacidad y demanda → déficit detectado
  → P26 crear turno o P27 resolver solicitud de turno adicional → publicar capacidad
```

P28 compara capacidad, demanda, lista de espera y espera estimada por periodo/especialidad. Puede advertir déficit, pero no abre turnos de manera autónoma: la decisión siempre es administrativa.

### 5.3 Solicitudes de agenda médica

```text
P27 Solicitudes médicas → revisar impacto y alternativas
  → aprobar/rechazar/solicitar ajuste → contingencia de citas afectadas → auditoría
```

Antes de aprobar cambios con citas activas, P27 muestra el impacto y no elimina silenciosamente citas. La resolución notifica al médico y, cuando corresponde, inicia la gestión de reprogramación de estudiantes afectados.

### 5.4 Campañas Tipo A

```text
P29 Campañas Tipo A → crear/configurar campaña → definir elegibilidad y capacidad
  → publicar → estudiante reserva desde P08
```

P29 administra periodos, reglas de elegibilidad y cupos de campañas. La pantalla debe diferenciar expresamente esta capacidad de los slots Tipo B.

### 5.5 Excepciones de citas, lista de espera y check-in

```text
P30 Gestión de citas y lista → revisar excepción/reasignación
P31 Recepción y check-in → escanear QR o buscar cita → validar → registrar llegada → P10 actualizado
```

- P30 centraliza excepciones operativas, cancelaciones, oferta de lista de espera y reasignaciones; respeta las transacciones del backend.
- P31 valida vigencia, fecha y estado de un QR, o localiza la cita de manera controlada. Un check-in válido registra llegada y crea la entrada en cola; intentos inválidos se explican sin revelar datos clínicos.

### 5.6 Auditoría

```text
Cambio relevante en P25–P31 → P32 Auditoría y trazabilidad
```

P32 permite consultar quién hizo qué, cuándo y sobre qué recurso. Expone referencias de estado, no contenido clínico sensible completo.

## 6. Estados que deben estar visibles

| Área | Estados de interfaz mínimos |
|---|---|
| Reserva | Cargando, disponible, retenido temporalmente, confirmado, expirado, conflicto/error. |
| Cita | Pendiente, confirmada, check-in realizado, esperando, llamada, en consulta, completada, cancelada, no-show, reprogramada. |
| Cola | Esperando, llamado, en consulta, completado, salió. |
| Agenda | Borrador, publicada, bloqueada, cancelada, completada. |
| Solicitud médica | Pendiente, aprobada, rechazada, cancelada, aplicada. |
| Teleconsulta | Aún no disponible, sala de espera, conectado, admitido, finalizada, acceso inválido. |

