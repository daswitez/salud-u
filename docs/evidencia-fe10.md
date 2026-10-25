# FE-10 · Ficha estructurada de revisión

Actualización transversal: el JSON clínico de persistencia/API y las solicitudes del frontend usan ahora claves y opciones en español. Se conservan los envoltorios HTTP y la presentación; [contrato, migración y regresión](json-clinico-espanol.md).

Validación local: 2026-10-24. Trazabilidad: UC-10, BE-10, RF-10 y RF-12. Rama frontend: `backend`. Se utilizaron exclusivamente pacientes, cuentas y citas sintéticos.

## Integración y comportamiento

Desde la atención iniciada o recuperada en FE-09, “Completar ficha” abre `/medico/citas/{id}?ficha=1`. Para Revisión utiliza el formulario conectado a Spring: antecedentes precargados, motivo, evaluación, diagnóstico, signos vitales, examen físico, laboratorio, conducta e indicaciones. El componente común de antecedentes permite completar los datos requeridos sin perder lo escrito en la ficha.

Los rewrites exactos `GET /api/medical/encounters/{id}` y `POST /api/medical/encounters/{id}/finalize` apuntan a Spring. Se eliminó el handler Next de finalización y su RPC Supabase. La normalización heredada se ejecuta en Java, incluyendo la variante de especialidad porque comparte la misma ruta. La pantalla de Especialidad conserva su incremento específico.

El GET nuevo devuelve únicamente el encuentro propio, paciente, cita, antecedentes vinculados, diagnósticos, mediciones y metadatos de documentos disponibles. Está documentado en OpenAPI, exige rol clínico y personal activo, verifica la relación con el encuentro y registra acceso. Un médico ajeno recibe `404`; Administración y Estudiante no acceden al contenido. Esta consulta permite completar FE-10 sin consumir la historia longitudinal todavía pendiente de FE-17.

Después del cierre, la pantalla consulta lo persistido y presenta la ficha de solo lectura. Al recargar conserva contenido y versión. Los errores de validación, permiso, sesión y red conservan los campos; el mensaje recibe foco. Si se pierde la respuesta después del commit, “Comprobar estado de la atención” recupera el resultado sin repetir la escritura. La sesión puede recuperarse en otra pestaña conservando el formulario abierto.

No se agregó guardado servidor de borradores: la ficha se persiste al finalizar, como indica el contrato de referencia. La pantalla lo informa y advierte antes de abandonar por enlaces internos o cerrar/recargar la pestaña. Cancelar el aviso mantiene los valores. Los datos permanecen en memoria mientras el formulario está abierto; no se guardan en localStorage ni sessionStorage. No se promete recuperación después de cerrar deliberadamente la página.

## Paridad y correcciones backend

- `ClinicalHistoryData` conserva campos, listas, booleanos estrictos, recortes y límites de la referencia. Los números ausentes, `null` o inválidos se normalizan a `null`; la cadena vacía conserva la conversión heredada a cero. La interfaz convierte valores persistidos a controles sin ejecutar reglas de negocio.
- Se admite omitir `reviewHistory`, como el payload T-01: se generan sus valores predeterminados. Los tests verifican este caso, además del formulario completo.
- Flyway V46 serializa la numeración de fichas por paciente: dos encuentros sucesivos reciben versiones 1 y 2. Conserva fichas históricas cerradas.
- La talla de la ficha se recibe en metros; la medición se registra en centímetros y se calcula IMC. Temperatura conserva `°C`. Para 70,5 kg y 1,70 m se comprobaron talla 170 cm e IMC 24,39.
- Ficha, diagnóstico, mediciones, antecedentes vinculados, cita `ATTENDED`, evento y auditoría se confirman juntos. El rechazo tardío revierte todas esas escrituras. Dos cierres concurrentes producen un éxito y un conflicto sin duplicación.
- La respuesta SQL real es `{encounterId, referralId:null, reviewHistoryVersion}` dentro de `ok/data`. El fixture T-01 de finalización es una respuesta simulada que no incluye la versión; se verifican sus campos comunes y el contrato completo de la RPC real, sin presentar el fixture como prueba de igualdad completa.

