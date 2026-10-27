# FE-15 · Completar y cerrar ficha de especialidad

Validación local: 2026-10-25. UC-15, BE-15, RF-11/RF-12/RF-13; RN-13/RN-14/RN-15. Rama frontend `backend`. Entorno local con pacientes, cuentas, citas y documentos sintéticos.

## Integración y contrato

La entrada desde la agenda conserva el inicio/recuperación de borrador de FE-09. “Completar ficha” abre ahora SpecialtyEncounterForm para SPECIALIST; deja de utilizar MedicalReviewWorkflow y su consulta a la historia longitudinal serverless.

La pantalla consume la cita propia y `GET /api/medical/encounters/{id}`. La respuesta incorpora specialty(id/code/name), template(id/version/schema) y encounter.specialtyHistory/specialtyHistoryVersion/specialtyHistoryId. La ficha usa el contrato estructurado existente: antecedentes propios del área, oftalmología o ginecología según el código de especialidad, motivo, evaluación, diagnóstico, plan y seguimiento.

Los esquemas de catálogo se exponen para identificar la versión. El formulario conserva los campos caracterizados de specialty-history y la normalización de BE-15; no interpreta nuevos campos arbitrarios de JSON Schema. Las plantillas del ensayo se preparan por SQL exclusivamente como semillas de prueba, sin introducir administración de plantillas en este flujo clínico.

La finalización conserva `POST /api/medical/encounters/{id}/finalize` y el JSON exacto de respuesta de especialidad: encounterId, specialtyHistoryVersion y specialtyHistoryId. El JSON clínico enviado/persistido es español: versionEsquema, codigoEspecialidad, antecedentesPersonales, oftalmologia y ginecologia. Las claves técnicas del contrato HTTP mantienen sus nombres.

Se añade templateId como extensión opcional para clientes anteriores. La nueva pantalla lo envía siempre. Spring bloquea y comprueba que coincide con la plantilla activa antes de cerrar; un cambio devuelve 409 sin escritura parcial. “Comprobar estado y actualizar plantilla” obtiene la versión vigente conservando todo lo escrito. Sin plantilla, muestra el estado y permite completarla más tarde, con cierre deshabilitado.

La plantilla queda asociada a la versión de ficha al cerrar, conforme a BE-15. La consulta de una atención cerrada obtiene esa plantilla histórica aunque exista otra activa. La UI confirma estado CLOSED, cita ATTENDED, identidad de ficha/versión y plantilla antes de anunciar éxito.

## Contexto remitido y documentos

`GET /api/medical/encounters/{id}/source-context` devuelve null para atención directa; si fue derivada devuelve motivo, resumen, prioridad, evaluación de origen, diagnósticos y documentos compartidos autorizados. Se añadió un rewrite exacto para esta ruta. La pantalla representa carga/error/reintento sin borrar los campos clínicos y audita la consulta sin texto clínico.

Los documentos compartidos pueden previsualizarse/descargarse con el mecanismo privado de FE-11. La autorización se limita a documentos AVAILABLE enlazados a la derivación, del paciente y encuentro origen correctos, con un encuentro SPECIALTY asignado al especialista actual. La consulta de documentos del origen devuelve únicamente esos enlaces; no habilita la lectura general del encuentro ajeno ni la subida de archivos al origen cerrado.

Los documentos propios de la nueva atención se gestionan con MedicalDocuments. Los antecedentes globales se consultan en resumen y mediante enlace en otra pestaña para conservar el borrador. Una atención directa funciona sin ficha de revisión ni antecedentes globales previos.

## Correcciones necesarias en Spring/PostgreSQL

V52 completa la persistencia de motivo/evaluación/indicaciones/seguimiento, fecha y actor del cierre. Vincula los antecedentes disponibles y devuelve la ficha de especialidad y su plantilla en la lectura propia. Comprueba especialidad activa y afiliación vigente al cerrar, y serializa la numeración por historia de especialidad. Ficha, diagnóstico, resumen, cita ATTENDED, evento y auditoría se confirman en una transacción; un conflicto tardío revierte todo.

V53 corrige una ambigüedad entre el parámetro de salida estado y la columna de derivación al iniciar una atención remitida. El cambio a IN_PROGRESS registra su evento en la misma transacción; recuperar el borrador conserva el mismo encuentro y no duplica el evento.

Se añadieron pruebas HTTP de cierre especializado, plantilla desactualizada y atención directa sin origen. Se ampliaron las pruebas PostgreSQL para apertura derivada/repetición, resúmenes persistidos, permisos, especialidad inactiva, rollback y lectura de plantilla histórica. OpenAPI documenta lectura, contexto remitido, templateId y contrato de cierre.

## Errores, borrador y accesibilidad

El formulario permanece en memoria ante error de validación, permiso, sesión o red. La autenticación puede recuperarse en otra pestaña. Ante una respuesta perdida, comprobar estado recupera el cierre existente sin reenviar la finalización. Se impide el doble envío del mismo formulario; la concurrencia entre pestañas se resuelve en PostgreSQL.

Los mensajes reciben foco; los campos tienen etiquetas y las acciones son botones/enlaces accesibles con teclado. Se advierte antes de salir con cambios. Los campos no se guardan como borrador en servidor; persisten al cerrar, de acuerdo con el contrato caracterizado. La ficha cerrada se presenta en modo de consulta, con versión, datos originales y cita atendida.

