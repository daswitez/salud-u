# FE-11 · Documentos privados de la atención

Validación local: 2026-10-25. Trazabilidad: UC-11, BE-11 y RF-17. Rama frontend: backend. Se utilizaron exclusivamente cuentas, pacientes, archivos y citas sintéticos.

## Integración y pantalla

La ficha de revisión incorpora el panel de documentos, que permite adjuntar, clasificar, consultar, previsualizar y descargar sin perder los campos clínicos ya escritos. La química sanguínea disponible habilita la opción “Adjunta”; Spring vuelve a comprobarla al cerrar.

Desde la apertura/recuperación de FE-09 se accede también a /medico/citas/{appointmentId}/documentos, tanto en Revisión como en Especialidad. Esta pantalla consume la agenda y documentos autorizados; no necesita consultar la historia longitudinal que continúa en FE-17. La atención cerrada conserva la lista y sus acciones de lectura, sin formulario de carga.

El panel representa el estado vacío, carga, errores, clasificación, nombre, tamaño, fecha de estudio y descripción opcionales. Mantiene el orden que devuelve Spring. Los controles tienen etiquetas explícitas y se deshabilitan durante cada operación; los mensajes reciben foco. La previsualización utiliza un diálogo nativo, permite cerrar con Escape y devuelve el foco al control que lo abrió.

Los tres rewrites son exactos:

- GET/POST /api/medical/documents.
- GET /api/medical/documents/{id}/download.
- GET /api/medical/documents/{id}/content.

Se retiraron los dos Route Handlers de documentos que llamaban a Supabase/RPC/Storage. Los flujos de esta historia no realizan llamadas Supabase. La migración de otras consultas longitudinales permanece en su historia correspondiente.

Next usa experimental.proxyClientMaxBodySize=16mb para no truncar los multipart válidos que superan su búfer predeterminado de 10 MB. Spring mantiene archivo máximo de 15 MiB y solicitud máxima de 16 MiB, con error 413 en el contrato de texto cuando se supera el límite.

## Contrato y persistencia

El POST conserva multipart con file, patientId, encounterId, documentType, description y studyDate, y respuesta 201/ok/data.id. Se admiten las siete clasificaciones heredadas y PDF/JPG/PNG/WEBP. Las opciones del formulario son presentación; el servidor comprueba rol, relación, encuentro borrador, tipo, firma MIME, tamaño real y checksum SHA-256.

Flyway V49 añade GET /api/medical/documents?encounterId={id}. Devuelve ok/data con los documentos AVAILABLE del encuentro propio, ordenados por cargado_en DESC e id DESC. Cada elemento contiene id, documentType, filename, mimeType, sizeBytes, studyDate, description y uploadedAt. Los null se conservan; una lista autorizada sin documentos devuelve []. Un médico ajeno recibe 404, y Estudiante/Administración 403.

V49 también bloquea la fila del encuentro al preparar una carga. La carga y el cierre se serializan: una carga que espera detrás del cierre se rechaza sin publicar metadatos o archivo. Las pruebas PostgreSQL verifican esa espera y el rechazo posterior.

La descarga conserva data.url relativa, de mismo origen, ligada al actor/documento, de un uso y válida 60 segundos. Cada acción solicita un enlace nuevo. El endpoint de contenido revalida el acceso clínico actual, consume el token y devuelve MIME/nombre original con no-store private, nosniff y no-referrer. Se registran las consultas de lista y descargas sin texto clínico en auditoría. Un intento ajeno no consume el enlace del propietario.

El frontend recupera los bytes con la cookie Spring y crea un Blob temporal en memoria para mostrar PDF o imagen y descargar con el nombre original. Revoca la URL al cerrar/desmontar la previsualización y cancela transferencias pendientes al salir. Los archivos privados no pasan por el optimizador de imágenes de Next ni se guardan en almacenamiento del navegador.

## Recuperación ante errores

Archivo vacío, MIME no permitido, contenido incompatible, exceso de tamaño, permiso, sesión y red producen mensajes sin anunciar éxito. El archivo seleccionado, tipo, descripción y fecha se conservan mientras el formulario permanece abierto. Solo se limpian después del POST 201.

Si la respuesta de una carga ya confirmada se pierde, el mensaje pide actualizar la lista antes de reintentar. “Actualizar documentos” permite reconocer el archivo publicado sin reenviar el POST. La interfaz no repite ciegamente cargas.

Se corrigió la renovación CSRF para rutas heredadas: Spring añade X-Error-Code sin alterar su error de texto. El cliente renueva el token una sola vez exclusivamente ante CSRF_INVALID, cuyo rechazo sucede antes de ejecutar la operación. FORBIDDEN no dispara ese reintento. Si la sesión caducó, aparece el acceso al login en otra pestaña, conservando los campos y el archivo para volver a intentar tras autenticarse.

## Evidencia de aceptación

