# Plan de integración Next.js ↔ Spring

Este plan convierte gradualmente `salud-u` desde Next.js/Supabase hacia el backend Spring de `../salud-u-backend`. Complementa el [backlog de integración](backlog-frontend.md): el backlog define historias y aceptación funcional; este documento fija el orden técnico, los contratos de frontera y las puertas de avance.

## Estado de partida

- El frontend está en la rama `backend` y aún ejecuta 24 Route Handlers bajo `src/app/api`, Supabase Auth, `proxy.ts` y consultas SSR directas a Supabase.
- Spring ya publica rutas de compatibilidad `/api/**` para consumidores actuales, rutas versionadas `/api/v1/**`, `GET /api/health` y OpenAPI en `/openapi/salud-u-v1.yaml`.
- Los contratos heredados usan `error` como texto. Solo `/api/v1/**` devuelve el objeto `{code,message,details,requestId}`. El cliente no debe asumir una forma única sin normalizarla.
- Estado al 2026-10-26: el frontend ya no contiene Supabase, Route Handlers ni Server Actions; FE-CORTE está aceptada localmente (ver sección de evidencia). El corte productivo sigue pendiente del ensayo de migración sintético, la estrategia de cuentas y la validación con el centro.

## Principios no negociables

1. No exponer `DB_*`, credenciales Supabase ni secretos de archivos al bundle del navegador.
2. Conservar la misma identidad en SSR, navegación y `fetch`: la cookie opaca Spring (`SALUD_U_SESSION`) y la cookie CSRF dedicada (`SALUD_U_CSRF`) deben viajar por el mismo origen.
3. Cada migración elimina la consulta Supabase del flujo afectado; no se acepta una escritura duplicada Next/Supabase/Spring.
4. Migrar por caso de uso completo: carga, vacío, error, permiso, recarga y concurrencia relevante. No declarar una pantalla lista sólo porque renderiza.
5. Mantener datos reales fuera de pruebas de integración, migración y rollback.

## Decisión de transporte (P0, antes de una pantalla)

La URL pública se conserva bajo el mismo origen. Hay dos alternativas válidas:

- **Preferida para despliegue:** el reverse proxy entrega Next para páginas y reenvía `/api/**`, `/api/v1/**` y `/actuator/health/**` a Spring. Al activar una ruta se elimina su Route Handler de Next, para que no exista competencia.
- **Transición local controlada:** `next.config.ts` reenvía exclusivamente rutas ya migradas a un origen configurado únicamente en servidor. Nunca habilitar una regla amplia que capture una ruta que todavía tiene handler serverless.

Antes de elegir una alternativa se debe documentar origen, TLS, cookies `Secure` y `SameSite`, cabeceras `X-Forwarded-*`, timeouts y el rollback. Una prueba debe demostrar que `/api/me` y una mutación ven la misma cookie desde SSR y navegador.

## Secuencia priorizada

| Orden | Backlog | Resultado mínimo verificable | Bloquea |
| --- | --- | --- | --- |
| P0.0 | Preparación | `pnpm install --frozen-lockfile`, lint, typecheck y build reproducibles; cuenta Spring sintética provisionada. | Todo consumo real. |
| P0.1 | FE-CON | Transporte mismo origen y `GET /api/health` muestra `service=backend`; retirar `GET /api/health/supabase`, sin fallback Supabase. | Sesión y flujos. |
| P0.2 | FE-CON | Cliente HTTP central obtiene `/api/v1/security/csrf`, reusa token/sesión y agrega el encabezado en mutaciones; no fuerza `Content-Type` para `FormData`. | Toda escritura. |
| P0.3 | FE-01 | Login, `/api/me`, logout, guardias y `proxy.ts` consumen Spring; eliminar Supabase Auth y `demo-session` de este flujo. | Autorización de pantalla. |
| P0.4 | FE-02, FE-04…FE-12 | Admisión → agenda → llegada → revisión/documentos → cierre, migrado por caso completo y probado por rol. | Flujo clínico principal. |
| P0.5 | FE-13…FE-17 | Derivación → asignación → especialidad → resolución → historia, incluyendo contexto remitido y permisos entre áreas. | Historia longitudinal. |
| P1 | FE-CAT, FE-PER, FE-18, FE-21…FE-26, H-INV | Catálogos/perfil, búsqueda, reportes, exportaciones, cumplimiento, auditoría, vacunas e investigación. | Retiro final. |
| P2 | FE-19, FE-20, FE-27 | Adendas, Word y carnet/cobertura. | Retiro final. |
| P0 final | FE-CORTE / F9 | Ausencia de Supabase y de Route Handlers de negocio; regresión, recuperación y aceptación conjunta. | Corte productivo. |

