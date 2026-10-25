# FE-CAT · Corrección del listado de cuentas

Validado localmente el 2026-10-24 con Next.js, Spring y PostgreSQL de prueba. Corrige el defecto descubierto durante FE-09 en `GET /api/v1/admin/principals`.

## Causa y cambio

`listar_principales_administracion()` devuelve la columna SQL `rols`; Java intentaba leer `roles`. La consulta ahora declara `rols AS roles`, conservando la firma SQL y el contrato JSON que usa el frontend.

Además, la migración Flyway V44 excluye la fila nula del `LEFT JOIN`: las cuentas sin roles o con todos sus roles revocados devuelven `roles: []`. Se conservan orden, estado de la cuenta y roles vigentes.

El manejador de errores de Spring traduce los fallos de persistencia no gestionados a `500`, con código `PERSISTENCE_FAILURE` en `/api/v1/**` y texto en `/api/**`. No expone la sentencia SQL, detalles de conexión ni contraseñas. Estos fallos ya no se despachan como un falso `401`.

## Evidencia

| Verificación | Resultado |
|---|---|
| Listado por API con administrador real Spring | `200`, cinco cuentas sintéticas y arrays de roles válidos. |
| Pantalla `/administrativo/personal-medico` | Cuentas y roles visibles; recarga correcta. |
| Identidad después de recargar | `/api/me` devuelve `200`. |
| Listado con estudiante | `403/FORBIDDEN`. |
| Listado sin sesión | `401/UNAUTHENTICATED`. |
| PostgreSQL temporal | Mapeo real de columnas, múltiples roles, cuenta inactiva, ausencia de roles, roles revocados, orden y rechazo a estudiante. |
| Error de persistencia simulado en MVC | `500` sanitizado; se conserva el contrato correspondiente a cada familia de rutas y la siguiente consulta válida responde `200`. |
| Regresión Java | 94 pruebas, cero fallos, errores u omisiones. |
| Chromium y lint del script | Aprobados; sin solicitudes del navegador a Supabase. |

Se reconstruyó Spring local y se aplicó V44. La prueba de navegador solo consulta cuentas y permisos; no modifica usuarios, roles ni catálogos.

## Reproducción

Desde `codigo/salud-u-backend`:

```bash
mvn test -q
docker compose up --build -d
```

Con Next local conectado a Spring, desde `codigo/salud-u`, reutilizando el entorno Playwright de los incrementos anteriores:

```bash
FECAT_PLAYWRIGHT=/tmp/salud-u-fe08-browser/node_modules/playwright/index.mjs node scripts/test-fecat-accounts.mjs
npx eslint scripts/test-fecat-accounts.mjs
git diff --check
```

En este equipo se indicó también `FECAT_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`. Se pueden configurar las cuentas demo mediante `FECAT_ADMIN`, `FECAT_STUDENT` y `FECAT_PASSWORD`.

Los artefactos están en `/tmp/salud-u-fecat-accounts-evidence/resultado.json` y `cuentas.png`. El JSON registra estados y solicitudes, sin cookies ni contraseñas. Los logs de regresión son `/tmp/salud-u-fecat-fix-maven.log` y `/tmp/salud-u-fecat-fix-mvc.log`.

El defecto del listado queda cerrado. La aceptación completa de las operaciones de FE-CAT mantiene sus criterios del backlog.
