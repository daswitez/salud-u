# FE-16 · Resolver o devolver una derivación

Validación local: 2026-10-25. UC-16, BE-16, RF-15; RN-11/RN-13/RN-25. Frontend en rama `backend`. Solo cuentas, pacientes, citas y documentos sintéticos locales.

## Contratos y semántica

Se verificó la función SQL `resolver_o_devolver_derivacion` de V26 y su ruta existente `PATCH /api/medical/referrals/{id}`. Se conserva el contrato de escritura: action RESOLVE/RETURN, reason y followUpText; éxito `200/ok/data` con exactamente referralId y status CLOSED/RETURNED.

Solo el especialista asignado, con personal activo y especialidad/afiliación vigentes, puede operar. Los estados admitidos son ASSIGNED e IN_PROGRESS. Resolver exige un encuentro SPECIALTY propio cerrado del mismo paciente. Devolver exige motivo no vacío. Motivo admite hasta 2000 caracteres; seguimiento opcional hasta 4000. Cadenas vacías se guardan null y tipos inválidos devuelven 400.

Se mantienen los rechazos caracterizados: 400 por datos inválidos, 409 al resolver sin atención cerrada, 403 por profesional ajeno/transición no permitida, incluida la repetición; 401 sin sesión. Una repetición no duplica eventos ni auditorías. La devolución no cancela automáticamente la cita ni reescribe la ficha: conserva la semántica SQL existente. La gestión de cita permanece en su caso de uso.

La lectura previa solo estaba disponible para el emisor de revisión. Se añadieron contratos explícitos separados para especialista:

| Ruta | Contrato |
|---|---|
| GET /api/medical/assigned-referrals | `ok/data[]` con todas las derivaciones asignadas propias, orden createdAt/id descendente. Sin registros: []. |
| GET /api/medical/assigned-referrals/{id} | `ok/data` con paciente, especialidad, motivo/resumen, emisor, cita/encuentro, estado y seguimiento persistidos. Ajena/inexistente: 404. |
| PATCH /api/medical/referrals/{id} | Escritura existente conservada; no hay endpoint nuevo de resolución. |

El detalle incluye followUpText, returnReason, resolvedAt/resolvedBy, returnedAt/returnedBy y events. Se conservan null y arrays vacíos. Los eventos incluyen estado anterior/nuevo, motivo, seguimiento, actor y fecha, ordenados por fecha/id ascendente. Los contratos del médico emisor continúan separados y sin cambios. OpenAPI documenta estas rutas y AssignedReferral.

## Pantalla

“Derivaciones recibidas” abre una bandeja propia del especialista, en lugar de redirigirlo a la agenda. Desde ella se consulta y gestiona cada derivación. La ficha especializada de FE-15 también enlaza “Gestionar derivación y seguimiento”. Se añadieron únicamente los rewrites exactos de las dos rutas de lectura; no se consulta Supabase ni la historia longitudinal serverless.

El formulario distingue resolución/devolución y muestra el motivo obligatorio cuando corresponde. Conserva acción, motivo y seguimiento ante validación, permiso, conflicto, caducidad o error de red. Permite reautenticarse en otra pestaña y advierte antes de salir con cambios.

Antes de anunciar éxito, vuelve a consultar el detalle y comprueba estado, motivo/seguimiento, fecha/actor y evento persistidos. Si se pierde la respuesta del PATCH, “Comprobar estado de la derivación” recupera el resultado sin volver a escribir. Si sigue activa, conserva los campos; si terminó, muestra el resultado persistido. Tras resolver/devolver, el formulario desaparece y queda la consulta con el seguimiento de estados.

Se representan carga, vacío, null y errores recuperables; los mensajes reciben foco. Etiquetas, selectores y botones nativos permiten completar el flujo con teclado.

## PostgreSQL y auditoría

V54 añade la consulta propia y completa las comprobaciones de afiliación vigente y pertenencia del encuentro cerrado. La función de resolución bloquea la derivación y registra estado, motivo, seguimiento, actor, fecha, evento y auditoría en una transacción. Los eventos de auditoría DERIVACION_RESUELTA/DERIVACION_DEVUELTA incluyen estados e identificador, sin motivo, seguimiento ni texto clínico.

Las lecturas generan DERIVACIONES_ASIGNADAS_CONSULTADAS o DERIVACION_ASIGNADA_CONSULTADA. El actor se fija con SET LOCAL mediante DatabaseActorContext; no queda retenido en el pool.

Las pruebas PostgreSQL provocan una excepción después de ejecutar la devolución: el estado vuelve a IN_PROGRESS y no queda auditoría parcial. Dos transacciones de devolución compiten y producen un 200 y un 403, con un evento y una auditoría finales. Se comprueban motivo/seguimiento/actor y origen clínico intacto, además del rechazo con especialidad inactiva.

