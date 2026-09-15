# Contexto maestro del proyecto para agentes de desarrollo

> **Propósito de este archivo**
>
> Este documento explica la idea completa del proyecto, su alcance, lógica de negocio, actores, procesos, arquitectura y criterios de diseño con suficiente contexto para que un agente de software pueda trabajar sobre el repositorio sin interpretar el sistema como un simple agendador de citas.
>
> Debe utilizarse como **documento de orientación general**. Los requisitos detallados se encuentran en `01_requisitos_y_procesos.md`, la arquitectura en `02_desarrollo_arquitectura.md`, UI/UX en `03_ui_ux.md`, IA en `04_ia_datos_y_demanda.md` y pantallas en `05_pantallas_y_flujos.md`.

---

# 1. Visión del proyecto

El proyecto consiste en desarrollar un **sistema web y móvil de gestión de atención médica universitaria** para el área de especialidades médicas de una universidad pública.

No es solamente una aplicación para “sacar cita”. El objetivo es digitalizar el recorrido completo del estudiante desde la planificación de la oferta médica hasta el cierre de una atención clínica:

```text
Administración de personal médico
        ↓
Planificación de turnos médicos
        ↓
Generación de capacidad y slots
        ↓
Búsqueda de atención
        ↓
Reserva o campaña masiva
        ↓
Comprobante QR o teleconsulta
        ↓
Check-in
        ↓
Cola digital
        ↓
Estimación de tiempo de espera
        ↓
Atención médica
        ↓
Historia clínica especializada
        ↓
Datos operacionales e históricos
        ↓
Mejor estimación y planificación futura
```

El sistema debe atacar varios problemas del proceso actual:

- programación y atención apoyadas en procedimientos manuales;
- presencia de fichas físicas y filas presenciales;
- dificultad para conocer disponibilidad real antes de acudir;
- temporadas de demanda extremadamente alta y otras de baja demanda;
- tiempos de espera impredecibles;
- capacidad médica que no siempre se distribuye de acuerdo con la demanda;
- cancelaciones y cupos liberados que pueden desaprovecharse;
- registros clínicos que no forman parte de un flujo digital integrado;
- poca trazabilidad operacional.

La idea central es transformar ese proceso en una cadena digital y medible.

---

# 2. Idea de producto en una frase

> Plataforma web y móvil que administra médicos, turnos, capacidad, citas, campañas, check-in, cola, teleconsulta e historias clínicas especializadas, utilizando un modelo predictivo para estimar tiempos de espera y datos de demanda para apoyar la planificación de la oferta médica.

---

# 3. Principios que definen el sistema

## 3.1 La agenda nace de la oferta médica

No deben existir citas “sueltas” sin relación con una agenda real.

La disponibilidad sigue esta jerarquía conceptual:

```text
Médico
  ↓
Especialidad habilitada
  ↓
Turno médico
  ↓
Slots generados
  ↓
Cita
```

Un **turno médico** es el bloque de trabajo de un profesional. Ejemplo conceptual:

```text
Médico A
Lunes 08:00–12:00
Modalidad presencial
Duración de slot: 30 min
```

De ese turno el sistema puede generar:

```text
08:00
08:30
09:00
09:30
10:00
10:30
11:00
11:30
```

Los slots pueden tener bloqueos o pausas y solo los publicados deben aparecer al estudiante.

## 3.2 La IA no decide atención clínica

La inteligencia artificial del proyecto tiene como objetivo principal **estimar tiempos de espera**.

No debe:

- diagnosticar;
- priorizar clínicamente pacientes;
- negar atención;
- decidir qué médico debe trabajar;
- modificar citas de forma autónoma.

La IA es una herramienta operacional y analítica.

## 3.3 La historia clínica es especializada

Existen cuatro especialidades, pero hasta que el levantamiento clínico las confirme formalmente deben denominarse únicamente:

- Especialidad 1
- Especialidad 2
- Especialidad 3
- Especialidad 4

Cada especialidad debe tener una ficha diseñada a medida. No se debe construir un único formulario genérico lleno de campos opcionales para todas.

Sí puede existir un núcleo común de atención, por ejemplo:

```text
ClinicalHistory
    ↓
ClinicalEncounter
    ├── Specialty1Record
    ├── Specialty2Record
    ├── Specialty3Record
    └── Specialty4Record
```

## 3.4 Spring Boot es la fuente de verdad transaccional

La lógica de agenda, slots, citas, colas y estados pertenece al backend transaccional.

El microservicio Python no es dueño de ningún estado crítico.

```text
Spring Boot + PostgreSQL = fuente de verdad
Python + scikit-learn      = inferencia predictiva
```

Una caída del servicio de IA no debe impedir reservar, hacer check-in ni atender pacientes.

---

# 4. Actores del sistema

El sistema posee tres actores humanos principales.

