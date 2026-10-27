# FE-22 · Exportación clínica autorizada en CSV/XLSX/PDF

Fecha: 2026-10-26. Trazabilidad: BE-22 / RF-24 / UC-22. Pruebas locales con datos sintéticos, Next en producción y Spring/PostgreSQL reales. La aceptación integral permanece en FE-CORTE.

## Verificación local

**167 pruebas Java aprobadas**, sin fallos, errores u omitidas. Cuatro grupos Chromium aprobados contra Next en producción y Spring/PostgreSQL; regresión FE-21 completa (cuatro grupos) y preparación/regresión FE-19 completa. Build, typecheck, ESLint focalizado, OpenAPI y git diff --check aprobados.

El informe final conserva **12 archivos verificados** con checksum/constancia privada y 16 eventos de generación de los escenarios finales, incluidos fallos y respuestas perdidas. Paciente sintético `92363c48-f51e-4a1a-a167-3d178c0684fb`; huella de encuentros/antecedentes/diagnósticos/fichas antes y después `39870817d46f2ece9b4cf032bbcd15c0` (sin cambios). El PDF se inspeccionó renderizado; Excel se reabre con POI y SheetJS.

## Resultado y conexión

La pantalla descarga los archivos generados por Spring mediante `POST /api/reports/clinical/export`. Se retiró `clinical-report-legacy-export.ts`: el frontend deja de generar CSV/XLSX/PDF con xlsx/jsPDF. Conserva los botones, la finalidad y la presentación del reporte de FE-21. Las dependencias de otras funciones pendientes se mantienen.

El rewrite del archivo y el de su constancia son exactos. No se agregan reglas clínicas ni consultas Supabase en Next. `apiBinary` comparte cookie/CSRF y normalización de errores textual/objeto con el cliente existente; solo renueva/reintenta CSRF cuando el filtro de seguridad declara CSRF_INVALID antes de la operación. La pérdida de una respuesta completada no dispara un reenvío automático.

El frontend envía finalidad, formato, filtros canónicos, columnas y agrupaciones aplicadas. No envía filas ni rowCount. Spring rechaza esos campos y recalcula el conjunto con la misma función/orden/ámbito de FE-21. Una atención cerrada después de generar la vista puede formar parte del archivo; la pantalla muestra la cantidad real y explica esa actualización.

## Contratos

| Operación | Contrato |
|---|---|
| `POST /api/reports/clinical` | Compatibilidad preservada: 201/ok/data.id de auditoría persistida, CSV/XLSX/PDF, entero 0..10000 y finalidad de hasta 300 caracteres. Este registro no acredita un archivo generado. |
| `POST /api/reports/clinical/export` | Nuevo contrato de archivo documentado: `{format,purpose,filters,columns?,groupBy?}`. Finalidad obligatoria recortada 1..300; filtros/listas/presentación como GET de FE-21. |
| Archivo válido | 200, MIME de formato, attachment con UUID, no-store/private, nosniff, X-Export-Id, X-Export-Row-Count y X-Content-SHA256. Spring conoce Content-Length; el proxy puede transmitir por chunks. |
| Límites | Se acepta 0..10000 atenciones. La consulta trae como máximo 10001 para detectar exceso; más de 10000 se rechaza 400 antes de generar, sin truncar. |
| Invalidación | 400 por finalidad/formato/filtros/columnas/grupos o filas/cantidad enviadas por cliente; 401 sin sesión; 403 rol/área/personal o CSRF; 500 generación/auditoría fallida. Errores sin attachment parcial. |
| `GET /api/reports/clinical/exports/{id}` | 200/ok/data: id, requestedBy, createdAt, purpose, filters, columns, groupBy, format, state, rowCount y sha256. Solo el solicitante con rol vigente; ajeno/inexistente mismo 404, roles no exportadores 403. |

Cada envío explícito es una exportación independiente, con UUID propio; dos envíos del mismo conjunto pueden tener igual checksum. No es una API idempotente. El botón se protege contra envíos simultáneos del mismo formulario. Si se pierde una respuesta después del commit, la constancia queda COMPLETED y un reintento explícito genera otra exportación auditada.