[test-fe11.mjs](../scripts/test-fe11.mjs) terminó PASS en Chromium con sesiones Spring reales: seis grupos de escenarios y 67 solicitudes API desde las páginas. El tráfico almacenado oculta tokens y no contiene cookies ni contraseñas.

| Escenario | Resultado |
|---|---|
| Vacío, otro MIME y firma PDF falsa | 400; lista sin publicación parcial y campos conservados. |
| Fallo de red antes de la carga | Conserva archivo y metadatos; reintento mediante teclado. |
| Formatos y clasificación | PDF/JPG/PNG/WEBP y las siete clasificaciones persistidos. |
| Tamaño límite a través de Next | Exactamente 15 MiB: 201; 15 MiB + 1 byte: 413, sin nueva fila. |
| Vista previa y descarga | Imagen decodificada desde Blob, PDF en diálogo y descarga con bytes idénticos. |
| Recarga, null y orden | IDs/metadatos persistidos, opcionales null y orden descendente comprobados. |
| Límites de acceso | Médico ajeno 404 al listar/firmar y 403 al cargar; Estudiante/Administración sin acceso; pantalla ajena no revela nombres de archivo. |
| Token ligado al actor y de un uso | Intento ajeno rechazado sin consumirlo; propietario accede una vez y la repetición recibe 404. |
| Sesión caducada | Tras renovar CSRF se muestra 401; login separado y reintento conservando archivo y descripción. |
| Respuesta de carga perdida | La lista recupera una única publicación sin repetir la carga. |
| Especialista asignado | Carga y recarga de documento propio; Revisión no puede listar esa atención. |
| Documento cargado desde la ficha | Conserva el motivo clínico ya escrito y actualiza la lista. |
| Atención cerrada | Química AVAILABLE permite ATTACHED; lectura posterior disponible, carga escondida y POST forzado rechazado sin cambios. |
| Caducidad real | Transcurridos más de 60 segundos el enlace recibe 404; un enlace nuevo permite descargar. |

La regresión de navegador de FE-10 también terminó PASS con sus cinco grupos de escenarios. Se inspeccionó la captura de la ficha cerrada y su lista de documentos.

Comprobación directa de PostgreSQL y almacenamiento privado para el paciente sintético b9a6836f-bb2d-4c17-98ae-a4de58f7e8b8:

- 11 documentos AVAILABLE en las dos atenciones, todos con tamaño y SHA-256 iguales al archivo físico.
- Ocho cargas comparadas además con los bytes originales que generó el navegador.
- Una auditoría DOCUMENTO_CLINICO_CARGADO por documento, con actor igual al registrador.
- Siete eventos DOCUMENTO_CLINICO_DESCARGADO durante los accesos comprobados.
- Las solicitudes rechazadas no añadieron documentos disponibles.

Los archivos/tokens se comparan por contenido, permisos y vigencia; no se exige igualdad de URLs variables. El 201/data.id y data.url conservan el contrato T-01. GET de lista y contenido binario se documentan como extensiones backend en OpenAPI.

## Verificación técnica y comandos

114 pruebas Java aprobadas, sin fallos, errores ni omitidas. Incluyen contratos HTTP, rol, null, errores, firma/tamaño/checksum, PostgreSQL/transacciones y serialización carga/cierre. Los tests distinguen rechazo CSRF de rechazo de permisos.

Typecheck, ESLint focalizado, build de producción y git diff --check aprobaron. Se verificó el OpenAPI servido por Spring con los cuatro métodos de documentos.

Desde codigo/salud-u-backend:

~~~bash
mvn test -q
docker compose up --build -d
~~~

Desde codigo/salud-u, con Next y Spring iniciados:

~~~bash
npx next typegen
npm run typecheck
npx eslint next.config.ts src/lib/api/client.ts src/components/medical-document-uploader.tsx src/components/medical-documents.tsx src/components/encounter-documents-page.tsx src/components/review-encounter-form.tsx src/components/medical-encounter-entry.tsx 'src/app/medico/citas/[appointmentId]/documentos/page.tsx' scripts/test-fe11.mjs
npm run build
FE11_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs FE11_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe11.mjs
FE10_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs FE10_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe10.mjs
git diff --check
~~~

La prueba usa Node, Playwright y Chromium locales, con rutas configurables, y requiere las semillas de Administración, Revisión, Estudiante, médico ajeno y Especialista FE-09 con especialidad FE09_TEST activa. Crea su paciente/citas y archivos. Conserva la revisión cerrada y marca las otras citas sintéticas como ausencia para liberar cupos.

Artefactos: /tmp/salud-u-fe11-evidence/resultado.json, documentos.png y privado.png. Logs: /tmp/salud-u-fe11-browser.log, maven.log, docker.log, build.log y regresion-fe10.log con el prefijo salud-u-fe11-.

FE-11 queda cerrada localmente. La aceptación integral de la integración permanece en FE-CORTE.
