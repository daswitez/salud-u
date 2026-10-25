# FE-09 · Iniciar o recuperar el encuentro borrador

Validación local: 2026-10-24. Trazabilidad: UC-09, BE-09, RF-09. Rama frontend: `backend`. Next.js y Spring Boot conectados a PostgreSQL local con datos sintéticos.

## Resultado implementado

La agenda médica consume `GET /api/medical/appointments` de Spring y la apertura usa `POST /api/medical/appointments/{id}/start`, con sesión y CSRF del cliente común. Se eliminaron los dos Route Handlers que consultaban Supabase; los rewrites son exactos.

La ruta `/medico/citas/{id}` muestra identidad, especialidad, horario y estado de la cita asignada. “Iniciar cita” crea el borrador y “Recuperar borrador” vuelve a verificar el encuentro existente. La recarga muestra la referencia persistida y conserva el UUID. El mensaje de resultado recibe el foco y los botones bloquean envíos mientras se espera la respuesta. La agenda permite reintentar una consulta fallida conservando sus filtros.

La apertura tiene una etapa propia: antes dependía de cargar toda la historia desde Supabase. La continuación “Completar ficha” conserva el formulario existente en `/medico/citas/{id}?ficha=1`, sin precargarlo durante UC-09. Sus operaciones de antecedentes, ficha, documentos y cierre se integran y aceptan en FE-03/10/11/12/15. FE-17 conserva su aceptación de historia longitudinal. Este incremento acredita la apertura/recuperación, no esas operaciones posteriores.

## Contrato de agenda y extensión explícita

La migración Flyway V43 completa los campos que faltaban al comparar Spring con el handler heredado: `checkedInAt`, `specialtyCode` y `patient.registrationCode/birthDate/phone/email`. Se conservan los valores `null`, el orden ascendente por horario/UUID y el límite de 200 citas propias. El controlador utiliza mapas que admiten `null`.

Se agrega `encounter: null | { id, status }` como extensión documentada en OpenAPI. Esta lectura permite conocer si ya existe un borrador sin crear uno por navegar. No contiene texto clínico del encuentro. La creación se mantiene explícita mediante POST, que devuelve:

```json
{
  "ok": true,
  "data": {
    "encounterId": "UUID del encuentro",
    "status": "DRAFT"
  }
}
```

La primera apertura devuelve `201`; la recuperación `200` con el mismo identificador. Los errores heredados conservan `error` como texto. Spring traduce falta de personal activo a `404`, cita ajena/inexistente a `404`, transición inválida a `409` y especialidad no vigente a `403`. La autorización y la transacción permanecen en Spring/PostgreSQL.

## Pruebas aprobadas

| Caso | Evidencia |
|---|---|
| Consulta de agenda y error de red | El mensaje ofrece reintento, conserva el filtro y representa la búsqueda vacía. |
| Cita propia `SCHEDULED` | Apertura desde agenda mediante teclado, respuesta `201` y confirmación del borrador. |
| Recuperación tras recarga | El mismo UUID figura en la agenda y la recuperación devuelve `200`. |
| Respuesta perdida después del commit | Se crea el borrador real, se interrumpe su respuesta y la interfaz muestra error; el reintento recupera el mismo encuentro. |
| Cita propia `CHECKED_IN` | Inicio válido, fecha de ingreso conservada en el contrato. |
| Médico ajeno | Agenda sin la cita, acceso directo sin identidad del paciente y POST `404`. |
| Administrativo/estudiante | Rechazo `403` al intentar el consumo médico. |
| Estado cambiado por otra operación | Una cita pasa a `NO_SHOW`; la pantalla desactualizada recibe `409` y no crea un borrador. |
| Especialista asignado | Apertura `201` y recuperación `200` de una atención directa de su especialidad activa. |
| Cita inexistente/sesión caducada | Estado vacío explícito y redirección al login al recargar, respectivamente. |
| Doble apertura concurrente | PostgreSQL verifica una respuesta `201`, otra `200`, un encuentro y un solo evento de creación. |
| Contrato HTTP | Pruebas MVC de identidad, campos `null`, lista vacía, `201/200`, permisos, CSRF y errores. |

El script [test-fe09.mjs](../scripts/test-fe09.mjs) terminó `PASS` con siete grupos de escenarios en Chromium y 32 solicitudes API desde las páginas. No hubo llamadas del navegador a Supabase ni a los endpoints de historia clínica durante UC-09. Los fallos de red son inducidos; los estados, permisos y respuestas clínicas proceden de Spring real.

Se inspeccionó la captura de apertura. Una consulta de solo lectura en PostgreSQL confirmó los tres borradores del recorrido (dos de revisión y uno de especialidad), cada uno con un único `ENCUENTRO_BORRADOR_CREADO` y el actor correspondiente. La limpieza marca como ausencia las citas sintéticas para dejar libres sus cupos y conserva su evidencia histórica.

Regresión Java: **91 pruebas, 0 fallos, 0 errores, 0 omitidas**, incluidas 23 pruebas PostgreSQL. Typecheck, ESLint focalizado y compilación de producción del frontend aprobados. El YAML OpenAPI incluye los dos endpoints y la extensión de lectura.

## Comandos y artefactos

Con Spring en `127.0.0.1:8080`, Next configurado con `SALUD_U_BACKEND_ORIGIN` e iniciado con `npm run dev -- --hostname 127.0.0.1`, ejecutar desde `codigo/salud-u`:

```bash
npm install --prefix /tmp/salud-u-fe08-browser --no-package-lock playwright
/tmp/salud-u-fe08-browser/node_modules/.bin/playwright install chromium
FE09_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs node scripts/test-fe09.mjs
npx next typegen
npm run typecheck
npx eslint next.config.ts src/lib/api/client.ts src/components/medical-appointments.tsx src/components/medical-agenda.tsx src/components/medical-encounter-entry.tsx 'src/app/medico/citas/[appointmentId]/page.tsx' scripts/test-fe09.mjs
npm run build
git diff --check
```

Para este equipo se reutilizó Chromium con `FE09_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`. Las credenciales se pueden indicar mediante `FE09_ADMIN`, `FE09_STUDENT`, `FE09_DOCTOR` y `FE09_PASSWORD`. El estudiante debe tener paciente vinculado y el médico de revisión personal activo. El script prepara dos profesionales sintéticos dedicados y una especialidad a través de los endpoints administrativos.

Desde `codigo/salud-u-backend` se ejecutaron:

```bash
mvn test -q
docker compose up --build -d
```

Artefactos temporales: `/tmp/salud-u-fe09-evidence/resultado.json` (escenarios, UUID de prueba y solicitudes sin cookies), `revision-borrador.png` y `especialidad-borrador.png`. Logs locales: `/tmp/salud-u-fe09-maven.log`, `/tmp/salud-u-fe09-build.log` y `/tmp/salud-u-fe09-final-docker.log`.

## Hallazgo separado: FE-CAT

La preparación inicial detectó un falso `401` en `GET /api/v1/admin/principals`: Java buscaba `roles` mientras la función SQL devolvía `rols`. La corrección posterior quedó validada con 94 pruebas Java y recorrido Chromium de listado/recarga/permisos. [Informe de corrección FE-CAT](evidencia-fecat-cuentas.md). El script FE-09 conserva la preparación de sus cuentas mediante alta API e identidad `/api/me`.
