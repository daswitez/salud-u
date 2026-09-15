# Requisitos y procesos de negocio

## 1. Reglas principales de negocio

1. El chequeo Tipo A solo puede completarse una vez durante la carrera del estudiante.
2. La capacidad Tipo A no consume slots de atención especializada Tipo B.
3. Todo turno médico publicado debe pertenecer a un profesional activo y a una especialidad habilitada.
4. Un turno médico genera uno o más slots según horario, duración configurada y bloqueos.
5. Un slot seleccionado puede quedar retenido por un máximo de 10 minutos.
6. Un slot no puede estar reservado por dos citas activas simultáneamente.
7. Una cita debe indicar modalidad presencial o teleconsulta.
8. Las citas presenciales generan comprobante QR verificable.
9. Las teleconsultas generan acceso temporal no predecible y revocable.
10. Una cancelación libera el slot y puede disparar el proceso de lista de espera.
11. La cola digital contiene pacientes que ya realizaron check-in.
12. La lista de espera contiene estudiantes que aún no tienen cita confirmada.
13. La IA estima tiempos operativos; no decide prioridad clínica.
14. La ampliación de oferta médica requiere decisión administrativa o aceptación del médico cuando corresponda.
15. Los registros clínicos solo pueden ser consultados o modificados por usuarios autorizados.
16. Toda modificación clínica relevante debe ser auditable.

---

# 2. Requisitos de Usuario — URS

| ID | Actor | Necesidad |
|---|---|---|
| URS-01 | Administrativo | Administrar el registro y estado del personal médico. |
| URS-02 | Administrativo | Configurar especialidades, modalidades y parámetros habilitados para cada médico. |
| URS-03 | Médico | Consultar su agenda y turnos asignados. |
| URS-04 | Médico | Solicitar modificaciones, bloqueos, ausencias o cambios de disponibilidad. |
| URS-05 | Administrativo | Revisar y resolver solicitudes de modificación de agenda. |
| URS-06 | Administrativo | Asignar y publicar turnos médicos. |
| URS-07 | Administrativo | Planificar capacidad según demanda histórica y prevista. |
| URS-08 | Estudiante | Buscar citas disponibles por especialidad, médico, fecha y modalidad. |
| URS-09 | Estudiante | Retener temporalmente un slot mientras completa su reserva. |
| URS-10 | Estudiante Tipo A | Programar el chequeo obligatorio mediante campañas independientes. |
| URS-11 | Estudiante Tipo B | Reservar una cita de especialidad. |
| URS-12 | Estudiante | Cancelar o reprogramar una cita de forma remota. |
| URS-13 | Estudiante | Obtener un comprobante QR para atención presencial. |
| URS-14 | Estudiante | Acceder de forma segura a una teleconsulta. |
| URS-15 | Estudiante | Conocer el tiempo estimado de espera. |
| URS-16 | Médico | Visualizar y gestionar pacientes en cola. |
| URS-17 | Estudiante | Ingresar a lista de espera cuando no exista disponibilidad. |
| URS-18 | Administrativo | Detectar y gestionar déficit de capacidad. |
| URS-19 | Estudiante | Realizar check-in digital. |
| URS-20 | Médico | Registrar y cerrar un encuentro clínico. |
| URS-21 | Médico | Registrar la historia clínica de Especialidad 1. |
| URS-22 | Médico | Registrar la historia clínica de Especialidad 2. |
| URS-23 | Médico | Registrar la historia clínica de Especialidad 3. |
| URS-24 | Médico | Registrar la historia clínica de Especialidad 4. |

---

# 3. Procesos de Negocio — PRC

## PRC-01 — Gestión de personal médico

**Disparador:** alta o modificación de un profesional.

**Entradas:** datos del profesional, estado, especialidad, modalidades.

**Flujo resumido:**

1. Administrativo busca al profesional.
2. Crea o edita el registro.
3. Asocia especialidad y modalidad.
4. Valida duplicidad.
5. Activa o desactiva según corresponda.
6. Se registra auditoría.

**Salida:** profesional disponible o no disponible para planificación de agenda.

## PRC-02 — Configuración profesional

1. Seleccionar médico activo.
2. Asociar especialidad(es) habilitada(s).
3. Definir modalidad presencial, teleconsulta o ambas.
4. Configurar parámetros de agenda permitidos.
5. Guardar configuración.

## PRC-03 — Consulta de agenda médica

1. Médico accede a su agenda.
2. Selecciona vista diaria, semanal o mensual.
3. Sistema muestra turnos, citas, bloqueos y modalidad.
4. Médico consulta detalle del paciente solo cuando tenga permiso.

## PRC-04 — Solicitud de modificación de agenda

Tipos sugeridos:

- Ausencia temporal.
- Bloqueo de periodo.
- Cambio de horario.
- Cambio de modalidad.
- Turno adicional.
- Intercambio de turno.