`FE-03` (antecedentes) se integra junto a revisión entre FE-09 y FE-10; no se pospone pese a su numeración. Cada fila se cierra sólo si también cumple los criterios individuales ya definidos en `backlog-frontend.md`.

## Evidencia local de FE-01 (2026-10-18)

- Se reemplazaron Supabase Auth, `demo-session.ts` y el Route Handler local de `/api/me` por sesión Spring; `proxy.ts` ya no inicializa Supabase.
- El navegador obtiene CSRF desde `/api/v1/security/csrf`, usa `POST /api/v1/auth/login`, consulta `/api/me` desde SSR y cierra por `/api/v1/session/logout`.
- Se separó `SALUD_U_CSRF` de la cookie opaca `SALUD_U_SESSION`; ambas son requeridas para mutaciones autenticadas y no comparten nombre.
- Recorrido HTTP local aprobado con cuenta sintética: login `200`, `/api/me` `200`, recarga SSR de `/perfil` `200`, logout `204`, `/api/me` posterior `401` y credenciales inválidas `401`.
- Validación de archivos modificados: TypeScript y ESLint sin errores. La migración de perfil se trata como FE-PER y no formó parte del cierre de FE-01.

## Evidencia local de FE-PER (2026-10-18)

- La pantalla `/perfil` usa `PATCH /api/v1/profile` y `POST /api/v1/profile/password` desde el cliente HTTP común; la acción de servidor que escribía mediante Supabase fue eliminada.
- Ambos formularios conservan sus valores ante una respuesta de validación, permiso o red, y presentan el mensaje normalizado de Spring. El cambio de nombre/correo también solicita la contraseña actual, porque forma parte del contrato de BE-PER.
- Spring revoca todas las sesiones después de un cambio válido. La interfaz informa ese efecto y dirige a inicio de sesión; al reautenticar, la recarga obtiene la identidad actual desde `/api/me`.
- Recorrido HTTP local aprobado con cuenta sintética: login `200`, contraseña actual incorrecta al editar perfil `401`, edición de perfil `204`, cambio de contraseña `204`, login con la clave nueva `200`, restauración de clave `204`, login original `200` y restauración de nombre `204`.
- TypeScript y ESLint focalizados sin errores; la renderización SSR de `/perfil` y el aviso de reautenticación fueron comprobados localmente.

## Evidencia local de FE-02 (2026-10-18)

- Next reenvía únicamente `/api/careers`, `/api/patients` y `/api/patients/{id}` a Spring. Se retiraron los dos Route Handlers de pacientes que consultaban Supabase; las rutas más profundas, como derivaciones, permanecen fuera de este incremento hasta su propia migración.
- La interfaz existente de listado, alta y detalle/edición conserva sus estados de carga, vacío, filtros, error y los valores del formulario tras un fallo. Las mutaciones siguen el cliente común con cookie y CSRF.
- Se corrigió el mapeo Java del contrato SQL de pacientes (`carrera_*` e `inscripcion_*`) y se añadió una prueba PostgreSQL que lee tanto lista como detalle después del registro, para evitar que un fallo de lectura quede cubierto por el despacho de error de Spring.
- Recorrido HTTP local aprobado a través de Next: login administrativo `200`, lista `200`, alta inválida `400`, creación `201`, detalle `200`, actualización `200` y recarga con datos persistidos. Un estudiante autenticado recibe `403` al consultar pacientes administrativos.
- Se creó exclusivamente una carrera y pacientes de integración identificados como FE-02 en la base local de pruebas. TypeScript y ESLint focalizados pasan.

## Evidencia local de FE-04 (2026-10-18)

