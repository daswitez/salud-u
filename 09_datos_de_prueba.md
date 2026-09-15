# Datos de prueba

> Fuente única de datos ficticios para desarrollo, demostraciones y pruebas manuales. No usar nombres, correos, teléfonos, códigos ni información clínica real.

## 1. Cómo usar estos datos actualmente

La autenticación actual es una **demo de frontend**. En P01:

- Se acepta cualquier correo con formato válido.
- La contraseña debe tener al menos 8 caracteres.
- Para una cuenta mock, el campo `role` asociado al correo define el área a la que se redirige la sesión; el usuario no selecciona el rol en el login.
- Los correos que no estén en la lista mock ingresan temporalmente al recorrido de estudiante.

Para mantener las pruebas repetibles, utilizar las cuentas y contraseña de esta tabla.

## 2. Cuentas de demostración

| ID | Rol | Nombre visible | Correo | Contraseña demo | Ruta esperada |
|---|---|---|---|---|---|
| U-EST-001 | Estudiante | Daniela Rojas | `daniela.rojas@demo.com` | `Demo2026!` | `/estudiante` |
| U-MED-001 | Personal médico | Dra. Valeria Mendoza | `valeria.mendoza@demo.com` | `Demo2026!` | `/medico` |
| U-ADM-001 | Personal administrativo | María Fernández | `maria.fernandez@demo.com` | `Demo2026!` | `/administrativo` |

### Casos manuales de acceso

| Caso | Datos | Resultado esperado |
|---|---|---|
| Inicio correcto como estudiante | `daniela.rojas@demo.com` + `Demo2026!` | Redirige a `/estudiante` por el `role` mock. |
| Inicio correcto como médico | `valeria.mendoza@demo.com` + `Demo2026!` | Redirige a `/medico` por el `role` mock. |
| Inicio correcto como administrativo | `maria.fernandez@demo.com` + `Demo2026!` | Redirige a `/administrativo` por el `role` mock. |
| Correo inválido | `correo-invalido` + contraseña válida | Muestra mensaje de error y no crea sesión. |
| Contraseña corta | Correo válido + `1234567` | Muestra mensaje de error y no crea sesión. |
| Ruta ajena | Sesión de estudiante e ingreso a `/medico` | Redirige al área del estudiante. |
| Cierre de sesión | Perfil → **Cerrar sesión** | Borra la sesión demo y vuelve a P01. |

## 3. Datos visibles actuales por rol

Estos datos alimentan únicamente la vista mock actual. Se migrarán a fixtures, mocks de API o semillas de base de datos cuando el backend esté disponible.

### 3.1 Estudiante — Daniela Rojas

| Campo | Valor |
|---|---|
| ID de estudiante | `EST-2026-001` |
| Próxima cita | Consulta de seguimiento, Especialidad 1 |
| Fecha/hora | Miércoles 10 de septiembre, 10:30 |
| Profesional | Dra. Valeria Mendoza |
| Modalidad | Presencial |
| Ubicación | Consultorio B-12 |
| Estado de check-in | Pendiente |
| Chequeo Tipo A | Pendiente; campaña habilitada |
| Lista de espera | Activa para Especialidad 2, presencial, lunes a viernes por la mañana |
| Avisos | Recordatorio de cita y campaña Tipo A disponible |

### 3.2 Médico — Dra. Valeria Mendoza

| Campo | Valor |
|---|---|
| ID de personal | `MED-001` |
| Especialidad habilitada | Especialidad 1 |
| Modalidad | Presencial y teleconsulta |
| Citas del día | 12 |
| Citas completadas | 4 |
| Pacientes esperando | 3 |
| Próxima atención | 10:30 |
| Teleconsultas del día | 1, programada a las 14:30 |

Agenda mock visible para la Dra. Valeria Mendoza (solo lectura en `/medico/agenda`):

| Hora | Paciente anonimizado | Estado |
|---:|---|---|
| 09:00 | Estudiante A. | Completada |
| 10:30 | Estudiante B. | Confirmada |
| 11:00 | Estudiante C. | Confirmada |

### 3.3 Agenda operativa médica — B4