Se corrigieron dos controles ginecológicos que combinaban valores distintos: tratamientos/ITS y detalle PAP/familiares. Detalle ITS y otros antecedentes familiares tienen ahora controles propios y conservan sus valores por separado. También se pueden completar los antecedentes propios del área para especialidades sin bloque adicional.

## Evidencia de aceptación

[test-fe15.mjs](../scripts/test-fe15.mjs) ejecuta Chromium contra la compilación de producción de Next y sesiones reales Spring/PostgreSQL.

Resultado: seis grupos aprobados y 99 solicitudes API desde las páginas. Se inspeccionó la captura de ficha cerrada.

| Escenario | Resultado |
|---|---|
| Atención directa | Inicia desde pantalla, origen null, sin revisión previa ni antecedentes obligatorios. |
| Datos inválidos | Espacios en evaluación devuelven 400 y conservan campos. |
| Plantilla retirada/cambiada | 409, estado sin plantilla, cierre deshabilitado, actualización a versión nueva sin perder borrador. |
| Red antes de guardar y sesión caducada | Error recuperable y campos intactos. |
| Respuesta perdida tras commit | Consulta recupera el mismo specialtyHistoryId sin nuevo cierre. |
| Recarga después del cierre | Motivo, evaluación, plan, seguimiento, antecedentes y versión persistidos. |
| Publicación de otra plantilla y antecedentes posteriores | Ficha cerrada conserva la plantilla utilizada y no incorpora antecedentes globales posteriores. |
| Atención derivada | Contexto, diagnóstico y documento compartido disponibles; vista previa privada y cierre correctos. |
| Dos pestañas | Un 200 y un 409, una versión; la perdedora conserva los campos y recupera el cierre ganador. |
| Especialidad inactiva | 409; reactivación de la especialidad sintética para continuar la prueba. |
| Cita marcada ausente durante la edición | 409, DRAFT sin versión/diagnóstico parcial. |
| Oftalmología y ginecología | Campos propios, lista anticonceptiva y opcionales se conservan tras recargar. |
| Especialista ajeno y otros roles | Rechazo sin exposición clínica; administración/estudiante sin permiso. |
| Repetición sobre atención cerrada | 409 y contenido original intacto. |
| Tráfico | Sin llamadas Supabase ni al endpoint longitudinal serverless de paciente. |

La regresión FE-14 aprobó cinco grupos de programación administrativa, incluidos concurrencia, recuperación y checksum del origen.

La consulta directa confirmó cinco cierres CLOSED/ATTENDED, cada uno con una versión y una auditoría ENCUENTRO_ESPECIALIDAD_CERRADO. El caso de conflicto no tiene versión persistida. Ejemplos del último ensayo:

| Encuentro | Caso | Versión ficha/plantilla | Estado |
|---|---|---|---|
| d0996aa6-3cbd-48d2-a190-6f1db32a7d32 | Directa, plantilla sustituida después | 1/2 | CLOSED/ATTENDED |
| 5000e4c7-9d65-48d9-a579-ca41615a96fa | Derivada | 1/3 | CLOSED/ATTENDED |
| 870a2f69-7168-4e41-8e5c-ecfb8f92fee0 | Carrera entre pestañas | 1/3 | CLOSED/ATTENDED |
| 06588eb2-1d36-49e1-8a52-5c0c1b1ffdbd | Conflicto tardío | Sin versión | DRAFT/NO_SHOW |

## Verificación y reproducción

126 pruebas Java aprobadas, cero fallos/errores/omitidas. Typegen, typecheck, ESLint focalizado, build y git diff --check aprobados. OpenAPI validado como YAML y servido por Spring.

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Desde `codigo/salud-u`:

```bash
npx next typegen
npm run typecheck
npx eslint next.config.ts src/components/specialty-encounter-form.tsx src/components/specialty-history-form.tsx 'src/app/medico/citas/[appointmentId]/page.tsx' scripts/test-fe15.mjs
npm run build
npm run start
```

Con Next escuchando en 3000, en otra terminal:

```bash
FE15_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs FE15_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe15.mjs
FE14_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs FE14_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome FE14_ARTIFACTS=/tmp/salud-u-fe15-regresion-fe14 node scripts/test-fe14.mjs
git diff --check
```

Playwright y Chromium son rutas configurables; se puede usar la instalación propia. No ejecutar build simultáneamente con el navegador sobre Next dev: el ensayo se realizó con next start y la compilación terminada.

La prueba requiere las semillas Administración, Revisión, Estudiante, médico ajeno y Especialista FE09, además de Docker Compose local. Crea pacientes y citas de prueba, una especialidad propia con versiones de plantilla, afiliaciones de prueba y un especialista ajeno. Prepara plantillas de oftalmología/ginecología únicamente si no existen. Una consulta SQL de horarios elige un intervalo aislado porque la colección pública tiene límite de 100 resultados. Las operaciones clínicas se realizan por HTTP. Se conservan las atenciones y versiones sintéticas para inspección; la cita del conflicto queda NO_SHOW/DRAFT.

Artefactos: `/tmp/salud-u-fe15-evidence/resultado.json`, `datos-postgresql.txt` y `ficha-cerrada.png`. Logs: `/tmp/salud-u-fe15-browser.log`, `-maven.log`, `-docker.log`, `-build.log`, `-typecheck.log`, `-typegen.log`, `-lint.log` y `-regresion-fe14.log`. El resultado contiene UUID de pacientes/atenciones y tráfico con tokens ocultos.

FE-15 queda cerrada localmente con este alcance. Resolver o devolver derivaciones continúa en FE-16; la aceptación integral permanece en FE-CORTE.
