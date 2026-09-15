# Backlog priorizado de frontend

> Backlog funcional derivado de requisitos, UI/UX y pantallas. **US** = historia de usuario. La prioridad se refiere al orden recomendado para diseñar e implementar el frontend; la seguridad, autorización y reglas transaccionales se validan con el backend.

## 1. Criterios transversales de terminado

Todo bloque que se declare terminado debe cumplir:

- Diseño responsive según actor: mobile-first estudiante; desktop/tablet-first médico; desktop-first administrativo.
- Tokens semánticos de `06_paleta_colores_y_design_tokens.md`; contraste WCAG AA objetivo, foco visible, navegación por teclado y textos de estado además de color.
- Estados de carga, vacío, error, éxito y permiso insuficiente.
- RBAC en rutas, acciones y datos visibles; no confiar solo en ocultar botones.
- Integración mediante contratos API definidos; el frontend no calcula disponibilidad ni modifica estados críticos localmente.
- Auditoría visible donde corresponda y ningún dato clínico sensible en QR, URLs, toasts o logs del cliente.

## 2. Orden recomendado de entregas

| Prioridad | Bloque | Resultado |
|---|---|---|
| P0 | B0–B5 | Base, autenticación, reserva Tipo B, detalle de cita, QR/check-in/cola y operación médica mínima. |
| P1 | B6–B10 | Atención clínica, agenda y personal, planificación, campañas Tipo A y lista de espera. |
| P2 | B11–B13 | Teleconsulta, notificaciones/preferencias y auditoría/analítica avanzada. |

## 3. P0 — Base y recorrido crítico

### B0. Base de aplicación y acceso (P01–P02)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-001 | Como usuario autorizado, quiero iniciar sesión para acceder solamente a mi área de trabajo. | Redirige por rol; muestra error accionable ante credenciales/sesión inválida; no permite entrar a rutas de otro rol. |
| US-002 | Como usuario, quiero mantener y cerrar mi sesión de forma segura. | Expone cerrar sesión; al vencer sesión informa y lleva a P01; no deja datos protegidos renderizados tras cerrar sesión. |
| US-003 | Como usuario, quiero editar mis preferencias permitidas en mi perfil. | P02 permite ver/editar datos básicos, preferencias de notificación y seguridad; valida campos; confirma guardado. |
| US-004 | Como usuario con discapacidad, quiero navegar los flujos principales de manera accesible. | Controles accesibles por teclado, foco visible, labels, mensajes no basados solo en color y objetivos táctiles adecuados. |

### B1. Inicio y búsqueda del estudiante (P03–P04)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-005 | Como estudiante, quiero ver mi situación actual al entrar. | P03 prioriza próxima cita, estado de cola, acción Buscar atención, chequeo Tipo A, lista activa y avisos recientes; cada tarjeta lleva a su detalle. |
| US-006 | Como estudiante, quiero buscar atención Tipo B por filtros relevantes. | P04 filtra por especialidad, médico opcional, modalidad y fecha/rango; conserva filtros al volver desde un error o detalle. |
| US-007 | Como estudiante, quiero distinguir horas disponibles de no disponibles. | Solo permite seleccionar slots disponibles; muestra médico, hora, modalidad y demanda/espera cuando exista; no presenta métricas administrativas innecesarias. |
| US-008 | Como estudiante sin cupos compatibles, quiero poder continuar mediante lista de espera. | P04 muestra estado vacío claro y una acción para P09 con filtros compatibles precargados; no promete disponibilidad inexistente. |

### B2. Reserva Tipo B y gestión de cita (P05–P07)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-009 | Como estudiante, quiero retener temporalmente un horario antes de confirmar. | Al seleccionar un slot, P05 solicita hold al backend y muestra especialidad, médico, fecha, hora, modalidad y cuenta regresiva de 10 min. |
| US-010 | Como estudiante, quiero confirmar una reserva retenida. | Solo habilita la confirmación con hold vigente propio; al éxito muestra cita confirmada y redirige a P07; evita doble envío mientras procesa. |
| US-011 | Como estudiante, quiero saber qué ocurre si vence o falla mi reserva. | Al expirar o recibir conflicto informa claramente, no crea cita local y ofrece volver a resultados preservando filtros. |
| US-012 | Como estudiante, quiero consultar mis citas por estado. | P06 separa futuras, anteriores, canceladas y completadas; permite abrir P07 con información y estado correcto. |
| US-013 | Como estudiante, quiero ver el detalle e instrucciones de mi cita. | P07 muestra especialidad, médico, fecha/hora, modalidad, estado, instrucciones y acción contextual: QR o teleconsulta. |
| US-014 | Como estudiante, quiero cancelar una cita permitida. | Solicita confirmación, respeta política del backend, actualiza estado y elimina/invalida QR o acceso; informa que el cupo pudo liberarse. |
| US-015 | Como estudiante, quiero reprogramar sin perder mi cita actual. | Inicia búsqueda de nuevo horario; conserva la cita original hasta confirmar una nueva; el resultado deja historial/estado actualizado. |