El cliente verifica MIME, UUID/cantidad/checksum y firma del archivo antes de crear la descarga. Se calcula SHA-256 sobre los bytes completos recibidos; un archivo corrupto no anuncia éxito. El CSV se valida sobre el archivo nativo descargado: la representación textual de DevTools puede normalizar el BOM. La confirmación indica revisar las descargas del navegador; no afirma que el usuario lo haya guardado en disco.

## Equivalencia y estilo

Los tres formatos usan el mismo modelo de metadatos/encabezados/filas. Incluyen institución, período Bolivia, finalidad, cantidad real, filtros legibles, columnas y dimensiones. Conservan el orden de columnas solicitado y el orden de filas de cada grupo de FE-21. Cuando hay agrupaciones se agrega la columna Grupo con etiqueta y cantidad; no se suman otras áreas al construir esos agregados. Los null se muestran como `—`; las fechas civiles no cambian de día por zona horaria y los hábitos se presentan en español.

- CSV: UTF-8 con BOM, CRLF entre registros, campos entre comillas y comillas internas duplicadas. Conserva saltos de línea dentro de una celda. Valores que podrían evaluarse como fórmula al abrir una planilla reciben un apóstrofo inicial de protección, incluido en la comparación como codificación de seguridad.
- XLSX: celdas de texto explícitas (incluye carnet/ceros iniciales y valores con `=`), dos emblemas, metadatos, encabezado fijo, autofiltro, celdas con ajuste de texto, impresión horizontal y pie confidencial. Se reabre con Apache POI y con el lector independiente SheetJS, además de inspeccionar XML/ZIP y relaciones de imágenes.
- PDF: A3 horizontal, dos emblemas, encabezado institucional, tablas, número de página y pie confidencial. Repite encabezados al continuar páginas y no recorta celdas extensas. Reutiliza los recursos de imagen entre páginas. Se abre con PDFBox/Poppler y se inspecciona una página renderizada.

Para superar el límite de longitud por celda de Excel, los valores de más de 30000 caracteres continúan en filas físicas y una columna Parte (1/N). La misma representación se aplica a los tres formatos; rowCount sigue contando atenciones. También se continúan metadatos muy extensos, preservando pares Unicode al dividir texto.