Carga, clasificación, previsualización y descarga de documentos corresponden a FE-11. En esta ficha se muestran los metadatos disponibles y solo se habilita “Adjunta” cuando existe química sanguínea disponible; Spring comprueba de nuevo esa condición. El cierre compartido se migró para poder comprobar la persistencia de FE-10; esto no declara cerrados los escenarios adicionales de FE-12 o FE-13.

## Evidencia

[test-fe10.mjs](../scripts/test-fe10.mjs) terminó `PASS` con Chromium y sesiones Spring reales. Cinco grupos de escenarios y 37 solicitudes API desde las páginas:

| Escenario | Resultado |
|---|---|
| Antecedentes ausentes y química adjunta sin archivo | Rechazo recuperable, sin ficha/diagnóstico/mediciones parciales. |
| Antecedentes desde el diálogo | Precarga y guardado sin perder los demás campos. |
| Cierre con teclado y recarga | Contenido estructurado, diagnóstico, nueve mediciones, indicaciones, cita atendida y ficha de solo lectura. |
| Doble cierre y actor ajeno | Conflicto sin reescritura y rechazo sin revelar contenido clínico. |
| Error de red antes del envío | Conserva el formulario y permite reintentar. |
| Respuesta perdida después del commit | Recupera `CLOSED` mediante consulta sin repetir el cierre. |
| Sesión caducada | Conserva valores durante reautenticación en otra pestaña. |
| Cambio concurrente de estado de cita | `409` y rollback de ficha, diagnóstico y mediciones. |
| Salida por enlace interno | Aviso cancelable; conserva URL y campos al cancelar. |

El tráfico observado no contiene llamadas Supabase ni lectura de la historia longitudinal heredada. Se inspeccionó la captura de la ficha cerrada.

Lectura directa de PostgreSQL para el paciente sintético `adec0466-0154-46c3-ab65-fb5e606c743b`:

| Encuentro | Estado / cita | Versión | Diagnósticos / mediciones | Evento ATTENDED / auditoría de cierre |
|---|---|---:|---|---|
| `cf656ffc-581d-445d-9c08-23e1e4424d85` | CLOSED / ATTENDED | 1 | 1 / 9 | 1 / 1 |
| `1bfac739-cb26-4330-b09f-fd234762917c` | CLOSED / ATTENDED | 2 | 1 / 9 | 1 / 1 |
| `ab0ea324-c20f-4d28-8afe-1d9b37724060` | DRAFT / NO_SHOW | — | 0 / 0 | 0 / 0 |

La prueba conserva las atenciones cerradas y libera las citas sintéticas restantes mediante ausencia.

## Verificación y comandos

En `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Resultado: **106 pruebas, cero fallos, errores u omitidas**. Incluye HTTP, normalización, integración PostgreSQL, transacciones y cierre concurrente. Se comprobó que el OpenAPI servido contiene ambos contratos de encuentro.

En `codigo/salud-u`, con Next y Spring iniciados:

```bash
FE10_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs \
FE10_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe10.mjs
npm run typecheck
npx eslint next.config.ts src/components/review-encounter-form.tsx src/lib/review-history.ts 'src/app/medico/citas/[appointmentId]/page.tsx' scripts/test-fe10.mjs
npm run build
git diff --check
```

Todos completaron correctamente. Playwright/Chromium se reutilizaron del ensayo FE-08; sus rutas son configurables. El script requiere las semillas locales de Administración, Revisión, Estudiante y médico ajeno, una carrera activa y disponibilidad libre; prepara su paciente y citas mediante API.

Artefactos locales: `/tmp/salud-u-fe10-evidence/resultado.json`, `ficha-cerrada.png`; logs `/tmp/salud-u-fe10-browser.log`, `/tmp/salud-u-fe10-maven.log`, `/tmp/salud-u-fe10-docker.log` y `/tmp/salud-u-fe10-build.log`. Las evidencias de tráfico no almacenan cookies ni contraseñas.

FE-10 queda cerrada localmente; la aceptación integral continúa en FE-CORTE.