El sistema debe mostrar al médico si la solicitud afecta citas ya confirmadas.

## PRC-05 — Resolución administrativa de solicitud

1. Administrativo recibe solicitud.
2. Visualiza impacto.
3. Evalúa citas afectadas y capacidad alternativa.
4. Aprueba, rechaza o solicita ajuste.
5. Si se aprueba, se actualiza agenda.
6. Si existen citas afectadas, se dispara contingencia de reprogramación.
7. Se notifica al médico.

## PRC-06 — Asignación y publicación de turnos

1. Seleccionar periodo.
2. Seleccionar especialidad.
3. Consultar médicos disponibles.
4. Seleccionar profesional.
5. Definir fecha, hora de inicio y fin.
6. Definir modalidad.
7. Definir duración de slot.
8. Validar conflictos.
9. Generar vista previa de slots.
10. Añadir bloqueos o pausas.
11. Publicar turno.
12. Generar slots reservables.

## PRC-07 — Planificación de capacidad

1. Consultar demanda histórica.
2. Consultar demanda reciente.
3. Consultar lista de espera.
4. Consultar capacidad publicada.
5. Comparar demanda vs capacidad.
6. Detectar déficit o exceso.
7. Permitir al administrativo decidir ajustes de oferta.

## PRC-08 — Búsqueda y exploración de citas

1. Estudiante abre búsqueda.
2. Selecciona especialidad.
3. Opcionalmente filtra por médico.
4. Selecciona modalidad.
5. Selecciona fecha o rango.
6. Sistema obtiene turnos publicados.
7. Excluye slots ocupados, bloqueados o retenidos.
8. Libera lógicamente holds vencidos.
9. Consulta indicador de demanda/espera cuando exista.
10. Muestra disponibilidad.
11. Estudiante selecciona slot.
12. Se inicia PRC-09.

## PRC-09 — Bloqueo temporal de slot

1. Recibir `slotId`.
2. Validar disponibilidad en transacción.
3. Crear hold exclusivo.
4. Definir expiración = ahora + 10 minutos.
5. Ocultar el slot a otros usuarios.
6. Confirmar reserva o liberar al expirar.

## PRC-10 — Agendamiento Tipo A

1. Validar que el chequeo no haya sido completado previamente.
2. Consultar campañas activas.
3. Validar elegibilidad.
4. Mostrar capacidad independiente.
5. Reservar cupo.
6. Crear cita Tipo A.
7. Programar notificaciones.

## PRC-11 — Agendamiento Tipo B

1. Validar hold.
2. Validar estudiante y especialidad.
3. Crear cita dentro de transacción.
4. Cambiar slot a ocupado.
5. Generar QR o sesión virtual según modalidad.
6. Programar notificaciones.

## PRC-12 — Cancelación y reprogramación

**Cancelación:**

1. Validar cita.
2. Aplicar política institucional.
3. Cancelar.
4. Liberar slot.
5. Invalidar QR/token.
6. Emitir evento de slot liberado.

**Reprogramación:**

1. Mantener la cita actual.
2. Buscar nuevo slot.
3. Crear hold nuevo.
4. Confirmar nuevo slot.
5. Recién entonces liberar el anterior.

## PRC-13 — Emisión y validación QR

1. Generar token opaco y seguro.
2. Vincularlo a la cita.
3. Mostrarlo como QR.
4. Al escanear, validar estado, fecha y vigencia.
5. Registrar check-in.

## PRC-14 — Gestión de teleconsulta

1. Crear sesión virtual.
2. Generar token temporal.
3. Permitir entrada a sala de espera en ventana válida.
4. Alertar al médico.
5. Médico admite paciente.
6. Iniciar consulta.
7. Invalidar acceso al finalizar o cancelar.

## PRC-15 — Estimación inteligente de espera

1. Obtener longitud de cola.
2. Obtener médicos activos.
3. Obtener pacientes en consulta.
4. Obtener duración histórica.
5. Obtener patrón temporal.
6. Construir features.
7. Consultar microservicio Python.
8. Obtener estimación.
9. Mostrar rango y nivel de demanda.
10. Si IA falla, usar baseline estadístico.

## PRC-16 — Gestión de cola digital

Estados sugeridos:

- WAITING
- CALLED
- IN_CONSULTATION
- COMPLETED
- LEFT

El tiempo real de espera se calcula mediante:

`consultation_started_at - checked_in_at`

## PRC-17 — Lista de espera y reasignación

1. Estudiante solicita entrar a lista.
2. Registra preferencias.
3. Slot liberado dispara búsqueda de candidatos.
4. Sistema selecciona candidatos compatibles.
5. Aplica reglas institucionales y FIFO entre equivalentes.
6. Crea oferta temporal.
7. Notifica estudiante.
8. Si acepta, crea cita.
9. Si rechaza o expira, pasa al siguiente.