| ID | Fecha/hora | Tipo | Detalle | Modalidad / estado |
|---|---|---|---|---|
| `AGEN-001` | 10 sep, 09:00–09:30 | Cita | Estudiante A. · Control programado | Presencial · Confirmada |
| `AGEN-002` | 10 sep, 10:30–11:00 | Cita | Daniela Rojas · Consulta de seguimiento | Presencial · Confirmada |
| `AGEN-003` | 10 sep, 12:00–13:00 | Bloqueo | Bloque administrativo | Bloqueado |
| `AGEN-004` | 10 sep, 14:30–15:00 | Cita | Estudiante D. · Seguimiento | Teleconsulta · Confirmada |
| `AGEN-005`–`AGEN-009` | 11–15 sep | Slots y bloqueos | Horarios publicados, teleconsulta y reunión de equipo | Disponible / bloqueado |

La agenda permite alternar las vistas **día**, **semana** y **mes**. Los elementos de tipo cita llevan a un detalle de agenda autorizado; el contexto completo del paciente sigue requiriendo relación asistencial activa desde la cola.

### 3.4 Catálogo de profesionales y disponibilidad para reserva Tipo B

| ID | Profesional | Especialidad | Modalidad | Slots publicados |
|---|---|---|---|---|
| `MED-001` | Dra. Valeria Mendoza | Especialidad 1 | Presencial, teleconsulta | `SLOT-100` a `SLOT-104` |
| `MED-002` | Dr. Andrés Flores | Especialidad 2 | Presencial, teleconsulta | `SLOT-105`, `SLOT-200` |
| `MED-003` | Dra. Camila Torres | Especialidad 3 | Teleconsulta | `SLOT-300` |
| `MED-004` | Dr. Mateo Silva | Especialidad 4 | Presencial | `SLOT-400` |

| Slot | Fecha y hora | Profesional | Modalidad | Estado inicial | Demanda / espera |
|---|---|---|---|---|---|
| `SLOT-100` | 15 sep, 09:00 | Dra. Valeria Mendoza | Presencial | Disponible | Media · 15–25 min |
| `SLOT-101` | 15 sep, 09:30 | Dra. Valeria Mendoza | Presencial | Disponible | Media · 15–25 min |
| `SLOT-102` | 15 sep, 10:00 | Dra. Valeria Mendoza | Presencial | No disponible | Alta · 30–40 min |
| `SLOT-103` | 15 sep, 14:30 | Dra. Valeria Mendoza | Teleconsulta | Disponible | Baja · 10–15 min |
| `SLOT-104` | 16 sep, 08:30 | Dra. Valeria Mendoza | Presencial | Disponible | Baja · 10–20 min |
| `SLOT-105` | 16 sep, 11:00 | Dr. Andrés Flores | Teleconsulta | Disponible | Media · 15–25 min |
| `SLOT-200` | 16 sep, 15:00 | Dr. Andrés Flores | Presencial | No disponible | Alta · 35–50 min |
| `SLOT-300` | 17 sep, 10:00 | Dra. Camila Torres | Teleconsulta | Disponible | Baja · 10–20 min |
| `SLOT-400` | 18 sep, 09:00 | Dr. Mateo Silva | Presencial | Disponible | Media · 15–25 min |

### 3.5 Citas, holds y cola para la demostración B2

| ID | Tipo | Estado inicial / regla |
|---|---|---|
| `CIT-2026-001` | Cita de Daniela Rojas | Confirmada, presencial, 10 sep 10:30, Dra. Valeria Mendoza, consultorio B-12 |
| `CIT-2026-002` | Historial | Completada, Especialidad 2, teleconsulta |
| `CIT-2026-003` | Historial | Cancelada, Especialidad 1, presencial |
| Hold de reserva | Retención temporal | Al abrir `/estudiante/reservar?slotId=...`, el slot queda retenido por 10 minutos en `localStorage`. Solo un hold vigente puede confirmar la cita. |
| Reprogramación | Regla mock | La cita original sigue confirmada mientras se elige otro slot. Solo después de confirmar la nueva se marca la original como cancelada. |
| `COL-2026-002`–`COL-2026-003` | Cola médica inicial | Dos estudiantes ficticios registrados con la Dra. Valeria Mendoza, ambos en espera. |

### 3.6 Check-in, QR y cola — B3