## Evidencia de navegador

[test-fe16.mjs](../scripts/test-fe16.mjs) valida el recorrido con sesiones reales Spring/PostgreSQL y Chromium. Se aprobaron cinco grupos y 47 solicitudes API desde las páginas contra Next en producción; incluye:

| Escenario | Resultado |
|---|---|
| Especialista sin derivaciones | Lista real [] y estado vacío. |
| Bandeja con fallo de red | Mensaje y reintento; recupera listado propio y orden de referencia. |
| Detalle recién asignado | Motivo/resumen/emisor visibles; seguimiento, devolución y encuentro null. |
| Resolver sin atención cerrada | 409, conserva seguimiento. |
| Devolver sin motivo o solo espacios | Validación nativa o 400 de Spring; sin cambio de estado. |
| Tipo de seguimiento inválido | 400. |
| Red y sesión caducada | Error recuperable y motivo/seguimiento intactos. |
| Respuesta perdida tras devolución | Recupera RETURNED sin repetir PATCH; un evento final y lectura correcta tras recarga. |
| Resolución desde ficha cerrada | JSON exacto, estado CLOSED y seguimiento/actor/fecha persistidos. |
| Resolución y devolución simultáneas | Un 200 y un 403; un evento final. La pestaña perdedora conserva campos y recupera el resultado ganador. |
| Repetición | Rechazada sin duplicar evidencia. |
| Especialista ajeno y otros roles | Sin lectura clínica ni escritura; anónimo 401. |
| Integridad | Las tres revisiones de origen y la atención especializada cerrada conservan su contenido. |
| Tráfico | Sin Supabase ni consulta longitudinal heredada de paciente. |

Se inspeccionaron las capturas del resultado persistido. El detalle muestra la secuencia emisión → asignación → atención cuando corresponde → resolución/devolución, con sus actores y fechas.

La regresión FE-15 aprobó sus seis grupos completos, incluidos atención directa/derivada, plantilla histórica, respuesta perdida, concurrencia y permisos.

Consulta directa PostgreSQL del ensayo final (cada registro tiene un evento final y una auditoría):

| Derivación | Estado final | Eventos/auditorías |
|---|---|---|
| fa6f7361-31b7-46b8-9eb8-67f498083e6f | RETURNED | 1/1 |
| ba5b8e0c-b405-4d3b-8be3-6d70b4f7606b | CLOSED | 1/1 |
| 12f1337f-0117-4ced-aa3c-0124fc7abb55 | RETURNED | 1/1 |

## Verificación y comandos

130 pruebas Java aprobadas, cero fallos/errores/omitidas. Incluyen cuatro pruebas HTTP nuevas, validación, lectura propia, permisos y PostgreSQL transaccional/concurrente. Build, typecheck, ESLint focalizado y git diff --check aprobados. OpenAPI validado como YAML.

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Desde `codigo/salud-u`:

```bash
npm run build
npm run typecheck
npx eslint next.config.ts src/components/assigned-referrals.tsx src/components/specialty-encounter-form.tsx src/app/medico/derivaciones/page.tsx 'src/app/medico/derivaciones/[referralId]/page.tsx' scripts/test-fe16.mjs
npm run start
```

Con Next escuchando en 3000, en otra terminal:

```bash
FE16_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs FE16_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe16.mjs
git diff --check
```

La regresión se ejecutó contra un servidor temporal de Next en 3001, antes de compilar y levantar la versión final:

```bash
FE15_ORIGIN=http://localhost:3001 FE15_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs FE15_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome FE15_ARTIFACTS=/tmp/salud-u-fe16-regresion-fe15 node scripts/test-fe15.mjs
```

Las rutas de Playwright/Chromium y el origen son configurables. La prueba requiere las semillas Administración, Revisión, Estudiante y Especialista FE09; crea una cuenta especialista vacía/ajena, especialidad/plantilla propias y tres pacientes con derivaciones. Las operaciones clínicas se realizan por HTTP. SQL prepara exclusivamente la plantilla de prueba y un horario aislado, y consulta la evidencia. Conserva los datos sintéticos finales para inspección.

Artefactos: `/tmp/salud-u-fe16-evidence/resultado.json`, `datos-postgresql.txt`, `devolucion.png`, `resolucion.png`; regresión en `/tmp/salud-u-fe16-regresion-fe15`. Logs `/tmp/salud-u-fe16-browser.log`, `-maven.log`, `-docker.log`, `-build.log`, `-typecheck.log`, `-lint.log` y `-regresion-fe15.log`. Los tokens en URLs se ocultan en el tráfico.

FE-16 queda cerrada localmente. La historia longitudinal continúa en FE-17; la aceptación integral permanece en FE-CORTE.
