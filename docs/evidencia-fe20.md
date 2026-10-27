# FE-20 · Exportar una ficha individual a Word

Fecha: 2026-10-26. Trazabilidad: BE-20, RF-21, UC-20; adendas de FE-19. Entorno local con datos sintéticos, Next en producción, Spring y PostgreSQL reales. La aceptación integral permanece en FE-CORTE.

## Resultado local

147 pruebas Java aprobadas (0 fallos, errores u omitidas); cuatro grupos Chromium aprobados contra Next en producción y Spring; regresión FE-19 completa (cinco grupos) aprobada. Build, typecheck, ESLint focalizado, OpenAPI y git diff --check aprobados. Siete DOCX descargados se abren con LibreOffice y se convierten a PDF sin reparación. Se inspeccionó visualmente la página institucional y se verifica el contenido por XML/POI.

## Contrato e integración

Se conserva `GET /api/medical/encounters/{id}/export.docx?purpose=...` y se incorpora al OpenAPI. El rewrite es exacto: no captura otros endpoints pendientes de migración. No se agrega Route Handler Next ni lógica clínica en el frontend.

| Situación | Respuesta |
|---|---|
| Ficha cerrada autorizada | 200, MIME DOCX, Content-Disposition attachment con UUID de encuentro, Content-Length, Cache-Control no-store/private y nosniff. |
| Finalidad explícita inválida | 400/error texto; se recorta y admite 1–500 caracteres. |
| Finalidad omitida | Consulta clínica autorizada, por compatibilidad del endpoint. La pantalla la presenta editable y obligatoria. |
| Sin sesión | 401/error texto. |
| Rol no clínico | 403/error texto. |
| Ficha inexistente, abierta o fuera del ámbito | Mismo 404/error texto, sin contenido clínico. |
| Fallo de generación o auditoría | 500/error texto recuperable; no se publica un archivo parcial. |

El botón de la ficha longitudinal ahora descarga el archivo generado por Spring. `clinical-word-export.ts` deja de generar DOCX en el navegador: solo solicita el binario, valida MIME/inicio y cierre del ZIP y lo entrega a la descarga. `apiFile` usa cookies de mismo origen, no-store y los dos contratos de error del cliente común. La autorización se recalcula en cada GET.

## Contenido y procedencia

V61 completa `obtener_ficha_exportable`: usa el ámbito de FE-17 y el listado autorizado de adendas de FE-19. Devuelve exclusivamente el encuentro cerrado seleccionado, con paciente, profesional, ficha y plantilla históricas, antecedentes vinculados, diagnósticos, mediciones y metadatos de sus documentos disponibles. No usa el antecedente global posterior ni incorpora otras atenciones del paciente. Se revoca la ejecución PUBLIC de la función.

El Word contiene los dos emblemas institucionales, encabezado UAGRM, pie de confidencialidad/número de página y secciones legibles. Las fechas de atención, cierre y adendas usan Bolivia; la fecha de nacimiento se interpreta como fecha civil. Los campos opcionales vacíos se expresan sin inventar datos. Incluye todo el JSON clínico de la versión guardada, con etiquetas en español; conserva los antecedentes específicos del área además de los generales vinculados. Los documentos privados se identifican por metadatos, sin incrustar URLs ni tokens de descarga.

Las adendas se muestran después del registro original, por número, cada una con motivo, contenido, nombre/identificador del autor y fecha. No sustituyen motivo, evaluación o diagnóstico originales. Una adenda todavía sin guardar no se exporta: la pantalla lo explica y mantiene ese borrador.

Después de generar por completo el archivo se registra `FICHA_WORD_EXPORTADA`: actor de la transacción, encuentro, finalidad, DOCX, versión y cantidad de adendas. Si una ficha histórica no tiene versión, se registra NO_REGISTRADA. No se copian diagnóstico, antecedentes o texto de adendas en la auditoría. Una repetición es otra exportación auditada; nunca crea una adenda ni modifica la clínica. El fallo de auditoría impide publicar el documento.

## Recuperación y accesibilidad

El control tiene etiqueta de finalidad, estado ocupado, botón protegido contra doble envío, mensajes de error dentro del diálogo y foco en el error. No anuncia archivo preparado ante una respuesta errónea o incompleta. El éxito indica que debe revisarse la descarga del navegador, sin afirmar que se guardó en disco.

Red, permiso, sesión, validación y fallo servidor conservan finalidad y borrador de adenda. En 401 se ofrece iniciar sesión en otra pestaña y volver a descargar. No hay reenvío automático de la exportación. Al desmontar el control se cancela la petición para evitar una descarga tardía desde una ficha cerrada. Los avisos de descarte de adendas de FE-19 permanecen vigentes.

## Pruebas y comandos

`scripts/test-fe20.mjs` ejecuta Chromium con las semillas y encuentros sintéticos generados por `test-fe19.mjs`. Comprueba el contenido DOCX, no los bytes ZIP ni fechas de generación. Inspecciona el ZIP/XML, emblemas, diagnóstico, ficha, plantilla, antecedentes, orden y autor de adendas. Prueba errores de red, sesión y permiso, respuesta HTML/ZIP incompleto, reautenticación, vacío, lectura de origen remitido, límites de rol/área y conservación de la clínica original.

La suite Java incluye contratos HTTP, reapertura del DOCX con POI, secciones opcionales, fechas, antecedentes del área junto a antecedentes generales, fallo de auditoría sin archivo y persistencia/ámbito PostgreSQL. El ensayo de navegador registra tráfico para descartar llamadas Supabase y compara una huella de encuentros/fichas/adendas antes/después de exportar. LibreOffice abre los documentos descargados y los convierte a PDF para inspección visual.

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Desde `codigo/salud-u`:

```bash
npm run build
npm run typecheck
npm exec eslint -- src/components/clinical-word-download.tsx src/components/medical-patient-record.tsx src/lib/clinical-word-export.ts src/lib/api/client.ts next.config.ts
FE19_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE19_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe19.mjs
FE20_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE20_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe20.mjs
libreoffice -env:UserInstallation=file:///tmp/salud-u-fe20-lo-profile --headless \
  --convert-to pdf --outdir /tmp/salud-u-fe20-evidence/libreoffice \
  /tmp/salud-u-fe20-evidence/*.docx
git diff --check
```

Las rutas Playwright/Chromium son las del entorno local; se pueden sustituir con las variables indicadas. No se cambia información real.

Artefactos: `/tmp/salud-u-fe20-evidence/resultado.json`, archivos DOCX, `exportacion-word.png` y `libreoffice/`. Logs: `/tmp/salud-u-fe20-browser.log`, `-maven.log`, `-docker.log`, `-build.log`, `-typecheck.log`, `-lint.log`, `-regresion-fe19.log` y `-libreoffice.log`.

## Evidencia del ensayo final

Encuentro de especialidad: `8eaae5a9-9764-460b-861e-462d835e7a2e`. Origen remitido: `a122c3f0-bd28-49c0-b4be-bc0e51f1540c`. Huella lógica de encuentros/fichas/adendas antes y después: `b410a3dd6019c3fe50d95439f4acc380` (sin cambios).

El informe registra 18 auditorías de exportación acumuladas de los ensayos para estos encuentros, con al menos tres actores clínicos comprobados y finalidades verificadas. Cada GET autorizado cuenta como exportación independiente. Los siete archivos finales se conservan junto al informe y sus PDF de inspección.
