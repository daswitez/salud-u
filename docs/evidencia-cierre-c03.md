# C-03 · Recorrido por rol, capturas e instrumento SUS

**Actualización F-04:** la Figura 3.61 ya fue capturada con decisión persistida en [ENTREGAS_CODEX/F-04](../../../ENTREGAS_CODEX/F-04/resumen.md). Las referencias a F-04 pendiente que aparecen abajo describen el corte histórico de C-03. La evaluación SUS con participantes reales continúa pendiente.

Fecha: **27/10/2026**. Fuente vigente: **MSD-Documento proyecto de grado Ver.1.10 u.docx**, aclarada por el usuario. Rama `backend`; producción de Next 16.3.4 en 3000, Spring/PostgreSQL en Docker, Flyway **V96**, Chromium y datos sintéticos. El documento fuente se conserva intacto.

**Resultado: cierre técnico parcial.** Recorrido automatizado aprobado; capturas disponibles para seis de las siete figuras solicitadas. Figura 3.61 pendiente de F-04. Instrumento SUS listo, sin respuestas de usuarios reales por confirmación del usuario. No se declara C-03 ni la aceptación institucional terminadas.

## Recorrido ejecutado

`scripts/test-fecorte-recorrido.mjs` ejecutó **ocho grupos**, seis roles y **47 respuestas API con X-Request-Id de Spring**; ningún origen externo ni Supabase. Es un recorrido **mixto UI/API**: algunos cierres y registros se realizan por API, no llenando toda la ficha desde la pantalla. No representa los tiempos, dificultades ni la finalización sin ayuda de los usuarios del Cuadro 3.69.

| Rol | Verificación actual |
|---|---|
| Estudiante | Login real por formulario, nombre de sesión, solicitud desde navegación, cita confirmada al recargar y dosis visible en carnet |
| Administración | Asignación inicial y de derivación compatibles por API; bandeja de derivaciones por pantalla; registro de dosis persistido |
| Revisión | Inicia atención por UI; actualiza antecedentes/cierra con derivación por API; confirma cierre y consulta historia por pantalla |
| Especialista | Recibe derivación y comienza cita por UI; cierra ficha del área por API; historia autorizada muestra la atención |
| Reportes | API del reporte incluye ambas atenciones; navegación a cumplimiento y consulta del constructor real |
| Auditor | Eventos de cierres/derivación presentes por API y bitácora visible por pantalla |

El script histórico tenía una aserción SQL `CLOSED/ATTENDED`; se actualizó a **CERRADA/ATENDIDA**, valores internos vigentes, conservando los códigos HTTP. Se reejecutó el recorrido completo y aprobó. [Resultado y red](evaluacion/cierre-20261027/recorrido.json), [log](evaluacion/cierre-20261027/recorrido.log), [registro por rol A.6](evaluacion/cierre-20261027/registro-a6.csv), [versión](evaluacion/cierre-20261027/version.json).

## Capturas de las figuras

Generadas desde el código actual con `scripts/capturar-cierre.mjs`, sin editar/componer imágenes ni reutilizar capturas del DOCX como si fueran del código actual. [Índice con fecha, ruta, resolución y SHA-256](evaluacion/cierre-20261027/figuras/indice.json).

| Figura | Evidencia | Estado / ajuste del pie |
|---|---|---|
| 3.54 | [Portal actual](evaluacion/cierre-20261027/figuras/figura-3.54.png) | Recapturada; sin lista de espera. El pie debe describir citas/solicitudes y avisos, sin prometer una campaña descartada |
| 3.55 | [Auditoría](evaluacion/cierre-20261027/figuras/figura-3.55.png) | Capturada con sesión Auditor |
| 3.57 | [Catálogo y esquemas](evaluacion/cierre-20261027/figuras/figura-3.57.png) | Capturada |
| 3.58 | [Registro de dosis](evaluacion/cierre-20261027/figuras/figura-3.58-registro.png) y [carnet complementario](evaluacion/cierre-20261027/figuras/figura-3.58-carnet.png) | Capturadas; carnet incluye la dosis del recorrido real |
| 3.59 | [Constructor, columnas, agrupación y exportación](evaluacion/cierre-20261027/figuras/figura-3.59.png); [investigación](evaluacion/cierre-20261027/figuras/figura-3.59-investigacion.png) | Capturadas. La seudonimización tiene pantalla propia; el constructor clínico no ofrece un selector de modo nominal/seudonimizado |
| 3.61 | Sin captura actual | **PENDIENTE F-04**: `/administrativo/planificacion` redirige al inicio. O-04/O-06 disponibles por API no sustituyen una pantalla de decisión |
| 3.62 | [Bandeja del estudiante](evaluacion/cierre-20261027/figuras/figura-3.62.png) | Capturada con contador y avisos persistidos |

