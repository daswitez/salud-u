# Información para desarrollo y arquitectura

## 1. Arquitectura propuesta

La arquitectura recomendada para el proyecto es:

```text
Web / App móvil
      │
      │ HTTPS
      ▼
Spring Boot
      │
      ├── Seguridad / IAM
      ├── Gestión de médicos
      ├── Agenda y turnos
      ├── Slots y citas
      ├── Campañas Tipo A
      ├── Check-in
      ├── Cola digital
      ├── Lista de espera
      ├── Notificaciones
      ├── Teleconsulta
      └── Historia clínica
      │
      ├──────────────► PostgreSQL
      │
      └── REST ──────► Python / FastAPI / scikit-learn
```

## 2. Decisión arquitectónica clave

**Spring Boot + PostgreSQL deben ser la fuente de verdad transaccional.**

El microservicio Python no debe:

- crear citas;
- modificar slots;
- decidir prioridades clínicas;
- ser propietario de la agenda.

Solo recibe características y devuelve estimaciones.

## 3. Organización recomendada del backend

Para un proyecto de grado, conviene un **monolito modular** en Spring Boot con límites claros de dominio, en lugar de múltiples microservicios innecesarios.

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

Cada módulo debe tener sus propias capas o paquetes de dominio/aplicación/infraestructura.

## 4. Dominios principales

### medical_staff

Entidades:

- MedicalStaff
- MedicalStaffSpecialty
- MedicalScheduleRequest

Responsabilidades:

- médicos activos;
- especialidades habilitadas;
- modalidades;
- solicitudes de agenda.

### schedule

Entidades:

- MedicalShift
- ScheduleBlock
- Slot

Responsabilidades:

- turnos de trabajo;
- horarios;
- pausas;
- generación de slots;
- publicación de capacidad.

### appointments

Entidades:

- Appointment
- AppointmentStatusHistory
- AppointmentHold

Estados recomendados:

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

### campaigns

Entidades:

- Campaign
- CampaignEligibility
- CampaignCapacity

Debe manejar Tipo A sin consumir slots Tipo B.

### queue

Entidades:

- QueueEntry
- QueueEvent
- WaitTimePrediction

### waitlist

Entidades:

- WaitlistEntry
- WaitlistOffer

### clinical

Entidades conceptuales:

```text
ClinicalHistory
ClinicalEncounter
ClinicalSpecialtyRecord
Specialty1Record
Specialty2Record
Specialty3Record
Specialty4Record
```

## 5. Estados de agenda

### MedicalShift

```text
DRAFT
PUBLISHED
BLOCKED
CANCELLED
COMPLETED
```

### Slot

```text
AVAILABLE
HELD
BOOKED
BLOCKED
CANCELLED
```

### AppointmentHold

Debe contener al menos:

```text
hold_id
slot_id
student_id
created_at
expires_at
status
```

## 6. Evitar double booking

No confiar en frontend.

La protección debe estar en backend + base de datos.

Opciones válidas:

- locking pesimista sobre slot;
- locking optimista con versión;
- restricción única y transacción;
- `SELECT ... FOR UPDATE` según diseño.

Objetivo: bajo pruebas concurrentes, solo una reserva puede ganar el slot.

## 7. Reprogramación segura

No liberar primero la cita original.

Flujo:

1. Obtener nuevo hold.
2. Crear nueva asociación de slot dentro de transacción.
3. Confirmar nuevo slot.
4. Liberar el anterior.
5. Registrar historial.

## 8. Eventos de dominio útiles

```text
MEDICAL_SHIFT_PUBLISHED
MEDICAL_SHIFT_CHANGED
APPOINTMENT_CREATED
APPOINTMENT_CANCELLED
SLOT_RELEASED
CHECKIN_COMPLETED
QUEUE_ENTRY_CREATED
CONSULTATION_STARTED
CONSULTATION_COMPLETED
WAITLIST_OFFER_CREATED
WAITLIST_OFFER_EXPIRED
WAITLIST_OFFER_ACCEPTED
```

No es obligatorio usar Kafka. En el MVP pueden ser eventos internos y jobs asíncronos.

## 9. API sugerida

### Buscar disponibilidad

```http
GET /api/v1/availability?specialtyId=&doctorId=&from=&to=&modality=
```

### Crear hold

```http
POST /api/v1/slots/{slotId}/hold
```

### Confirmar cita

```http
POST /api/v1/appointments
```

### Cancelar cita

```http
POST /api/v1/appointments/{id}/cancel
```

### Reprogramar

```http
POST /api/v1/appointments/{id}/reschedule
```

### Check-in

```http
POST /api/v1/checkins
```

### Cola médica

```http
GET /api/v1/doctors/me/queue
```

### Estimación de espera

```http
GET /api/v1/specialties/{id}/wait-time
```

## 10. Microservicio Python

Tecnologías:

- Python
- FastAPI
- scikit-learn
- pandas / numpy para preparación offline
- joblib para serialización del pipeline/modelo

Endpoint conceptual:

```http
POST /predict/wait-time
```

Entrada ejemplo:

```json
{
  "specialtyId": "uuid",
  "weekday": 2,
  "hour": 10,
  "queueLength": 8,
  "activeDoctors": 2,
  "patientsInConsultation": 2,
  "recentArrivals": 5,
  "recentCompletions": 3,
  "historicalAverageConsultationMinutes": 18.5
}
```

Salida:

```json
{
  "estimatedWaitMinutes": 32,
  "lowerBound": 25,
  "upperBound": 41,
  "demandLevel": "HIGH",
  "modelVersion": "wait-time-1.0.0"
}
```

## 11. Persistencia

PostgreSQL.

Índices importantes:

- `slot(shift_id, start_time, status)`
- `appointment(student_id, status)`
- `appointment(slot_id)`
- `medical_shift(doctor_id, date)`
- `queue_entry(specialty_id, status, checked_in_at)`
- `waitlist_entry(specialty_id, status, created_at)`

## 12. Seguridad

- TLS 1.3 cuando cliente e infraestructura lo soporten.
- RBAC.
- Principio de mínimo privilegio.
- Tokens temporales para QR y teleconsulta.
- Nunca guardar contraseñas con cifrado reversible.
- Si existen credenciales locales: Argon2id o bcrypt.
- No incluir información clínica completa en QR.
- No registrar contenido clínico sensible en logs de aplicación.

## 13. Auditoría

`AuditEvent` debería registrar:

```text
audit_id
actor_user_id
action
resource_type
resource_id
previous_state_reference
new_state_reference
occurred_at
request_id
```

Para datos clínicos, evitar duplicar el contenido sensible completo en el log de auditoría.

## 14. Observabilidad

Medir:

- latencia por endpoint;
- p50 / p95 / p99;
- tasa de errores;
- throughput;
- holds creados/expirados;
- double booking rechazado;
- tamaño de cola;
- espera real;
- predicción vs espera real;
- ofertas de lista de espera aceptadas/expiradas.

## 15. Estrategia de pruebas

### Unitarias

- reglas de negocio;
- elegibilidad Tipo A;
- cambios de estado;
- priorización de lista;
- generación de slots.

### Integración

- Spring + PostgreSQL;
- locking de slots;
- endpoints críticos;
- llamada al servicio IA.

### Concurrencia

Escenario crítico:

- 50 o 100 usuarios intentando reservar el mismo slot.
- Resultado esperado: una cita confirmada.

### Rendimiento

Metas:

- CRUD estándar p95 < 200 ms.
- búsqueda p95 < 500 ms.
- carga objetivo 500 req/s en escenario de prueba definido.