Actualización 2026-10-26: el ensayo FE-24 corrige el pendiente de `/api/my-specialties` y una lectura vacía de jornadas persistidas por diferencias de claves internas. La evidencia HTTP anterior no detectaba ese fallo visual. Ahora el especialista guarda y recupera su jornada desde navegador con Spring y sin Supabase; véase [evidencia FE-24](evidencia-fe24.md).

- Next reenvía únicamente `/api/availability-slots` a Spring y se retiró el Route Handler que invocaba RPCs Supabase. El gestor de horarios mantiene el contrato de agenda (`schedules`, `recurringBlocks`, `dateBlocks`, `slots` y `appointments`) y las reglas camelCase se normalizan en Spring antes de persistirse.
- Recorrido local aprobado con médico de revisión: login `200`, consulta de gestión `200`, reemplazo de jornada `200`, recarga con contrato válido `200`, creación de bloqueo por fecha `201` y eliminación `200`.
- Administración puede consultar según su contrato, pero no puede alterar jornadas: intento de escritura `403`. La ficha de personal activa necesaria para la cuenta médica demo se creó a través del API administrativo real.
- TypeScript y ESLint focalizados pasan. La jornada sintética quedó como semilla local; el bloqueo puntual creado durante la prueba fue eliminado.

## Evidencia local de FE-05 (2026-10-18)

- Next reenvía exclusivamente `/api/appointment-requests` y `/api/appointment-requests/{id}` a Spring. Se eliminaron los Route Handlers Supabase de listado/alta/cancelación; `/api/appointment-requests/{id}/assign` no coincide con esos patrones y queda a cargo de su incremento posterior.
- La interfaz existente conserva carga, lista vacía, error, detalle y cancelación mediante el cliente HTTP común con sesión y CSRF. No replica reglas de solicitud ni cancela el borrador ante un fallo.
- Se amplió el contrato de lectura de Spring: lista `cancelled_at`, `cancellation_reason` y, para solicitudes asignadas, `appointment` con profesional, horario y fin. La migración Flyway V40 mantiene el orden descendente y el filtro por estudiante/administración de la función SQL.
- Recorrido HTTP local aprobado tanto directo como a través de Next: login `200`, listado `200`, creación `201`, recarga `200`, cancelación `200` y recarga final `200` con estado `CANCELLED` y motivo persistido. Un médico de revisión recibe `403` al listar solicitudes.
- `mvn clean test` completó 81 pruebas sin errores; TypeScript y ESLint focalizados de FE-05 pasan. La regresión visual automatizada completa permanece centralizada en FE-CORTE.

## Evidencia local de FE-06 (2026-10-18)

- La pantalla administrativa de programación ya tenía el selector de solicitud directa; se conectó al contrato Spring sin reproducir reglas clínicas en Next. El `POST /api/appointment-requests` acepta `appointmentType: SPECIALTY`, `patientId` y `specialtyId` exclusivamente para Administración.
- Se incorporó la migración V41 para que el listado devuelva `specialty_id` e `referral_id`; así, después de crear o recargar, la solicitud directa conserva su especialidad y se filtran cupos compatibles. La operación crea auditoría `SPECIALTY_APPOINTMENT_REQUEST_CREATED`.
- `/api/specialties` se reenvía a Spring y se retiró su Route Handler Supabase, porque alimenta directamente el selector de esta historia. Las rutas de derivación y asignación siguen reservadas a sus incrementos.
- Recorrido HTTP a través de Next aprobado: catálogo de prueba `200`, falta de especialidad `400`, creación directa `201`, listado `200` con `SPECIALTY` y `specialty_id`, cancelación de limpieza `200` y rechazo a estudiante `403`.
- `mvn clean test` completó 81 pruebas sin errores; TypeScript y ESLint focalizados de FE-06 pasan. La regresión visual automatizada completa permanece centralizada en FE-CORTE.

### Evidencia local FE-07 — asignación de solicitud (2026-10-18)