El generador PDF usa fuentes DejaVu embebidas y [Apache PDFBox](https://pdfbox.apache.org/3.0/getting-started.html). Si un símbolo no es representable por esa fuente, rechaza la generación y ofrece reintentar/elegir otro formato; no sustituye ni elimina texto clínico silenciosamente. El ensayo incluye un símbolo fuera de esa cobertura para verificar FAILED y su descarga íntegra en CSV. No se acredita cobertura tipográfica universal. LibreOffice Writer está instalado en este entorno, pero Calc no; no se declara una apertura manual en Microsoft Excel/Calc.

## Persistencia, transacción y autorización

V63 agrega `exportacion_reporte_clinico`, con nombres de tabla/columnas en español: solicitante, fecha, finalidad, filtros, columnas, agrupaciones, formato, estado, cantidad y checksum. Los parámetros técnicos conservan los nombres del contrato HTTP de reportes; no se cambia el JSON de fichas/antecedentes clínicos en español.

El runtime no tiene acceso directo a la tabla. Las funciones SECURITY DEFINER insertan o consultan la procedencia propia, verifican roles vigentes y revocan ejecución PUBLIC. No se agrega edición ni borrado HTTP. La función de registro y el evento de auditoría se confirman en la misma transacción.

El servicio aplica el actor de la sesión a la transacción antes de recalcular. ADMINISTRATIVE/REPORTING_OFFICER ven el conjunto institucional; revisión y especialista mantienen alcance propio y área vigente. La generación usa memoria privada y solo devuelve los bytes cuando la generación y la auditoría terminaron correctamente; no crea objetos públicos ni enlaces persistentes.

COMPLETED acredita generación íntegra, no recepción física por el navegador. Guarda SHA-256 y cantidad real. Ante un fallo de generación autorizado, el servicio revierte y libera su conexión antes de registrar FAILED en otra transacción: no reserva dos conexiones del pool por operación fallida. FAILED no tiene checksum ni archivo. Si falla la persistencia/auditoría, no se publica el documento ni se conserva un registro parcial de éxito.

Los eventos CLINICAL_REPORT_EXPORTED / CLINICAL_REPORT_EXPORT_FAILED registran actor, finalidad, formato, estado, cantidad y nombres de filtros/columnas/grupos. Los valores completos de filtros quedan en la procedencia privada del solicitante; no se copian diagnósticos, antecedentes ni términos clínicos automáticos al evento.

## Interfaz y recuperación

El formulario de exportación exige finalidad, admite teclado, muestra ocupado y lleva el foco al error. Conserva finalidad y filtros (incluido el criterio que aún no se agregó) ante 400, permiso, sesión, red, servidor y archivo corrupto. El usuario puede abrir sesión en otra pestaña y volver a descargar. Un doble click no crea dos exportaciones.

Después de descargar, se conserva solo el UUID de constancia en la URL. Al recargar, se verifica la constancia privada, se recupera la finalidad y se muestra el estado persistido sin afirmar que hubo una nueva descarga. Aplicar otro reporte elimina esa constancia de la vista y conserva la finalidad editable. No se guardan filas clínicas ni archivos en localStorage.

El resultado vacío también puede exportarse: metadatos, cantidad cero y encabezados válidos. El usuario ve el conteo devuelto por el backend después de una actualización concurrente; no se utiliza la cantidad de la vista anterior para autorizar o registrar la descarga.

## Pruebas y comandos

Pruebas Java: límites 0/10000/10001 antes de renderizar, HTTP binario/CSRF/roles/errores, generación real/reapertura en los tres formatos, comillas/saltos/acentos/null, continuación de celdas/metadatos Unicode, paginación y fórmulas como texto. PostgreSQL comprueba recalculo real, autor/procedencia privada, falta de privilegios directos y rollback de registro/auditoría.

`scripts/test-fe22.mjs` ejecuta cuatro grupos con sesiones Spring y datos preparados por FE-19/FE-21:

1. Descarga nativa CSV/XLSX/PDF; igualdad de tabla/columnas/grupos y checksum; lectura independiente de Excel, PDF con páginas y constancia persistida tras recarga.
2. Obligatorios/400, red/permiso/500, logout y reautenticación reales, checksum erróneo, respuesta perdida después del commit y doble click. No anuncia éxito ni borra el borrador.
3. Alcance por médico, denegación de constancia ajena, roles y filas/cantidad falsas rechazadas, vacío exportable, datos cambiados después de mostrar la vista y exportaciones simultáneas por actores distintos.
4. FAILED ante fallo de generación, alternativa CSV que conserva el símbolo, fallo tardío controlado de registro que revierte todo y recuperación, auditoría sin términos clínicos, huella clínica intacta y ausencia de Supabase.

Los triggers de fallo se instalan solo sobre los registros sintéticos identificados por finalidad de ensayo y se eliminan con finally. No se cambia información real.

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Desde `codigo/salud-u`:

```bash
npm run build
npm run typecheck
npm exec eslint -- src/components/clinical-report-builder.tsx src/lib/clinical-reports.ts src/lib/clinical-report-export.ts src/lib/api/client.ts next.config.ts
FE19_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE19_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe19.mjs
FE21_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE21_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe21.mjs
FE22_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE22_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe22.mjs
git diff --check
```

Las rutas de Playwright/Chromium corresponden al entorno local. El Dockerfile usa la caché Maven de BuildKit con Compose y ejecuta verify; se retiró dependency:go-offline, que demoraba la preparación con dependencias ajenas a las pruebas necesarias. Para este ensayo se inició esa caché con el repositorio de dependencias Maven ya comprobado, sin copiar configuraciones ni credenciales.

Artefactos: `/tmp/salud-u-fe22-evidence/resultado.json`, CSV/XLSX/PDF, `pdf-pagina-1.png` y `exportaciones.png`. Logs `/tmp/salud-u-fe22-browser.log`, `-maven.log`, `-docker.log`, `-build.log`, `-typecheck.log`, `-lint.log`, `-regresion-fe21.log` y `-preparacion-fe19.log`.
