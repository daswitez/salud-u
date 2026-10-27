# FE-21 · Reporte clínico por período y múltiples criterios

Fecha: 2026-10-26. Trazabilidad: BE-21 / RF-22, RF-23, RF-33 / UC-21. Entorno local sintético: Next en producción, Spring y PostgreSQL reales. La aceptación integral sigue en FE-CORTE.

## Resultado local

155 pruebas Java aprobadas (0 fallos/errores/omitidas), cuatro grupos Chromium aprobados con Next en producción, regresión FE-20 completa (cuatro grupos), build, typecheck, ESLint focalizado, OpenAPI y git diff --check aprobados.

La última medición mensual incluyó **155 atenciones sintéticas**: diez consultas secuenciales con p95 43.3 ms y máximo 43.3 ms; quince consultas en tres ráfagas de concurrencia cinco, p95 92.6 ms y máximo 92.6 ms. Todas por debajo de 3 s en este entorno local.

Paciente de ensayo `9f7953c3-9e96-4d29-bfa5-7e9b65e7ffdf`; solicitante de Reportes `0dac4c71-922b-49e4-9775-8d2d0764f3b3`. Huella lógica de encuentros/antecedentes/diagnósticos antes y después `ae55270049a6f97fbae86422cef7a177` (sin cambios). Se verificaron 29 eventos de consulta del responsable con su actor y metadatos sin términos clínicos. El informe conserva filas esperadas, tiempos y tráfico.

## Integración y alcance

`GET /api/reports/clinical` consume Spring por rewrite exacto, con sesión de mismo origen. Se retiró el Route Handler Supabase. El cliente conserva el sobre completo `ok/data/filters` mediante `apiEnvelope`, además de `presentation` cuando se solicita. `apiJson` mantiene su contrato anterior para los demás casos. Los JSON clínicos de hábitos/ficha de especialidad continúan en español en HTTP y PostgreSQL; su adaptación se limita al modelo de presentación.

Se conservan las páginas `/medico/reportes` y `/administrativo/reportes` y las redirecciones de `/clinicos`. REPORTING_OFFICER puede ingresar al reporte institucional sin una ficha de personal; su inicio administrativo redirige al reporte antes de consultar el dashboard serverless y la navegación muestra reportes/perfil. La lectura de especialidades para ese rol es solo de catálogo activo; no habilita administración ni escritura. Se completa la validación de ese rol en el aprovisionamiento de usuarios existente.

El formulario conserva los períodos rápidos, fechas, tipo, especialidad, diagnóstico, listas de alergias/antecedentes/hábitos y búsqueda. Agrega selección de columnas y hasta dos agrupaciones. Los criterios de una lista se agregan con botón/Enter y se combinan por AND. Se puede presentar motivo, evaluación, indicaciones, seguimiento, nacimiento y ficha del área, además de las nueve columnas anteriores.

Los filtros y la presentación aplicada permanecen en la URL para recargar o volver a abrir el reporte. Los campos que todavía se están editando no alteran las filas aplicadas. Restablecer limpia también el término que no se había agregado. Los mensajes y errores tienen estados accesibles; el error recibe foco y la tabla usa encabezados de columna. El cálculo de alcance, filas, filtros y grupos se ejecuta en Spring/PostgreSQL; Next no reproduce reglas clínicas.

## Contrato

El OpenAPI servido por Spring documenta GET y el POST compatible existente.

| Elemento | Comportamiento |
|---|---|
| Sobre | `ok`, `data`, `filters`; sin coincidencias `data: []`. |
| Filas | Las 17 claves de la RPC efectiva: identificación de atención/paciente, cierre, tipo, especialidad, nacimiento, motivo/evaluación/indicaciones/seguimiento, diagnósticos, alergias, resumen de antecedentes, hábitos y ficha de especialidad. |
| Null | Especialidad, nacimiento, evaluación, indicaciones, seguimiento y ficha mantienen null cuando corresponda; pantalla usa `—`. |
| Orden | `closed_at DESC`, empate por UUID ascendente; las columnas elegidas mantienen el orden solicitado. |
| Filtros | Escalares omitidos null, listas omitidas []; listas JSON tipadas, términos recortados, únicos y hasta 15 de 200 caracteres. |
| Fechas | Días inclusivos de Bolivia; sin límites explícitos se conserva la ventana de referencia de últimos 30 días hasta hoy. |
| Texto | Coincidencia parcial normalizada: mayúsculas, tildes/NFC y espacios. Todas las listas combinan AND; hábitos afirmativos exigen SI. |
| Presentación adicional | Solo aparece si se pide `columns` o `groupBy`; `columns` no vacío/permitido y `groupBy` hasta dos dimensiones entre day/month/encounterType/specialty. day y month no se combinan. |
| Grupos | `key`, `count`, `encounterIds`; especialidad ausente null. Orden por primera aparición y detalle en el orden original. Se calculan únicamente sobre filas autorizadas y filtradas. |
| Error | 400 fecha/tipo/listas/columnas/agrupación inválidos; 401 sin sesión; 403 rol/personal no permitido; 500 fallo recuperable. Error textual, sin clínica. |
| Caché y auditoría | no-store/private; evento REPORTE_CLINICO_CONSULTADO con actor, cantidad y nombres de columnas/dimensiones, sin términos clínicos de búsqueda. |

V62 completa la función detallada y conserva la firma SQL de 13 columnas de `reporte_clinico` para consumidores anteriores. ADMINISTRATIVE/REPORTING_OFFICER consultan el conjunto institucional; los médicos solo sus encuentros cerrados, con área activa y afiliación vigente para especialistas. No amplía el reporte del especialista a atenciones ajenas porque pueda leerlas en la historia longitudinal.