- `POST /api/appointment-requests/{id}/assign` es ahora un rewrite exacto hacia Spring; se eliminó el Route Handler que invocaba `rpc_assign_appointment_request` en Supabase. La pantalla de programación administrativa ya consumía ese contrato mediante `apiJson`, por lo que conserva espera, foco, error y recarga sin duplicar reglas clínicas.
- Recorrido HTTP mediante `localhost:3000`: solicitud inicial `201`; asignación compatible `200` con `data.appointmentId`; recarga `ASSIGNED/SCHEDULED` y `bookedCount: 1`. La falta de cupo devuelve `400`, la repetición `409` y el estudiante `403`; ninguna alternativa creó una segunda cita ni incrementó el cupo.
- Se tradujeron los errores SQL controlados de `asignar_solicitud_cita` en `AppointmentAssignmentController`, para que una solicitud que ya no está pendiente no termine en el flujo de autenticación como `401`. `mvn clean test` pasó con 81 pruebas; TypeScript y ESLint focalizados pasan. La asignación de esta evidencia es una semilla sintética local.

## Evidencia FE-08 (2026-10-24)

Llegada y ausencia se reenvían a Spring por rutas exactas; sus handlers Supabase se retiraron. La cancelación ya migrada ahora conserva la semántica SQL de la solicitud asignada todavía `SCHEDULED`. Flyway V42 persiste fechas/actores/motivos y evita doble liberación; Spring devuelve errores de negocio recuperables y éxito con `data:null`. El recorrido Chromium aprobó éxito, recarga, teclado, fallos de red, conflictos, permisos y registro ajeno. [Informe, artefactos locales y comandos reproducibles](evidencia-fe08.md).

## Evidencia FE-09 (2026-10-24)

La agenda y la apertura/recuperación se reenvían a Spring por rutas exactas y sus dos handlers Supabase fueron eliminados. La etapa de apertura usa únicamente la agenda autorizada y el POST de inicio; V43 completa sus campos y agrega la referencia nullable al encuentro, documentada en OpenAPI. Chromium verificó revisión/especialidad, permisos, recarga y recuperación de una respuesta perdida tras el commit. Pasan 91 pruebas Java y los controles del frontend. [Informe, alcance de la continuación de ficha y comandos](evidencia-fe09.md).

El defecto de FE-CAT detectado durante este ensayo fue corregido después: listado de cuentas `200`, roles válidos, recarga sin perder sesión y rechazo de actores ajenos. La corrección y sus 94 pruebas Java están documentadas en [evidencia-fecat-cuentas.md](evidencia-fecat-cuentas.md).

## Evidencia FE-03 (2026-10-24)

Los antecedentes globales se consultan y guardan en Spring por el rewrite exacto `GET/PATCH /api/medical/patients/{id}/clinical-background`. Se retiró su handler Supabase y se unificó la edición en un panel que conserva el formulario ante errores y conflictos. V45 preserva el contrato `current/encounter`, la normalización de listas, los actores y la versión vinculada a una atención cerrada. Pasan 100 pruebas Java y el recorrido Chromium de revisión/especialista, comparación de versiones, recarga, red y permisos. [Informe y comandos](evidencia-fe03.md).

## Evidencia FE-10 (2026-10-24)

Antes del siguiente incremento se completó la traducción transversal del JSON clínico a español en Spring, PostgreSQL y solicitudes Next. Incluye migración reversible de registros existentes, adaptación de lectores y regresión FE-03/10. [Contrato y evidencia](json-clinico-espanol.md).

La ficha de revisión consume el contexto propio y la finalización en Spring mediante rewrites exactos; se eliminó el handler Supabase compartido. Conserva antecedentes precargados, campos estructurados, diagnóstico, mediciones e indicaciones, y recupera la ficha cerrada sin usar la historia longitudinal heredada. Java normaliza el contrato y Flyway V46 corrige la numeración de versiones, la talla en cm y el IMC para nuevos cierres. Chromium aprobó cinco grupos de escenarios, incluidos red, sesión, permisos, respuesta perdida y aviso al abandonar el formulario. PostgreSQL confirmó atomicidad y ausencia de duplicados; pasan 106 pruebas Java y los controles frontend. Documentos y escenarios adicionales de cierre/derivación continúan en FE-11/12/13. [Informe, alcance y comandos](evidencia-fe10.md).

## Evidencia FE-11 (2026-10-25)

