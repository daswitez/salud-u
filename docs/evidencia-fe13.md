# FE-13 · Emitir derivación con contexto y elementos compartidos

Validación local: 2026-10-25. Trazabilidad: UC-13, BE-13, RF-15/RF-16 y RN-11/RN-17. Rama frontend: backend. Se utilizaron cuentas, pacientes, citas, especialidades y archivos sintéticos.

## Flujo de emisión

El médico de revisión marca “Derivación a especialidad” en la ficha y completa especialidad activa, motivo, resumen y prioridad. El formulario muestra qué diagnóstico y documentos disponibles se compartirán y explica que la emisión sucede junto con el cierre.

Se conservó la semántica de rpc_finalize_initial_encounter: se vinculan automáticamente los diagnósticos y todos los documentos AVAILABLE de la atención de origen. La interfaz no ofrece selección individual ni incluye elementos de otras atenciones, aunque pertenezcan al mismo paciente. No se añadió un endpoint independiente de emisión: el POST de finalización existente sigue siendo la escritura autoritativa.

Las prioridades mantienen los códigos ROUTINE/PRIORITY/URGENT, presentados como Rutinaria/Prioritaria/Urgente. Se envían referralSpecialtyId, referralReason, referralComment y referralPriority junto con la ficha clínica en español. Desmarcar la derivación omite especialidad/motivo/resumen aunque el usuario los hubiera escrito.

“Cerrar y emitir derivación” queda deshabilitado durante la operación. La pantalla comprueba el cierre persistido y que la derivación recuperada coincida con referralId devuelto antes de mostrar éxito. Si la respuesta se pierde, “Comprobar estado de la atención” recupera cierre y derivación sin repetir el POST.

La consulta cerrada muestra prioridad, estado, motivo, resumen y elementos compartidos. “Consultar derivación” abre el detalle persistido; los enlaces de origen permiten consultar la ficha y sus documentos.

## Lectura e integración

Las páginas /medico/derivaciones y /medico/derivaciones/{id} dejan de redirigir a la agenda para el médico de revisión. Ahora muestran las derivaciones propias, incluido el estado vacío, y su detalle con contexto de revisión. El flujo del especialista permanece en su incremento correspondiente.

Se añadieron rewrites exactos:

- GET /api/medical/referrals: lista del emisor activo, orden createdAt DESC/id DESC, con identidad del paciente, especialidad, prioridad/estado, motivo/resumen, origen y cantidades compartidas.
- GET /api/medical/referrals/{id}: detalle propio con contexto de origen cerrado, versión, diagnósticos y documentos compartidos. Mantiene listas vacías y null.

Estos contratos nuevos están documentados en OpenAPI. La ruta de contexto del encuentro conserva sus campos y añade referral, que es null cuando no se emitió una derivación. Ninguna de estas lecturas consume la historia longitudinal ni Supabase.

Las consultas exigen REVIEW_DOCTOR, personal activo, autoría y encuentro inicial propio cerrado. Otro médico recibe 404 sin contenido clínico; Estudiante, Administración y Especialista no acceden a este contrato de emisor. La programación administrativa y la atención especializada mantienen sus contratos e historias propios.

## Backend y transacción

Flyway V50 conserva la firma y el JSON de finalización, y completa dos efectos de la referencia que faltaban: evento inicial PENDING_ASSIGNMENT con estado anterior null y auditoría DERIVACION_EMITIDA. Se registran en la misma transacción que ficha, diagnósticos, mediciones, cita y enlaces compartidos.

No se inventaron eventos ni auditorías para emisiones anteriores. Los nuevos registros incluyen su evidencia desde V50. Las auditorías de lectura registran DERIVACIONES_EMITIDAS_CONSULTADAS y DERIVACION_CONSULTADA sin texto clínico.

Las funciones de lectura comprueban origen, emisor y paciente; tanto el detalle como los conteos excluyen documentos no disponibles y enlaces ajenos al paciente. Un índice por emisor/fecha apoya la consulta propia.

Las pruebas PostgreSQL provocan un fallo al insertar la derivación después de haber ejecutado el cierre interno: ficha, diagnóstico, cita y evento ATTENDED se revierten y no queda derivación. También compiten dos transacciones reales, con un 200 y un 409 y una sola emisión.

## Recuperación de errores y accesibilidad

El catálogo puede fallar o quedar vacío sin borrar lo escrito. “Actualizar especialidades” consulta únicamente el catálogo; no recarga ni reinicia el formulario clínico o la derivación. La prioridad y los textos permanecen durante el reintento.

Los campos tienen etiquetas, límites del contrato y validación nativa para guiar al usuario; Spring decide la validez de los datos, permisos y especialidad activa. Los mensajes reciben foco. El reintento de sesión conserva motivo/resumen/prioridad; una respuesta de carga perdida no provoca otra emisión automática.

Las páginas de lista/detalle presentan carga, error con reintento, lista vacía y valores ausentes. El contenido emitido es de consulta. El borrador permanece en memoria mientras el formulario está abierto, según FE-10/12.

## Evidencia de navegador

[test-fe13.mjs](../scripts/test-fe13.mjs) terminó PASS en Chromium con sesiones Spring reales: seis grupos de escenarios y 94 solicitudes API desde las páginas.