### B3. Llegada, QR y cola (P10, P16, P17, P31)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-016 | Como estudiante con cita presencial, quiero mostrar un comprobante QR seguro. | P07 muestra QR solo para cita confirmada presencial; el QR contiene token opaco, nunca datos clínicos legibles. |
| US-017 | Como administrativo, quiero validar un QR o localizar una cita para hacer check-in. | P31 soporta escaneo/búsqueda controlada, valida cita, fecha, vigencia y estado; registra llegada solo una vez e informa errores sin filtrar datos sensibles. |
| US-018 | Como estudiante, quiero confirmar que ya estoy registrado y conocer mi espera. | P10 muestra estado de cola, rango estimado, demanda y última actualización; usa términos “estimado/aproximadamente”. |
| US-019 | Como médico, quiero gestionar pacientes que ya hicieron check-in. | P16 lista espera ordenada con tiempo esperando, paciente actual y próximas citas; permite llamar e iniciar atención según estado permitido. |
| US-020 | Como médico, quiero revisar el contexto de una cita antes de atender. | P17 muestra solo datos autorizados, modalidad y estado, con acceso al resumen clínico; prohíbe acceso si no existe relación asistencial permitida. |

### B4. Inicio y agenda médica operativa (P13–P14)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-021 | Como médico, quiero una visión operativa de mi día. | P13 muestra turnos, próximos pacientes, check-ins, cola y teleconsultas; enlaza a la acción correspondiente. |
| US-022 | Como médico, quiero revisar mi agenda por rango temporal. | P14 permite vistas diaria, semanal y mensual; muestra turnos, citas, bloqueos y modalidad; abre detalle autorizado. |

### B5. Dashboard administrativo inicial (P24)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-023 | Como administrativo, quiero detectar el estado operativo del servicio. | P24 muestra citas del día, médicos activos, cola, especialidades saturadas, demanda, lista de espera e incidencias. |
| US-024 | Como administrativo, quiero llegar rápidamente al área que resuelve una incidencia. | Cada alerta/métrica enlaza a P25–P31 según permisos; el dashboard no ofrece acciones autónomas de asignación médica. |

## 4. P1 — Operación completa y atención clínica

### B6. Encuentro e historias clínicas especializadas (P18–P22)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-025 | Como médico, quiero consultar el resumen clínico autorizado del paciente. | P18 presenta encuentros previos permitidos, metadata e historial sin exponer contenido fuera de autorización. |
| US-026 | Como médico, quiero iniciar y guardar un encuentro clínico. | Desde P16/P17 crea encuentro asociado a cita; permite borrador con indicador de guardado y recuperación segura. |
| US-027 | Como médico de Especialidad 1, quiero registrar su ficha específica. | P19 usa estructura especializada, encabezado común del paciente y acciones Guardar/Finalizar; valida campos definidos por la especialidad. |
| US-028 | Como médico de Especialidad 2, quiero registrar su ficha específica. | P20 cumple las mismas garantías, con componentes y campos propios de Especialidad 2. |
| US-029 | Como médico de Especialidad 3, quiero registrar su ficha específica. | P21 cumple las mismas garantías, con componentes y campos propios de Especialidad 3. |
| US-030 | Como médico de Especialidad 4, quiero registrar su ficha específica. | P22 cumple las mismas garantías, con componentes y campos propios de Especialidad 4. |
| US-031 | Como médico, quiero finalizar una consulta para continuar con la cola. | Finalizar solicita confirmación si existen datos pendientes, registra hora final, actualiza cita/cola y deja trazabilidad; no permite doble finalización. |

### B7. Gestión de personal y solicitudes médicas (P15, P25, P27)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-032 | Como médico, quiero solicitar un cambio de agenda. | P15 permite tipo de solicitud, periodo, motivo y modalidad cuando aplique; muestra citas afectadas antes de enviar y estado posterior. |
| US-033 | Como médico, quiero conocer la resolución de mi solicitud. | P15 lista pendiente, aprobada, rechazada, cancelada o aplicada; muestra motivo/resolución y notificación relacionada. |
| US-034 | Como administrativo autorizado, quiero administrar profesionales. | P25 busca, crea, edita, activa/inactiva sin borrar historial; detecta duplicados y registra auditoría. |
| US-035 | Como administrativo autorizado, quiero configurar especialidades y modalidades de un médico. | P25 solo permite turnos posteriores en especialidades/modalidades habilitadas; muestra validaciones e impacto al modificar configuración. |
| US-036 | Como administrativo, quiero resolver solicitudes con impacto visible. | P27 muestra solicitud, citas afectadas y capacidad alternativa; permite aprobar/rechazar/solicitar ajuste con motivo y trazabilidad. |

