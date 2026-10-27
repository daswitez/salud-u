# FE-23 · Cumplimiento institucional y panorama administrativo

Fecha: 2026-10-26. Trazabilidad: BE-23 / RF-25 / UC-23. Verificación local sintética con Next en producción, Spring y PostgreSQL reales. La validación institucional de la regla académica y el volumen se mantiene pendiente en FE-CORTE; no se inventó una política anual, de especialidad o por gestión distinta a la referencia existente.

## Resultado local

169 pruebas Java aprobadas, sin fallos, errores u omitidas; cuatro grupos Chromium aprobados, regresión FE-22 completa (cuatro grupos), build, typecheck, ESLint focalizado, OpenAPI y git diff --check aprobados.

El ensayo compara siete matrículas del mismo período/carrera: una cumplida y seis pendientes. Múltiples cierres de un paciente no duplican la matrícula y se muestra el primero válido. Se verifican límites de Bolivia, cierre anterior/posterior, llegada, ausencia, programada, sin cita, matrícula inactiva histórica y consulta vigente sin período.

## Integración

`/administrativo/reportes/cumplimiento` ya no consulta Supabase. Administrativo y REPORTING_OFFICER consumen los endpoints Spring mediante rewrites exactos. Hay acceso desde reportes, navegación de Reportes y el inicio administrativo.

El formulario ofrece carrera, período académico y rango de actividad. Guarda los filtros aplicados en la URL y los recupera al recargar. Carrera/período seleccionan matrículas; las fechas consultan actividad institucional por día y no cambian la ventana de cumplimiento. Esa diferencia se explica en pantalla para no presentar una suma de actividad institucional como si fuera específica de la carrera filtrada.

El inicio administrativo deja de consultar directamente patient/appointment/availability_slot y RPC Supabase. `AdministrativeOverview` consume conteos en Spring y conserva tarjetas, guía y navegación de trabajo. Reportes mantiene su redirección al módulo de reportes; el panorama de coordinación administrativa sigue reservado al Administrativo.

No hay handler Next ni reglas clínicas en el navegador. El cliente solo presenta el estado decidido por PostgreSQL y cuenta las filas/clasificaciones devueltas para las tarjetas. El rótulo Matrículas evita llamar estudiantes únicos a filas históricas de distintos períodos/carreras.

## Regla y paridad

Se conserva el modelo de BE-23 y la RPC: una atención CLOSED, de cualquier tipo admitido por la referencia, dentro de la ventana inclusiva de inscripción. La referencia no exige únicamente INITIAL; la pantalla se titula atención obligatoria y no inventa esa restricción. Check-in, no-show y un encuentro DRAFT no cumplen.

Sin período se consideran matrículas ACTIVE vigentes. Con período explícito se consulta también historia inactiva. Pacientes archivados se excluyen. Las filas incluyen paciente/carrera/período y el primer cierre válido o null. Se preserva el orden nominal del endpoint por apellidos/nombres/UUID y el orden de actividad por día descendente/tipo/especialidad con null primero. La RPC original no declara ORDER BY: la comparación independiente de estados se hace por ID; la pantalla conserva exactamente el orden de Spring.

V64 aplica fechas de Bolivia tanto a la ventana académica como a actividad y al día por omisión. Corrige el uso de la zona horaria del servidor en V33. El instante 27/10 03:59:59Z todavía pertenece al 26/10 en Bolivia; 04:00:00Z pertenece al día siguiente. Las pruebas PostgreSQL verifican ambos límites.

La comparación con `rpc_compliance_report` usa una consulta equivalente e independiente y la misma semilla, con zona de sesión America/La_Paz. Se explicita la diferencia frente a interpretar días en UTC. Período histórico y exclusión de archivados/vigencia son el alcance explícito de BE-23; no se presenta la RPC histórica sin filtros de vigencia como una regla institucional ya aprobada.

## Contratos

| Endpoint | Respuesta y alcance |
|---|---|
| GET `/api/reports/compliance?careerId=&period=` | Administrativo/Reportes. ok/data; fila patientId, carnet, fullName, careerId, careerName, academicPeriod, firstClosedEncounterAt nullable y complianceStatus COMPLIANT/PENDING. Escalares vacíos no se envían. Período explícito vacío/solo espacios o mayor a 80, y UUID inválido, se rechazan 400. |
| GET `/api/reports/daily-activity?from=&to=` | Administrativo/Reportes. ok/data; activityDay, encounterType, specialtyName nullable, totalClosed. Días inclusivos Bolivia; omisión hoy; hasta 366 días de diferencia. Rango inválido 400. No hereda carrera/período del otro endpoint. |
| GET `/api/reports/administrative-summary` | Solo Administrativo. ok/data con day, registeredPatients, scheduledAppointments, closedToday, pendingReferrals, availableSlots. No devuelve nombres, diagnósticos ni textos clínicos. |

