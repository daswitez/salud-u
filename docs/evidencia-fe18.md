# FE-18 · Buscar por fechas y contenido en la historia autorizada

Validación local: 2026-10-25. UC-18, BE-18, RF-19; RN-14/RN-20. Frontend en rama `backend`. Solo cuentas, pacientes y documentos sintéticos.

## Contrato y alcance

Se confirmó el endpoint existente `GET /api/medical/patients/{id}/search`. El rewrite añadido es exacto; la búsqueda consume Spring y no incorpora reglas de negocio ni acceso Supabase en Next.

Parámetros opcionales: q (hasta 200 caracteres tras recorte), from/to (ISO yyyy-MM-dd). Ambos días son inclusivos en America/La_Paz. Se admite una sola fecha o ninguna; rango invertido y fecha inválida devuelven 400. q vacío equivale a todo el contenido; `%` y `_` son texto literal.

Respuesta conservada: `ok/data[]` con id, occurredAt, encounterType, status, chiefComplaint, assessment y specialty. Solo incluye CLOSED, en el mismo orden de la historia: fecha/id descendente. Cero coincidencias devuelve []; campos ausentes conservan null, incluida specialty:null en revisiones. La implementación anterior usaba Map.of con valores null y podía fallar; ahora usa un resultado tipado.

Se documenta explícitamente la búsqueda de atenciones cerradas porque ese es el conjunto consultable en la línea de tiempo de la pantalla. Los borradores siguen en el flujo de atención, no se mezclan con resultados históricos.

## Normalización y autorización

V58/V59 aplican coincidencia parcial literal, sin distinguir mayúsculas o acentos y colapsando espacios repetidos. Unicode compuesto/descompuesto produce el mismo resultado. Los saltos de línea de campos estructurados se decodifican antes de normalizar; no se busca en claves técnicas del JSON.

El texto incluye motivo, evaluación, indicaciones, seguimiento, especialidad, diagnósticos, valores textuales de fichas, antecedentes vinculados al encuentro y nombre/descripción de documentos AVAILABLE. Los antecedentes globales posteriores sin vinculación no cambian lo que se puede encontrar en una ficha histórica.

La función reutiliza ids_historia_autorizada de FE-17: relación clínica, revisiones para revisión, áreas vigentes para especialista y origen remitido autorizado. La restricción se aplica antes de buscar contenido de cada encuentro. No puede utilizarse una coincidencia para descubrir información de otra área o de un paciente sin relación.

Se conserva el error 404 “No tienes acceso clínico a este paciente.” para falta de relación, 403 para roles no clínicos y 401 sin sesión. El endpoint devuelve no-store, private. HISTORIA_LONGITUDINAL_BUSCADA registra actor/paciente, cantidad de resultados y existencia de texto; no registra el término clínico ni el contenido encontrado.

## Interfaz y recuperación

La historia ofrece texto, Desde, Hasta, Buscar en historia y Limpiar filtros. Es una consulta explícita al pulsar Buscar: escribir no genera solicitudes por cada tecla, para moderar la carga en días de alta demanda.

Cada búsqueda consulta resultados y una historia autorizada actualizada; las tarjetas se construyen con los IDs devueltos, sin volver a decidir permisos o coincidencias en el navegador. Si cambió el conjunto durante ambas lecturas y no puede confirmar la correspondencia, muestra un error recuperable.

Los filtros aplicados correctamente se conservan en q/from/to de la URL. La recarga reproduce la misma búsqueda; limpiar elimina esos parámetros y recupera la historia cerrada. La pantalla distingue los campos editados de los filtros aplicados mediante el resumen de resultados.

Ante validación, red o sesión, se conservan texto/fechas y se ocultan los resultados fallidos. No se anuncia una lista vacía como si fuera éxito. La reautenticación en otra pestaña conserva el formulario. Solo la respuesta vigente puede actualizar el estado; las respuestas anteriores se ignoran. Los campos tienen etiquetas, se puede enviar con Enter y los errores reciben foco.

La regresión FE-17 se adaptó al cambio intencional de búsqueda local a envío explícito, conservando sus escenarios de autorización, teclado, documentos y errores.

## Perfil de carga para este centro

El usuario indicó que todavía no hay volumen institucional numérico definido: es un centro pequeño, con picos de atención y reportes de varias áreas a fin de mes. Se tomó un perfil sintético conservador para la historia de un paciente: 1.001 atenciones y ráfagas de 20 búsquedas con concurrencia 10.

V59 añade índices para fecha/paciente en atenciones cerradas, diagnósticos por encuentro y documentos disponibles por encuentro. Los límites de fecha se convierten a intervalos temporales indexables, conservando los días inclusivos de Bolivia.

Medición PostgreSQL en Testcontainers, incluyendo transacción y transferencia de IDs:

| Perfil sintético | Muestras | Resultado observado |
|---|---:|---:|
| Historial de 1.001 atenciones, búsqueda secuencial | 10 | p95 ≈ 52 ms |
| Mismo historial, concurrencia 10 | 20 | p95 ≈ 375 ms |

La prueba HTTP adicional alterna dos especialistas de áreas diferentes, con 20 búsquedas y concurrencia 10: comprueba el tiempo y que el pool no mezcle sus resultados. En el fixture HTTP funcional de 1–2 fichas autorizadas por actor, el p95 final fue 45.8 ms (máximo 48.2 ms). Esta medición HTTP es distinta del historial grande aislado de Testcontainers; los valores completos están en resultado.json. En ambos perfiles sintéticos se observó menos de 3 segundos.

Esto es evidencia local, no un aforo institucional ni una garantía de producción. El corte integral debe medir búsquedas y reportes mensuales ejecutándose juntos, sobre el hardware de despliegue y con un volumen acordado. No se declara ese ensayo mixto cumplido con una medición aislada de búsqueda.

## Pruebas

[test-fe18.mjs](../scripts/test-fe18.mjs) prepara dos áreas, revisión remitida/no remitida, diagnósticos, antecedentes posteriores y documentos. Comprueba:

| Escenario | Resultado |
|---|---|
| Texto parcial con mayúsculas/acentos/espacios y Unicode descompuesto | Coincidencia correcta. |
| Diagnóstico y valor estructurado con salto de línea | Encuentra el encuentro autorizado. |
| Término exclusivo de otra área u origen no remitido | Lista vacía sin exposición. |
| Antecedente actual posterior sin vínculo histórico | No se encuentra en la ficha cerrada. |
| Revisiones con especialidad null | Respuesta válida, sin excepción. |
| Fecha UTC en día diferente de Bolivia | 2026-10-25 02:30Z pertenece al 24 de octubre local. |
| Fechas inclusivas y rango inválido | Resultados correctos o 400 conservando formulario. |
| Recarga, URL y limpieza | Filtros/resultados reproducibles. |
| Sin coincidencias | [] y mensaje correcto. |
| Red/sesión | Error recuperable, campos conservados, sin resultados residuales ni falso éxito. |
| Navegación a ficha | IDs/resultados coherentes con detalle y línea de tiempo. |
| Roles/relación/área y pico concurrente | Sin mezcla de datos ni acceso ajeno. |
| Datos clínicos | Encuentro original intacto; auditoría sin texto de búsqueda. |
| Supabase | Ninguna llamada del flujo. |

Se aprobaron cuatro grupos de navegador contra Next en producción, con 36 solicitudes API desde las páginas. Se inspeccionó la captura de búsqueda. La regresión FE-17 aprobó sus cuatro grupos completos. La auditoría del ensayo confirmó 39 búsquedas sin términos clínicos en detalles. 136 pruebas Java aprobadas, sin fallos/errores/omitidas; incluyen contratos HTTP, normalización/rangos en PostgreSQL, límites de acceso y mediciones sintéticas secuenciales/concurrentes.

## Comandos y artefactos

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Desde `codigo/salud-u`:

```bash
npm run build
npm run typecheck
npx eslint next.config.ts src/components/medical-patient-record.tsx 'src/app/medico/pacientes/[patientId]/page.tsx' scripts/test-fe18.mjs scripts/test-fe17.mjs
npm run start
```

Con Next escuchando en 3000, en otra terminal:

```bash
FE18_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs FE18_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe18.mjs
git diff --check
```

La regresión se ejecutó antes de compilar, en el servidor temporal de desarrollo:

```bash
FE17_ORIGIN=http://localhost:3001 FE17_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs FE17_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome FE17_ARTIFACTS=/tmp/salud-u-fe18-regresion-fe17 node scripts/test-fe17.mjs
```

Se usaron semillas locales Administración, Revisión, Estudiante y Especialista FE09. Se crean cuentas por área y pacientes de ensayo; las fechas específicas se establecen únicamente mientras la ficha está DRAFT. Los datos del benchmark grande viven en PostgreSQL aislado de Testcontainers. No se cambian datos reales.

Build, typecheck, ESLint focalizado y git diff --check aprobados. OpenAPI actualizado para búsqueda y servido por Spring. Artefactos: `/tmp/salud-u-fe18-evidence/resultado.json` y `busqueda.png`; regresión `/tmp/salud-u-fe18-regresion-fe17`. Logs `/tmp/salud-u-fe18-browser.log`, `-maven.log`, `-docker.log`, `-build.log`, `-typecheck.log`, `-lint.log` y `-regresion-fe17.log`. El log Maven contiene FE18_BENCHMARK y FE18_PEAK_BENCHMARK; los tokens en URLs se ocultan.

FE-18 queda cerrada localmente para el perfil sintético indicado. El dimensionamiento institucional y la carga mixta con reportes mensuales continúan en FE-CORTE.
