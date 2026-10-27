# FE-19 · Correcciones auditables de atenciones cerradas

Validación local: 2026-10-25. UC-19, BE-19, RF-14; RN-09/RN-26/RN-27. Rama frontend `backend`. Se utilizaron exclusivamente cuentas, pacientes, citas y documentos sintéticos.

## Caracterización y contrato

Se verificaron la función SQL de V29 y la ruta Spring existente `POST /api/medical/encounters/{id}/amendments`. Se conserva el éxito 200 y `ok/data(id,amendmentNo,createdAt,createdBy)`; createdBy identifica al actor de sesión y createdAt se formaliza como fecha ISO. Motivo y contenido se guardan separados del encuentro original.

La escritura mantiene el alcance del contrato SQL: solo el autor de la atención cerrada, con personal activo y autorización clínica vigente, puede agregar. Leer una ficha de otro médico del área o un origen remitido no concede permiso para corregirla.

| Operación | Contrato |
|---|---|
| GET /api/medical/encounters/{id}/amendments | Nuevo contrato explícito `ok/data(canAdd,items[])`. Autoriza lectura según FE-17; lista vacía [], orden por número/id. |
| POST de la misma ruta | reason y content obligatorios; límites 1000/8000 tras recorte. Conserva 200 con los cuatro campos de creación. |
| clientRequestId opcional | Extensión UUID para reintentar el mismo envío sin duplicarlo. El cliente nuevo lo envía siempre. |

La lectura incluye id, amendmentNo, reason, content, createdAt, createdBy, createdByName y clientRequestId (null para registros sin clave). canAdd procede del servidor. Ambos métodos requieren rol clínico; 401 sin sesión, 403 por rol/relación/área/autor o encuentro no cerrado. Los datos inválidos devuelven 400 y la reutilización de una clave con otro contenido 409, con error textual.

La sobrecarga SQL anterior de tres argumentos sigue disponible. Sin clientRequestId se conserva la semántica de una nueva adenda por solicitud, sin deduplicación de contenido. Se prueba esa compatibilidad en PostgreSQL.

## Persistencia, inmutabilidad y auditoría

V60 añade la clave de envío y su unicidad por encuentro/actor. El encuentro se bloquea para serializar la numeración. Mismo envío con mismo contenido devuelve el mismo id/número/fecha/actor; no agrega otro registro ni otra auditoría. Un envío ya guardado con contenido diferente se rechaza.

La tabla de adendas queda append-only: el runtime no tiene permisos directos de tabla y un trigger rechaza UPDATE/DELETE, incluso al probarlos con la cuenta migradora. No existe operación HTTP ni control de interfaz para editar o borrar adendas. No se reescriben motivo, evaluación, diagnóstico, mediciones, documentos, plantilla, versión ni cita de la atención original.

ADENDA_ENCUENTRO_AGREGADA se registra en la misma transacción que la adenda, con identificador del encuentro y número, sin motivo/contenido clínico en detalles. Las lecturas generan ADENDAS_ENCUENTRO_CONSULTADAS. El actor se establece con SET LOCAL y la lectura devuelve no-store, private.

Se corrige también la lectura SQL anterior, que no comprobaba la relación clínica para revisión. La nueva consulta y la función heredada reutilizan el ámbito de FE-17. Los colegas autorizados del área y el especialista remitido pueden leer las adendas permitidas, con canAdd:false.

Las adendas forman parte del contenido buscable de FE-18, dentro del mismo ámbito autorizado. La ficha y su versión siguen intactas; la búsqueda identifica la atención y el detalle presenta su corrección por separado.

## Interfaz y recuperación

“Correcciones auditables” aparece en la consulta de la ficha cerrada de revisión, la de especialidad y el detalle de la historia longitudinal. Presenta número, autor, fecha, motivo y contenido, separados de los datos originales. La creación se ofrece únicamente cuando el servidor confirma canAdd.

Los campos tienen etiquetas y validación nativa para obligatorios/límites; Spring/PostgreSQL deciden la validez y autorización. Hay carga, lista vacía, error con foco y consulta recuperable. Ante red, validación, sesión o permiso se conservan los campos; la reautenticación puede hacerse en otra pestaña.

“Comprobar adendas guardadas” recupera el estado por la clave del envío sin repetir la escritura. Si el médico modificó el borrador después de perder la respuesta, el contenido persistido se muestra y sus cambios se conservan para una nueva adenda, que requiere pulsar Guardar. El guardado solo se anuncia después de volver a leer y comprobar identidad, número, actor, fecha y contenido persistidos.

Se impiden envíos simultáneos del mismo formulario. Dos pestañas con correcciones distintas pueden agregar ambas, con numeración única. Si el médico sale o cierra el detalle con una adenda sin guardar, se advierte antes de descartar, incluido Escape y el botón Cerrar ficha. La vista previa anidada de archivos conserva su propio cierre.

Los borradores permanecen en memoria, con advertencia al salir; no se añade un API de borrador clínico. La integración de las adendas en el archivo Word se debe verificar en FE-20, donde corresponde migrar esa exportación.

## Evidencia de navegador