| Dato | Valor / comportamiento mock |
|---|---|
| Fecha operativa demo | `2026-09-10`; solo una cita presencial confirmada de esta fecha puede registrarse. |
| QR opaco de Daniela | `qr_7Hd4mP2kX9`; no contiene nombre, especialidad ni datos clínicos. |
| Cita apta para check-in | `CIT-2026-001`, presencial, 10:30, Dra. Valeria Mendoza. |
| Validación médica P31 | `/medico/check-in`: el médico acepta token QR o ID de cita y valida vigencia, fecha, modalidad, estado y llegada única. |
| Estado de cola P10 | `/estudiante/cola`: muestra llegada, rango estimado, demanda y última actualización tras check-in. |
| Agenda y cola médica P14/P16 | `/medico/agenda` reúne calendario de citas, espacios disponibles y bloqueos con la cola operativa. **Llamar siguiente** → **Iniciar atención** → **Finalizar atención** actualiza el mismo estado local. |
| Contexto e historia P17/P18 | Desde cualquier paciente asignado a `MED-001` en la cola se puede abrir su contexto e historial autorizado, incluso en espera. La ficha solo se habilita al llamar o iniciar la atención; otros IDs muestran acceso restringido. |
| Detalles de paciente | `EST-2026-001`: Daniela Rojas, Ingeniería de Sistemas, correo, teléfono y contacto de emergencia ficticios. |

### 3.7 Encuentros e historias clínicas especializadas — B6

| ID | Tipo | Datos mock / regla |
|---|---|---|
| `ENC-2026-001` | Encuentro previo | Especialidad 2, finalizado el 21 ago; metadata y plan ficticios autorizados. |
| `ENC-2026-002` | Encuentro previo | Especialidad 1, finalizado el 15 ago; visible a `MED-001` como historial permitido. |
| Nuevo encuentro | Borrador | Se crea desde una entrada de cola llamada o en atención y se persiste en `localStorage`. |
| Casos activos P19–P22 | Encuentros | `COL-2026-009` (Especialidad 1), `COL-2026-010` (Especialidad 2), `COL-2026-011` (Especialidad 3) y `COL-2026-012` (Especialidad 4) están en atención para probar cada ficha. |
| Fichas P19–P22 | Formularios | Cuatro estructuras mock con campos propios: motivo, evaluación/valoración, hallazgos o intervención y plan de seguimiento. |
| Finalización | Regla | Solo un encuentro `DRAFT` de un paciente `IN_SERVICE` puede finalizar. Registra `endedAt`, completa cita/cola y bloquea una segunda finalización. |

Rutas de demostración: `/medico/encuentro/COL-2026-009` presenta P18 para Especialidad 1. Las fichas se prueban directamente con: `especialidad-1?cola=COL-2026-009`, `especialidad-2?cola=COL-2026-010`, `especialidad-3?cola=COL-2026-011` y `especialidad-4?cola=COL-2026-012`.

### 3.8 Dashboard administrativo — B5

| Campo | Valor |
|---|---|
| ID de personal | `ADM-001` |
| Permisos previstos | Gestión de agenda, médicos, campañas, citas y reportes operativos |
| Citas del día | 84 |
| Médicos activos | 16 |
| Especialidades habilitadas | 4 |
| Pacientes en cola | 11 |
| Lista de espera | 7, con 2 solicitudes nuevas |
| Alerta de capacidad | Especialidad 2 con déficit previsto de 8 cupos |
| Solicitud pendiente | Ausencia de Dra. Andrea C., jueves 14:00–18:00 |

Métricas operativas del dashboard: 84 citas del día, 16 médicos activos, 11 pacientes en cola, 7 entradas en lista de espera, 2 especialidades saturadas y 2 incidencias. Cada indicador deriva a su módulo administrativo mock: personal médico, planificación, capacidad, lista de espera o incidencias; no habilita check-in ni asignaciones clínicas.

### 3.9 Personal médico y solicitudes — B7

| Dato | Valor / comportamiento mock |
|---|---|
| Solicitud médica P15 | `/medico/solicitudes`: la Dra. Valeria solicita bloqueo, cambio de horario o modalidad para un periodo. Antes de enviar, ve las citas confirmadas potencialmente afectadas. |
| Solicitud inicial | `SOL-2026-001`, bloqueo del 10 sep, estado `Pendiente`, con citas de `MED-001` como impacto mock. |
| Solicitud resuelta | `SOL-2026-002`, cambio a teleconsulta el 15 sep, estado `Aprobada`, con resolución registrada. |
| Personal P25 | `/administrativo/personal-medico`: `MED-001` a `MED-004` están activos. Permite crear, editar, activar/inactivar y conservar su bitácora. |
| Duplicados | El correo de profesional debe ser único; el mock informa el conflicto sin guardar cambios. |
| Solicitudes P27 | `/administrativo/solicitudes`: administración revisa citas afectadas, capacidad alternativa, motivo y bitácora; puede aprobar, rechazar o solicitar ajuste con una razón obligatoria. |

