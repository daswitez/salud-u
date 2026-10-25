# JSON clínico en español

Cambio transversal validado localmente el 2026-10-24, antes de continuar con otra historia. Afecta antecedentes globales, revisión y especialidad en Spring/PostgreSQL y sus consumidores Next.js.

## Contrato

La persistencia y los JSON clínicos de las respuestas usan claves en español sin tildes. Las nuevas solicitudes del frontend también. Ejemplo parcial de ficha de revisión:

```json
{
  "versionEsquema": 1,
  "sexo": "F",
  "antecedentesPersonales": {
    "patologicos": null,
    "quirurgicos": null,
    "alergicos": "Penicilina",
    "medicacionHabitual": null,
    "familiaresRelevantes": null
  },
  "habitos": {
    "alimentacion": "ADECUADA",
    "actividadFisica": "SI",
    "tabaco": "NO",
    "alcohol": "NO"
  },
  "signosVitales": {
    "presionSistolica": 120,
    "presionDiastolica": 80,
    "frecuenciaCardiaca": 70,
    "frecuenciaRespiratoria": 18,
    "temperatura": 36.7,
    "saturacionOxigeno": 98,
    "peso": 70.5,
    "talla": 1.7
  },
  "conducta": {
    "educacionSalud": true,
    "tratamiento": false,
    "estudiosComplementarios": false,
    "derivacion": false,
    "seguimientoMedico": true,
    "sinObservaciones": false
  },
  "observaciones": "Hidratación"
}
```

También se usan `examenFisico` y `laboratorio`. Los antecedentes globales incluyen `alergias`, `enfermedadesPersonales`, `cirugias`, `medicamentos` y `antecedentesFamiliares`; cada entrada tiene `estado: PRESENTE/NINGUNO/DESCONOCIDO` y `elementos: []`. Especialidad utiliza `codigoEspecialidad`, `antecedentesPersonales`, `oftalmologia` y `ginecologia`.

Las opciones estructuradas se traducen según su campo: `SI/NO`, `ADECUADA/REGULAR/INADECUADA`, `AGUDO/SUBAGUDO/CRONICO`, `NORMAL/ALTERADO` y métodos `NINGUNO/ORAL/INYECTABLE/DIU/IMPLANTE/PRESERVATIVO`. Textos libres como una observación que diga “YES” no se traducen. Los códigos de especialidad conservan su identidad de catálogo; números, booleanos, fechas clínicas, null, listas y orden conservan su significado.

El diccionario completo está en [clinical-json-dictionary.json](../src/lib/clinical-json-dictionary.json), con copia idéntica en los recursos Spring. Una prueba compara ambas copias. OpenAPI documenta el nuevo contrato y los alias de entrada.

Se mantienen las rutas y envoltorios HTTP existentes: `ok/data`, `reviewHistory`, `specialtyHistory`, `current/encounter`, metadatos de versiones y mensajes de error. Este cambio traduce el contenido clínico estructurado; los estados/roles de columnas relacionales y otros contratos administrativos conservan su alcance separado.

## Backend y migración

`ClinicalJson` traduce claves y opciones por campo. Los normalizadores aceptan entradas heredadas o españolas y producen exclusivamente el formato español. Si aparecen dos alias equivalentes en el mismo objeto, se rechazan con 400, sin elegir silenciosamente uno de los valores.

Flyway V47 traduce las versiones existentes de antecedentes, revisión y especialidad, verifica reversibilidad dentro de la transacción y adapta validaciones, cierres y lectura de hábitos/alergias para reportes. Los triggers canonizan nuevas inserciones, incluidas llamadas SQL heredadas. No se reescribieron migraciones ya aplicadas.

V48 trata las plantillas como JSON Schema: sus nombres de campos, listas `required` y opciones conocidas se traducen, mientras palabras del estándar como `type`, `properties`, `items` y `enum` permanecen válidas. Los textos descriptivos se conservan.

