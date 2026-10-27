# FE-INV · Exportación seudonimizada para investigación

Fecha: 2026-10-26. Trazabilidad: H-INV / BE-INV / RF-34; RN-22, RN-23 y RN-32. Ensayo exclusivamente local con datos sintéticos, Next en producción, Spring y PostgreSQL reales.

## Resultado local

Cinco grupos Chromium aprobados con inspección automática de los archivos descargados (ZIP con CSV y XLSX). 183 pruebas Java aprobadas, sin fallos/errores/omitidas. Regresiones FE-21 (4), FE-22 (4), FE-23 (4), FE-24 (5), FE-25 (6, ajustada a la lectura del catálogo por Reportes), FE-26 (7) y FE-27 (6) aprobadas después del cambio. Compilación de producción, typecheck, lint de los archivos del cambio y lectura YAML de OpenAPI aprobados. Se inspeccionó la captura de la pantalla con la constancia.

## Implementación

No existía pantalla ni consumo Supabase. Se agrega `/administrativo/reportes/investigacion` (Administración y Reportes), enlazada desde Reportes y, para Reportes, desde la navegación. Consume Spring por rewrites exactos (`/api/research/exports` y `/api/research/exports/{id}`).

- **Modo de exportación visible:** conjunto seudonimizado `MONTHLY-V1`; qué incluye y excluye; rotación mensual del seudónimo; sin aprobación previa (RN-32) y qué queda registrado.
- **Solicitud:** finalidad obligatoria (3–300), filtros de fechas, carrera, especialidad y vacuna recibida, y formato CSV en ZIP o XLSX. Filtros y formato se escriben en la URL al cambiarlos, sin esperar respuestas; la finalidad se conserva en pantalla ante cualquier error.
- **Descarga:** `src/lib/research-export.ts` sólo ofrece el archivo si el tipo, el identificador, las filas, el SHA-256 de los bytes recibidos, las firmas ZIP y las entradas esperadas (datos + diccionario) coinciden. Cualquier fallo muestra error y no descarga nada.
- **Confirmación:** tras descargar, la pantalla lee la constancia y comprueba que la finalidad registrada sea la enviada. Muestra finalidad, filtros, formato, filas, política, mes y fecha. El `exportId` queda en la URL, así que la constancia sigue visible al recargar.

Las reglas (conjunto, seudónimo, rangos, validación de filtros, límite y procedencia) siguen en Spring/PostgreSQL.

## Cambios de backend necesarios (BE-INV)

V38 y su controlador ya exportaban el conjunto, pero faltaba lo necesario para usarlo y comprobarlo desde pantalla. V69 y el controlador:

- **Hora de Bolivia:** mes de la atención, filtros de fecha, edad, matrícula vigente y mes de la política usan el día de Bolivia; antes usaban UTC, con lo que el seudónimo rotaba 4 horas antes y las atenciones de la noche caían en el día o mes siguiente.
- **Filtros cerrados:** `filtros_investigacion_normalizados` acepta sólo `from`, `to`, `careerId`, `specialtyId` y `vaccineId`, con fechas y UUID válidos y `from ≤ to`. Antes cualquier clave se guardaba en la procedencia y un valor mal formado terminaba en un error genérico; ahora responde `400` con mensaje claro.
- **Procedencia comprobable:** la exportación guarda mes de política y SHA-256, y la auditoría incluye finalidad y nombres de filtros. La respuesta trae `X-Export-Id`, `X-Export-Row-Count`, `X-Content-SHA256` y `X-Pseudonym-Policy`.
- **Constancia:** nuevo `GET /api/research/exports/{id}`, sólo para quien exportó (otro usuario recibe `404`).
- **Errores distinguibles:** finalidad o formato `400`; más de 10.000 filas `400` con sugerencia; rol `403`; fallo al generar `500` sin registrar procedencia. El límite se aplica con `limit 10001` en vez de cargar todo.
- **Archivo:** CSV con BOM UTF-8 y neutralización de fórmulas (`= + - @`); en XLSX los conteos son numéricos. Diccionario en español con las categorías de cada columna.
- **Catálogo de vacunas:** Reportes puede leer `GET /api/vaccines` (y `listar_vacunas`) para filtrar por vacuna; escribirlo sigue siendo sólo de Administración. Ya veía los nombres en la cobertura. FE-25 se ajustó a este cambio.

