# ES-08 · Auditoría con códigos en español

Fecha: 26/10/2026. Rama: `backend`. Backend V79 aplicado y probado antes de validar la interfaz.

La API devuelve las acciones y recursos actuales en español y mantiene SUCCESS/DENIED/FAILURE para resultado. La pantalla muestra los códigos recibidos y las etiquetas Exitoso/Denegado/Fallido. Se añadió una explicación de la preservación de los códigos históricos y de la búsqueda por códigos actuales o anteriores.

## Validación

- `npm run typecheck`: aprobado.
- ESLint de los archivos modificados: aprobado.
- `git diff --check`: aprobado.
- Chromium, regresión FE-24 completa: aprobada. Se actualizaron sus inserciones de enum a EXITO/DENEGADO/FALLO y su aserción del evento de lectura a EVENTOS_AUDITORIA_CONSULTADOS.
- Comprobación adicional de la pantalla fuente actualizada en puerto 3001: 25 eventos con PACIENTE_CREADO y paciente; resultado Exitoso; filtros PATIENT_CREATED/patient y PACIENTE_CREADO/paciente devuelven los mismos IDs. Aviso de conservación histórica visible. Instancia temporal detenida al terminar.

```bash
FE24_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE24_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
FE24_ARTIFACTS=/tmp/salud-u-es08-fe24-evidence node scripts/test-fe24.mjs
```

Evidencia local en `/tmp/salud-u-es08-fe24-evidence`: `resultado.json`, `auditoria.png`, `es08-pantalla.json` y `es08-codigos-espanol.png`. El script adicional usado para la comprobación fuente está en `/tmp/es08-pantalla.mjs` y usa la cuenta sintética del resultado FE-24.

Se adaptaron además las aserciones SQL de auditoría de FE-21, FE-22, FE-25, FE-26, FE-27 y FE-INV a los códigos españoles. En FE-26 se eliminó la dependencia del orden alfabético de las acciones; en FE-22 se espera FALLIDA en la fila SQL, manteniendo FAILED por HTTP. Esos seis ensayos completos no se volvieron a ejecutar como parte de ES-08.

El frontend previamente compilado en puerto 3000 sigue operativo y muestra los nuevos códigos recibidos; el aviso textual nuevo se validó en la instancia temporal y requiere recompilar el frontend para aparecer en ese servidor.

Backend y preservación de las 7.462 filas históricas: [evidencia ES-08](../../salud-u-backend/docs/operations/es08-exportaciones-y-auditoria-en-espanol.md).
