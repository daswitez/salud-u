# Arquitectura objetivo: Salud-U integrado

Este documento representa el destino de integración: Next.js conserva la experiencia web y Spring Boot es la única autoridad para sesión, reglas clínicas, autorización, auditoría y persistencia. Las rutas ya migradas no llaman a Supabase; las restantes se migran de manera explícita, sin un rewrite global que capture endpoints serverless todavía vigentes.

Los bloques siguientes usan **PlantUML**. Se pueden renderizar con la extensión de PlantUML del editor o con cualquier servidor/CLI compatible.

## 1. Contexto del sistema

```plantuml
@startuml
!theme plain
left to right direction
skinparam componentStyle rectangle

actor Estudiante
actor Administrativo
actor "Médico de revisión" as ReviewDoctor
actor Especialista
actor Auditor

rectangle "Navegador" as Browser
rectangle "Salud-U Web\nNext.js" as Next
rectangle "Salud-U API\nSpring Boot" as Spring
database "PostgreSQL\nesquema salud_u" as Postgres
collections "Almacenamiento privado\nde documentos" as Storage

Estudiante --> Browser
Administrativo --> Browser
ReviewDoctor --> Browser
Especialista --> Browser
Auditor --> Browser

Browser --> Next : HTTPS\nHTML, RSC, JS, fetch same-origin
Next --> Spring : Rewrites explícitos /api/...\nCookie de sesión + CSRF
Spring --> Postgres : JDBC + transacciones\nRLS, funciones y auditoría
Spring --> Storage : carga y URL firmada\nde documentos clínicos

note bottom of Next
  UI, navegación, accesibilidad y estado efímero.
  No contiene reglas clínicas ni credenciales de infraestructura.
end note

note bottom of Spring
  Identidad, permisos por rol/relación/área,
  reglas de negocio, contratos HTTP y OpenAPI.
end note
@enduml
```

## 2. Despliegue y frontera de red

```plantuml
@startuml
!theme plain
skinparam componentStyle rectangle

node "Cliente institucional" {
  [Navegador]
}

cloud "HTTPS / dominio institucional" as Edge

node "Aplicación web" {
  [Next.js]
  component "Route Handlers no migrados\n(transición controlada)" as LegacyHandlers
  component "Rewrites exactos\n/api/health\n/api/me\n/api/v1/**\nrutas UC migradas" as Rewrites
}

node "Servicios de aplicación" {
  [Spring Boot]
  component "Security\nsesión + CSRF" as Security
  component "Controladores y DTO" as Controllers
  component "Servicios / transacciones" as Services
  component "Auditoría append-only" as Audit
}

database "PostgreSQL" {
  database "salud_u\ntablas en español" as ClinicalDb
}

cloud "Object storage privado" as Files

[Navegador] --> Edge
Edge --> [Next.js]
[Next.js] --> Rewrites
[Next.js] --> LegacyHandlers : solo endpoint aún no migrado
Rewrites --> [Spring Boot] : red interna / origen configurado
[Spring Boot] --> Security
Security --> Controllers
Controllers --> Services
Services --> ClinicalDb
Services --> Audit
Services --> Files

note right of Rewrites
  Nunca usar /api/:path* como
  rewrite general mientras queden
  handlers de transición.
end note

note right of ClinicalDb
  Migraciones Flyway.
  La política de acceso se valida
  también al nivel de datos.
end note
@enduml
```

## 3. Componentes y responsabilidades terminadas

```plantuml
@startuml
!theme plain
left to right direction
skinparam componentStyle rectangle

package "Frontend: Next.js" {
  [Pantallas y componentes] as UI
  [apiJson\nnormalización de errores] as ApiClient
  [SSR / Server Components] as SSR
  [Rewrites selectivos] as Rewrite
  [Handlers heredados\npendientes de migración] as Transition
}

package "Backend: Spring Boot" {
  [AuthController\n/api/v1/auth/*] as Auth
  [Identity & Profile\n/api/me, perfil] as Identity
  [Admisión y agenda] as Scheduling
  [Atención clínica e historia] as Clinical
  [Documentos privados] as Documents
  [Reportes, auditoría y vacunas] as Governance
  [Manejador de errores] as Errors
  [Actor de base de datos] as ActorContext
}

database "PostgreSQL: salud_u" as Db
collections "Storage clínico" as FileStore

UI --> ApiClient
SSR --> Rewrite
ApiClient --> Rewrite : fetch same-origin\ncredentials incluidas
Rewrite --> Auth
Rewrite --> Identity
Rewrite --> Scheduling
Rewrite --> Clinical
Rewrite --> Documents
Rewrite --> Governance
Transition --> Db : solo hasta su migración\n(no para casos cerrados)

Auth --> ActorContext
Identity --> ActorContext
Scheduling --> ActorContext
Clinical --> ActorContext
Documents --> ActorContext
Governance --> ActorContext
ActorContext --> Db : actor/roles por conexión

Auth --> Errors
Identity --> Errors
Scheduling --> Errors
Clinical --> Errors
Documents --> Errors
Governance --> Errors
Documents --> FileStore

note bottom of Errors
  /api/**: { ok, data, error: texto }
  /api/v1/**: error estructurado.
  El cliente interpreta ambos sin perder borradores.
end note
@enduml
```

