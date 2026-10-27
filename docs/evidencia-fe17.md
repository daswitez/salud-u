# FE-17 · Historia longitudinal autorizada por área

Validación local: 2026-10-25. UC-17, BE-17, RF-03/RF-18; RN-02/RN-05/RN-14/RN-17. Frontend en rama `backend`. Se utilizaron exclusivamente cuentas, pacientes, citas y documentos sintéticos.

## Integración y paridad

`GET /api/medical/patients/{id}` se reenvía a Spring mediante un rewrite exacto. Se retiró su Route Handler Supabase. Las rutas más profundas mantienen su migración por caso; no hay captura global de rutas serverless.

La respuesta conserva `ok/data` y los campos patient, intake, clinicalBackground, encounters, diagnoses, documents, appointments y referrals. Se completaron los antecedentes actuales y vinculados, derivaciones y versiones que faltaban en la implementación Spring. Intake conserva sus resúmenes de texto. El JSON de fichas y antecedentes continúa canónico en español, con adaptación de presentación del cliente existente.

V57 conserva también los campos secundarios de la ruta original: referral_id/specialty_id/closed_at/blood_chemistry_status/clinical_background_version_id de encuentro; free_text/diagnosis_kind/condition del diagnóstico; checked_in_at/assigned_staff_id/availability_slot de cita; y source_encounter_id/specialty_id/assigned_staff_id/comment_for_specialist/created_at de derivación. Los diagnósticos de texto creados por los cierres actuales corresponden a CONFIRMED y condition:null, igual que en la referencia. La prueba verifica estas claves además de las utilizadas en pantalla.

Cada encuentro incluye accessReason AREA/REFERRAL_SOURCE, ficha estructurada, número de versión y antecedentes vinculados. La ficha de especialidad también incluye la plantilla histórica id/version. Estos metadatos permiten mostrar la procedencia y distinguir la versión de ficha de la de plantilla.

Se conservan los null de campos ausentes y arrays vacíos. Encuentros, citas, derivaciones y documentos mantienen orden descendente por fecha; los diagnósticos, ascendente por creación. Se usa id como desempate estable. Las citas son únicamente las asignadas al actor actual, como en la referencia.

## Autorización corregida en PostgreSQL

Se contrastó la función original `private.can_read_clinical_patient` del serverless y los filtros de área del Route Handler. El backend previo comprobaba el área, pero permitía consultar un paciente sin relación clínica. V55 exige personal activo y al menos una relación: encuentro propio, derivación asignada o cita propia SCHEDULED/CHECKED_IN/ATTENDED. Un médico sin relación recibe el mismo `404/error` de referencia: “No tienes acceso clínico a este paciente.” Administración/estudiante reciben 403 y la sesión ausente 401.

Después aplica el ámbito:

| Actor | Encuentros que puede recibir |
|---|---|
| Médico de revisión con relación | Revisiones INITIAL del paciente, aunque las haya realizado otro médico. |
| Especialista con relación | SPECIALTY de sus áreas activas con afiliación vigente, incluidos otros autores del área. |
| Especialista con derivación asignada | Además, la revisión INITIAL que originó esa derivación, en un área vigente propia. |
| Médico sin relación, aunque tenga la misma especialidad | Ningún contenido clínico. |

La misma selección restringe diagnósticos, documentos y derivaciones. Una relación válida sin encuentros todavía devuelve 200 con listas vacías, no un falso error de acceso. Los antecedentes globales son compartidos por las áreas autorizadas; cada ficha cerrada muestra exclusivamente su versión vinculada.

Firma, contenido y lista de documentos vuelven a aplicar la autorización por relación/área. Así un médico puede abrir un documento del historial permitido de otro autor y no puede obtenerlo de otra área o de una revisión no remitida. Solo aparecen documentos AVAILABLE del mismo paciente y encuentro. V56 conserva la semántica SQL anterior para documentos denegados: cero filas; HTTP continúa devolviendo 404.

La búsqueda existente de Spring reutiliza la selección autorizada para no dejar una vía alternativa de acceso sin relación. Su integración de pantalla y filtros avanzados sigue en FE-18. La exportación backend que consume la historia hereda esta autorización; su integración de Word sigue en FE-20.

## Pantalla y recuperación

Se retiró el filtrado de permisos del cliente que ocultaba el origen remitido y dependía de nombres de especialidad derivados de las citas. La UI muestra el conjunto que devuelve Spring; el filtro de texto existente solo reduce la presentación de los encuentros ya autorizados.

Desde Mis pacientes se puede abrir la historia, ver citas propias, derivaciones autorizadas y fichas cerradas. El origen remitido está identificado explícitamente. El detalle muestra diagnóstico, indicaciones, seguimiento, antecedentes vinculados, ficha estructurada y versión/plantilla histórica. Los archivos usan la previsualización y descarga privada de FE-11.

El detalle utiliza dialog nativo con nombre accesible, cierre por Escape y devolución del foco a la tarjeta. La vista previa de documentos funciona dentro de ese detalle. Los mensajes reciben foco, hay indicadores de carga y reintento, estados vacíos y etiquetas de controles.

“Actualizar historia” conserva el filtro ante errores de red. Ante 401/403/404 se retira el contenido anterior; una sesión caducada permite autenticarse en otra pestaña y recuperar la historia. Cada paciente usa una instancia de componente propia para evitar mostrar temporalmente la ficha del paciente anterior al navegar.

El editor de antecedentes permanece en el componente ya integrado de FE-03; su formulario conserva su propia recuperación/versionado. El botón Word existente se mantiene como comportamiento actual, sin declarar cerrada FE-20.

