# FE-24 · Auditoría persistida y cierre del pendiente de agenda

Fecha: 2026-10-26. Trazabilidad: UC-24 / BE-24 / RF-26 y RF-27; corrección de integración FE-04. Ensayo exclusivamente local con datos sintéticos, Next en producción, Spring y PostgreSQL reales.

## Resultado local

174 pruebas Java aprobadas, sin fallos/errores/omitidas. Cinco grupos Chromium aprobados con 155 solicitudes registradas y 500 eventos operacionales inspeccionados; regresión FE-23 completa (cuatro grupos), compilación de producción, typecheck, lint de los archivos del cambio, lectura de OpenAPI y `git diff --check` aprobados. Se inspeccionaron las capturas de la bitácora y la agenda. Next y Spring permanecen iniciados en localhost:3000 y localhost:8080.

## Implementación

`/administrativo/auditoria` consulta `GET /api/audit-events` mediante rewrite exacto. Se retiró `demo-audit-store.ts`: no hay eventos inventados, fallback de demostración ni acceso Supabase en este recorrido. El Auditor tiene navegación de auditoría/perfil y su inicio administrativo lo dirige a la bitácora. Las cuentas con varios roles se validan contra las autoridades completas de `/api/v1/session`, sin cambiar el contrato de `/api/me` ni otorgar permisos por el rol visual. Spring y PostgreSQL vuelven a comprobar AUDITOR. Se probó revocación y restitución del rol con la misma sesión, y peticiones simultáneas de Auditor y médico para evitar confundir sus autoridades.

La pantalla ofrece fechas inclusivas de Bolivia, búsqueda por nombre/correo/UUID del actor, acción, recurso, resultado y tamaño de página. Todos los filtros se ejecutan en Spring/PostgreSQL. Se preservan orden, null y listas vacías; los filtros y el cursor aplicado quedan en la URL para recargar. Nombre y roles mostrados son los vigentes del actor, no una instantánea de sus roles cuando ocurrió el evento.

V65 añade consulta por cursor `(ocurrido_en,id)` descendente, con precisión de microsegundos y sin OFFSET: nuevos eventos no desplazan la siguiente página. Se conserva la firma SQL histórica. La respuesta compatible sigue `ok/data/error`; solo `paginated=true` añade `pagination: {hasMore,nextCursor}`. `actorId` exacto continúa disponible por API; la pantalla usa `actor` parcial. El límite público sigue siendo 1–500; el servidor solicita una fila adicional para detectar otra página. La búsqueda parcial trata `%` y `_` como caracteres literales. El cambio a días de Bolivia se documenta expresamente frente al antiguo cast de fecha dependiente de la zona del servidor.

Las filas contienen identificador, instante, actor, acción, recurso, identificador nullable, resultado y contexto operacional derivado. No se publican `detalles`, correlaciones ni contenido clínico. Cada lectura satisfactoria agrega `AUDIT_EVENTS_READ` con actor, límite y cantidad; no modifica eventos anteriores. La respuesta es `no-store, private`. No hay acciones de edición ni eliminación. El usuario runtime no tiene UPDATE ni DELETE sobre la evidencia y las pruebas PostgreSQL intentan ambas operaciones.

Validación devuelve 400; sin sesión 401; sin autoridad 403; fallos de persistencia 500 recuperable. Los métodos no admitidos devuelven 405 conservando el contrato de error correspondiente a `/api/**` o `/api/v1/**`, sin desviar al manejo de sesión. La pantalla conserva filtros ante errores de texto/objeto, red o caducidad, oculta filas antiguas, mueve el foco al error y permite reintentar tras iniciar sesión real en otra pestaña.

## Pendiente corregido de FE-04

`/api/my-specialties` ahora tiene rewrite exacto a Spring y se elimina su handler Next/Supabase. También se retira el handler Supabase de `/api/careers`, que ya estaba reemplazado por su rewrite. La consulta médica conserva solo afiliaciones propias activas/vigentes, nombres y orden de Spring, con `[]` cuando no hay afiliación.

La prueba de navegador descubrió que la jornada se persistía pero no reaparecía: `AvailabilityService.management` devolvía nombres internos españoles (`horarios`, `cupos`, `dia_semana`, etc.) y agregaba listas públicas vacías. Se corrige la adaptación al contrato público esperado (`schedules`, `slots`, `weekday`, `starts_at`, etc.) para jornadas, bloqueos y cupos. No se cambian nombres españoles almacenados ni las reglas de negocio. Una prueba de regresión usa payloads SQL españoles y exige el contrato público, con null y listas preservados. El navegador guarda una jornada de un especialista sintético y comprueba que reaparece después de recargar.

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
npx eslint scripts/test-fe24.mjs src/app/administrativo/auditoria src/app/administrativo/layout.tsx src/app/administrativo/page.tsx src/components/app-sidebar.tsx src/components/app-header.tsx src/lib/session.ts next.config.ts
FE24_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE24_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe24.mjs
FE23_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE23_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe23.mjs
git diff --check
```

El script limita su origen a localhost/127.0.0.1 y crea cuentas y eventos de prueba identificados FE24. Para comprobar un acceso clínico real reutiliza la atención sintética del ensayo FE-19 en `/tmp/salud-u-fe19-evidence/resultado.json`. Inspecciona eventos reales de organización, historia, consulta y exportación de reportes; la semilla de 31 eventos controla los límites de fecha, resultado, null y páginas. Inserta un evento más reciente entre páginas para verificar estabilidad. Compara el hash de los eventos originales después de las consultas y de los intentos de mutación. Guarda resultado, tráfico y capturas en `/tmp/salud-u-fe24-evidence`.

`npm run lint` completo también se ejecutó: mantiene tres errores anteriores fuera de FE-24 (efecto de carga en personal-medico, tipos any en demo-clinical-store y ui-contracts) y una advertencia de variable sin usar en test-fe21. El lint de todos los archivos de este cambio pasa; no se presenta el lint general como aprobado.

La regresión integral entre todos los módulos, la validación institucional del volumen y el retiro de las dependencias Supabase de módulos todavía no migrados corresponden a FE-CORTE. Este cierre acredita auditoría y el pendiente de agenda descrito, no el corte integral.
