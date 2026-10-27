# FE-25 · Catálogo de vacunas y esquemas de dosis

Fecha: 2026-10-26. Trazabilidad: UC-25 / BE-25 / RF-29; RN-29 y RN-30. Ensayo exclusivamente local con datos sintéticos, Next en producción, Spring y PostgreSQL reales.

## Resultado local

176 pruebas Java aprobadas, sin fallos/errores/omitidas. Seis grupos Chromium aprobados; regresiones FE-23 y FE-24 ejecutadas después del cambio de navegación. Compilación de producción, typecheck, lint de los archivos del cambio y lectura YAML de OpenAPI aprobados. Se inspeccionó la captura del catálogo. Next y Spring permanecen iniciados en localhost:3000 y localhost:8080.

## Implementación

No existía pantalla equivalente en la aplicación anterior ni consumo Supabase de vacunas: la función se presenta como nueva en `/administrativo/vacunas`, con entrada "Vacunas" en la navegación administrativa. Next reenvía exactamente `/api/vaccines` y `/api/vaccines/:vaccineId` a Spring; no hay Route Handler, regla de negocio ni fallback en Next.

La pantalla lista el catálogo (activas o todas), crea vacunas, edita código/nombre/estado/dosis y desactiva o reactiva desde la fila. Cada dosis se muestra con su intervalo mínimo desde la anterior. La dosis 1 es la inicial; la numeración es la posición en el formulario y los límites HTML (`required`, longitudes, 1–3650 días, máximo 20 dosis) sólo orientan: Spring/PostgreSQL validan número, orden e intervalo, y la prueba elimina el límite del navegador para comprobar el rechazo del servidor desde pantalla. La opción "Mostrar inactivas" queda en la URL (`?inactivas=1`) y se conserva al recargar.

Desactivar crea una versión no vigente del esquema y deja intactas las versiones anteriores y las dosis aplicadas: la prueba registra una dosis con la versión 2, desactiva y comprueba que la dosis sigue enlazada a esa versión y que Spring rechaza una dosis nueva de la vacuna inactiva.

## Cambio de backend necesario (BE-25)

El contrato anterior respondía `400 El esquema de vacuna no es válido.` para cualquier fallo y aceptaba formularios desactualizados, de modo que una edición podía reemplazar sin aviso la versión creada por otra persona. V66 agrega una sobrecarga `guardar_vacuna_y_esquema(..., p_version_esperada)` que bloquea la fila de la vacuna, compara la última versión y distingue código duplicado y vacuna inexistente. Se conserva la firma de cinco argumentos.

- `PUT /api/vaccines/{id}` acepta `expectedSchemaVersion` opcional; la pantalla siempre envía la versión que mostró. Si otra versión es posterior: `409` sin crear versión.
- Código duplicado (sin distinguir mayúsculas ni espacios): `409 Ya existe una vacuna con ese código.`
- Vacuna inexistente: `404`. Esquema inválido: `400`. Sin rol: `403`. Sin sesión: `401`.
- OpenAPI actualizado; pruebas MVC de los nuevos códigos y prueba PostgreSQL de versión desactualizada, duplicado e inexistente.

## Escenarios verificados en navegador

1. Administrativo crea una vacuna de tres dosis usando etiquetas y teclado; el cuerpo enviado coincide con BE-25 y el código se normaliza en Spring. El esquema reaparece después de recargar.
2. Editar envía la versión esperada y crea la versión 2; desactivar la oculta de activas, conserva dosis aplicadas y versiones (3 esquemas, 7 dosis de esquema) e impide registrar dosis nuevas; reactivar persiste.
3. Código duplicado, formulario desactualizado e intervalo inválido muestran el mensaje del servidor, mueven el foco al error y conservan el borrador; "Recargar catálogo" muestra la versión vigente sin descartar lo escrito. Por API se rechazan código corto, intervalo 0 en dosis siguiente, intervalo inicial distinto de 0, salto de numeración, intervalo mayor a 3650, 21 dosis, lista vacía y vacuna inexistente, sin filas parciales.
4. Red caída, `500` y sesión cerrada conservan el formulario; tras iniciar sesión real se reintenta y guarda. Un error de lectura oculta filas anteriores; lista vacía y carga se representan.
5. Médico de revisión, estudiante y Reportes reciben `403` en lectura y escritura; anónimo `401`. Reportes ve "Acceso restringido"; el estudiante es redirigido. Cada cambio deja un evento `VACCINE_CREATED`/`VACCINE_UPDATED`.
6. Todo el tráfico de vacunas va a `/api/vaccines` del mismo origen; ninguna solicitud a Supabase.

Actualización FE-26: la dosis histórica del ensayo se siembra como Administrativo por el rewrite `/api/vaccinations`, indicando al médico demo como aplicador; la dosis sobre vacuna inactiva responde ahora `409`.

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
npx eslint scripts/test-fe25.mjs src/app/administrativo/vacunas src/components/app-sidebar.tsx next.config.ts
FE25_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE25_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe25.mjs
```

El script limita su origen a localhost/127.0.0.1, crea vacunas y una cuenta de Reportes identificadas `FE25-<marca>` y guarda resultado, tráfico y captura en `/tmp/salud-u-fe25-evidence`. Las vacunas sintéticas quedan en la base local (no se borran, por diseño del catálogo).

## Pendiente

Registro de dosis (FE-26), carnet y cobertura (FE-27) y la regresión integral FE-CORTE quedan fuera de este cierre.