## 4.1 Estudiante Universitario

Responsabilidades y capacidades:

- autenticarse;
- consultar servicios disponibles;
- buscar disponibilidad;
- filtrar por especialidad, médico, fecha y modalidad;
- reservar atención;
- programar el chequeo obligatorio cuando corresponda;
- confirmar, cancelar y reprogramar citas;
- visualizar comprobante QR;
- acceder a teleconsulta;
- ingresar a lista de espera;
- aceptar una vacante liberada;
- realizar check-in;
- visualizar su estado en cola;
- consultar una estimación de espera;
- recibir notificaciones.

## 4.2 Personal Médico Especialista

Responsabilidades y capacidades:

- consultar su agenda;
- visualizar turnos asignados;
- solicitar cambios de disponibilidad;
- solicitar bloqueos, ausencias o turnos extraordinarios cuando corresponda;
- visualizar los pacientes que ya realizaron check-in;
- llamar al siguiente paciente;
- iniciar y cerrar consultas;
- acceder a antecedentes clínicos permitidos;
- registrar el encuentro clínico de su especialidad;
- atender teleconsultas.

Un médico **no administra otros médicos** y no publica libremente la agenda institucional salvo que se defina explícitamente esa capacidad.

## 4.3 Personal Administrativo

Es el actor que administra la operación del servicio.

Puede:

- registrar médicos;
- editar su información operacional;
- activar o inactivar profesionales;
- asociar especialidades y modalidades;
- resolver solicitudes de agenda;
- asignar turnos médicos;
- configurar duración de slots;
- publicar capacidad;
- crear bloqueos de agenda;
- administrar campañas Tipo A;
- visualizar capacidad y demanda;
- gestionar excepciones de citas;
- supervisar lista de espera;
- asistir en check-in;
- consultar auditoría operacional según permisos.

### Regla institucional fundamental

**No existe el rol “Coordinador de Salud”.**

Si alguna funcionalidad requiere permisos de coordinación, debe modelarse mediante permisos dentro de `Personal Administrativo`, por ejemplo:

```text
MANAGE_MEDICAL_STAFF
MANAGE_SCHEDULES
MANAGE_CAMPAIGNS
MANAGE_APPOINTMENTS
VIEW_OPERATIONAL_REPORTS
VIEW_AUDIT
```

No crear un cuarto rol humano denominado coordinador.

---

# 5. Tipos de demanda del estudiante

## 5.1 Tipo A — Chequeo médico obligatorio único

El estudiante debe realizar un chequeo obligatorio **una sola vez durante toda su carrera universitaria**.

Este flujo no debe competir por los mismos cupos que las consultas especializadas.

Características:

- atención masiva;
- campañas por periodo y criterios institucionales;
- capacidad propia;
- slots o cupos de campaña independientes;
- validación de que el estudiante no lo haya completado previamente.

Conceptualmente:

```text
Capacidad Tipo A != Capacidad Tipo B
```

## 5.2 Tipo B — Atención especializada

Corresponde a la atención en Especialidad 1–4.

La disponibilidad proviene de turnos médicos publicados.

Puede incluir:

- presencial;
- teleconsulta, cuando la especialidad y el médico tengan habilitada esa modalidad.

---

# 6. Conceptos de dominio que NO deben confundirse

## Turno médico

Bloque de trabajo asignado a un profesional.

## Slot

Unidad reservable dentro de un turno médico.

## Hold

Bloqueo temporal de un slot durante el flujo de reserva.

Duración acordada:

```text
10 minutos
```

## Cita

Reserva confirmada de un estudiante sobre un slot.

## Cola digital

Pacientes que **ya hicieron check-in** y se encuentran esperando atención.

## Lista de espera

Estudiantes que quieren obtener una cita pero actualmente no poseen un slot disponible.

## Tiempo de espera

Para el modelo principal:

```text
wait_time = consultation_started_at - checked_in_at
```

## Capacidad

Cantidad de atención que puede ofrecerse en un periodo a partir de los turnos y slots publicados.

## Demanda

Cantidad de solicitudes, reservas, pacientes, entradas en lista de espera o carga esperada para un periodo/especialidad.

---

# 7. Macroprocesos del sistema

Los procesos se organizan conceptualmente en cuatro grandes áreas, aunque la matriz formal de trazabilidad usa columnas separadas URS → PRC → RF → RNF.

## Área A — Oferta médica y agenda

Objetivo: determinar quién puede atender, cuándo y cuánta capacidad existe.

Incluye:

1. Gestión del personal médico.
2. Configuración profesional.
3. Consulta de agenda médica.
4. Solicitud de cambio de agenda.
5. Resolución administrativa de solicitudes.
6. Asignación y publicación de turnos.
7. Planificación de capacidad.

## Área B — Exploración y agendamiento

