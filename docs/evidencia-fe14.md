# FE-14 · Programar una derivación activa

Validación local: 2026-10-25. UC-14, BE-14, RF-06/RF-07/RF-15; RN-06/RN-07/RN-12. Frontend en rama `backend`. Se utilizaron exclusivamente cuentas y datos sintéticos locales.

## Integración

La bandeja administrativa y las opciones de derivación por paciente consumen Spring mediante rewrites exactos de `GET /api/administrative/referrals` y `GET /api/patients/{id}/referrals`. Se retiraron los dos Route Handlers Supabase. Las demás rutas conservan su migración por caso de uso.

Desde “Asignar especialista y horario” se precargan paciente, tipo REFERRAL y derivación. La creación utiliza `POST /api/appointment-requests` con patientId, appointmentType, referralId y specialtyId:null; conserva `201/data.id`. La programación utiliza `POST /api/appointment-requests/{id}/assign` con slotId y confirma por GET que la solicitud está ASSIGNED y tiene la cita devuelta antes de anunciar éxito.

La agenda general también obtiene la especialidad de la derivación seleccionada sin necesitar patientId en la URL. Solo presenta cupos compatibles; Spring vuelve a validar los permisos, estado, paciente, especialidad y capacidad. Administración consulta el motivo/resumen administrativo de la referencia, sin acceder al endpoint clínico del emisor ni editar su ficha.

La bandeja conserva sus 15 campos, incluidos specialty_id y los valores null de especialista/cita/horario. Se recuperó la paridad con la RPC: todos los estados están disponibles para Por programar/Historial; orden por grupo PENDING_ASSIGNMENT, ASSIGNED, IN_PROGRESS y restantes, y fecha descendente dentro del grupo. Las opciones por paciente incluyen PENDING_ASSIGNMENT/ASSIGNED en fecha descendente.

## Recuperación y accesibilidad

Las selecciones permanecen ante errores de red, validación, conflicto o sesión. Un enlace permite autenticarse en otra pestaña sin perderlas. “Reintentar carga” consulta el estado persistido; “Actualizar agenda” recupera nuevos cupos. Ninguna respuesta perdida dispara automáticamente otra creación/asignación.

Una derivación ajena al paciente de la URL muestra error sin escoger silenciosamente otra. La UI distingue solicitud pendiente y derivación ya programada; bloquea envíos simultáneos del mismo formulario. Las etiquetas, botones nativos y mensajes con foco permiten operar con teclado. Se representan carga, listas vacías y valores ausentes.

## Backend y PostgreSQL

Flyway V51 restaura las consultas de bandeja/opciones y añade creación de solicitud con comprobación explícita de paciente. La sobrecarga SQL anterior permanece compatible. Duplicados pendientes y derivaciones no programables devuelven 409 recuperable, en lugar de un error genérico.

La asignación bloquea solicitud/cupo/derivación y actualiza solicitud, cita, reserva, estado y profesional asignado en la misma transacción. Añade un evento ASSIGNED y auditoría DERIVACION_PROGRAMADA con el actor administrativo y los identificadores operativos, sin texto clínico. Las consultas registran BANDEJA_DERIVACIONES_CONSULTADA y DERIVACIONES_PACIENTE_CONSULTADAS.

No cambia el encuentro cerrado, su versión, motivo, resumen, prioridad, diagnósticos o documentos compartidos. Las pruebas PostgreSQL comparan las filas originales y compiten tanto por creación como por asignación. También rechazan una derivación CLOSED y verifican su exclusión de opciones y permanencia en historial; ese estado se prepara únicamente en la base aislada de integración.

Los contratos y errores están documentados en `../salud-u-backend/src/main/resources/static/openapi/salud-u-v1.yaml`.

## Evidencia

[test-fe14.mjs](../scripts/test-fe14.mjs) terminó PASS en Chromium con sesiones Spring reales: cinco grupos y 74 solicitudes API desde páginas.