## Auditoría y pruebas PostgreSQL

La consulta genera HISTORIA_LONGITUDINAL_CONSULTADA con actor/paciente y detalles vacíos, en su transacción. El endpoint devuelve Cache-Control: no-store, private. No se escribe en la atención cerrada al consultarla.

Las pruebas PostgreSQL verifican lectura de plantilla histórica, rechazo sin relación tanto por historia como por búsqueda, acceso posterior de un colega del área al establecer una cita y autorización del documento de otro autor. La regresión mantiene el contrato de documentos privados y los límites entre pacientes/áreas.

## Aceptación en navegador

[test-fe17.mjs](../scripts/test-fe17.mjs) crea un paciente con dos revisiones de autores diferentes y dos áreas especializadas. Una revisión fue remitida al especialista A; el área B es directa. Un colega de A tiene una cita propia pero no la derivación. Se actualizan los antecedentes globales después de cerrar para distinguir versión actual 2 e histórica 1.

| Escenario | Resultado |
|---|---|
| Revisión con relación | Recibe ambas revisiones y ninguna ficha especializada. |
| Especialista A | Recibe su área y solo el origen remitido; excluye revisión no remitida y área B. |
| Especialista B | Recibe su área directa sin origen de A. |
| Colega de A con relación | Recibe ficha/documento del área A de otro autor, sin revisión de origen ajena. |
| Actor de la misma área sin relación | Historia y descarga rechazadas. |
| Respuesta y presentación | Versiones, plantilla, antecedentes vinculados, null y orden conservados. |
| Navegación | Mis pacientes → historia → ficha/archivos; recarga conserva datos. |
| Teclado/foco | Apertura con Enter, cierre con Escape y foco restaurado. |
| Archivos | Vista previa del origen remitido y descarga propia; firma/descarga ajenas 404. |
| Red y filtro | Reintento conservando el texto de búsqueda. |
| Historia vacía | Cita autorizada sin encuentros: listas vacías y mensaje correcto. |
| Sesión caducada | Se retiran las tarjetas anteriores; reautenticación y recarga recuperan datos. |
| Roles no clínicos y anonimato | 403/401 sin exposición de identidad o contenido clínico. |
| Datos inmutables | La ficha cerrada conserva el contenido original tras todas las consultas y rechazos. |
| Tráfico | Sin llamadas Supabase. |

Cuatro grupos de aceptación aprobados contra Next en producción, con 46 solicitudes API desde las páginas. Se inspeccionaron las capturas de revisión y especialidad.

Ejemplos del ensayo final:

| Encuentro | Procedencia | Visible para |
|---|---|---|
| c3e20fa7-b680-47c8-a4d0-80b571b4fa2e | Revisión remitida | Revisión y especialista A asignado |
| 82210bec-29be-48e6-84b3-0ed7ef7a8e93 | Revisión no remitida | Revisión |
| 15efeebd-efe9-4e03-b107-01ab4ed53048 | Especialidad A | Especialista A y colega A con relación |
| 4634a83e-d998-474f-9dbc-3932b1314b6c | Especialidad B | Especialista B |

La auditoría del paciente del ensayo confirmó 11 lecturas de HISTORIA_LONGITUDINAL_CONSULTADA con 4 actores autorizados distintos; no contiene texto clínico.
 La regresión FE-16 pasó sus cinco grupos, con resolución/devolución, respuesta perdida, concurrencia y permisos.

## Verificación y comandos

133 pruebas Java aprobadas, sin fallos/errores/omitidas. Incluyen tres contratos HTTP nuevos de historia (éxito/vacío/no-store, permisos/error de referencia y fallo recuperable) y pruebas PostgreSQL ampliadas. Typegen, typecheck, ESLint focalizado, build y git diff --check aprobados. OpenAPI documenta el contrato y sus límites.

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Desde `codigo/salud-u`:

```bash
npx next typegen
npm run typecheck
npx eslint next.config.ts src/components/medical-patient-record.tsx src/components/medical-review-workflow.tsx 'src/app/medico/pacientes/[patientId]/page.tsx' scripts/test-fe17.mjs
npm run build
npm run start
```

Con Next en 3000, desde otra terminal:

```bash
FE17_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs FE17_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe17.mjs
git diff --check
```

La regresión se ejecutó en el servidor temporal de desarrollo antes de compilar la versión final:

```bash
FE16_ORIGIN=http://localhost:3001 FE16_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs FE16_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome FE16_ARTIFACTS=/tmp/salud-u-fe17-regresion-fe16 node scripts/test-fe16.mjs
```

Playwright/Chromium y el origen son configurables. El script usa las semillas locales Administración, Revisión, Especialista FE09 y Estudiante; crea cuentas por rol/área y pacientes propios del ensayo. SQL prepara únicamente las plantillas de prueba y horarios aislados, y consulta la auditoría. La clínica y documentos se preparan por HTTP. Se conservan los datos sintéticos para inspección.

Artefactos: `/tmp/salud-u-fe17-evidence/resultado.json`, `historia-especialista.png`, `historia-revision.png`; regresión `/tmp/salud-u-fe17-regresion-fe16`. Logs `/tmp/salud-u-fe17-browser.log`, `-regresion-fe16.log`, `-maven.log`, `-docker.log`, `-build.log`, `-typecheck.log`, `-typegen.log` y `-lint.log`. El resultado incluye UUID del ensayo y tráfico con tokens ocultos.

FE-17 queda cerrada localmente. La búsqueda avanzada continúa en FE-18; la aceptación integral permanece en FE-CORTE. No se acredita rendimiento con volumen institucional ni validación completa del frontend a partir de este ensayo local.