Documentos consumen Spring por rutas exactas de colección, firma y contenido; se retiraron los handlers Supabase. El panel ofrece carga/clasificación, consulta y vista previa/descarga privadas desde revisión y desde la página propia de documentos para ambos roles clínicos. V49 aporta metadatos autorizados y serializa carga/cierre. Se ajustó el búfer Next a 16 MiB y se corrigió el reintento CSRF identificado por cabecera, preservando los dos contratos de error. Chromium aprobó seis grupos y la caducidad real de 60 s; pasan 114 pruebas Java, regresión FE-10 y controles frontend. [Informe y comandos](evidencia-fe11.md).

## Evidencia FE-12 (2026-10-25)

El cierre confirma en Spring la ficha CLOSED y la cita ATTENDED antes de mostrar éxito. La consulta muestra estado, versión y datos inmutables, con acceso desde atenciones realizadas. Se bloquean envíos simultáneos del mismo formulario y se conserva el borrador ante errores o confirmación inconsistente. Chromium aprobó seis grupos, incluida carrera entre dos pestañas y rollback tardío; PostgreSQL confirmó versiones 1–4 con un evento/auditoría por cierre y ningún dato parcial en el rechazo. Pasan 114 pruebas Java, regresión FE-10 y controles frontend. [Informe y comandos](evidencia-fe12.md).

## Evidencia FE-13 (2026-10-25)

La ficha emite derivación con el cierre y muestra contexto, prioridad y elementos compartidos de su origen. La lista y el detalle del emisor consumen GET propios en Spring mediante rewrites exactos. V50 añade la lectura autorizada y el evento/auditoría de creación en la misma transacción; mantiene la compartición automática de referencia. Chromium aprobó seis grupos, incluida recuperación de catálogo/sesión/red, tres prioridades y concurrencia; pasan 118 pruebas Java, regresión FE-12 y controles frontend. [Informe y comandos](evidencia-fe13.md).

## Evidencia FE-14 (2026-10-25)

La bandeja administrativa y las opciones por paciente consumen Spring mediante rewrites exactos; se retiraron sus handlers Supabase. V51 restaura historial/orden de referencia, valida paciente al crear REFERRAL y registra evento/auditoría al programar atómicamente. La agenda conserva selección ante conflictos, red y caducidad, recupera respuestas perdidas consultando el estado y funciona desde paciente o agenda general. Chromium aprobó cinco grupos con concurrencia y origen clínico intacto; PostgreSQL confirmó un evento/cita/reserva por asignación. Pasan 124 pruebas Java, seis grupos de regresión FE-08 y controles frontend. [Informe y comandos](evidencia-fe14.md).

## Evidencia FE-15 (2026-10-25)

La ficha especialista consume contexto propio, plantilla y origen remitido en Spring, sin consultar la historia longitudinal serverless. V52 completa los datos del cierre y autoriza documentos compartidos; V53 corrige el inicio derivado y registra su evento. Se verifica templateId al cerrar, se conserva el borrador ante errores/cambio de plantilla y la consulta usa la plantilla histórica. Pasan seis grupos de Chromium en producción, regresión FE-14, 126 pruebas Java y controles frontend. [Informe y comandos](evidencia-fe15.md).

## Evidencia FE-16 (2026-10-25)

El especialista tiene bandeja/detalle de derivaciones recibidas y formulario de resolución/devolución. Se conserva PATCH /api/medical/referrals/{id}; las consultas propias usan rutas exactas /api/medical/assigned-referrals. V54 verifica afiliación/encuentro y audita la operación en la misma transacción. La UI comprueba el estado persistido, conserva los campos ante errores y recupera respuestas perdidas sin repetir PATCH. Pasan cinco grupos de Chromium en producción, regresión FE-15 completa, 130 pruebas Java y controles frontend. [Informe y comandos](evidencia-fe16.md).

## Evidencia FE-17 (2026-10-25)

