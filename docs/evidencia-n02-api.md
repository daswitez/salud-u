# N-02 · API de bandeja y preferencias desde la web

Fecha de cierre: 27/10/2026. Rama: `backend`. Backend V83 probado antes de añadir el proxy.

`next.config.ts` reenvía GET /api/notifications, PATCH /api/notifications/{id}/read y GET/PUT /api/me/notification-preferences a Spring. No se añadió lógica de dominio a Next ni se construyeron todavía las pantallas F-01/F-02.

`scripts/test-n02.mjs` crea dos cuentas sintéticas, inicia sesiones reales con cookies/CSRF y verifica:

- Tres avisos generados por N-01, páginas sin duplicados y contador total propio.
- Lista ajena inaccesible y mismo cuerpo 404 al marcar un aviso ajeno o inexistente.
- Lectura idempotente y contador actualizado.
- Preferencias predeterminadas sin escritura por GET, PUT persistido y aislamiento entre cuentas.
- Identidad ajena en el cuerpo rechazada, cursor inválido 400, falta de CSRF 403 y anónimo 401.
- Cache-Control no-store, private en las respuestas satisfactorias.

Resultado: **aprobado a través de Next temporal en 127.0.0.1:3001**, con Spring V83 en 8080. Evidencia `/tmp/salud-u-n02-evidence/resultado.json`. Typecheck, ESLint de next.config.ts/script y diff check aprobados.

```bash
N02_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
N02_ORIGIN=http://127.0.0.1:3001 node scripts/test-n02.mjs
```

El script admite un origen local directo de Spring para repetir el ensayo sin proxy. Requiere credenciales demo locales y Docker para sus fixtures N02; no apunta a producción. Las cuentas, avisos y auditoría del ensayo se conservan.

La instancia temporal se detuvo al finalizar. El frontend ya compilado en puerto 3000 sigue con su configuración anterior; las reglas nuevas se activarán al recompilar/reiniciar esa instancia. El backend está levantado con la API disponible.

Contrato, SQL, permisos, pruebas y límites: [N-02 backend](../../salud-u-backend/docs/operations/n02-bandeja-y-preferencias-api.md).