Se conservan **ocho PNG**: seis figuras y dos complementos. La captura de registro de dosis es del formulario; la persistencia de la dosis y el carnet se verifican aparte en el recorrido. Las imágenes son evidencia técnica con datos de prueba, no aprobación humana ni prueba por sí sola de todos los requisitos. No se insertaron automáticamente en el Word ni se modificaron sus pies.

## SUS y tareas humanas

[Instrumento listo](evaluacion/cierre-20261027/instrumento-sus.md): las diez afirmaciones se transcriben del Apéndice A.5 vigente, con escala 1–5 sin selección inicial; incluye las nueve tareas del Cuadro 3.69 y criterios de éxito por rol.

- [Planilla de respuestas](evaluacion/cierre-20261027/sus-respuestas.csv), solo encabezado.
- [Planilla de tareas, tiempos, ayudas y dificultades](evaluacion/cierre-20261027/tareas-usuarios.csv), solo encabezado.
- [Resultado actual](evaluacion/cierre-20261027/sus-resultado.json): **n=0, media=null, umbral=null**, pendiente de respuestas reales.
- `scripts/calcular-sus.py`: valida diez respuestas enteras 1–5, rechaza duplicados y mezcla de versiones; calcula contribuciones impares/pares, puntuación, promedio y promedio por rol. Alfa de Cronbach solo si la muestra y varianza permiten calcularlo, sin interpretar muestras pequeñas como fiables.
- Autopruebas aprobadas para extremos 0/100, neutral 50, caso 82,5, datos inválidos, duplicados, mezcla de versiones y planilla vacía. Son ensayos sintéticos del algoritmo, **no participantes SUS**.

La aceptación documental requiere promedio SUS ≥70 **y** todas las tareas críticas terminadas sin ayuda. Faltan participantes y la tarea de sugerencias requiere F-04. Un recorrido del agente no sustituye esa validación.

## Reproducción

Prerequisitos: backend V96 y Next compilado/servido, cuentas demo locales y herramientas Playwright/Chromium externas a las dependencias del producto. Desde frontend:

```bash
FECORTE_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FECORTE_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
FECORTE_ORIGIN=http://127.0.0.1:3000 \
FECORTE_ARTIFACTS=/tmp/cierre-recorrido node scripts/test-fecorte-recorrido.mjs

CIERRE_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
CIERRE_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
CIERRE_CAPTURAS=/tmp/cierre-capturas-nuevo node scripts/capturar-cierre.mjs

python3 scripts/calcular-sus.py --autoprueba
python3 scripts/calcular-sus.py docs/evaluacion/cierre-20261027/sus-respuestas.csv
```

Adaptar rutas de herramientas y usar directorios nuevos para conservar esta ejecución. El recorrido agrega datos sintéticos y auditoría local; no borra evidencia. Las capturas dependen del recorrido aprobado y sus datos. La prueba de usuario se aplica con el protocolo, sin ejecutar scripts en lugar de las personas.

Verificación complementaria actual: backend **312/0/0/0**, lint completo y typecheck aprobados; inventario frontend aprobado (64 reglas exactas), inventario inglés cero y salud UP. El build de producción vigente es el de F-01/F-02; este cierre solo modifica scripts, documentación y evidencias. [C-01/C-02](../../salud-u-backend/docs/operations/cierre-c01-c02.md).
