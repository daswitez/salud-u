# FE-27 · Carnet de vacunación y cobertura institucional

> Actualización VAC-HISTORIAL (27/10/2026): las vistas se llaman «Historial de vacunación», no incluyen impresión y aclaran que no reemplazan el carnet oficial del Ministerio de Salud. La evidencia histórica de abajo describe el comportamiento anterior; la nueva verificación y capturas están en `ENTREGAS_CODEX/VAC-HISTORIAL/`.

Fecha: 2026-10-26. Trazabilidad: UC-27 / BE-27 / RF-31 y RF-32; RN-21, RN-29 y RN-30. Ensayo exclusivamente local con datos sintéticos, Next en producción, Spring y PostgreSQL reales.

## Resultado local

180 pruebas Java aprobadas, sin fallos/errores/omitidas. Seis grupos Chromium aprobados; regresiones FE-23, FE-24, FE-25 y FE-26 ejecutadas después de los cambios de navegación y de la ficha del estudiante. Compilación de producción, typecheck, lint de los archivos del cambio y lectura YAML de OpenAPI aprobados. Se inspeccionaron las capturas del carnet y de la cobertura.

## Implementación

No había pantallas equivalentes ni consumo Supabase. Se agregan tres vistas que consumen Spring por rewrites exactos (`/api/vaccination-card`, `/api/reports/vaccination-coverage`):

- **Estudiante:** "Mi carnet de vacunación" (`/estudiante/vacunas`) en su navegación. Pide el carnet sin `patientId`; Spring resuelve el paciente propio.
- **Administrativo:** "Ver carnet de vacunación" desde la ficha del estudiante (`/administrativo/estudiantes/{id}/carnet-vacunacion`). El carnet se puede imprimir.
- **Administrativo / Reportes:** "Cobertura de vacunación" (`/administrativo/reportes/vacunacion`), enlazada desde Reportes y, para Reportes, desde la navegación. Filtros de carrera y período en la URL.

Componentes `vaccination-card.tsx` y `vaccination-coverage.tsx`. El estado (pendiente, en curso, completo, desactivada), los conteos y los porcentajes vienen de PostgreSQL; la pantalla solo los presenta y resume cuántas vacunas hay en cada estado. No suma coberturas entre grupos, porque un estudiante con dos matrículas se contaría dos veces.

## Cambios de backend necesarios (BE-27)

V68 reemplaza las dos funciones conservando sus firmas:

- **Carnet:** cada dosis incluye lote y nombre del aplicador. Las vacunas desactivadas solo aparecen si el paciente tiene dosis de ellas. Administración sin `patientId` responde `400` (antes `404`). Cada lectura se audita como `VACCINATION_CARD_READ`.
- **Cobertura:** las matrículas vigentes (sin período) se evalúan con el día de Bolivia, no con `current_date` del servidor, igual que V64 para cumplimiento. Cada estudiante cuenta una sola vez por vacuna/carrera/período (`count(DISTINCT)`). Cada consulta se audita como `VACCINATION_COVERAGE_READ`, registrando solo si hubo filtros y cuántas filas resultaron.

Los endpoints dejan de ser transacciones de solo lectura porque escriben la auditoría. OpenAPI y pruebas MVC/PostgreSQL actualizadas.

Se mantiene la regla vigente: el estado y la cobertura se calculan contra la última versión del esquema. Si el catálogo agrega una dosis, un estudiante antes completo pasa a "en curso"; las dosis aplicadas conservan la versión con que se registraron.

## Escenarios verificados en navegador

1. El estudiante abre su carnet desde la navegación: datos propios, carrera y período; Hepatitis B en curso (1 de 2) con lote y aplicador, Toxoide completo, vacuna desactivada con su dosis, y la desactivada sin dosis omitida. Tras registrar la segunda dosis, "Actualizar carnet" y la recarga muestran "Completo".
2. Un estudiante no puede consultar otro carnet (403) ni la cobertura. Médico, Reportes y Auditor no leen carnets. Anónimo recibe 401. Administración sin paciente recibe 400 y con paciente inexistente 404.
3. Administrativo abre el carnet desde la ficha; estado correcto por paciente. Red caída y sesión vencida muestran el error con foco, ocultan datos anteriores y se recuperan tras iniciar sesión real. Reportes ve "Acceso restringido".
4. Reportes filtra por carrera y período usando el teclado: 2 estudiantes, 50 % y 100 % calculados en Spring; vacunas inactivas excluidas. Las filas coinciden con la API y la URL conserva los filtros al recargar.
5. Lista vacía, período mayor a 80 caracteres (400), red, `500` y sesión vencida conservan los filtros y permiten reintentar. Administración llega a la cobertura desde Reportes.
6. Lecturas auditadas sin texto de filtros en los detalles; todo el tráfico va al mismo origen; ninguna solicitud a Supabase.

## Observación sobre navegación previa

Durante el ensayo, un clic en un enlace mientras Reportes o Cumplimiento todavía cargaban sus datos se perdía: el `history.replaceState` que esas pantallas hacen al terminar la carga anula la navegación en curso. El defecto viene de FE-21/FE-23 (y las pantallas nuevas usan el mismo patrón); el ensayo espera a que la página cargue. Conviene corregirlo en FE-CORTE, por ejemplo usando el router de Next o ignorando la actualización si la ruta cambió.

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
npx eslint scripts/test-fe27.mjs src/components/vaccination-card.tsx src/components/vaccination-coverage.tsx src/app/estudiante/vacunas "src/app/administrativo/estudiantes/[patientId]" src/app/administrativo/reportes src/components/app-sidebar.tsx next.config.ts
FE27_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE27_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe27.mjs
```

El script limita su origen a localhost/127.0.0.1. Crea por API una cuenta de estudiante, Reportes y Auditor, una carrera y cuatro vacunas; por SQL, dos pacientes matriculados en esa carrera y período, uno vinculado a la cuenta del estudiante. Todo queda marcado `FE27-<marca>`. Guarda resultado, tráfico y capturas en `/tmp/salud-u-fe27-evidence`.

## Pendiente

Exportación de investigación con vacunación (H-INV) y la regresión integral FE-CORTE quedan fuera de este cierre. Con un catálogo real grande, el carnet podría agrupar las vacunas pendientes.