| Escenario | Resultado |
|---|---|
| Bandeja con red caída, vacío y recuperación | Error con foco, estados vacíos y recarga correctos. El vacío de bandeja se inyecta de forma controlada; las demás lecturas vuelven a Spring. |
| Paciente sin derivaciones | Lista real vacía y creación deshabilitada. |
| URL con derivación de otro paciente | Error sin selección alternativa; POST forzado 409. |
| Respuesta de creación perdida después del commit | Recupera una única solicitud pendiente sin otro POST. |
| Especialidad incompatible | Cupo excluido de la UI; asignación forzada 409 sin reserva. |
| Cupo ocupado después de cargar | 409, conserva selección y no anuncia éxito. |
| Sesión caducada | 401, enlace de autenticación y selección intacta. |
| Respuesta de asignación perdida después del commit | Recupera la misma cita ASSIGNED; recarga mantiene Confirmada. |
| Repetir creación/asignación | 409 sin duplicados. |
| Dos pestañas, agenda global y paciente | Un 200 y un 409; recuperación de la única cita ganadora. |
| Historial | Programada, especialista/horario y motivo/resumen originales; sin enlace para volver a asignar. |
| Roles y anonimato | Revisión/Especialista/Estudiante sin acceso administrativo; anónimo 401. Administración sin acceso al detalle clínico del emisor. |
| Integridad clínica | Hash lógico antes/después idéntico para los tres orígenes, incluidos antecedentes, diagnósticos, mediciones, documentos y contexto remitido. Se excluye del hash únicamente el estado operativo de derivación. |
| Supabase | Ninguna llamada en el tráfico de este recorrido. |

La captura `derivacion-programada.png` fue inspeccionada. La regresión FE-08 aprobó sus seis grupos: cancelación, llegada, ausencia, conflicto tardío, permisos y recarga.

Consulta directa PostgreSQL tras la prueba:

| Derivación sintética | Estado | Origen/cita origen | Solicitudes/citas | Eventos/auditorías de asignación |
|---|---|---|---|---|
| 0f74da79-21ca-4475-9013-bef50d89a0a3 | ASSIGNED | CLOSED/ATTENDED | 1/1 | 1/1 |
| 3bf1302a-3e5f-4e8a-bbb8-5429a1b5015e | ASSIGNED | CLOSED/ATTENDED | 1/1 | 1/1 |
| cb9007e3-c577-4f5a-9fd7-366626fb0b93 | ASSIGNED | CLOSED/ATTENDED | 1/1 | 1/1 |

Ninguna auditoría de programación tiene un actor sin rol administrativo. Los tres cupos utilizados quedaron con una reserva; el incompatible con cero. Las citas programadas se conservan para inspección.

## Comandos y controles

124 pruebas Java aprobadas, cero fallos/errores/omitidas. Incluyen seis pruebas HTTP nuevas y concurrencia real PostgreSQL. Typecheck, ESLint focalizado y compilación de producción aprobados. OpenAPI validado como YAML y publicado por Spring.

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < /tmp/salud-u-fe14-db.sql
```

Desde `codigo/salud-u` con Next, Spring y PostgreSQL iniciados:

```bash
npx next typegen
npm run typecheck
npx eslint next.config.ts src/components/administrative-referral-inbox.tsx src/app/administrativo/check-in/page.tsx scripts/test-fe14.mjs
npm run build
FE14_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs FE14_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe14.mjs
FE08_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs FE08_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe08.mjs
git diff --check
```

La prueba usa las semillas locales Administración, Revisión, Estudiante y Especialista FE09; crea dos especialidades, tres pacientes con revisión cerrada/derivación y otro sin derivaciones. Añade afiliaciones del especialista a sus áreas sintéticas. Conserva las asignaciones y no cambia datos reales.

Artefactos: `/tmp/salud-u-fe14-evidence/resultado.json` y `derivacion-programada.png`; consulta `/tmp/salud-u-fe14-db.sql` y resultado `/tmp/salud-u-fe14-db.txt`. Logs `/tmp/salud-u-fe14-browser.log`, `-regresion-fe08.log`, `-maven.log`, `-docker.log`, `-build.log`, `-typecheck.log` y `-lint.log`. Los UUID y hashes de origen completos están en resultado.json.

FE-14 queda cerrada localmente. La atención especializada continúa en FE-15; la aceptación integral permanece en FE-CORTE.
