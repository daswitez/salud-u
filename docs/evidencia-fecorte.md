# FE-CORTE · Integración completa sin Supabase

Fecha: 2026-10-26. Trazabilidad: H-CORTE / BE-CORTE; RNF-07, RNF-08, RNF-09 y RNF-10. Ensayo exclusivamente local con datos sintéticos: Next en producción (`next start`), Spring y PostgreSQL en Docker. Rama `backend`, sin commits.

## Resultado local

| Control | Resultado |
| --- | --- |
| Inventario estático (`scripts/check-fecorte-inventory.mjs`) | 6/6: rama `backend`; sin Supabase en `src/`, `package.json` ni lockfile; sin Route Handlers ni Server Actions; 49 rewrites exactos `/api/**`; sin stores demo ni nombres ficticios; bundle sin Supabase, origen interno ni contraseña de prueba. |
| `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `build` | Aprobados. |
| Recorrido integral por roles (`scripts/test-fecorte-recorrido.mjs`) | 8/8, con registro de red. |
| Corte y recuperación (`scripts/test-fecorte-corte.mjs`) | 5/5 (Spring, PostgreSQL, conciliación de archivos y reinicio de Next). |
| Carga mixta (`../salud-u-backend/scripts/load-mixed.sh`) | 360 solicitudes con concurrencia 20, p95 global 695 ms. |
| Accesibilidad y navegadores (`scripts/test-fecorte-a11y.mjs`) | 24 pantallas de 7 perfiles: axe-core WCAG 2.1 A/AA sin violaciones y foco visible; Chromium y Firefox a 1024×768, 1366×768 y 1920×1080 (168 cargas). |
| Regresión FE-03…FE-27, FE-CAT, FE-INV | Todas aprobadas (detalle abajo). |
| `mvn test` (backend) | 186 pruebas, 0 fallos, 0 errores, 0 omitidas. |

## Retirada de Supabase y de comportamiento simulado

- **Código Supabase:** se eliminaron `src/lib/supabase/server.ts`, `src/lib/api/route-auth.ts`, el último Route Handler (`initial-history`, que sólo respondía 410), `scripts/create-test-users.mjs`, `scripts/seed-longitudinal-demo-history.mjs` y la carpeta `supabase/`. El SQL original queda archivado en `../salud-u-backend/docs/reference-t01/sources/supabase`.
- **Dependencias:** se quitaron `@supabase/ssr`, `@supabase/supabase-js`, `docx`, `jspdf`, `jspdf-autotable`, `xlsx` y `xlsx-js-style`. Las exportaciones ya se generan en Spring. `pnpm-workspace.yaml` declara `allowBuilds` para pnpm 12.
- **Stores demo:** se eliminaron `demo-*` (acceso, reservas, clínica, avisos, teleconsulta y personal), `mock-clinic` y `mock-users`, junto con los componentes que sólo los usaban. Las pantallas sin requisito funcional (cola, lista de espera, chequeo, avisos, solicitudes, planificación, capacidad, incidencias) redirigen a la pantalla real equivalente.
- **Datos reales en pantalla:** el inicio del estudiante muestra su próxima cita y sus solicitudes pendientes desde Spring, con su nombre en vez de "Daniela Rojas". Los encabezados de estudiante y administración usan el nombre de la sesión, y Administración puede asignar el rol Reportes.
- **Ayuda de cuentas de prueba:** sólo aparece si el servidor define `SALUD_U_TEST_ACCESS_PASSWORD`, y la contraseña ya no está en el bundle. Localmente se agregó a `.env.local`; en un despliegue institucional no se define.

## Defectos encontrados y corregidos

| Defecto | Corrección |
| --- | --- |
| Con más de 200 citas, la agenda del médico devolvía las 200 más antiguas. Al iniciar la atención, la pantalla decía "No se encontró una cita asignada a tu cuenta". | V70: la agenda devuelve todas las activas y las 200 cerradas más recientes. Nuevo `GET /api/medical/appointments/{id}`; cinco pantallas piden la cita por id. |
| La solicitud de cita del estudiante respondía 400 (Spring exige cuerpo JSON). | Se envía `{}`. |
| Un `replaceState` durante la carga anulaba un clic de navegación (registrado en FE-21/FE-27). | `src/lib/url-state.ts` no reemplaza la URL mientras hay una navegación interna pendiente. Se aplica en siete pantallas. |
| RNF-08 no se cumplía: la historia previa sólo estaba en un componente sin uso. | `ClinicalHistoryDialog` en las fichas de revisión y especialidad: historia autorizada, búsqueda en Spring y detalle por atención, fuera del formulario. Se eliminó el componente sin uso. |
| PostgreSQL caído → la sesión no se validaba, Spring respondía 401 y la pantalla pedía iniciar sesión. | Spring responde `503 SERVICE_UNAVAILABLE` y conserva la cookie. La espera por conexión baja de 30 s a 5 s. |
| Spring o PostgreSQL caídos → toda navegación SSR redirigía a "sesión vencida". | `getSession` distingue 401 de una falla de servicio, y `src/app/error.tsx` ofrece "Reintentar" sin tocar la sesión. |
| Un commit fallido tras mover un documento dejaba el archivo sin fila. | El archivo se borra si la transacción no se confirma. `reconcile-documents.sh` concilia filas y archivos por SHA-256. |
| Un cupo superpuesto respondía 500 genérico. | 409 o 400 con el mensaje de PostgreSQL. |
| El listado de cupos publicados heredó el `limit(100)` de Supabase: con más de 100 cupos futuros, Administración dejaba de ver cupos asignables (detectado por la regresión FE-14). | V71 devuelve todos los cupos futuros publicados; prueba de integración con 121 cupos. |
| Axe: nombre accesible distinto del texto visible (logo y perfil), `dl` inválida y tablas desplazables sin acceso por teclado. | Nombres que incluyen el texto visible, estructura corregida y regiones desplazables enfocables y rotuladas. |
| A 1024 px, la lista de estudiantes desbordaba la página: un texto `sr-only` escapaba del contenedor desplazable. | Los contenedores `overflow-x-auto` pasan a `relative`. |

## Recorrido integral (8 grupos)

1. El estudiante entra por el formulario, ve su nombre real y solicita una cita de revisión desde la navegación; el inicio refleja la solicitud pendiente.
2. El médico publica disponibilidad, Administración asigna el cupo y el estudiante ve la cita confirmada con su médico.
3. El médico de revisión inicia la cita desde su pantalla y la cierra con derivación: encuentro `CLOSED` y cita `ATTENDED` en la misma transacción.
4. Administración ve la derivación en su bandeja y la agenda; el especialista la recibe, la inicia desde pantalla y cierra la atención.
5. Ambos profesionales ven las atenciones cerradas en la historia del paciente.
6. Administración registra una dosis y el estudiante la ve en su carnet.
7. Reportes encuentra ambas atenciones por período y contenido y abre cumplimiento; Auditor ve los cierres y la derivación en la auditoría.
8. Red: 34 respuestas `/api/**`, todas con `X-Request-Id` de Spring (ninguna generada por Next), sin orígenes externos ni Supabase.

## Corte y recuperación (RNF-07, RNF-08)

| Escenario | Comprobado | Tiempo |
| --- | --- | --- |
| Historia durante la atención | Diálogo con historia autorizada y búsqueda; al cerrar, el formulario conserva lo escrito y la URL no cambia. | — |
| Spring detenido | Cierre e historia muestran error con reintento; otra pantalla muestra "No pudimos cargar esta pantalla" (no el login). Base sin cambios. Al volver Spring, la misma sesión comprueba el estado y cierra una sola vez. | Reinicio 9 s |
| PostgreSQL detenido | Readiness 503; Spring 503 (no 401) con la cookie intacta. Carga de archivo, cierre y alta de catálogo fallan sin filas ni archivos. Spring se reconecta sin reiniciarse y los reintentos escriben una vez. | Error visible en 6,2 s; recuperación 17 s |
| Conciliación | Filas y archivos con checksum idéntico; sin huérfanos, temporales ni cargas a medias. | — |
| Reinicio de Next | La sesión sigue válida (vive en Spring/PostgreSQL). | 1 s |

## Carga mixta de fin de mes

Pila desechable con 3.000 pacientes, 9.000 atenciones cerradas (3.000 en el mes), 9.000 diagnósticos, 6.600 dosis y 3.000 inscripciones. Ocho actores de cinco áreas (dos de Reportes, Administración, Auditor, dos médicos de revisión y dos especialistas). Concurrencia 20 sobre Spring. Cada respuesta se compara con una lectura secuencial del mismo actor.

| Operación | Solicitudes | p50 ms | p95 ms | Máx. ms |
| --- | ---: | ---: | ---: | ---: |
| Búsqueda en historia | 120 | 153 | 284 | 373 |
| Historia autorizada | 120 | 148 | 373 | 534 |
| Reporte clínico mensual | 15 | 939 | 1.202 | 1.202 |
| Reporte clínico mensual con diagnóstico | 15 | 509 | 858 | 858 |
| Cobertura de vacunación | 15 | 612 | 1.031 | 1.031 |
| Cumplimiento institucional | 15 | 366 | 637 | 637 |
| Listado de pacientes | 15 | 266 | 647 | 647 |
| Actividad diaria del mes | 15 | 252 | 458 | 458 |
| Panorama administrativo | 15 | 127 | 393 | 393 |
| Auditoría del mes | 15 | 144 | 274 | 274 |

Sin errores ni respuestas mezcladas entre actores; p95 global 695 ms (< 3 s). Es una medición local en el equipo de desarrollo, no un aforo institucional.

## Accesibilidad y navegadores (RNF-09, RNF-10)

- **RNF-09:** inicio de sesión y 23 pantallas de Estudiante, Administración, Médico de revisión, Especialista, Reportes y Auditor, incluida la ficha de revisión en borrador. axe-core 4 con reglas WCAG 2.1 A/AA (contraste, etiquetas, nombres accesibles, estructura, regiones desplazables) sin violaciones. 30 tabulaciones por pantalla: el foco siempre es visible (anillo, contorno o cambio de borde) y no se pierde.
- **RNF-10:** las mismas pantallas en Chromium y Firefox a 1024×768, 1366×768 y 1920×1080: sin desborde horizontal, con encabezado, sin errores de script y, en Chromium a 1024 px, sin violaciones axe.
- **WebKit/Safari:** no se ejecutó. El navegador está descargado, pero faltan dependencias del sistema que requieren `sudo` (`libevent-2.1-7t64`, `libavif16`, `libmanette-0.2-0`).

## Regresión

Después de los cambios de FE-CORTE: FE-03, FE-08…FE-27, FE-CAT (cuentas) y FE-INV aprobadas en Chromium, junto con `test-clinical-json` y el backend (186 pruebas).

La primera corrida completa encontró dos problemas de las pruebas y un defecto del producto. Se corrigieron y las suites afectadas se volvieron a correr:

- FE-11…FE-14 elegían horarios mirando la lista de cupos de Administración (máximo 100). Con el volumen acumulado chocaban con cupos de corridas anteriores. Ahora usan horas distintas en cada corrida y reintentan ante el nuevo 409.
- FE-14 reveló además el límite de 100 cupos del listado publicado, un defecto real corregido con V71 (ver tabla de defectos).
- FE-22 inspeccionaba el XLSX con el paquete `xlsx`, retirado del frontend. Ahora lo lee con Python (`zipfile`), respetando la posición de cada celda.

## Pendiente fuera del alcance local

- **Validación con el personal del centro** (FE-CORTE, RNF-07–10): no se puede hacer desde este entorno.
- **Volumen institucional y hardware de despliegue:** repetir `load-mixed.sh` con el volumen acordado.
- **Migración desde Supabase** (BE-CORTE, condición 4): falta el mapeador y el ensayo con fixture sintético (UUID, FK, versiones, recuentos, checksums y rollback).
- **Cuentas y contraseñas** (BE-CORTE, condición 5): estrategia a aprobar con el responsable institucional.
- **Respaldo de documentos:** `backup.sh` sólo respalda PostgreSQL; el volumen `clinical_documents` debe respaldarse en el mismo momento y conciliarse tras restaurar.
- **WebKit:** requiere instalar dependencias del sistema.
- **Decisión de k-anonimato** para la exportación de investigación (ver FE-INV).

## Verificación reproducible

Desde `codigo/salud-u-backend`:

```bash
mvn -B -ntp test
docker compose up --build -d
./scripts/verify-platform.sh
./scripts/load-mixed.sh 3000
SALUDU_PROJECT=salud-u-backend ./scripts/reconcile-documents.sh
```

Desde `codigo/salud-u` (Next en producción en `localhost:3000`):

```bash
corepack pnpm install --frozen-lockfile && corepack pnpm lint && corepack pnpm typecheck && corepack pnpm build
node scripts/check-fecorte-inventory.mjs
export FECORTE_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs
export FECORTE_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome
node scripts/test-fecorte-recorrido.mjs
FECORTE_RESTART_NEXT=<script que reinicia next start> node scripts/test-fecorte-corte.mjs
node scripts/test-fecorte-a11y.mjs
```

Las pruebas de corte detienen y reinician los contenedores `backend` y `postgres` del proyecto local. Los scripts limitan su origen a localhost y guardan resultados, capturas y registros en `/tmp/salud-u-fecorte-*-evidence`.
