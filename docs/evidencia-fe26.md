# FE-26 · Registro de dosis aplicada

Fecha: 2026-10-26. Trazabilidad: UC-26 / BE-26 / RF-30; RN-29, RN-30 y RN-31. Ensayo exclusivamente local con datos sintéticos, Next en producción, Spring y PostgreSQL reales.

## Resultado local

179 pruebas Java aprobadas, sin fallos/errores/omitidas. Siete grupos Chromium aprobados; regresión FE-25 completa (seis grupos) después de ajustar su semilla al nuevo acceso, y regresiones FE-03, FE-17, FE-18, FE-19 y FE-20 (fichas administrativa y médica modificadas) aprobadas. Compilación de producción, typecheck, lint de los archivos del cambio y lectura YAML de OpenAPI aprobados. Se inspeccionaron las capturas de las fichas administrativa y médica.

## Implementación

No había pantalla ni consumo Supabase de vacunación. Para conservar la navegación, el registro se integra donde el actor ya trabaja con el paciente:

- **Administrativo:** sección "Vacunación" al final de `/administrativo/estudiantes/{id}`; elige al médico de revisión aplicador.
- **Médico de revisión:** misma sección en `/medico/pacientes/{id}`; queda como aplicador y registrador. El especialista no la ve.

El componente compartido `src/components/vaccination-doses.tsx` consume `GET /api/vaccinations/context` y `POST /api/vaccinations` mediante rewrites exactos. Next no calcula orden, intervalo ni aplicador: preselecciona la siguiente dosis que devuelve Spring y muestra las decisiones del servidor. Los límites HTML (fecha máxima, longitudes) sólo orientan; la prueba los elimina para comprobar el rechazo en Spring.

Cada vacuna muestra estado, siguiente dosis o esquema completo y la tabla de dosis aplicadas con fecha, lote, versión de esquema, aplicador, registrador y, si corresponde, la justificación del intervalo. Las vacunas desactivadas solo aparecen si el paciente tiene dosis, y no se ofrecen para registrar.

## Cambios de backend necesarios (BE-26)

Antes, todos los rechazos devolvían `400 La dosis no cumple las reglas de vacunación.` y la pantalla no podía saber que debía pedir justificación. El médico tampoco podía consultar vacunas ni dosis previas (`/api/vaccines` y el carnet son solo para Administración y Estudiante), y podía registrar dosis para cualquier paciente por UUID.

V67:
- `contexto_registro_vacunacion(paciente)`: vacunas activas con esquema vigente y siguiente dosis calculada en servidor, dosis aplicadas con responsables (también de vacunas desactivadas), aplicadores elegibles y día actual de Bolivia. Cada lectura se audita como `VACCINATION_RECORD_READ`.
- `registrar_dosis_vacuna` conserva su firma. Para Médico de revisión exige el mismo acceso clínico que la historia (`requerir_acceso_medico_paciente`: cita inicial asignada). La fecha futura se evalúa en día de Bolivia y tiene código propio.

Spring publica `GET /api/vaccinations/context?patientId=` (Administrativo/Médico de revisión) y distingue: `422` intervalo insuficiente sin justificación; `409` dosis duplicada, dosis anterior pendiente o vacuna inactiva; `400` fecha futura, fecha anterior a la previa, aplicador que no es médico de revisión activo o justificación >500; `403` rol o aplicador ajeno; `404` paciente inexistente o fuera de la atención del médico. OpenAPI y pruebas MVC/PostgreSQL actualizadas; la prueba de integración previa del médico ahora siembra su cita inicial.

**Cambio de comportamiento:** un médico de revisión ya no registra dosis de pacientes sin cita inicial asignada a él. Administración sigue registrando para cualquier paciente indicando el aplicador. Si la institución necesita campañas en que cualquier médico vacune a cualquier estudiante, debe decidirse expresamente.

## Escenarios verificados en navegador

1. Administrativo registra la dosis 1 con teclado y etiquetas; el cuerpo enviado es el contrato BE-26; lote recortado, fecha, aplicador y registrador persistidos y visibles tras recargar. Una vacuna desactivada conserva su dosis y no se ofrece.
2. Duplicado, dosis fuera de orden, fecha futura en Bolivia y fecha anterior a la previa muestran el mensaje de Spring con foco y borrador. Un intervalo insuficiente responde 422, enfoca la justificación (`aria-invalid`) sin crear fila; con justificación se registra con advertencia persistida.
3. Dos registros simultáneos de la misma dosis: uno 201 y otro 409. Justificación >500, aplicador inválido, vacuna inactiva y cuerpo incompleto: rechazados sin filas parciales.
4. El médico de revisión registra desde la ficha de su paciente como aplicador y registrador; ve la siguiente dosis y el esquema completo calculados en servidor; no puede indicar otro aplicador (403) ni consultar o registrar pacientes ajenos (404).
5. Red caída, `500` y sesión cerrada conservan la dosis en el formulario; tras iniciar sesión real se registra. Un error de carga oculta el formulario y permite reintentar; listas vacías sin vacunas ni aplicadores se representan.
6. Estudiante, Reportes, especialista y anónimo rechazados; seis dosis con seis eventos `VACCINE_DOSE_RECORDED` y lecturas auditadas.
7. Todo el tráfico va a `/api/vaccinations` del mismo origen; ninguna solicitud a Supabase.

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
npx eslint scripts/test-fe26.mjs scripts/test-fe25.mjs src/components/vaccination-doses.tsx "src/app/administrativo/estudiantes/[patientId]/page.tsx" "src/app/medico/pacientes/[patientId]/page.tsx" next.config.ts
FE26_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE26_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe26.mjs
```

El script limita su origen a localhost/127.0.0.1. Por SQL crea un paciente propio con cita inicial del médico demo y otro paciente ajeno; por API crea vacunas, un médico aplicador, una cuenta de Reportes y un especialista, todos marcados `FE26-<marca>`. Guarda resultado, tráfico y capturas en `/tmp/salud-u-fe26-evidence`. Los datos sintéticos quedan en la base local.

## Pendiente

El carnet del estudiante y la cobertura institucional (FE-27), las fichas de campañas sin cita y la regresión integral FE-CORTE quedan fuera de este cierre. La lista de la ficha muestra todas las vacunas activas; con un catálogo real grande convendría agruparla o filtrarla.
