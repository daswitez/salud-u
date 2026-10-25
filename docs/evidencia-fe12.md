# FE-12 · Cierre de revisión, ficha inmutable y cita atendida

Validación local: 2026-10-25. Trazabilidad: UC-12, BE-12 y RF-13; RN-05, RN-08, RN-09, RN-10 y RN-25. Rama frontend: backend. Todos los pacientes, citas y archivos del ensayo son sintéticos.

## Comportamiento de la pantalla

El cierre consume el POST /api/medical/encounters/{id}/finalize ya conectado a Spring en FE-10, con los documentos de FE-11. El payload conserva el contrato y el JSON clínico en español. No se añaden reglas de negocio ni acceso Supabase en Next.

El formulario informa que cerrar guarda la ficha de consulta y marca la cita como atendida. Motivo y evaluación tienen etiquetas y required para guiar al usuario; Spring valida de nuevo, incluyendo textos en blanco y química ATTACHED con documento AVAILABLE.

Se añadió una protección inmediata contra envíos simultáneos desde el mismo formulario, además de deshabilitar controles mientras se guarda. La protección del servidor sigue resolviendo dos pestañas concurrentes.

Después del POST se consulta el contexto persistido. Solo se anuncia éxito al confirmar CLOSED, ATTENDED y ficha/version presentes. Una confirmación inconsistente conserva el borrador y muestra error, aunque el POST haya respondido 200. “Comprobar estado de la atención” consulta sin repetir la escritura y muestra los datos que realmente quedaron guardados.

La consulta cerrada muestra el estado “Atendida”, versión, diagnóstico, mediciones, indicaciones, antecedentes vinculados y documentos. No presenta campos de edición ni cierre/carga de archivos. “Ver atenciones realizadas” lleva a la agenda; desde allí se puede volver a consultar la misma atención.

La lectura de una ficha cerrada ya no requiere cargar el catálogo de especialidades, que solo usa el formulario en borrador. La recuperación de sesión borra el aviso de login después de confirmarse y conserva campos durante los errores. Los mensajes reciben foco.

## Transacción y contratos

El backend existente proporciona la transacción de ficha, diagnóstico, mediciones, versión, cita ATTENDED, evento y auditoría. FE-12 no requiere una nueva migración: se utilizan las funciones Flyway vigentes, incluida la serialización carga/cierre incorporada en V49.

La respuesta real comprobada desde pantalla es exactamente:

~~~json
{
  "ok": true,
  "data": {
    "encounterId": "UUID del encuentro",
    "referralId": null,
    "reviewHistoryVersion": 1
  }
}
~~~

La versión cambia con las fichas sucesivas del paciente. El fixture T-01 de finalización era una respuesta simulada que no incluía reviewHistoryVersion; se conservan sus campos comunes y se verifica explícitamente la respuesta completa de la RPC real. Las URLs variables y los archivos siguen su comparación por permisos/contenido.

Un cierre repetido recibe 409 y no reescribe la ficha. Un actor ajeno recibe 404 con datos clínicos ausentes; un rol sin permiso, 403. El error tardío por estado de cita revierte las inserciones clínicas y no genera evento ATTENDED ni auditoría de cierre exitoso.

## Evidencia de navegador

[test-fe12.mjs](../scripts/test-fe12.mjs) terminó PASS en Chromium con sesiones reales Spring, seis grupos de escenarios y 73 solicitudes API desde las páginas.