Objetivo: convertir capacidad publicada en acceso real para el estudiante.

Incluye:

8. Búsqueda y exploración de citas.
9. Hold temporal.
10. Agendamiento Tipo A.
11. Agendamiento Tipo B.
12. Cancelación y reprogramación.
13. QR presencial.
14. Teleconsulta.

## Área C — Demanda, cola y espera

Objetivo: gestionar saturación, incertidumbre de espera y recuperación de capacidad.

Incluye:

15. Estimación inteligente de espera.
16. Cola digital.
17. Lista de espera y reasignación.
18. Gestión de déficit de capacidad.

## Área D — Atención clínica

Objetivo: registrar llegada, ejecutar la atención y conservar un expediente especializado.

Incluye:

19. Check-in.
20. Encuentro clínico.
21. Atención Especialidad 1.
22. Atención Especialidad 2.
23. Atención Especialidad 3.
24. Atención Especialidad 4.

---

# 8. Proceso completo de administración de médicos

## 8.1 Alta de médico

1. Personal Administrativo accede a gestión de médicos.
2. Busca si el profesional ya existe.
3. Registra o actualiza sus datos operacionales.
4. Asocia Especialidad 1–4 según corresponda.
5. Define modalidad disponible:
   - presencial;
   - teleconsulta;
   - ambas.
6. Define parámetros requeridos por agenda.
7. Activa al profesional.
8. Sistema registra auditoría.
9. Médico queda disponible para planificación de turnos.

El estado conceptual puede ser:

```text
ACTIVE
INACTIVE
SUSPENDED
```

## 8.2 Configuración de especialidad

Un médico solo puede recibir turnos dentro de una especialidad que tenga habilitada.

Debe existir una relación similar a:

```text
MedicalStaff
MedicalStaffSpecialty
Specialty
```

## 8.3 Inactivación

Inactivar un médico no debe borrar su historial ni sus atenciones anteriores.

Antes de afectar futuros turnos, el sistema debe revisar citas existentes y mostrar impacto.

---

# 9. Solicitudes de agenda del médico

El médico necesita un mecanismo formal para comunicar cambios.

Entidad conceptual:

```text
MedicalScheduleRequest
```

Tipos posibles:

```text
CHANGE_SCHEDULE
TEMPORARY_UNAVAILABILITY
LEAVE
EXTRA_SHIFT
BLOCK_PERIOD
MODALITY_CHANGE
SHIFT_SWAP
OTHER
```

Estados:

```text
PENDING
APPROVED
REJECTED
CANCELLED
APPLIED
```

Flujo:

1. Médico abre su agenda.
2. Selecciona fecha/turno.
3. Solicita modificación.
4. Sistema identifica si existen citas afectadas.
5. Solicitud queda pendiente.
6. Administrativo revisa impacto.
7. Puede aprobar o rechazar.
8. Si se aprueba y existen citas afectadas, se dispara un procedimiento de contingencia.
9. Se notifica al médico y a estudiantes afectados cuando corresponda.
10. Se registra trazabilidad.

No borrar automáticamente un turno con citas activas.

---

# 10. Asignación de turnos médicos

Este es un proceso central.

## Entradas

- médicos activos;
- especialidad habilitada;
- disponibilidad;
- solicitudes aprobadas;
- horarios existentes;
- modalidad;
- duración de consulta/slot;
- demanda histórica;
- demanda estimada;
- lista de espera;
- campañas y restricciones institucionales.

## Flujo esperado

1. Administrativo selecciona un periodo.
2. Selecciona especialidad.
3. Sistema muestra médicos elegibles.
4. Sistema muestra capacidad ya publicada.
5. Sistema muestra indicadores de demanda.
6. Administrativo selecciona médico.
7. Define fecha y hora de inicio/fin.
8. Define modalidad.
9. Define duración del slot.
10. Sistema valida solapamientos.
11. Sistema valida que el médico esté activo y habilitado para esa especialidad.
12. Sistema calcula slots posibles.
13. Administrativo puede añadir pausas/bloqueos.
14. Sistema muestra preview.
15. Turno puede guardarse como borrador.
16. Cuando se publica, se generan slots reservables.
17. Los slots aparecen en búsqueda.
18. Se registra auditoría.

Estados sugeridos de `MedicalShift`:

```text
DRAFT
PUBLISHED
BLOCKED
CANCELLED
COMPLETED
```

Estados sugeridos de `Slot`:

```text
AVAILABLE
HELD
BOOKED
BLOCKED
CANCELLED
```

---

# 11. Gestión de capacidad y demanda

El sistema debe ayudar al personal administrativo a responder:

- ¿cuántos slots existen para cada especialidad?
- ¿cuántos ya están ocupados?
- ¿cuánta gente está esperando?
- ¿en qué días u horas existe mayor saturación?
- ¿la oferta futura parece suficiente?