La información de B7 se persiste solo en el `localStorage` del navegador bajo una clave demo. No afecta un backend ni datos reales.

### 3.10 Planificación, capacidad y demanda — B8

| Dato | Valor / comportamiento mock |
|---|---|
| Planificación P26 | `/administrativo/planificacion`: crea turnos con médico activo, especialidad/modalidad habilitadas, rango, duración y pausas. Valida solapes antes de guardar el borrador. |
| Turno publicado | `TUR-2026-001`, Dra. Valeria, 15 sep, 08:00–10:00 presencial, slots de 30 min y pausa 09:00–09:30. Sus slots reservables aparecen en P04. |
| Turno borrador | `TUR-2026-002`, Dr. Andrés, 16 sep, 09:00–12:00, teleconsulta; no aparece en búsqueda estudiantil hasta que se publique. |
| Capacidad P28 | `/administrativo/capacidad`: filtra periodo/especialidad y presenta slots publicados, ocupados, lista de espera, demanda, espera y déficit mock. |
| Déficit demostrable | Especialidad 2 contiene demanda alta y 7 entradas de espera; muestra recomendación de iniciar planificación o revisar solicitudes, sin asignar médicos automáticamente. |

Los turnos, borradores y publicaciones de B8 se persisten solo en el almacenamiento local de esta demostración.

### 3.11 Chequeo Tipo A y lista de espera — B9

| Dato | Valor / comportamiento mock |
|---|---|
| Chequeo P08 | `/estudiante/chequeo`: Daniela inicia en estado `Pendiente`, elegible para `CAM-2026-001`. Muestra resultado para pendiente, cupo reservado, completado o no elegible. |
| Campaña Tipo A | `CAM-2026-001`, 22 sep, 08:30, Centro de Salud Universitaria, 12 cupos iniciales. Su capacidad no consume slots Tipo B. |
| Cita Tipo A | Al reservar se crea una cita mock de chequeo, visible en Mis citas y su detalle P07. Un segundo cupo queda bloqueado. |
| Lista P09 | `/estudiante/lista-espera`: preferencias de Especialidad 2, 16–20 sep, franja 14:00–18:00, presencial y médico opcional. No existe posición de espera ficticia. |
| Oferta mock | `OFF-2026-001`, Especialidad 2, Dr. Andrés Flores, 16 sep a las 15:30 presencial. Vence 20 minutos después de cargarse por primera vez en el navegador. |
| Excepciones P30 | `/administrativo/lista-espera`: muestra cancelaciones, ofertas, reasignaciones y permite reenviar o retirar una oferta previa confirmación. |

Los estados de campaña, lista de espera y ofertas de B9 son exclusivamente locales a este navegador y no representan datos clínicos reales.

### 3.12 Estados operativos y teleconsulta — B10/B11

| Dato | Valor / comportamiento mock |
|---|---|
| Contratos B10 | `10_contratos_ui.md` y `src/lib/ui-contracts.ts` definen respuestas, estados vacíos, errores y recuperación para cambiar mocks por endpoints sin romper la UI. |
| Teleconsulta P11 | `/estudiante/teleconsulta/CIT-2026-004?token=tele_7Xk2pQ9m`: valida token, ventana y estado de cita; muestra sala de espera, instrucciones y reintento de conexión mock. |
| Sesión virtual | `TEL-2026-001`, asignada a `MED-001`, Daniela Rojas, Estado inicial `WAITING`. El token es opaco y expira 25 minutos después de inicializarse en el navegador. |
| Sala médica P23 | `/medico/teleconsulta`: solo muestra sesiones de `MED-001`; admitir cambia la sesión a `ADMITTED`, finalizar completa la cita e invalida el acceso. |
| Reingreso | Una cita cancelada o una sesión `ENDED`/`REVOKED`/expirada no permite volver a ingresar. |

### 3.13 Avisos, preferencias y auditoría — B12/B13