La historia longitudinal usa GET /api/medical/patients/{id} en Spring mediante rewrite exacto, con el handler Supabase retirado. PostgreSQL exige relación clínica y selecciona revisiones, áreas vigentes y orígenes remitidos; la UI representa el conjunto autorizado sin recortar el origen. V55–V57 completan antecedentes/versiones, derivaciones, campos secundarios y autorización de documentos/búsqueda. Pasan cuatro grupos Chromium en producción, regresión FE-16 completa, 133 pruebas Java y controles frontend. [Informe y comandos](evidencia-fe17.md).

## Evidencia FE-18 (2026-10-25)

La historia consulta GET /api/medical/patients/{id}/search con q/from/to y conserva los filtros aplicados al recargar. V58/V59 normalizan texto/acentos/espacios y valores estructurados, aplican días inclusivos de Bolivia e índices para el alcance por paciente/encuentro. Se conservan null y el ámbito de FE-17, con auditoría sin el término buscado. Pasan cuatro grupos Chromium en producción, regresión FE-17, 136 pruebas Java y controles frontend. [Informe y comandos](evidencia-fe18.md).

Perfil de operación indicado: centro pequeño con picos y reportes de varias áreas a fin de mes, todavía sin volumen numérico definido. FE-18 ensayó 1.001 atenciones por paciente y 20 búsquedas con concurrencia 10. FE-CORTE debe validar el escenario mixto búsquedas/reportes mensuales y el hardware real antes de acreditar capacidad institucional.

## Evidencia FE-19 (2026-10-25)

Las atenciones cerradas presentan correcciones auditables separadas del original. Se conserva POST /api/medical/encounters/{id}/amendments y se incorpora su GET autorizado. V60 mantiene la firma SQL anterior, limita la escritura al autor, protege UPDATE/DELETE, registra auditoría atómica y admite reintentos idempotentes. La UI conserva borradores ante errores y consulta el resultado perdido antes de volver a escribir. Pasan cinco grupos Chromium en producción, regresión FE-18, 140 pruebas Java y controles frontend. Las correcciones son buscables dentro del mismo ámbito; su inclusión en Word queda trazada para FE-20. [Informe y comandos](evidencia-fe19.md).

## Evidencia local FE-20 (2026-10-26)

La ficha longitudinal descarga el DOCX privado desde Spring mediante rewrite exacto, con finalidad editable. V61 completa la versión histórica, antecedentes vinculados y del área, diagnósticos, mediciones, documentos y adendas separadas con motivo/actor/fecha; exportación auditada después de generar todo el archivo. La interfaz conserva finalidad y adenda pendiente ante red, permiso, sesión o archivo incompleto y recupera el acceso tras reautenticación real. Pasan cuatro grupos Chromium en producción, regresión FE-19 completa, 147 pruebas Java y controles frontend; siete DOCX abren en LibreOffice. [Informe y comandos](evidencia-fe20.md).

## Evidencia local FE-21 (2026-10-26)

El constructor consume Spring por rewrite exacto, con el handler Supabase retirado. V62 completa las listas AND, antecedentes resumidos/ficha histórica y los 17 campos de la RPC; preserva la firma SQL anterior para exportaciones. Spring define columnas/grupos opcionales sobre el conjunto autorizado y admite Reportes sin personal con catálogo de especialidades de lectura. La UI conserva URL/selección y borrador ante errores y sesión; no deja filas obsoletas visibles. Pasan cuatro grupos Chromium, regresión FE-20, 155 pruebas Java y controles frontend. La consulta mensual local y sus ráfagas quedan medidas con volumen sintético explícito. [Informe, fronteras FE-22 y comandos](evidencia-fe21.md).

## Evidencia local FE-22 (2026-10-26)

La pantalla consume el endpoint separado de archivo en Spring mediante rewrite exacto y deja de generar reportes en el navegador. El backend recalcula el conjunto permitido y genera CSV/XLSX/PDF con finalidad, columnas/grupos y contenido equivalente. V63 registra procedencia privada/estado/checksum y auditoría; el cliente comprueba SHA-256 y recupera constancia/finalidad al recargar. Se conserva el POST compatible de registro. Pasan cuatro grupos Chromium, regresión FE-21, 167 pruebas Java y controles frontend, con errores de generación, persistencia, red y sesión real comprobados. [Informe, límites y comandos](evidencia-fe22.md).

## Evidencia local FE-23 (2026-10-26)

