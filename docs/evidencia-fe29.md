# F-02 · Preferencias de avisos en el perfil

Fecha: **27/10/2026**. Estado: **terminada y verificada localmente**. Rama: `backend`. Continúa la secuencia de evidencias frontend; corresponde a **F-02 de la nueva épica F**, distinta de la historia anterior FE-02 de pacientes. Dependencia N-02, contra backend **V96**. Prueba compartida y comandos: [F-01](evidencia-fe28.md).

## Cambio

`/perfil` incorpora un formulario independiente para avisos, después de datos y seguridad. Guardar preferencias no solicita contraseña ni cambia credenciales/sesión.

- `GET /api/me/notification-preferences` carga las preferencias reales; no se muestran valores ficticios antes de recibir la respuesta.
- `PUT /api/me/notification-preferences` envía exclusivamente `receiveReminders` y `reinforcedReminder`, booleanos, mediante cookies/CSRF del cliente API existente.
- «Recibir recordatorios de citas» controla el aviso ordinario del día anterior. «Permitir un recordatorio adicional» controla el del día de la cita cuando corresponda; la ayuda explica que requiere los recordatorios habilitados. Ambas preferencias se conservan independientemente y las cuatro combinaciones de N-02 siguen siendo válidas.
- Se informa que los avisos de cambios/cancelaciones llegan siempre a la bandeja. No se ofrece SMTP ni lista de espera.
- Estado de carga; error recuperable de consulta; guardado con confirmación y fecha de Bolivia; controles desactivados mientras se guarda y si no hay cambios. Un error al guardar conserva el borrador. Sesión vencida permite volver a login.
- Nombre accesible y descripción separados para cada checkbox; controles nativos y grupo con leyenda. No se añaden campos de preferencias a los formularios de contraseña/datos.

Se elimina `notifications` y su propiedad ficticia `waitlist` de `AppSession` en `src/lib/session.ts`. La identidad se toma de `/api/me` y las preferencias exclusivamente de su endpoint. Se retira el bloque informativo de avisos que estaba dentro del formulario de datos personales.

`next.config.ts` conserva la regla exacta `/api/me/notification-preferences` preparada por N-02, ahora documentada como F-02. El mismo proxy admite GET/PUT; no hay API de negocio en Next ni identificadores de terceros en el formulario.

## Verificación

`scripts/test-fe01-fe02.mjs`, cinco grupos aprobados con Next de producción/Spring/PostgreSQL reales:

- Los seis roles acceden al formulario; anónimo redirigido al login.
- GET devuelve los valores predeterminados del backend sin crear una fila: se comprueba por SQL antes y después de abrir el perfil.
- Guardado mediante navegador, cuerpo exactamente con los dos booleanos; dos clics consecutivos provocan una sola petición PUT.
- Desactivar el ordinario manteniendo el adicional se conserva al recargar; el otro estudiante mantiene sus propias preferencias.
- Ante 503 de guardado se conservan las selecciones, se puede reintentar y luego se confirma persistencia por recarga real. El error se inyecta en navegador; los guardados satisfactorios llegan al backend.
- Ante 503 de carga no aparece un formulario con valores inventados; «Reintentar preferencias» recupera la consulta real.
- Perfil sin desborde horizontal a 320, 390, 768 y 1366 píxeles; axe WCAG A/AA sin incidencias.

Artefactos reproducibles en `/tmp/salud-u-fe01-fe02-evidence/`: `resultado.json`, `red.json`, `axe-perfil.json`, `preferencias-escritorio.png` y `preferencias-movil.png`. Logs de la corrida `/tmp/fe01-browser.log`.

Lint completo, typecheck, build, inventario frontend y diff check aprobados. Backend: 312 pruebas sin fallos ni omisiones, sin cambios en este avance; inventario inglés cero. Regresión ES-10 de seis roles aprobada. No es una validación manual con usuarios finales.

El contacto de emergencia y los consentimientos del perfil siguen en F-08/F-10, respectivamente. No se consideran parte de este cierre.