### B8. Planificación de agenda, capacidad y demanda (P26, P28)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-037 | Como administrativo, quiero crear un turno médico en borrador. | P26 exige médico activo, especialidad habilitada, fecha, inicio/fin, modalidad y duración; impide solapamientos y muestra errores accionables. |
| US-038 | Como administrativo, quiero previsualizar slots y configurar pausas. | P26 calcula preview antes de publicar, permite bloqueos/pausas y distingue slots resultantes no reservables. |
| US-039 | Como administrativo, quiero publicar capacidad. | Publicar confirma la acción y crea slots reservables vía backend; solo turnos publicados aparecen en P04. |
| US-040 | Como administrativo, quiero comparar capacidad y demanda. | P28 filtra por periodo/especialidad y muestra slots publicados/ocupados, demanda estimada, lista de espera, espera y déficit con texto + icono + color. |
| US-041 | Como administrativo, quiero actuar ante un déficit sin automatismos clínicos. | Desde P28 ofrece iniciar P26 o revisar solicitudes; el sistema recomienda/advierte, pero no asigna médicos ni abre turnos por cuenta propia. |

### B9. Chequeo Tipo A y lista de espera (P08, P09, P30)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-042 | Como estudiante, quiero saber mi estado del chequeo obligatorio. | P08 indica pendiente/completado/no elegible y explica el resultado; bloquea segunda realización después de completado. |
| US-043 | Como estudiante elegible, quiero reservar cupo de campaña Tipo A. | P08 muestra campañas activas y capacidad independiente; reserva confirma cita Tipo A sin consumir capacidad Tipo B. |
| US-044 | Como estudiante, quiero gestionar mis preferencias de lista de espera. | P09 crea/edita/cancela lista con especialidad, fechas, franja, modalidad y médico opcional; muestra estado sin posición falsa. |
| US-045 | Como estudiante, quiero responder a una oferta temporal compatible. | Oferta muestra detalle, vencimiento y Aceptar/No me sirve; aceptar usa backend para confirmar y lleva a P07; expirada no puede aceptarse. |
| US-046 | Como administrativo, quiero atender excepciones de citas y lista de espera. | P30 muestra cancelaciones, ofertas y reasignaciones según permisos; las acciones piden confirmación y reflejan el resultado transaccional. |

### B10. Estados operativos y calidad de integración

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-047 | Como usuario, quiero recibir feedback comprensible en procesos críticos. | Reserva, check-in, cola, solicitud, campaña y consulta muestran carga, éxito, error, expiración/cancelación y opción de recuperación. |
| US-048 | Como equipo de desarrollo, quiero contratos de UI resistentes a cambios. | Cada bloque define tipos de datos, estados vacíos y errores de API; los mocks respetan la forma de los endpoints acordados. |

## 5. P2 — Canales complementarios, notificaciones y trazabilidad

### B11. Teleconsulta (P11, P23)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-049 | Como estudiante, quiero ingresar de forma segura a mi teleconsulta. | P11 valida ventana/token antes de entrar; muestra sala de espera, instrucciones y errores de conexión; acceso expirado o revocado queda bloqueado. |
| US-050 | Como médico, quiero administrar la sala virtual. | P23 lista pacientes conectados, permite admitir al autorizado y enlaza al contexto clínico; no expone salas de otros médicos. |
| US-051 | Como usuario, quiero que la sesión termine correctamente. | Al finalizar/cancelar se actualiza estado de cita y se invalida acceso según backend; la UI evita reingreso con un token terminado. |

### B12. Avisos y preferencias (P02, P12)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-052 | Como estudiante, quiero consultar mis notificaciones relevantes. | P12 lista recordatorios, cambios, cancelaciones y ofertas con fecha/estado; permite marcar lectura y navegar al recurso asociado. |
| US-053 | Como usuario, quiero ajustar las notificaciones permitidas. | P02 guarda preferencias por canal/evento conforme a política; confirma resultado y maneja error. |

### B13. Auditoría y observabilidad administrativa (P32)

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| US-054 | Como administrativo con permiso de auditoría, quiero consultar cambios críticos. | P32 filtra por periodo, actor, acción y recurso; muestra quién, qué, cuándo y referencias de estado. |
| US-055 | Como auditor, quiero preservar la privacidad clínica. | P32 no muestra contenido clínico sensible completo; respeta RBAC, paginación y exportación solo si la política lo autoriza. |
| US-056 | Como administrativo, quiero evaluar indicadores de la operación. | P32/P28 presentan métricas permitidas de latencia, holds, cola, espera real vs estimada y lista de espera sin sustituir decisiones humanas. |

## 6. Dependencias principales

| Bloque | Depende de |
|---|---|
| B1–B2 | B0, catálogo de especialidades/médicos y API de disponibilidad/hold/cita. |
| B3–B4 | B0, API de citas, check-in, cola y agenda. |
| B5, B7–B9 | B0 y permisos administrativos. |
| B6 | B3/B4, modelo de citas, autorización clínica y definición validada de cada ficha especializada. |
| B11 | B2/B4, proveedor o contrato de teleconsulta. |
| B12 | B0 y servicio de notificaciones. |
| B13 | Eventos auditables producidos por los módulos anteriores. |

## 7. Corte recomendado de MVP demostrable

El primer incremento demostrable abarca B0–B5: inicio de sesión por rol, búsqueda y reserva Tipo B con hold, detalle/QR, check-in, cola digital, agenda/cola médica y dashboard administrativo. Permite exhibir el recorrido completo **oferta → reserva → llegada → espera → atención**, aun usando datos simulados mientras se integran los endpoints.