Tests MVC y PostgreSQL ampliados (filtros inválidos, día de Bolivia en el cambio de mes, constancia ajena, auditoría con finalidad) y OpenAPI actualizado.

## Escenarios verificados en navegador

1. Reportes entra desde la navegación, ve el modo y exporta CSV con teclado. La solicitud lleva exactamente finalidad, filtros y formato. El ZIP descargado coincide con el SHA-256 y contiene `research-data.csv` y `dictionary.csv`. Columnas exactas, diccionario para cada una, seudónimo `R-` + 20, mes al día 1, edad en rangos (`20_24`, `UNKNOWN`), carrera y período. No aparece carnet, código de registro, nombres, correo, UUID, texto de diagnóstico ni lote. Base de datos y auditoría registran finalidad, filtros, filas, checksum y mes. Al recargar se conservan la constancia y los filtros.
2. XLSX filtrado por vacuna: hojas `Research data` y `Dictionary`, sólo columnas permitidas y mismo seudónimo que en el CSV del mismo mes. Formato y vacuna quedan en la URL.
3. Errores, ninguno con descarga, y en todos se conservan finalidad, filtros y formato:
   - finalidad vacía: no se envía nada y el foco va al campo, marcado `aria-invalid`;
   - rango invertido: `400` de Spring;
   - red caída y `500`: mensaje y reintento;
   - archivo truncado en tránsito: falla la comprobación del checksum y no se ofrece;
   - sesión vencida: enlace para iniciar sesión en otra pestaña y reintento exitoso.
4. Estudiante, médico y Auditor reciben `403` al exportar o leer constancias. En pantalla, Auditor ve "Acceso restringido" y estudiante y médico son sacados del área administrativa. Otro usuario de Reportes recibe `404` con una constancia ajena. Un filtro desconocido (`patientId`) da `400`. Anónimo, rechazado. Administración llega desde Reportes.
5. Sólo quedan registradas las exportaciones que Spring generó completas. El caso truncado sí queda registrado, porque el servidor lo generó completo y se cortó después. Validación, red, `500` y sesión no dejan registro. Todo el tráfico va al mismo origen y no hay ninguna solicitud a Supabase.

## Decisiones y observaciones

- **Archivo cortado en tránsito:** queda registrado con su checksum aunque el usuario no lo reciba. La procedencia refleja lo que Spring entregó y el checksum permite distinguirlo; la pantalla no ofrece el archivo dañado.
- **Política de seudónimo sin cambios:** se mantiene `MONTHLY-V1`; sólo se fija el mes en hora de Bolivia. Las exportaciones anteriores a V69 no tienen mes ni checksum y la constancia los muestra vacíos.
- **Riesgo de reidentificación indirecta:** el conjunto no aplica umbrales de celdas pequeñas (k-anonimato). Combinar carrera, período, rango de edad y mes podría aislar a pocas personas en grupos chicos. El backlog no lo exige; conviene decidirlo institucionalmente antes de exportar datos reales.
- **Navegación en Reportes:** el ensayo espera a que Cumplimiento termine de cargar antes de navegar, por el `replaceState` ya registrado para FE-CORTE. Esta pantalla actualiza la URL sólo de forma síncrona al cambiar filtros o tras una exportación iniciada por el usuario.

## Verificación reproducible

Desde `codigo/salud-u-backend`:

```bash
mvn -B -ntp test
docker compose up --build -d
```

Desde `codigo/salud-u`:

```bash
npm run build
npm run typecheck
npx eslint scripts/test-feinv.mjs scripts/test-fe25.mjs src/components/research-export.tsx src/lib/research-export.ts src/app/administrativo/reportes src/components/app-sidebar.tsx next.config.ts
FEINV_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FEINV_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-feinv.mjs
```

El script limita su origen a localhost/127.0.0.1 y lee los archivos descargados con `python3 -I` (`zipfile`). Crea por API dos cuentas de Reportes, una de estudiante, una de Auditor, una carrera y una vacuna. Por SQL crea dos pacientes matriculados, cada uno con una atención cerrada (uno con diagnósticos de texto marcado), y registra una dosis por API. Todo queda marcado `FEINV-<marca>`. Guarda resultado, tráfico, archivos y captura en `/tmp/salud-u-feinv-evidence`.