Ejemplo conceptual:

```text
Especialidad 1
Próxima semana

Slots publicados: 96
Demanda estimada: 124
Lista de espera: 21
Déficit estimado: 28
```

El sistema puede advertir:

```text
Capacidad prevista insuficiente
```

Pero **no debe asignar autónomamente más horas a un médico**.

La decisión puede llevar a:

- abrir un turno extraordinario;
- consultar médicos disponibles;
- solicitar disponibilidad adicional;
- redistribuir la oferta;
- mantener capacidad actual.

Flujo circular:

```text
Demanda
   ↓
Déficit detectado
   ↓
Decisión administrativa
   ↓
Nuevo turno médico
   ↓
Nuevos slots
   ↓
Mayor capacidad
```

---

# 12. Búsqueda y exploración de citas

Esta es una de las experiencias principales del estudiante.

Debe permitir filtrar por:

- especialidad;
- médico;
- fecha/rango;
- modalidad;
- disponibilidad.

Flujo:

1. Estudiante abre “Buscar atención”.
2. Sistema identifica qué servicios puede utilizar.
3. Estudiante selecciona tipo de atención.
4. Si es Tipo B, selecciona especialidad.
5. Puede seleccionar médico opcionalmente.
6. Selecciona modalidad.
7. Selecciona fecha/rango.
8. Backend consulta turnos publicados.
9. Excluye slots ocupados, bloqueados o en hold vigente.
10. Libera lógicamente holds expirados.
11. Devuelve disponibilidad real.
12. Puede mostrar tiempo de espera o demanda estimada cuando aplique.
13. Estudiante selecciona un slot.
14. Se inicia hold de 10 minutos.

El frontend no es la fuente de verdad de disponibilidad.

---

# 13. Hold temporal de 10 minutos

Cuando un estudiante selecciona un slot:

1. Backend abre una operación transaccional.
2. Verifica nuevamente disponibilidad.
3. Crea un hold exclusivo.
4. Guarda estudiante propietario.
5. Define:

```text
expires_at = now + 10 minutos
```

6. Mientras esté vigente, otro usuario no puede reservar ese slot.
7. Si se confirma la cita, el slot pasa a reservado.
8. Si expira, vuelve a estar disponible.

Condición crítica:

```text
0 double booking
```

La exclusión debe garantizarse en backend/PostgreSQL, no mediante un simple estado visual del frontend.

---

# 14. Agendamiento Tipo A

Flujo esperado:

1. Estudiante selecciona chequeo obligatorio.
2. Sistema consulta si ya fue completado.
3. Si ya está completado, no permite una segunda realización como Tipo A.
4. Consulta campañas activas.
5. Aplica reglas de elegibilidad.
6. Muestra capacidad de campaña.
7. Estudiante selecciona cupo.
8. Sistema reserva capacidad Tipo A.
9. Crea cita/registro correspondiente.
10. Genera comprobante y notificaciones.

La capacidad Tipo A jamás debe restarse de la capacidad normal de Especialidad 1–4.

---

# 15. Agendamiento Tipo B

1. Estudiante selecciona slot.
2. Backend crea hold.
3. Estudiante confirma.
4. Backend verifica que el hold siga vigente y pertenezca al estudiante.
5. Dentro de una transacción:
   - crea cita;
   - cambia slot `HELD → BOOKED`;
   - registra modalidad;
   - crea historial de estado.
6. Según modalidad:
   - presencial → genera QR;
   - teleconsulta → genera sesión segura.
7. Programa notificaciones.

Estados de cita sugeridos:

```text
PENDING_CONFIRMATION
CONFIRMED
CHECKED_IN
WAITING
CALLED
IN_CONSULTATION
COMPLETED
CANCELLED
NO_SHOW
```

---

# 16. Cancelación y reprogramación

## Cancelación

1. Usuario selecciona una cita.
2. Backend valida que su estado permita cancelar.
3. Cambia a `CANCELLED`.
4. Libera slot.
5. Invalida QR o acceso virtual.
6. Emite evento conceptual:

```text
SLOT_RELEASED
```

7. Lista de espera puede intentar reutilizar ese slot.

## Reprogramación segura

No cancelar primero la cita original.

Secuencia recomendada:

1. Mantener cita actual.
2. Buscar nuevo slot.
3. Crear hold del nuevo slot.
4. Confirmar nuevo slot transaccionalmente.
5. Liberar slot anterior.
6. Registrar historial.

Esto evita que el estudiante pierda una cita antes de asegurar otra.

---

# 17. Modalidad presencial y QR

Una cita presencial confirmada debe producir un comprobante digital.

El QR debe representar un identificador/token opaco y verificable, no información clínica sensible en texto plano.

Flujo de check-in:

1. Estudiante presenta QR.
2. Recepción/consultorio lo escanea.
3. Backend valida token.
4. Comprueba cita, fecha, vigencia y estado.
5. Marca `CHECKED_IN`.
6. Registra hora real de llegada.
7. Crea entrada en cola digital.

El objetivo es reducir dependencia de fichas físicas y filas administrativas.

---

# 18. Teleconsulta

Cuando una cita sea virtual:

1. Backend crea `TeleconsultationSession`.
2. Genera credencial temporal no predecible.
3. El estudiante solo puede entrar dentro de la ventana permitida.
4. Ingresa a una sala virtual de espera.
5. El médico recibe una alerta cuando el estudiante se conecta.
6. Médico admite al paciente.
7. Se inicia canal cifrado.
8. Al cerrar la atención, se invalida la sesión según política.

Los tokens deben ser temporales, expirables y revocables.

---

# 19. Cola digital

La cola digital comienza después del check-in.

Entidad conceptual:

```text
QueueEntry
```

Estados sugeridos:

```text
WAITING
CALLED
IN_CONSULTATION
COMPLETED
LEFT
```

Flujo:

1. Check-in crea entrada `WAITING`.
2. Médico visualiza cola.
3. Llama al siguiente paciente.
4. Estado pasa a `CALLED`.
5. Médico inicia atención.
6. Estado pasa a `IN_CONSULTATION`.
7. Se registra `consultation_started_at`.
8. Al terminar, pasa a `COMPLETED`.
9. Se registra `consultation_finished_at`.

Estos timestamps son esenciales para el modelo de espera.

---

# 20. Modelo predictivo de tiempo de espera

La IA debe responder una pregunta útil:

> ¿Cuánto tiempo aproximadamente tendrá que esperar un estudiante para ser atendido dadas las condiciones actuales e históricas?

Variable objetivo:

```text
wait_time_minutes = consultation_started_at - checked_in_at
```

## Posibles features actuales

```text
queue_length
patients_in_consultation
active_doctors
recent_arrivals
recent_completions
appointments_next_60_minutes
```

## Posibles features temporales/históricas

```text
specialty
weekday
hour
month
academic_period
average_consultation_duration
historical_wait_same_period
campaign_active
```

## Salida deseada

No mostrar una promesa exacta.

Preferir:

```text
Espera estimada: 25–35 min
Demanda: ALTA
```

Ejemplo de respuesta del microservicio:

```json
{
  "estimatedWaitMinutes": 30,
  "lowerBound": 24,
  "upperBound": 38,
  "demandLevel": "HIGH",
  "modelVersion": "wait-time-1.0.0"
}
```

## Modelos candidatos

No fijar un modelo definitivo antes de evaluar.

Comparar por ejemplo:

- promedio/mediana histórica como baseline;
- Linear Regression;
- Random Forest Regressor;
- Gradient Boosting Regressor;
- HistGradientBoostingRegressor.

Métricas:

- MAE como métrica principal;
- RMSE;
- R².

Meta experimental propuesta:

```text
MAE <= 10 minutos
```

No tratar esa meta como garantía previa.

---

# 21. Cold start de la IA

El servicio actual puede no disponer de suficientes datos digitales estructurados.

Por eso el sistema debe funcionar desde el primer día sin depender de ML entrenado.

## Fase 1

Baseline estadístico, por ejemplo:

```text
queue_length × average_consultation_duration / active_doctors
```

con ajustes básicos.

## Fase 2

Recolectar automáticamente:

```text
checked_in_at
consultation_started_at
consultation_finished_at
queue_length
active_doctors
contexto temporal
```

## Fase 3

Entrenar y comparar modelos.

## Fase 4

Desplegar solo un modelo que supere de forma suficiente al baseline.

## Fallback

Si Python falla:

```text
Spring Boot
   ↓
usa estimación estadística
   ↓
la agenda sigue funcionando
```

---

# 22. Lista de espera inteligente

La lista de espera es distinta de la cola digital.

Flujo:

1. Estudiante busca cita.
2. No existe disponibilidad compatible.
3. Puede ingresar a lista de espera.
4. Define criterios aceptables:
   - especialidad;
   - fechas;
   - modalidad;
   - médico opcional.
5. Una cita se cancela o libera un slot.
6. Sistema busca candidatos compatibles.
7. Aplica reglas institucionales.
8. Entre candidatos equivalentes puede utilizar FIFO.
9. Selecciona candidato.
10. Crea oferta temporal.
11. Reserva temporalmente el slot.
12. Notifica al estudiante.
13. Estudiante dispone de una ventana configurable para aceptar.
14. Si acepta → cita confirmada.
15. Si rechaza o expira → siguiente candidato.

La reasignación debe ser consistente y evitar que dos estudiantes acepten la misma vacante.

---

# 23. Notificaciones

Canales mínimos acordados:

- push;
- in-app.