Cumplimiento y actividad institucional consumen Spring con filtros por carrera/período y fechas, sin consultas Supabase. V64 fija los días de Bolivia y aporta el panorama administrativo de conteos; la pantalla no calcula reglas clínicas ni convierte errores en métricas cero. Administrativo y Reportes consultan cumplimiento; solo Administrativo recibe el panorama de coordinación. Pasan cuatro grupos Chromium, regresión FE-22, 169 pruebas Java y controles frontend. La regla académica del modelo y el volumen todavía requieren validación institucional en FE-CORTE. [Informe, paridad y comandos](evidencia-fe23.md).

## Evidencia local FE-24 (2026-10-26)

La bitácora abandona el almacén demo y consulta eventos reales de Spring con autoridad Auditor, incluso en cuentas multirrol. V65 conserva la consulta histórica y agrega actor parcial/paginación por cursor estable, filtros de fecha en Bolivia y respuesta sin metadata sensible. La interfaz conserva filtros tras recarga, validación, red, permiso y sesión vencida, sin mostrar filas obsoletas. La evidencia runtime sigue sin permisos de actualización/eliminación; cada lectura agrega su evento propio. Se corrigen además el rewrite de especialidades propias y la traducción de gestión de disponibilidad que ocultaba jornadas persistidas. Pasan cinco grupos Chromium, regresión FE-23 completa y 174 pruebas Java; build, typecheck, lint del cambio y OpenAPI aprobados. El lint global mantiene tres errores previos identificados en el informe. [Evidencia y comandos](evidencia-fe24.md).

## Evidencia local FE-25 (2026-10-26)

La nueva pantalla `/administrativo/vacunas` consume `/api/vaccines` por rewrite exacto, sin Route Handler ni Supabase. V66 añade la versión esperada al guardar, de modo que un formulario desactualizado recibe `409` sin crear versión, y distingue código duplicado (`409`) y vacuna inexistente (`404`); se conserva la firma SQL anterior. Desactivar conserva versiones y dosis aplicadas. La interfaz conserva el borrador ante validación, conflicto, red, servidor y sesión vencida. Pasan seis grupos Chromium, regresiones FE-23/FE-24 y 176 pruebas Java; build, typecheck, lint del cambio y OpenAPI aprobados. [Evidencia y comandos](evidencia-fe25.md).

## Evidencia local FE-26 (2026-10-26)

El registro de dosis se integra en la ficha administrativa del estudiante y en la del médico de revisión, consumiendo `/api/vaccinations` y el nuevo `/api/vaccinations/context` por rewrites exactos, sin Route Handler ni Supabase. V67 aporta el contexto (siguiente dosis calculada en servidor, dosis con responsables, aplicadores elegibles), evalúa la fecha futura en Bolivia y exige al médico el mismo acceso clínico que la historia. Spring distingue 422/409/400/403/404 para que la pantalla pida justificación de intervalo y conserve el borrador. Pasan siete grupos Chromium, regresión FE-25 y 179 pruebas Java. [Evidencia y comandos](evidencia-fe26.md).

## Evidencia local FE-27 (2026-10-26)

Carnet del estudiante, carnet imprimible desde la ficha administrativa y cobertura institucional consumen Spring por rewrites exactos, sin Route Handler ni Supabase. V68 incluye lote y aplicador en el carnet, omite vacunas desactivadas sin dosis, evalúa matrículas vigentes en día de Bolivia, cuenta cada estudiante una vez por grupo y audita ambas lecturas. Pasan seis grupos Chromium, regresiones FE-23…FE-26 y 180 pruebas Java. Se registra para FE-CORTE que el `replaceState` de pantallas con filtros puede anular un clic de navegación durante la carga. [Evidencia y comandos](evidencia-fe27.md).

## Evidencia local FE-INV (2026-10-26)

La exportación para investigación consume `/api/research/exports` y la constancia `/api/research/exports/{id}` por rewrites exactos, sin Route Handler ni Supabase. La pantalla muestra el modo seudonimizado sin aprobación previa, descarga sólo archivos cuyo SHA-256 y estructura coinciden y confirma la finalidad registrada. V69 aplica día de Bolivia, filtros cerrados, checksum en la procedencia y lectura del catálogo de vacunas para Reportes. Pasan cinco grupos Chromium con inspección de ZIP/XLSX, regresiones FE-21…FE-27 y 183 pruebas Java. [Evidencia y comandos](evidencia-feinv.md).