| Escenario | Resultado |
|---|---|
| Cuenta de revisión sin emisiones | Lista real [] y mensaje de estado vacío. |
| Catálogo con fallo de red | Error recuperable; campos clínicos y de derivación intactos. |
| Catálogo vacío | Respuesta vacía controlada para comprobar la UI; reintento contra Spring recupera las especialidades. |
| Especialidad/motivo/resumen obligatorios | La validación nativa impide el envío incompleto; espacios se rechazan con 400 en Spring. |
| Prioridad manipulada | 400 sin persistencia parcial. |
| Especialidad desactivada después de cargar la pantalla | 409; ficha sigue DRAFT sin derivación. La especialidad sintética se reactiva al terminar el escenario. |
| Red antes del POST y sesión caducada | Conserva motivo, resumen, prioridad y clínica; consulta/reautenticación sin reiniciar el formulario. |
| Respuesta perdida después del commit | Consulta recupera el mismo referralId y la ficha CLOSED/ATTENDED sin reenviar el POST. |
| Tres prioridades | Códigos y etiquetas correctos tras emitir y recargar. |
| Elementos compartidos | Solo diagnóstico y documento del origen; documentos de otra atención del mismo paciente y de otro paciente excluidos. |
| Arrays vacíos y null | “Sin diagnósticos/documentos compartidos”, ausencia de seguimiento/indicaciones y opcionales null. |
| Consulta y navegación | Detalle, contexto, ficha/documentos de origen y listado recargables con datos persistidos. |
| Cancelar la intención de derivar | referralId:null, aunque antes hubiera textos seleccionados, y ninguna derivación creada. |
| Conflicto tardío de cita | 409 y rollback clínico/de emisión, conservando los campos. |
| Dos pestañas con distinto contenido | Un 200 y un 409; una derivación y recuperación explícita del contenido ganador. |
| Emisor ajeno y roles sin permiso | Rechazo sin motivo, resumen ni contexto clínico expuestos. |
| Repetición sobre ficha cerrada | 409 y checksum del detalle original intacto. |

La indisponibilidad PROCESSING se verifica adicionalmente en PostgreSQL: no se vincula el documento pendiente al emitir. El tráfico del navegador no contiene llamadas Supabase ni a la historia longitudinal heredada. Se inspeccionó la captura del detalle.

La regresión FE-12 también terminó PASS con sus seis grupos, incluidos doble envío, carrera entre pestañas, confirmación inconsistente y recuperación de sesión.

## Comprobación de datos

Paciente sintético principal: ec089c5a-7d11-4ed7-812d-43edbd5ed637.

| Derivación | Prioridad | Origen/cita | Versión | Diagnósticos/documentos | Evento/auditoría de emisión |
|---|---|---|---:|---|---|
| 19890208-9827-4f39-a378-ff6a36ad1edd | URGENT | CLOSED/ATTENDED | 1 | 1/1 | 1/1 |
| 9c4ef7ea-dc8e-49af-b05b-490bc3b86913 | PRIORITY | CLOSED/ATTENDED | 2 | 0/0 | 1/1 |
| e750a05c-1246-4ee6-8c10-ad8e025bea07 | ROUTINE | CLOSED/ATTENDED | 3 | 0/0 | 1/1 |
| 17c8baa9-08eb-45b8-9419-7f553bbe577b | URGENT | CLOSED/ATTENDED | 5 | 0/0 | 1/1 |

La versión 4 se cerró sin derivación, conforme a la casilla desmarcada. El rechazo tardío no consumió una versión ni creó derivación. La cita del otro origen de prueba se conserva como DRAFT/NO_SHOW, con su documento fuera de los elementos compartidos.

La consulta directa confirmó cero enlaces a documentos de otro paciente/origen o no disponibles, y cero diferencias entre el emisor y el actor de evento/auditoría. El checksum lógico del primer detalle permaneció dff8d0910711006b123d66f6cc2817dec8b2649ba0d80c42ec58d60f570bb03d después de reintentos y accesos rechazados.

## Verificación y comandos

118 pruebas Java aprobadas, sin fallos, errores u omitidas. Incluyen contratos HTTP de lectura y permisos, SQL de compartición, auditoría, carrera real y fallo controlado después del cierre interno. Typecheck, ESLint focalizado, build y git diff --check aprobados. Se verificó el OpenAPI publicado por Spring.

Desde codigo/salud-u-backend:

~~~bash
mvn test -q
docker compose up --build -d
~~~

Desde codigo/salud-u, con Next/Spring/PostgreSQL iniciados:

~~~bash
npx next typegen
npm run typecheck
npx eslint next.config.ts src/lib/referrals.ts src/components/emitted-referrals.tsx src/components/review-encounter-form.tsx src/app/medico/derivaciones/page.tsx 'src/app/medico/derivaciones/[referralId]/page.tsx' scripts/test-fe13.mjs
npm run build
FE13_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs FE13_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe13.mjs
FE12_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs FE12_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe12.mjs
git diff --check
~~~

La prueba requiere las semillas locales de Administración, Revisión, médico ajeno, Estudiante y Especialista FE-09. Crea una cuenta de revisión vacía, dos pacientes, una especialidad propia y sus citas/archivos. Conserva los cierres y libera las otras citas sintéticas mediante ausencia. Las rutas de Playwright/Chromium son configurables.

Artefactos: /tmp/salud-u-fe13-evidence/resultado.json y derivacion.png. Logs: /tmp/salud-u-fe13-browser.log, /tmp/salud-u-fe13-maven.log, /tmp/salud-u-fe13-docker.log, /tmp/salud-u-fe13-build.log, /tmp/salud-u-fe13-regresion-fe12.log y /tmp/salud-u-fe13-db.txt. Los tokens de URLs se ocultan en el tráfico registrado.

FE-13 queda cerrada localmente. La programación y la atención especializada siguen en FE-14/15/16; la aceptación integral continúa en FE-CORTE.