Los antecedentes son los de la versión vinculada, resumidos como la referencia (secciones y orden), nunca el JSON bruto ni el antecedente global posterior. El fallback de revisión se limita al mismo encuentro u origen de su derivación. La ficha de especialidad es la versión de la atención, no la plantilla ni datos posteriores.

## Diferencias justificadas y frontera FE-22

Se contrasta con la RPC consolidada y fixtures de T-01. Se restaura la paridad ausente en el backend previo: listas ignoradas, antecedentes mal extraídos, falta de cuatro columnas, hábitos tomados de otra fuente y falta del rol Reportes. El fixture `report-empty` se compara como sobre completo; errores por rol y sesión conservan estado/texto.

La normalización con tildes/espacios y el tratamiento literal de `%`/`_` cumplen la aceptación documental. Se documentan estas extensiones frente a ILIKE de referencia. Las listas malformadas y términos fuera de límite ahora se rechazan explícitamente, en lugar de ignorarlos/truncarlos silenciosamente. El fallback de antecedentes y la exigencia de especialidad vigente restringen el comportamiento heredado para cumplir autorización por área y evitar arrastrar contenido de una revisión ajena.

Se conserva la descarga actual del detalle en CSV/XLSX/PDF desde el cliente y se separa su código en `clinical-report-legacy-export.ts`. El POST de registro de esa descarga ahora pasa a Spring y devuelve 201/data.id de una auditoría persistida, con validación de formato y entero 0..10000; deja de devolver un UUID sin persistencia. La vista explica que estos archivos incluyen el detalle completo del resultado aplicado. El endpoint de archivos, recálculo de exportación y aplicación del estilo/columnas/agrupaciones a esos archivos son el trabajo de **FE-22**; FE-21 no declara cerrada esa historia.

## Recuperación

No se presenta un fallo como reporte vacío exitoso. Al consultar o fallar se retiran resultados anteriores; permanecen filtros, selección de columnas/grupos y el término aún sin agregar. Reintentar consulta el último envío; el usuario puede cambiar criterios y aplicar una nueva consulta. El catálogo se recupera independientemente, sin descartar filtros ni reemplazar el error del reporte.

Se comprueba logout real de Spring, rechazo 401, reautenticación y reintento sin desmontar el formulario. Se ofrece abrir sesión en otra pestaña. Las solicitudes de reporte se cancelan al desmontar/sustituir la consulta, y los botones de descarga quedan ocupados durante su envío.

## Pruebas y comandos

`scripts/test-fe21.mjs` prepara pacientes/atenciones/antecedentes mediante la API probada, con una cuenta de Reportes aprovisionada por API sin personal. Usa la especialidad sintética de FE-19. Prueba:

- Sobre de 17 campos, listas AND normalizadas, datos históricos y coincidencia con criterios mixtos.
- Revisión/especialista/otro médico limitados a sus propias filas; Reportes institucional sin personal.
- Envío y recarga de filtros/columnas/grupos, teclado, null y detalle del grupo coherente con Spring.
- Fallo de catálogo y reintento independiente, red, permiso, servidor, sesión real/simulada y rango inválido; conservación de término pendiente y limpieza explícita al restablecer.
- Vacío, contrato T-01 report-empty, 401/403, columnas/listas/dimensiones inválidas y POST compatible con auditoría persistida.
- Huella de encuentros/antecedentes/diagnósticos intacta, actor de auditoría correcto y ausencia de llamadas Supabase.
- Diez consultas mensuales secuenciales y quince en tres ráfagas con concurrencia cinco. Se registra volumen real sintético y tiempos individuales.

Pruebas Java: contrato HTTP, límites de registro de descarga, listas canónicas, agrupación por Bolivia con null/orden, integración PostgreSQL de combinaciones/alcance/ventana inclusiva y compatibilidad SQL de 13 columnas. La regresión de FE-20 verifica que el cliente JSON/binario y las descargas Word mantengan su comportamiento.

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Desde `codigo/salud-u`:

```bash
npm run build
npm run typecheck
npm exec eslint -- src/components/clinical-report-builder.tsx src/lib/clinical-report* src/lib/api/client.ts src/lib/clinical-json.ts src/app/administrativo/reportes/page.tsx src/app/administrativo/page.tsx src/components/app-sidebar.tsx src/components/app-header.tsx next.config.ts
FE21_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE21_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe21.mjs
FE20_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE20_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
FE20_ARTIFACTS=/tmp/salud-u-fe21-regresion-fe20 node scripts/test-fe20.mjs
git diff --check
```

El script usa semillas locales con datos ficticios; para prepararlas se conserva `scripts/test-fe19.mjs`. Las rutas de Playwright/Chromium corresponden a este entorno y se pueden reemplazar con las variables del comando. No se modifica información real.

Artefactos: `/tmp/salud-u-fe21-evidence/resultado.json`, `reporte-agrupado.png`; regresión `/tmp/salud-u-fe21-regresion-fe20`. Logs `/tmp/salud-u-fe21-browser.log`, `-maven.log`, `-docker.log`, `-build.log`, `-typecheck.log`, `-lint.log`, `-regresion-fe20.log`.

La institución describe un centro pequeño con picos de demanda y reportes de fin de mes, sin volumen numérico acordado. La medición local no acredita aún el rendimiento institucional ni la carga mixta con agenda/búsquedas; esa aceptación se mantiene en FE-CORTE.

Seguimiento FE-22 (2026-10-26): se retiró el exportador local transitorio y se integraron los archivos recalculados por Spring con columnas/grupos/finalidad. [Evidencia FE-22](evidencia-fe22.md).