La migración cambia la representación técnica de las claves; conserva UUID, vínculos, número de versión, actor, fechas y contenido clínico. No crea nuevas atenciones/versiones ni altera cierres o eventos existentes. La aplicación continúa sin permisos UPDATE/DELETE sobre las versiones históricas. Un cierre repetido sigue rechazándose y conserva el checksum de la ficha ya migrada.

Antes de aplicar V47 al entorno local se guardó `/tmp/salud-u-antes-json-es.dump` mediante pg_dump y un inventario JSON con permisos restringidos. La comparación con el inventario posterior verificó **11 versiones de antecedentes y 5 fichas de revisión**: contenido reversible e identidad/metadatos intactos. El entorno no contenía fichas de especialidad o plantillas previas; su almacenamiento y traducción se probaron en PostgreSQL aislado.

## Frontend

`apiJson` convierte las escrituras clínicas a español y adapta sus respuestas al modelo de presentación existente. La traducción se limita a los cuerpos de finalización/antecedentes y a los bloques clínicos de lectura; no incorpora validaciones médicas ni lógica de persistencia en Next.

Se conservan formularios, etiquetas, borradores en memoria y lectura de registros heredados de las áreas aún pendientes de migración. Las fichas, antecedentes, resúmenes, exportación Word del frontend y hábitos de reportes reciben sus modelos de presentación compatibles. No se migra otra historia ni se habilita acceso Supabase para los flujos ya integrados.

## Pruebas y evidencia

- **111 pruebas Java**, sin fallos, errores u omitidas: equivalencia de entradas españolas/heredadas, conservación de texto libre/null/números/listas, rechazo de alias ambiguos, paridad Java/PostgreSQL, palabras reservadas JSON Schema, persistencia de especialidad, concurrencia, atomicidad y permisos históricos.
- Prueba del adaptador frontend: diccionarios idénticos, transformación reversible, envoltorios HTTP intactos, traducción anidada de antecedentes y rechazo de alias.
- Chromium FE-03: cinco grupos de escenarios, antecedentes/edición/recarga, conflicto, red, permisos y snapshot cerrado.
- Chromium FE-10: cinco grupos de escenarios, datos estructurados y mediciones, permisos, sesión, red, respuesta perdida, rollback y aviso al abandonar. Inspecciona el POST real y confirma `signosVitales.talla` y `antecedentesPersonales.alergicos`, sin las claves antiguas.
- Typecheck, ESLint focalizado, build y comprobación de espacios del diff aprobados.

Comandos en `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
python3 scripts/verificar-json-clinico.py /tmp/salud-u-antes-json-es.json /tmp/salud-u-despues-json-es.json
```

El verificador compara inventarios de filas con estructura `[{tipo,id,fila}]` sin imprimir contenido clínico. Permite filas nuevas después del inventario inicial y exige conservar todas las anteriores.

Comandos en `codigo/salud-u`, con Next/Spring iniciados:

```bash
node scripts/test-clinical-json.mjs
FE03_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs FE03_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe03.mjs
FE10_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs FE10_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node scripts/test-fe10.mjs
npm run typecheck
npx eslint src/lib/clinical-json.ts src/lib/api/client.ts scripts/test-clinical-json.mjs scripts/test-fe03.mjs scripts/test-fe10.mjs
npm run build
git diff --check
```

Las rutas de Chromium y Playwright corresponden al entorno local y son configurables. La prueba del adaptador requiere Node 22 con soporte de eliminación de tipos TypeScript. Los recorridos utilizan las mismas semillas sintéticas de FE-03/10 y crean pacientes propios.

Evidencias locales: `/tmp/salud-u-json-es-{maven,docker,build,fe03,fe10}.log`, `/tmp/salud-u-fe03-evidence/` y `/tmp/salud-u-fe10-evidence/`. Los archivos de inventario/respaldo no se incluyen en Git.