Eventos comunes:

- cita creada;
- recordatorio;
- cita modificada;
- cita cancelada;
- cambio de agenda que afecte al estudiante;
- oferta de lista de espera;
- oferta a punto de expirar;
- acceso de teleconsulta;
- cambio relevante en atención/cola si se decide notificarlo.

Registro conceptual:

```text
notification_id
user_id
appointment_id
notification_type
channel
created_at
sent_at
delivered_at
read_at
status
```

---

# 24. Check-in y atención clínica

## Check-in

Puede originarse por QR o por asistencia administrativa en un caso excepcional.

Al hacer check-in:

```text
CONFIRMED
   ↓
CHECKED_IN
   ↓
WAITING
```

## Inicio de atención

Médico llama al estudiante:

```text
WAITING
   ↓
CALLED
   ↓
IN_CONSULTATION
```

Al iniciar consulta debe crearse o abrirse un `ClinicalEncounter`.

Al finalizar:

```text
IN_CONSULTATION
   ↓
COMPLETED
```

Se registra la hora real y los datos alimentan analítica/IA.

---

# 25. Historia clínica especializada

Cada atención debe vincularse al estudiante, profesional, cita y especialidad.

Núcleo conceptual:

```text
ClinicalHistory
  └── ClinicalEncounter
          ├── patient/student
          ├── medical_staff
          ├── specialty
          ├── appointment
          ├── started_at
          ├── completed_at
          └── specialty_record
```

Cada especialidad tendrá una estructura propia:

```text
Specialty1Record
Specialty2Record
Specialty3Record
Specialty4Record
```

Reglas:

- permitir guardar borrador;
- permitir finalizar atención;
- validar campos requeridos según ficha;
- conservar historial;
- auditar modificaciones relevantes;
- restringir acceso según rol/permisos;
- no exponer contenido clínico innecesariamente al personal administrativo.

Los campos exactos de cada ficha deben provenir del levantamiento con profesionales y no deben inventarse durante el desarrollo.

---

# 26. Arquitectura técnica esperada

## Frontend

Debe existir experiencia web y móvil.

Orientación:

- estudiante: mobile-first;
- médico: web/desktop-first con responsive;
- administrativo: web/desktop-first.

## Backend

```text
Java
Spring Boot
```

Arquitectura recomendada para el proyecto:

```text
monolito modular
```

No convertir cada módulo en microservicio sin necesidad.

Módulos sugeridos:

```text
identity
medical_staff
specialties
schedule
slots
appointments
campaigns
checkin
queue
waitlist
notifications
telemedicine
clinical
analytics
ai_integration
audit
```

## Persistencia

```text
PostgreSQL
```

Debe conservar integridad transaccional de:

- slots;
- holds;
- citas;
- agenda;
- estados críticos.

## IA

```text
Python
FastAPI
scikit-learn
```

Integración mediante REST.

---

# 27. Entidades principales sugeridas

```text
User
Student
MedicalStaff
Specialty
MedicalStaffSpecialty

MedicalScheduleRequest
MedicalShift
ScheduleBlock
Slot
AppointmentHold

Campaign
CampaignEligibility
CampaignCapacity

Appointment
AppointmentStatusHistory

QrCheckInToken
TeleconsultationSession

QueueEntry
QueueEvent
WaitTimePrediction

WaitlistEntry
WaitlistOffer

Notification

ClinicalHistory
ClinicalEncounter
Specialty1Record
Specialty2Record
Specialty3Record
Specialty4Record

AuditEvent
```

Estos nombres son conceptuales. El diseño final de base de datos puede ajustar normalización y agregados, pero debe conservar la semántica del dominio.

---

# 28. Eventos de dominio útiles

El sistema puede utilizar eventos internos sin requerir necesariamente Kafka.

```text
MEDICAL_SHIFT_PUBLISHED
MEDICAL_SHIFT_CHANGED
APPOINTMENT_CREATED
APPOINTMENT_CANCELLED
APPOINTMENT_RESCHEDULED
SLOT_RELEASED
CHECKIN_COMPLETED
QUEUE_ENTRY_CREATED
PATIENT_CALLED
CONSULTATION_STARTED
CONSULTATION_COMPLETED
WAITLIST_OFFER_CREATED
WAITLIST_OFFER_EXPIRED
WAITLIST_OFFER_ACCEPTED
```

Para el MVP, estos eventos pueden resolverse mediante eventos de aplicación, jobs y procesamiento asíncrono simple.

---

# 29. Integridad y concurrencia

## Double booking

Debe ser imposible que dos citas activas ocupen el mismo slot.

No confiar en:

- botones deshabilitados;
- estado local del frontend;
- “el usuario fue más rápido”.

Debe existir protección transaccional en backend/DB.

Opciones aceptables según diseño:

- `SELECT ... FOR UPDATE`;
- locking optimista;
- locking pesimista;
- constraints únicos compatibles con el modelo;
- transacciones atómicas.

## Hold

El hold de 10 minutos también debe ser validado en servidor.

## WaitlistOffer

Una vacante no puede ser confirmada por dos estudiantes.

---

# 30. Seguridad y privacidad

Datos de salud son información sensible.

Criterios mínimos del proyecto:

```text
TLS 1.3 cuando el entorno lo soporte
cifrado en reposo equivalente a AES-256
RBAC
sesiones/tokens expirables
trazabilidad de cambios
```

Los logs no deben almacenar:

- contraseñas;
- tokens completos;
- texto clínico completo innecesario;
- secretos;
- datos sensibles sin necesidad técnica.

El personal administrativo debe poder operar agenda/citas sin recibir automáticamente acceso al contenido íntegro de historias clínicas.

---

# 31. Auditoría

Se requiere trazabilidad especialmente para:

- creación/edición/inactivación de médicos;
- cambios de especialidad/modalidad;
- asignación de turnos;
- aprobación/rechazo de solicitudes;
- cambios de agenda;
- cancelaciones/reprogramaciones administrativas;
- check-in;
- cambios clínicos relevantes;
- acceso a información sensible cuando se defina necesario.

`AuditEvent` debería permitir reconstruir al menos:

```text
actor
operation
entity_type
entity_id
timestamp
previous_state / new_state cuando aplique
```

---

# 32. Requisitos no funcionales de referencia

Metas actuales del proyecto:

```text
CRUD estándar p95 < 200 ms
Búsqueda de disponibilidad p95 < 500 ms
Inferencia IA p95 < 300 ms
Actualización relevante de cola <= 5 s
Carga objetivo >= 500 req/s en pruebas controladas
Disponibilidad objetivo >= 99.5%
0 double bookings en pruebas concurrentes
SUS > 75
MAE objetivo experimental <= 10 min
```

No interpretar estas cifras como garantías sin pruebas; son objetivos de validación.

---

# 33. UX esperada por actor

## Estudiante

Debe poder llegar a la acción principal rápidamente.

Prioridades:

- buscar atención;
- ver próxima cita;
- saber si debe realizar chequeo Tipo A;
- ver QR/acceso virtual;
- conocer estado de espera;
- aceptar oferta de lista de espera.

El estudiante no debería necesitar entender conceptos internos como `MedicalShift`, `QueueEntry` o `AppointmentHold`.

## Médico

Debe priorizar operación del día:

- agenda;
- pacientes esperando;
- paciente actual;
- consulta;
- historia especializada.

## Administrativo

Debe priorizar capacidad y control operacional:

- médicos;
- agenda;
- solicitudes;
- demanda;
- saturación;
- campañas;
- incidencias.

---

# 34. Inventario de pantallas

La versión actual contempla **32 pantallas principales**.

Resumen:

```text
2 compartidas
10 estudiante
11 médico
9 administrativo
```

El detalle completo está en `05_pantallas_y_flujos.md`.

No contar como pantalla independiente:

- toast;
- modal de confirmación;
- drawer;
- estado vacío;
- error inline.

---

# 35. Flujos end-to-end importantes

## Flujo 1 — Reserva normal de Especialidad 1–4

```text
Inicio estudiante
→ Buscar atención
→ Filtrar
→ Seleccionar slot
→ Hold 10 min
→ Confirmar
→ Crear cita
→ QR o sesión virtual
→ Notificación
```

## Flujo 2 — Presencial

```text
Cita confirmada
→ QR
→ Llegada
→ Escaneo
→ Check-in
→ Cola digital
→ Espera estimada
→ Médico llama
→ Consulta
→ Historia especializada
→ Finalización
```

## Flujo 3 — Teleconsulta

```text
Cita confirmada
→ Acceso seguro
→ Sala de espera
→ Alerta al médico
→ Médico admite
→ Consulta
→ Historia especializada
→ Finalización
```

## Flujo 4 — Lista de espera

```text
Sin disponibilidad
→ Unirse a lista
→ Cancelación libera slot
→ Sistema busca candidato
→ Oferta temporal
→ Acepta
→ Cita confirmada
```

## Flujo 5 — Planificación médica

```text
Dashboard administrativo
→ Capacidad/demanda
→ Déficit detectado
→ Planificación de turnos
→ Médico elegible
→ Crear turno
→ Generar slots
→ Publicar
→ Nueva disponibilidad
```

## Flujo 6 — Cambio solicitado por médico

```text
Médico consulta agenda
→ Solicita cambio
→ Sistema calcula impacto
→ Administrativo revisa
→ Aprueba / rechaza
→ Agenda se ajusta
→ Citas afectadas se gestionan
→ Notificaciones
```

## Flujo 7 — Aprendizaje del modelo

