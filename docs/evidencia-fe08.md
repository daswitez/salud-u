# FE-08 · Llegada, ausencia y cancelación

Fecha de validación: 2026-10-24. Entorno local con Next.js, Spring Boot, PostgreSQL y cuentas/pacientes sintéticos. No se usaron datos institucionales.

## Implementación

- `POST /api/appointments/{id}/check-in` y `/no-show` tienen rewrites exactos a Spring. Se eliminaron sus Route Handlers Supabase. `PATCH /api/appointment-requests/{id}` continúa por el rewrite ya migrado.
- La pantalla administrativa consume los nombres de campos de cupos que entrega Spring (`startsAt`, `endsAt`, `specialtyId`, `bookedCount`). La consulta de derivaciones se realiza al elegir ese flujo, en su incremento correspondiente; no es necesaria para llegada o ausencia.
- Llegada y ausencia recargan la bandeja antes de mostrar éxito, desactivan los botones mientras hay una operación y presentan errores recuperables. La ausencia está disponible tanto en `SCHEDULED` como en `CHECKED_IN`, según la referencia SQL.
- La cancelación estudiantil admite un motivo opcional, lo conserva ante errores, informa el resultado y mueve el foco al mensaje. Carga, registro inexistente y error de consulta tienen estados distintos.

## Paridad backend necesaria para este caso

La comparación con `rpc_check_in_appointment`, `rpc_mark_appointment_no_show` y `rpc_cancel_appointment_request` detectó faltantes en BE-08. La migración Flyway V42 agrega fecha de ingreso, fecha/motivo de cancelación, actor de cancelación y motivo del evento de ausencia; todos los nombres persistidos son españoles.

La cancelación admite solicitud pendiente o asignada cuya cita siga `SCHEDULED`; cancela solicitud/cita y libera el cupo en la misma transacción. Una repetición conserva la primera cancelación y no vuelve a liberar el cupo. Un estudiante no puede cancelar solicitudes de otro paciente, incluido un paciente todavía sin cuenta vinculada. La llegada registrada impide cancelar y no computa como atención cerrada.

Spring registra auditoría de llegada/ausencia con el actor de la transacción; el motivo permanece en el evento de estado, fuera del detalle de auditoría. Los errores de transición se devuelven como texto con `409` y los registros ajenos como `404`, sin convertir conflictos SQL en falsas caducidades de sesión. Las tres mutaciones exitosas conservan `{ "ok": true, "data": null }`.

## Recorrido Chromium aprobado

El script [test-fe08.mjs](../scripts/test-fe08.mjs) usa sesiones Spring reales y crea sus solicitudes/cupo mediante API. Solo el fallo de red se provoca deliberadamente; los errores de permiso y transición proceden del backend real.

| Escenario | Resultado |
|---|---|
| Estudiante cancela solicitud pendiente usando teclado | Cancelada; motivo persiste tras recarga. |
| Falla de red al registrar ingreso | Permanece `SCHEDULED`; no muestra éxito; reintento con teclado funciona. |
| Administrativo registra ingreso | `CHECKED_IN`, fecha de ingreso persistida y visible por API tras recarga. |
| Cancelación después de ingreso y doble ingreso | `409`; estado y reserva intactos. |
| Estudiante intenta llegada/ausencia por API | `403`; no escribe. |
| Ausencia después del ingreso | `NO_SHOW`; la pantalla lo refleja tras recarga; libera el cupo una sola vez. |
| Estudiante cancela cita asignada todavía confirmada | Solicitud y cita `CANCELLED`, fecha y motivo conservados; cupo liberado. |
| Falla de red al cancelar | Conserva el motivo y la selección; permite repetir sin falso éxito. |
| Repetición de cancelación | `200`, sin liberar otra reserva. |
| Pantalla desactualizada por otra operación | Muestra el `409` real; “Reintentar carga” actualiza la bandeja y conserva sesión. |
| Cancelación de solicitud ajena | `404`; solicitud ajena permanece pendiente. |
| Registro inexistente y navegación sin sesión | Estado “Solicitud no encontrada.” y redirección al login, respectivamente. |

Se registraron 40 solicitudes API desde las páginas durante el recorrido y no hubo solicitudes del navegador a Supabase. Las rutas y componentes FE-08 ya no importan su cliente. Se inspeccionó la captura de la cancelación persistida.

Los artefactos locales están en `/tmp/salud-u-fe08-evidence`: `resultado.json` (casos, IDs sintéticos y solicitudes sin cookies), `administrativo.png` y `estudiante.png`. El script conserva el historial de prueba; las citas finalizan canceladas o como ausencia y el cupo de prueba queda libre.

## Reproducción

Con Spring en `127.0.0.1:8080`, Next configurado contra ese origen y las cuentas demo provisionadas, iniciar Next con `npm run dev -- --hostname 127.0.0.1`. El estudiante de prueba debe estar vinculado a un paciente; se requiere otro paciente sintético para comprobar ajenidad y un médico de revisión con personal activo.

Desde `codigo/salud-u`:

```bash
npm install --prefix /tmp/salud-u-fe08-browser --no-package-lock playwright
/tmp/salud-u-fe08-browser/node_modules/.bin/playwright install chromium
FE08_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs node scripts/test-fe08.mjs
npm run typecheck
npx eslint next.config.ts src/app/administrativo/check-in/page.tsx 'src/app/estudiante/citas/[id]/page.tsx' scripts/test-fe08.mjs
npm run build
```

Para reutilizar el Chromium ya instalado en esta máquina se ejecutó el recorrido con `FE08_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`. Las cuentas se pueden cambiar mediante `FE08_ADMIN`, `FE08_STUDENT`, `FE08_DOCTOR` y `FE08_PASSWORD`; no se guardan cookies ni credenciales en la evidencia.

Desde `codigo/salud-u-backend`:

```bash
mvn clean test
docker compose up --build -d
```

Las pruebas nuevas incluyen contrato HTTP, autorización, CSRF y errores recuperables (`AppointmentAttendanceMvcTest`), además de persistencia PostgreSQL, cancelación de cita asignada, protección del paciente no vinculado, fecha de ingreso, motivo de ausencia y ausencia de doble liberación (`DatabaseActorContextIntegrationTest`). La regresión integral de otros módulos permanece en FE-CORTE.

## Resultado final

- `mvn test -q`: 87 pruebas, 0 fallos, 0 errores y 0 omitidas; incluye 22 pruebas PostgreSQL y la carrera de dos operaciones de ausencia concurrentes (solo una completa y libera el cupo).
- `npm run typecheck`, ESLint focalizado, `npm run build` y `git diff --check`: correctos.
- `test-fe08.mjs`: `PASS` en Chromium, con sesiones reales Spring.
- Lectura de PostgreSQL local tras el recorrido: dos citas `NO_SHOW`, una cita `CANCELLED` y una solicitud pendiente cancelada sin cita; la reserva del cupo termina en `0`. Auditoría: un `APPOINTMENT_CHECKED_IN` y dos `APPOINTMENT_NO_SHOW`, todos con el actor `Administración Demo`.

FE-08 queda cerrada localmente con evidencia HTTP, navegador y PostgreSQL. Esto no acredita la integración de los módulos posteriores ni el corte productivo.