[test-fe19.mjs](../scripts/test-fe19.mjs) ejecuta Chromium con sesiones Spring y PostgreSQL reales, también contra Next en producción. Cinco grupos aprobados, con 80 solicitudes API desde las páginas:

| Escenario | Resultado |
|---|---|
| Lista vacía, fallo de carga y reintento | Carga asentada, error recuperable y formulario según capacidad del servidor. |
| Obligatorios, espacios y límite inválido | Validación nativa/400, conservando campos y sin registro parcial. |
| Red antes del POST y sesión caducada | Conserva motivo/contenido; recuperación sin escribir por accidente. |
| Respuesta perdida tras commit | Recupera la misma adenda; repetir el envío devuelve el mismo resultado. |
| Mismo envío con contenido distinto | 409; consultar no descarta los cambios nuevos del médico. |
| Guardar el borrador modificado | Crea una nueva adenda solo tras acción explícita. |
| Dos pestañas con solicitudes distintas | Ambas 200, con IDs/números únicos y orden 1–5. |
| Cerrar modal con borrador | Cancelar la salida mantiene datos; aceptar el descarte no escribe nada. |
| Revisión y especialista autores | Ambos pueden agregar a sus propios encuentros cerrados. |
| Colega del área u origen remitido | Lectura autorizada sin formulario de escritura; POST forzado 403. |
| Otra área, sin relación, administración, estudiante, anónimo y borrador | Rechazados sin exposición ni cambios parciales. |
| Inmutabilidad | Hash lógico de la ficha, cita, versiones vinculadas, diagnóstico, mediciones y documentos permanece igual; también el del origen de revisión. |
| Búsqueda | Encuentra la atención por contenido de una adenda autorizada. |
| Tráfico | Sin Supabase. |

La regresión FE-18 aprobó sus cuatro grupos, incluidos búsqueda normalizada/fechas, recuperación, permisos y ráfaga concurrente de consultas.

## Pruebas PostgreSQL y verificación

140 pruebas Java aprobadas, sin fallos/errores/omitidas. Cuatro contratos HTTP nuevos cubren lista/capacidad, creación, errores/reintento y roles. PostgreSQL comprueba dos transacciones con la misma clave (una sola adenda), rechazo de contenido diferente y de escritor ajeno, lectura del colega, reversión completa ante fallo, bloqueo de UPDATE/DELETE y compatibilidad de la firma SQL anterior.

La comprobación lógica compara el registro original completo en PostgreSQL y hashes del grafo expuesto por la API antes/después de las operaciones.

Ensayo final:

| Encuentro | Adendas | Números distintos | Auditorías de creación |
|---|---:|---:|---:|
| 7276614f-7697-4099-831a-9a4e4ea3c67e | 5 | 5 | 5 |
| c6834529-2af4-4266-bc87-a88ccb26a9b7 | 1 | 1 | 1 |

Hash original de especialidad: `9ff89387d0586cf8fd8ada95c661cff786d5d417710240908ee5031173d5b771`. Hash de revisión origen: `30d8f1c7299fd2d9870eb72f64666c503b917d8cda26ae1df89cbcebde5ad0f3`. Ambos permanecieron iguales tras las correcciones.
 Las consultas finales confirman un evento de auditoría de creación por adenda; no se cuenta una repetición como una creación nueva.

Build, typecheck, ESLint focalizado, git diff --check y OpenAPI aprobados. El OpenAPI servido por Spring contiene GET/POST y el esquema EncounterAmendment.

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Desde `codigo/salud-u`:

```bash
npm run build
npm run typecheck
npx eslint next.config.ts src/components/encounter-amendments.tsx src/components/medical-patient-record.tsx src/components/review-encounter-form.tsx src/components/specialty-encounter-form.tsx scripts/test-fe19.mjs
npm run start
```

Con Next en 3000, desde otra terminal:

```bash
FE19_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs FE19_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe19.mjs
git diff --check
```

La regresión se ejecutó en el servidor temporal de desarrollo antes de compilar la versión final:

```bash
FE18_ORIGIN=http://localhost:3001 FE18_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs FE18_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome FE18_ARTIFACTS=/tmp/salud-u-fe19-regresion-fe18 node scripts/test-fe18.mjs
```

El ensayo usa las semillas Administración, Revisión, Especialista FE09 y Estudiante. Crea pacientes y cuentas por área, prepara la clínica por HTTP y conserva las adendas sintéticas para inspección. SQL prepara la plantilla de prueba/horarios y consulta la evidencia. No se modifica información real.

Artefactos: `/tmp/salud-u-fe19-evidence/resultado.json`, `adendas.png`; regresión `/tmp/salud-u-fe19-regresion-fe18`. Logs `/tmp/salud-u-fe19-browser.log`, `-maven.log`, `-docker.log`, `-build.log`, `-typecheck.log`, `-lint.log` y `-regresion-fe18.log`. El resultado contiene UUID, hashes lógicos, conteos de auditoría y tráfico con tokens ocultos.

FE-19 queda cerrada localmente. La aceptación integral permanece en FE-CORTE.

Seguimiento 2026-10-26: la inclusión de adendas autorizadas en Word quedó comprobada en [FE-20](evidencia-fe20.md).