El sobre de listas se conserva; vacío es `[]`. Se corrigió el OpenAPI de cumplimiento/actividad para no exigir `error:null` en respuestas que omiten ese atributo. No hay cambio de contrato HTTP para los consumidores existentes de esas listas.

Los endpoints responden no-store/private y auditan actor/contexto de transacción sin contenido clínico: CUMPLIMIENTO_CONSULTADO, ACTIVIDAD_DIARIA_CONSULTADA y PANORAMA_ADMINISTRATIVO_CONSULTADO. Errores de infraestructura ahora son 500 recuperables, en vez de 400 o una lista/métrica cero de sustitución. Sin sesión 401; médicos/estudiantes/auditor no consultan estos reportes; Reportes no consulta el panorama de coordinación.

El resumen preserva las definiciones observables de las tarjetas anteriores: pacientes sin archivar; citas SCHEDULED/CHECKED_IN globales; derivaciones PENDING_ASSIGNMENT globales; suma disponible de cupos PUBLISHED. Solo Atenciones cerradas se limita a hoy Bolivia. Se presenta como Estudiantes registrados, sin confundir ese conteo con inscripción académica activa. V64 calcula los conteos sin enviar documentos o evaluaciones al frontend.

## Recuperación y accesibilidad

Las solicitudes se cancelan al sustituir la consulta o salir. Carga y error retiran resultados anteriores; los filtros siguen en el formulario. Reintentar no borra el período ni las fechas. La caducidad real de Spring ofrece iniciar sesión en otra pestaña y continuar. No se anuncia una consulta exitosa después de una respuesta inválida, de permiso o de red.

El acceso de Auditor a la pantalla presenta una denegación visible y un enlace al perfil, sin consultar datos de cumplimiento ni entrar en un bucle de redirecciones. También se prueba su rechazo 403 en las API.

El catálogo de carreras se recupera independientemente; mantiene la carrera seleccionada aunque todavía no esté en las opciones recuperadas. Etiquetas, teclado, encabezados de tabla, mensajes de carga/alerta y foco de error permiten completar la consulta. El panorama muestra métricas solo tras recibir datos válidos: un fallo no aparece como cero pacientes ni como bandeja al día.

## Evidencia y comandos

`test-fe23.mjs` crea carrera/pacientes/usuario Reportes por las API probadas. SQL migrador prepara únicamente las fechas y estados históricos sintéticos necesarios para probar ventanas, cierres múltiples y check-in/ausencia. No se modifica información real. El script compara estados con una consulta independiente de referencia, y compara actividad del día con closedToday del panorama.

Prueba cuatro grupos: regla/semilla; recorrido/recarga/errores/sesión/teclado/vacío; permisos/panorama/ausencia de contenido clínico; auditoría/cierres múltiples/historia inactiva/Supabase ausente. Se inspeccionaron las capturas de cumplimiento y panorama. La regresión FE-22 incluye archivos reales, constancias, concurrencia, red y fallo tardío con rollback.

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Desde `codigo/salud-u`:

```bash
npm run build
npm run typecheck
npm exec eslint -- src/components/institutional-compliance.tsx src/components/administrative-overview.tsx src/components/app-sidebar.tsx src/app/administrativo/page.tsx src/app/administrativo/reportes/page.tsx src/app/administrativo/reportes/cumplimiento/page.tsx next.config.ts
FE23_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE23_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe23.mjs
FE22_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE22_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
FE22_ARTIFACTS=/tmp/salud-u-fe23-regresion-fe22 node scripts/test-fe22.mjs
git diff --check
```

La regresión FE-22 usa las semillas de FE-19/FE-21 conservadas por sus scripts. Las rutas de Playwright y Chromium son del entorno local y se pueden sustituir con las variables indicadas.

Artefactos: `/tmp/salud-u-fe23-evidence/resultado.json`, `cumplimiento.png`, `panorama.png`; regresión `/tmp/salud-u-fe23-regresion-fe22`. Logs `/tmp/salud-u-fe23-browser.log`, `-maven.log`, `-docker.log`, `-build.log`, `-typecheck.log`, `-lint.log` y `-regresion-fe22.log`.

Ensayo final: carrera `d6f03248-8838-43cd-876b-106dc16f7bf5`, período `FE23-1793050109805`. 7 matrículas, 1 cumplida y 6 pendientes; 4 eventos del usuario Reportes comprobados con su actor. El JSON conserva consulta de referencia, filas ordenadas, actividad, resumen y tráfico.
