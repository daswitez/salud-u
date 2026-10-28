# F-01 · Bandeja de avisos con contador en el encabezado

Fecha: **27/10/2026**. Estado: **terminada y verificada localmente**. Rama: `backend`. Este archivo continúa la secuencia de evidencias FE-03…FE-27; corresponde a **F-01 de la nueva épica F**, no a la historia anterior FE-01 de sesión.

Dependencias verificadas: N-02; contrato inglés de V85; tipos de recordatorio de N-03/O-03. Backend local actual **V96**, sin nuevas migraciones en este avance. Referencias: RF-35/RF-36, UC-28, PA-20 y pantalla prevista como Figura 3.62 en el backlog.

## Interfaz y consumo

- `/estudiante/avisos` reemplaza la redirección anterior. `/medico/avisos` y `/administrativo/avisos` comparten la misma bandeja privada.
- Acceso desde la campana del encabezado y «Mis avisos» del menú de escritorio. La campana sigue disponible en móvil. Admite estudiante, revisión, especialista, Administración, Reportes y Auditor, conforme a N-02.
- `GET /api/notifications?limit=20`, cursor opaco codificado en `before` para cargar más, sin OFFSET ni filtros de destinatario. Deduplicación por ID al combinar páginas. «Actualizar bandeja» vuelve a la primera página y refleja cambios de entrega/reprogramación.
- `PATCH /api/notifications/{id}/read` mediante el cliente existente con cookies y CSRF. Solo actualiza el aviso tras confirmar el servidor; no hay botón global ni promesas de leer avisos que todavía no se cargaron.
- El contador global usa el `unreadCount` del servidor. Consulta ligera con `limit=1` al montar, cada 60 segundos mientras la pestaña esté visible, al volver al navegador o recuperar conexión, y después de marcar leído. La lista también comunica su contador. Cargar más o marcar leído conserva la paginación.
- Estado compartido en memoria por sesión, con proveedor identificado por principal en los layouts y en perfil. Consultas abortables al reemplazar/cerrar; sin almacenamiento de avisos en localStorage. Una respuesta anterior del contador se cancela al aceptar el resultado de la lista.
- Presentación española de los seis códigos de evento HTTP ingleses, incluido APPOINTMENT_REMINDER_REINFORCED. Leído/sin leer distingue texto y estilo. Las fechas muestran hora de Bolivia. El contenido operativo se renderiza como texto, sin HTML inyectado, identificadores de destinatario ni enlaces a fichas ajenas.
- Carga, vacío, fallo de consulta con reintento, 404 al leer, sesión vencida con acceso al login y contador indisponible (`!`) sin convertir el fallo en cero avisos. Los dobles clics de lectura se bloquean durante la operación.

`next.config.ts` mantiene las reglas exactas ya preparadas por N-02 para `/api/notifications` y `/api/notifications/:notificationId/read`; ahora están identificadas con F-01. No requiere reescribir las URLs de pantalla hacia Spring. No se añade lógica de dominio ni Route Handler en Next.

## Evidencia reproducible

Prerequisitos: backend local con datos demo, Next compilado y servido en 3000, Playwright/Chromium y axe-core fuera de las dependencias del producto.

```bash
npm run lint
npm run typecheck
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

En otra terminal, adaptar las rutas de las herramientas si corresponde:

```bash
FE01_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
FE01_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-fe01-fe02.mjs
```

El script usa **Next de producción + Spring + PostgreSQL reales**, cuentas sintéticas nuevas para los seis roles y otro estudiante. Genera 23 citas sintéticas; sus avisos operativos salen del trigger real (asignación, reprogramación, cancelación y ausencia). Siembra dos recordatorios explícitos para probar su presentación; no los presenta como una prueba nueva del programador N-03/O-03. Conserva los datos sintéticos y la auditoría; no elimina evidencia.

Resultado: **cinco grupos aprobados** de F-01/F-02. Para F-01:

- 28 avisos propios, primera página de 20 y segunda de 8; sin duplicados; seis eventos reconocidos.
- Apertura por campana, contador 28 → 27 tras leer y 26 después de lectura externa con regreso a la pestaña; lectura y fecha conservadas al recargar.
- Dos clics consecutivos producen una sola petición de lectura. Contador global independiente de la página.
- Los otros cinco roles y otro estudiante ven su bandeja vacía y contador cero; avisos ajenos e inexistentes producen el mismo 404.
- Anónimo redirigido a login en las tres bandejas y perfil; estudiante no entra en la ruta médica.
- Carga demorada con control desactivado; 503 de lista y recuperación, 404 de lectura, 503 del contador y recuperación, 401 con enlace a login. Estos fallos se inyectan en el navegador; los recorridos satisfactorios usan el backend real.
- Escritorio 1366 y anchos 320/390/768 sin desborde horizontal. Campana enfocada por teclado. Axe WCAG A/AA sin incidencias en bandeja de escritorio y móvil, y en perfil.

Artefactos: `/tmp/salud-u-fe01-fe02-evidence/resultado.json`, `red.json`, `axe-*.json`, `bandeja-escritorio.png`, `bandeja-movil.png` y capturas de preferencias. El script vuelve a generarlos.

## Regresión y límites

- Backend: `mvn -B -ntp verify`, **312 pruebas, 0 fallos, 0 errores, 0 omitidas** antes de la integración; inventario inglés **0**.
- Frontend: lint completo, typecheck, build de producción y `git diff --check` aprobados.
- `node scripts/check-fecorte-inventory.mjs`: aprobado; **64 reglas exactas**, sin Supabase, Route Handlers ni Server Actions de negocio; bundle sin origen interno ni contraseña de pruebas.
- `scripts/test-es10.mjs`: nueve vistas de los seis roles aprobadas, con contratos, permisos cruzados, CSV, duplicado 409 y cierre de sesión 401. Logs `/tmp/fe01-regresion.log`; resultado en `/tmp/salud-u-fe01-regresion-es10/`.
- Next compilado y disponible localmente en 3000; API de salud vía proxy UP. No se modificó el backend ni el programador.

La bandeja no recibe eventos por WebSocket: los nuevos avisos se detectan en el contador y la lista se actualiza al abrirla o con su botón. No hay correo. La prueba automatizada no sustituye la validación con usuarios ni el cuestionario SUS de C-03. Las restantes historias F-03…F-10 siguen separadas.

Preferencias: [evidencia F-02](evidencia-fe29.md).