| Dato | Valor / comportamiento mock |
|---|---|
| Avisos P12 | `/estudiante/avisos`: `NOT-2026-001` a `NOT-2026-005` incluyen recordatorio, teleconsulta, oferta de espera, campaña y cambio/cancelación. Cada aviso tiene fecha, estado, lectura y recurso asociado. |
| Preferencias P02 | `/perfil?rol=estudiante` permite ajustar canal dentro de la aplicación/correo por evento. La política exige mantener el aviso dentro de la aplicación para cancelaciones críticas. |
| Auditoría P32 | `/administrativo/auditoria`: `AUD-2026-001` a `AUD-2026-006` contienen actor, acción, recurso, referencia, estado y timestamp; no contienen notas ni contenido clínico. |
| Indicadores permitidos | Latencia API `380 ms`, holds exitosos `96%`, cola mediana `22 min`, diferencia real/estimada `± 6 min`, lista de espera activa `7`. |
| Exportación | Deshabilitada por política mock. Requeriría autorización de auditoría explícita en una implementación real. |

## 4. Convenciones para próximos datos mock

| Dominio | Formato de ID | Ejemplo |
|---|---|---|
| Usuario estudiante | `EST-YYYY-NNN` | `EST-2026-002` |
| Personal médico | `MED-NNN` | `MED-002` |
| Personal administrativo | `ADM-NNN` | `ADM-002` |
| Cita | `CIT-YYYY-NNN` | `CIT-2026-001` |
| Turno médico | `TUR-YYYY-NNN` | `TUR-2026-001` |
| Slot | `SLOT-YYYY-NNN` | `SLOT-2026-001` |
| Campaña Tipo A | `CAM-YYYY-NNN` | `CAM-2026-001` |
| Entrada de cola | `COL-YYYY-NNN` | `COL-2026-001` |
| Lista de espera | `LE-YYYY-NNN` | `LE-2026-001` |

## 5. Próximos conjuntos de datos a incorporar

| Bloque | Datos que se agregarán aquí |
|---|---|
| B1 — Inicio y búsqueda | Implementado: catálogo de especialidades, médicos, modalidades, disponibilidad, slots ocupados y sin cupo. |
| B2 — Reserva y citas | Implementado en frontend: holds de 10 min, citas confirmadas/canceladas/reprogramadas, QR ficticio y reglas de expiración. |
| B3 — Check-in y cola | Implementado en frontend: QR opaco, validación controlada, llegada única, cola persistida, espera estimada y acciones médicas por estado. |
| B4 — Inicio y agenda médica | Implementado en frontend: tablero operativo, próximos pacientes, check-ins, cola, teleconsultas y agenda con vistas día/semana/mes. |
| B5 — Dashboard administrativo | Implementado en frontend: métricas operativas, demanda, lista de espera e incidencias con derivación a módulos permitidos. |
| B6 — Encuentro e historias clínicas | Implementado en frontend: resumen autorizado, borradores recuperables, cuatro fichas especializadas y finalización trazable. |
| B6 — Atención clínica | Encuentros y fichas totalmente ficticias, anonimizadas y separadas por especialidad. |
| B7 — Personal y solicitudes | Implementado en frontend: creación/edición/activación de profesionales, configuración futura de especialidades/modalidades y ciclo de solicitudes médicas con impacto y auditoría. |
| B8 — Planificación, capacidad y demanda | Implementado en frontend: turnos en borrador, pausas, detección de solapes, previsualización, publicación y panel de capacidad/demanda. |
| B9 — Chequeo y lista de espera | Implementado en frontend: campaña Tipo A independiente, estado de elegibilidad, preferencias, ofertas temporales y excepciones administrativas trazables. |
| B10 — Estados e integración | Implementado en frontend: contratos de UI, errores recuperables y convenciones para sustituir mocks por API. |
| B11 — Teleconsulta | Implementado en frontend: validación de acceso, sala de espera, admisión médica y finalización con token invalidado. |
| B12 — Avisos y preferencias | Implementado en frontend: avisos enlazados, lectura persistente y preferencias por evento/canal con política crítica. |
| B13 — Auditoría y observabilidad | Implementado en frontend: filtros, paginación, métricas operativas agregadas y privacidad clínica preservada. |

## 6. Regla de seguridad

Las credenciales de este documento son únicamente datos mock. Nunca reutilizarlas en una cuenta real, ambiente productivo ni proveedor externo.
