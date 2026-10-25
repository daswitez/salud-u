# FE-03 · Antecedentes globales con motivo y versiones

Actualización transversal: los datos clínicos de persistencia/API usan claves y opciones en español, manteniendo versiones, envoltorios y presentación. [Contrato actualizado y regresión](json-clinico-espanol.md).

Validación local: 2026-10-24. Trazabilidad: UC-03, BE-03, RF-04 y RF-20. Rama frontend: `backend`. Se usaron cuentas, pacientes, atenciones y archivos de evidencia sintéticos.

## Integración

`GET/PATCH /api/medical/patients/{id}/clinical-background` se reenvían por una regla exacta a Spring. Se eliminó el Route Handler que normalizaba datos y llamaba a Supabase.

La pantalla `/medico/pacientes/{id}/antecedentes` está enlazada desde “Antecedentes generales” en la atención FE-09. El panel también reemplaza los editores de antecedentes del formulario y de la ficha existentes. Usa las listas/estados del componente común y mantiene valores, motivo y foco cuando falla una operación. El GET de antecedentes y las escrituras pertenecen a Spring; la lectura longitudinal completa y el resto de la ficha conservan sus incrementos propios.

El guardado transmite `data`, `changeReason`, `expectedVersion` y, cuando corresponde, `encounterId`. Una versión conflictiva produce `409`: el formulario permanece abierto, permite consultar la versión vigente y usarla explícitamente como base después de revisar/combinar los cambios. Consultar esa versión no reemplaza los campos que el médico está escribiendo.

El diálogo tiene etiquetas, foco inicial/de error, navegación con Tab y retorno del foco al cerrar. Los controles se deshabilitan durante el guardado. El estado vacío permite registrar antecedentes; los errores de carga ofrecen reintento y la sesión caducada muestra acceso al login conservando el formulario mientras permanece abierto.

## Paridad y contrato backend

La comparación con las RPC de referencia detectó diferencias que se corrigieron en Spring y Flyway V45:

- El GET devuelve `data.current` y `data.encounter`, conservando sus valores `null`. El parámetro opcional `encounterId` permite consultar la versión vinculada a una atención propia. Está documentado como extensión de la ruta HTTP.
- `recordedBy` contiene el nombre/correo del actor, conforme a la RPC, y no el UUID que antes entregaba Spring.
- La normalización de listas pasa de Next a `ClinicalBackgroundData`: conserva orden, recorta espacios/longitudes, admite `details` heredado, limita 50 elementos de 500 caracteres y representa estados no presentes con listas vacías. Las opciones de hábitos se normalizan según la referencia.
- PostgreSQL rechaza estados/listas inválidos, requiere motivo y serializa las versiones por paciente. La versión, el vínculo al encuentro y la auditoría se guardan en la misma transacción.
- Una atención cerrada conserva su versión. Se puede crear una nueva versión global autorizada, pero no cambiar el vínculo histórico de esa atención.
- El frontend siempre envía `expectedVersion` entero. El contrato Spring exige ese entero no negativo y rechaza su ausencia o valores fraccionarios con `400`, en lugar de convertirlos silenciosamente en cero; la decisión está expresada en OpenAPI para mantener el control de concurrencia.

El JSON de versión conserva `id`, `versionNo`, `data`, `verificationStatus`, `recordedAt`, `recordedBy` y `changeReason`. Los errores heredados son texto; un actor sin rol clínico recibe `403`, un paciente/encuentro ajeno `404` y un conflicto o intento de modificar una atención cerrada `409`.

## Evidencia de navegador

[test-fe03.mjs](../scripts/test-fe03.mjs) terminó `PASS` en Chromium con sesiones Spring reales. Las pruebas provocan el fallo de red; los permisos, validaciones, versiones y conflictos proceden del backend.

| Escenario | Resultado |
|---|---|
| Sin antecedentes | GET con `current:null/encounter:null` y formulario de registro. |
| Listas y motivo | Alergias ordenadas, estado desconocido/listas vacías, hábitos y motivo obligatorio. |
| Falla de red al guardar | No anuncia éxito; conserva alergias y motivo; reintento mediante teclado. |
| Guardado/recarga | Versión, listas, fecha, autor y motivo persistidos; vínculo con el encuentro comprobado por API. |
| Dos formularios abiertos | El segundo recibe `409` sin escribir; conserva el borrador y compara la versión vigente. |
| Resolución del conflicto | El médico combina los cambios, elige la base vigente y guarda una nueva versión. |
| Especialista asignado | Consulta y actualiza los mismos antecedentes globales; Revisión ve la actualización al recargar. |
| Médico ajeno/Administración | GET/PATCH ajenos `404` sin contenido clínico; Administración `403`. |
| Datos inválidos | Motivo vacío `400` y ninguna nueva versión. |
| Atención cerrada | Conserva snapshot versión 2 después de llegar a versión global 5; pantalla de consulta y PATCH con ese encuentro rechazado `409`. |

Se registraron cinco grupos de escenarios y 28 solicitudes API desde las páginas, sin llamadas del navegador a Supabase. Se inspeccionó la captura del resumen con las listas y el autor del especialista.

El cierre de la atención sintética se preparó mediante la API Spring directa, porque el reenvío de cierre corresponde a FE-12. La prueba conserva ese registro atendido y marca las otras citas de prueba como ausencia para liberar sus cupos. No modifica pacientes institucionales.

## Verificación técnica

- `mvn test -q`: **100 pruebas, 0 fallos, 0 errores y 0 omitidas**. Incluye normalización de referencia, contrato HTTP y PostgreSQL con concurrencia, autorización, rollback y checksum lógico intacto de la versión previa.
- Typecheck, ESLint focalizado, compilación de producción y `git diff --check`: correctos.
- OpenAPI válido y servido por Spring con el contrato de antecedentes.
- Lectura de PostgreSQL local: cinco versiones, un evento `ANTECEDENTE_CLINICO_VERSIONADO` por versión y el actor correspondiente. El encuentro cerrado permanece vinculado a la versión 2.

## Comandos reproducibles

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Desde `codigo/salud-u`, con Next iniciado y conectado a Spring:

```bash
npm install --prefix /tmp/salud-u-fe08-browser --no-package-lock playwright
/tmp/salud-u-fe08-browser/node_modules/.bin/playwright install chromium
FE03_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs node scripts/test-fe03.mjs
npx next typegen
npm run typecheck
npx eslint next.config.ts src/components/clinical-background.tsx src/components/clinical-background-panel.tsx src/components/medical-encounter-entry.tsx src/components/medical-review-workflow.tsx src/components/medical-patient-record.tsx 'src/app/medico/pacientes/[patientId]/antecedentes/page.tsx' scripts/test-fe03.mjs
npm run build
git diff --check
```

En este equipo se reutilizó Chromium con `FE03_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`. El script usa `FE03_ADMIN`, `FE03_DOCTOR` y `FE03_PASSWORD` para configurar las cuentas locales; requiere una carrera activa y personal de revisión activo. Crea su paciente de prueba y prepara el especialista/médico ajeno mediante API administrativa.

Artefactos: `/tmp/salud-u-fe03-evidence/resultado.json` y `antecedentes.png`; los datos de solicitudes no contienen cookies ni contraseñas. Logs: `/tmp/salud-u-fe03-maven.log`, `/tmp/salud-u-fe03-docker.log` y `/tmp/salud-u-fe03-build.log`.

FE-03 queda cerrada localmente. La aceptación integral de los módulos posteriores continúa en sus historias y FE-CORTE.