## 4. Secuencia de sesión y llamada autenticada

```plantuml
@startuml
!theme plain
actor Usuario
participant "Next.js" as Next
participant "Spring Security" as Security
participant "API Spring" as Api
database "PostgreSQL" as Db

Usuario -> Next : abre /iniciar-sesion
Next -> Security : GET /api/v1/auth/csrf\n(vía rewrite)
Security --> Next : Set-Cookie SALUD_U_CSRF
Usuario -> Next : credenciales
Next -> Security : POST /api/v1/auth/login\nCookie CSRF + X-CSRF-Token
Security -> Db : validar identidad, estado y roles
Db --> Security : principal autorizado
Security --> Next : 200 + Set-Cookie sesión
Next --> Usuario : navegación según rol

Usuario -> Next : usa una pantalla protegida
Next -> Api : GET/POST /api/...\nCookie de sesión + CSRF si modifica
Api -> Db : aplica actor, permisos y regla
Db --> Api : resultado transaccional
Api --> Next : contrato del endpoint
Next --> Usuario : datos o error recuperable

alt sesión caducada
  Security --> Next : 401
  Next --> Usuario : redirige a inicio de sesión\nconservando borrador local cuando corresponde
end
@enduml
```

## 5. Secuencia UC-07: asignar solicitud a cupo

```plantuml
@startuml
!theme plain
actor Administrativo
participant "Pantalla de programación\nNext.js" as UI
participant "Rewrite exacto" as Rewrite
participant "AppointmentAssignmentController\nSpring" as Controller
database "PostgreSQL / salud_u" as Db

Administrativo -> UI : selecciona solicitud pendiente y cupo
UI -> Rewrite : POST /api/appointment-requests/{id}/assign\n{ slotId }
Rewrite -> Controller : misma solicitud HTTP\ncookie + CSRF
Controller -> Db : fijar actor y roles de conexión
Controller -> Db : asignar_solicitud_cita(id, slotId)

group transacción única
  Db -> Db : bloquea solicitud y cupo
  Db -> Db : valida PENDING, disponibilidad y compatibilidad
  Db -> Db : crea cita SCHEDULED
  Db -> Db : incrementa cantidad reservada
  Db -> Db : actualiza solicitud a ASSIGNED
  Db -> Db : registra evento de cita y auditoría
end

Db --> Controller : appointmentId
Controller --> UI : 200 { ok:true, data:{ appointmentId } }
UI -> Rewrite : GET /api/appointment-requests + cupos
Rewrite --> UI : estado recargado
UI --> Administrativo : solicitud ASSIGNED y cupo actualizado

alt cupo inválido o solicitud ya asignada
  Db --> Controller : error SQL controlado
  Controller --> UI : 400/409 { ok:false, error:"..." }
  UI --> Administrativo : conserva selección y muestra mensaje
end

alt actor sin rol administrativo
  Controller --> UI : 403
  UI --> Administrativo : informa permiso insuficiente
end
@enduml
```

## Estado objetivo de migración

| Capa | Resultado esperado al cierre |
|---|---|
| Frontend | Next.js es cliente y capa de presentación; no conoce claves de base de datos ni aplica reglas clínicas. |
| API | Spring publica contratos versionados o heredados caracterizados, valida autorización y ejecuta operaciones atómicas. |
| Datos | PostgreSQL conserva UUID, FK, versiones, eventos y evidencia de auditoría con migraciones Flyway. |
| Archivos | El backend verifica contenido y autorización; el navegador recibe URLs temporales, nunca acceso directo permanente. |
| Transición | Cada endpoint pasa de handler serverless/Supabase a rewrite explícito y se elimina el handler anterior después de probarlo. |
| Observabilidad | Health apunta al backend, auditoría no contiene texto clínico sensible y los errores son compatibles con la UI. |