| Escenario | Resultado |
|---|---|
| Motivo/evaluación vacíos | Validación nativa y foco en el campo; no se envía POST. |
| Evaluación con espacios | 400 de Spring; campos conservados y foco en el mensaje. |
| ATTACHED sin documento | 409, aunque se fuerce la opción desde el DOM; no se guarda ficha parcial. |
| ATTACHED con química disponible | Cierre 200 con versión/diagnóstico/mediciones/cita y documento vinculado. |
| Dos submit en el mismo turno | Un único POST; controles deshabilitados durante la espera. |
| Recarga y navegación | Consulta cerrada, cita Atendida y acceso desde la agenda al mismo registro. |
| Intento de reescritura | 409; checksum lógico original intacto. |
| Dos pestañas concurrentes | Un 200 y un 409; un solo diagnóstico y versión. La perdedora conserva sus campos hasta consultar el estado persistido. |
| Cita cambiada a ausencia antes del cierre | 409 y rollback de ficha/diagnóstico/mediciones; conserva el formulario y muestra Inasistencia al consultar el estado. |
| POST 200 con confirmación inconsistente | La prueba altera únicamente la respuesta de confirmación, después de un commit real; la pantalla no anuncia éxito ni descarta el borrador. Un GET posterior recupera CLOSED/ATTENDED sin repetir POST. |
| Sesión caducada | Renovación CSRF y 401; borrador clínico conservado, reautenticación y cierre posterior sin aviso de login residual. |
| Médico ajeno y estudiante | Rechazados; pantalla ajena sin diagnóstico ni contenido clínico. |

El tráfico no contiene llamadas Supabase ni lectura de la historia longitudinal heredada. Se inspeccionó la captura de la ficha cerrada. La regresión FE-10 también terminó PASS con sus cinco grupos, incluidos fallos de red y respuesta perdida después del commit.

## Comprobación de PostgreSQL

Paciente sintético: 3e975747-f855-45f4-8e2e-ee2e55eed44b.

| Encuentro | Encuentro / cita | Versión | Diagnósticos / mediciones | Eventos ATTENDED / auditorías de cierre |
|---|---|---:|---|---|
| ca8849d0-da49-40d9-9178-bad574e13030 | CLOSED / ATTENDED | 1 | 1 / 9 | 1 / 1 |
| 705ef2c6-d490-4014-89c3-e2e1e9aa085c | CLOSED / ATTENDED | 2 | 1 / 9 | 1 / 1 |
| 18d40fb1-cb42-4c3f-a5f7-47ce08390e7d | CLOSED / ATTENDED | 3 | 1 / 9 | 1 / 1 |
| 012dc27a-fe22-4d89-899b-63ff9b329aa4 | CLOSED / ATTENDED | 4 | 1 / 9 | 1 / 1 |
| f430b737-80b7-425a-b204-c9aa7268e086 | DRAFT / NO_SHOW | — | 0 / 0 | 0 / 0 |

El checksum lógico de la primera ficha permaneció 1d4cdc4e5595d1985c1d6af748ae9e7e1af5d53d43eebabddeb046c1f8cac345 después de reintentos, concurrencia en otras atenciones y accesos ajenos. La comparación incluye datos del encuentro, antecedentes vinculados, diagnósticos y mediciones.

## Verificación y comandos

114 pruebas Java aprobadas: cero fallos, errores u omitidas. Typecheck, ESLint focalizado, build y git diff --check aprobados.

Desde codigo/salud-u-backend:

~~~bash
mvn test -q
~~~

Desde codigo/salud-u, con Next/Spring/PostgreSQL iniciados:

~~~bash
npm run typecheck
npx eslint src/components/review-encounter-form.tsx scripts/test-fe12.mjs
npm run build
FE12_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs FE12_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe12.mjs
FE10_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs FE10_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe10.mjs
git diff --check
~~~

La prueba usa las semillas locales de Administración, Revisión, médico ajeno y Estudiante. Crea su propio paciente y cinco citas; conserva las cuatro atenciones cerradas y marca las citas restantes como ausencia al finalizar. Las rutas de Chromium/Playwright son configurables.

Artefactos: /tmp/salud-u-fe12-evidence/resultado.json y cierre-confirmado.png. Logs: /tmp/salud-u-fe12-browser.log, /tmp/salud-u-fe12-maven.log, /tmp/salud-u-fe12-build.log, /tmp/salud-u-fe12-regresion-fe10.log y /tmp/salud-u-fe12-db.txt. Las URLs con token se ocultan en el tráfico almacenado.

FE-12 queda cerrada localmente; la aceptación integral continúa en FE-CORTE.