## Evidencia local FE-CORTE (2026-10-26)

Inventario estático sin Supabase, Route Handlers, Server Actions ni stores demo; 49 rewrites exactos. Recorrido integral estudiante/administración/revisión/especialista/reportes/auditor con 34 respuestas `/api/**` emitidas por Spring. Corte de Spring, PostgreSQL y Next sin pérdida de borrador ni escrituras divididas; documentos conciliados por SHA-256. Carga mixta sintética de fin de mes con p95 695 ms. RNF-08 (historia en diálogo durante la atención), RNF-09 (axe WCAG 2.1 A/AA, teclado) y RNF-10 (Chromium/Firefox, tres resoluciones) aprobados; WebKit y validación con el centro pendientes. [Evidencia y comandos](evidencia-fecorte.md).

## Contratos de frontera a implementar en FE-CON

### Health

El reemplazo exacto es `GET /api/health`. Respuesta disponible:

```json
{"ok":true,"service":"backend","status":"UP","error":null}
```

No renombrar el servicio como Supabase ni conservar un fallback hacia `/api/health/supabase`. Los probes operativos profundos permanecen en `/actuator/health/readiness` y no son una API de pantalla.

### Sesión y CSRF

1. Al cargar la aplicación o antes del primer `POST`, `PATCH`, `PUT` o `DELETE`, solicitar `GET /api/v1/security/csrf` con credenciales del mismo origen.
2. Mantener token y nombre de cabecera en memoria; enviar el token sólo en mutaciones. Una respuesta `403/CSRF_INVALID` obliga a obtenerlo una vez y reintentar sólo la petición segura de reintentar.
3. Autenticar por `POST /api/v1/auth/login`, leer identidad mediante `/api/me` y cerrar por `POST /api/v1/session/logout`; nunca leer la cookie HttpOnly.
4. Cuando sesión caduque, preservar borradores no clínicos en memoria y redirigir a login sin reintentar ciegamente escrituras clínicas.

### Errores

El adaptador debe normalizar a un mensaje de UI sin perder el request id:

- `/api/**`: `error` es texto (`unauthenticated`, `forbidden` o mensaje).
- `/api/v1/**`: `error.message` es el texto y `error.code` clasifica el caso.
- Respuestas no JSON, red y `503` deben mostrarse como indisponibilidad; nunca como éxito ni con contenido clínico en el mensaje.

## Migración de cada ruta

Para una ruta ya publicada por Spring, el orden es: caracterizar fixture T-01, actualizar consumidor, eliminar la lógica de negocio del Route Handler de Next, probar navegador y comprobar ausencia de tráfico Supabase para ese caso. Si se mantiene un proxy temporal, éste solo reenvía método, query, cuerpo, cookies, `Set-Cookie`, `X-CSRF-TOKEN` y `X-Request-Id`; no interpreta reglas clínicas.

Las consultas SSR de `src/app/administrativo/page.tsx` y `src/app/administrativo/reportes/cumplimiento/page.tsx` son trabajo explícito: deben usar endpoints backend de resumen/reportes o requerir un contrato nuevo. No se sustituyen por acceso directo de navegador a PostgreSQL.

## Evidencia de cierre por incremento

- Pruebas del frontend: lint, typecheck, build y casos de navegador por rol.
- Pruebas HTTP: éxito, validación, sesión vencida, actor ajeno, CSRF y recarga.
- Evidencia de red: sin llamadas Supabase ni claves Supabase para el flujo migrado; cookies y cabeceras no exponen secretos.
- Regresión de datos: el resultado tras recargar coincide con Spring; archivos se validan por permiso, contenido y vigencia, no por URL firmada literal.
- Rollback documentado: desactivar el routeo/proxy del incremento sin mezclar escrituras ni alterar datos clínicos.

El corte completo solo puede aprobarse cuando H-CORTE y FE-CORTE estén aprobados con el mismo entorno de ensayo y datos sintéticos.