```text
Check-in
→ checked_in_at
→ Inicio consulta
→ consultation_started_at
→ wait_time real
→ dataset histórico
→ entrenamiento offline
→ evaluación
→ nueva versión del modelo
→ mejores estimaciones
```

---

# 36. Límites de alcance

El proyecto **sí incluye**:

- gestión de médicos;
- agenda;
- turnos;
- slots;
- citas;
- campañas Tipo A;
- presencial con QR;
- teleconsulta;
- cola digital;
- estimación de espera;
- lista de espera;
- reasignación;
- demanda/capacidad;
- historias clínicas especializadas 1–4;
- seguridad;
- auditoría;
- notificaciones.

El MVP **no pretende convertirse en un HIS hospitalario completo**.

Fuera de alcance recomendado:

- laboratorio clínico completo;
- farmacia/dispensación;
- facturación;
- internación hospitalaria;
- interoperabilidad nacional compleja;
- diagnóstico automático por IA;
- prescripción electrónica avanzada;
- seguros;
- gestión contable.

No agregar estos módulos salvo decisión explícita del proyecto.

---

# 37. Convenciones obligatorias para agentes

1. **No crear un rol Coordinador de Salud.**
2. Utilizar `Especialidad 1`, `Especialidad 2`, `Especialidad 3`, `Especialidad 4` hasta que se confirme otra nomenclatura.
3. No convertir el modelo de IA nuevamente en un predictor principal de no-show. El objetivo central actual es **tiempo de espera**.
4. No permitir que Python modifique agenda/citas directamente.
5. No permitir double booking.
6. No mezclar lista de espera con cola digital.
7. No mezclar turno médico con slot.
8. Tipo A y Tipo B deben mantener capacidad separada.
9. No borrar historial clínico al modificar una cita o médico.
10. No exponer contenido clínico completo a roles administrativos sin necesidad y autorización.
11. Las fichas de Especialidad 1–4 deben poder evolucionar independientemente.
12. Mantener trazabilidad y auditoría de operaciones críticas.
13. Un cambio de agenda con citas activas requiere análisis de impacto.
14. Una caída de IA no debe bloquear la operación transaccional.
15. No inventar reglas clínicas; marcarlas como pendientes de validación profesional.

---

# 38. Prioridad sugerida de implementación

Una secuencia razonable es:

## Fase 1 — Núcleo de identidad y oferta

```text
identity
medical_staff
specialties
schedule
slots
```

## Fase 2 — Reserva

```text
availability
holds
appointments
campaigns
```

## Fase 3 — Operación de atención

```text
QR/checkin
queue
notifications
waitlist
```

## Fase 4 — Clínica

```text
clinical core
specialty 1
specialty 2
specialty 3
specialty 4
```

## Fase 5 — Teleconsulta

```text
session
waiting room
access tokens
```

## Fase 6 — IA y analítica

```text
operational dataset
baseline
training pipeline
inference API
demand dashboards
```

Esta secuencia permite que el sistema genere datos útiles antes de depender del modelo predictivo.

---

# 39. Qué debe entender un agente antes de implementar una feature

Antes de modificar el sistema, responder mentalmente:

1. ¿Qué actor inicia esta acción?
2. ¿A qué proceso de negocio pertenece?
3. ¿Qué entidad es la fuente de verdad?
4. ¿Qué estados pueden cambiar?
5. ¿Debe ser transaccional?
6. ¿Puede afectar citas existentes?
7. ¿Debe generar auditoría?
8. ¿Debe generar notificación?
9. ¿Produce datos para cola/demanda/IA?
10. ¿Expone datos clínicos sensibles?

Si una feature no puede ubicarse dentro del modelo de negocio descrito aquí, no asumir comportamiento: revisar requisitos o pedir definición.

---

# 40. Resultado final esperado del producto

Cuando el sistema esté completo, el recorrido ideal será:

- administración configura profesionales y su capacidad;
- médicos conocen y gestionan su disponibilidad mediante solicitudes;
- estudiantes encuentran atención sin ir físicamente a buscar una ficha;
- las reservas son consistentes y no se duplican;
- el chequeo obligatorio se gestiona por campañas separadas;
- la atención presencial utiliza QR y cola digital;
- la teleconsulta utiliza acceso seguro;
- los estudiantes reciben una expectativa razonable de su espera;
- los cupos liberados pueden recuperarse con lista de espera;
- administración puede identificar déficit de capacidad;
- cada consulta genera un encuentro clínico especializado;
- los datos operacionales permiten evaluar y mejorar el modelo de espera;
- el sistema conserva seguridad, privacidad y trazabilidad.

En resumen, el proyecto pretende sustituir un proceso fragmentado y manual por un **flujo digital completo de oferta → acceso → espera → atención → registro → aprendizaje operacional**.