## PRC-18 — Gestión de déficit de capacidad

1. Detectar déficit.
2. Mostrar magnitud.
3. Mostrar médicos potencialmente disponibles.
4. Permitir crear solicitud de turno adicional.
5. Si se aprueba/acepta, generar nuevo turno y slots.

## PRC-19 — Check-in de paciente

1. Escanear QR o localizar cita.
2. Validar cita.
3. Registrar hora de llegada.
4. Cambiar estado.
5. Insertar paciente en cola digital.
6. Actualizar estimaciones.

## PRC-20 — Atención y encuentro clínico

1. Médico llama paciente.
2. Inicia consulta.
3. Crear `ClinicalEncounter`.
4. Abrir ficha correspondiente a la especialidad.
5. Permitir guardado de borrador.
6. Completar atención.
7. Cerrar encuentro.
8. Registrar hora de finalización.
9. Actualizar cola.

## PRC-21 a PRC-24 — Atención especializada

Cada especialidad posee una ficha y flujo clínico propio, validado durante el levantamiento con profesionales del área.

---

# 4. Requerimientos Funcionales — RF

| ID | Requerimiento |
|---|---|
| RF-01 | Registrar, editar, activar e inactivar personal médico. |
| RF-02 | Asociar especialidades, modalidades y parámetros de agenda. |
| RF-03 | Mostrar agenda diaria, semanal y detalle de citas. |
| RF-04 | Crear solicitudes de cambio y analizar impacto. |
| RF-05 | Aprobar, rechazar y auditar solicitudes. |
| RF-06 | Crear turnos, validar conflictos y generar slots. |
| RF-07 | Calcular capacidad, demanda y déficit. |
| RF-08 | Filtrar disponibilidad por especialidad, médico, fecha y modalidad. |
| RF-09 | Crear hold de 10 minutos y evitar colisiones. |
| RF-10 | Gestionar campañas Tipo A con capacidad independiente. |
| RF-11 | Validar hold, crear cita y ocupar slot. |
| RF-12 | Cancelar, liberar slot y reprogramar. |
| RF-13 | Generar, visualizar y validar QR. |
| RF-14 | Generar sesión virtual, token temporal y sala de espera. |
| RF-15 | Consultar modelo de IA y aplicar fallback estadístico. |
| RF-16 | Crear y actualizar cola digital. |
| RF-17 | Gestionar lista, ofertas y reasignación. |
| RF-18 | Detectar déficit y gestionar ampliación de oferta. |
| RF-19 | Registrar llegada y check-in. |
| RF-20 | Crear, guardar y cerrar encuentro clínico. |
| RF-21 | Gestionar ficha Especialidad 1. |
| RF-22 | Gestionar ficha Especialidad 2. |
| RF-23 | Gestionar ficha Especialidad 3. |
| RF-24 | Gestionar ficha Especialidad 4. |

---

# 5. Requerimientos No Funcionales — RNF

| ID | Requerimiento |
|---|---|
| RNF-01 | Autorización mediante RBAC y auditoría del personal médico. |
| RNF-02 | Integridad y trazabilidad de configuración profesional. |
| RNF-03 | Operaciones estándar de agenda p95 < 200 ms. |
| RNF-04 | 100% de cambios de agenda auditables. |
| RNF-05 | 100% de decisiones administrativas de agenda trazables. |
| RNF-06 | Cero conflictos de agenda y operaciones transaccionales. |
| RNF-07 | Métricas de capacidad, latencia y rendimiento. |
| RNF-08 | Búsquedas de disponibilidad p95 < 500 ms. |
| RNF-09 | Cero double booking bajo pruebas concurrentes. |
| RNF-10 | Separación íntegra entre capacidad Tipo A y Tipo B. |
| RNF-11 | Reserva atómica y transaccional. |
| RNF-12 | Auditoría y consistencia de reprogramaciones. |
| RNF-13 | TLS 1.3 cuando sea compatible y QR con token no predecible. |
| RNF-14 | Tokens temporales, expirables y revocables para teleconsulta. |
| RNF-15 | Inferencia p95 < 300 ms y evaluación con MAE/RMSE. |
| RNF-16 | Cambios de cola visibles en <= 5 segundos. |
| RNF-17 | Reasignación consistente y notificaciones oportunas. |
| RNF-18 | Observabilidad de demanda y capacidad. |
| RNF-19 | Check-in íntegro, seguro y auditable. |
| RNF-20 | Cifrado en tránsito, cifrado en reposo, RBAC y auditoría clínica. |
| RNF-21 | Privacidad y trazabilidad de Especialidad 1. |
| RNF-22 | Privacidad y trazabilidad de Especialidad 2. |
| RNF-23 | Privacidad y trazabilidad de Especialidad 3. |
| RNF-24 | Privacidad y trazabilidad de Especialidad 4. |

