# ES-10 · Recorrido de cierre por los seis roles

Fecha: 26/10/2026. Rama: `backend`. Backend V80/V81 aplicado, inventario local cero y pruebas de integración aprobadas antes del recorrido.

`scripts/test-es10.mjs` usa Chromium y sesiones Spring mediante el formulario real de login. Verifica nueve vistas entre Administración, revisión, especialista, estudiante, Reportes y Auditor. Comprueba pacientes y derivaciones, agenda y horarios, carnet, reporte institucional, CSV, auditoría y filtros históricos. Los DTO conservan los códigos y campos HTTP existentes.

También verifica permisos cruzados 403, vacuna duplicada 409 con `vacuna_codigo_unico` y cierre de sesión seguido de 401. Crea cuentas/catálogos/vacuna de prueba con marcador ES10. No elimina evidencia de auditoría al terminar.

```bash
ES10_PLAYWRIGHT=/tmp/salud-u-browser/node_modules/playwright/index.mjs \
ES10_CHROMIUM=/home/daswits/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
node scripts/test-es10.mjs
```

**Resultado:** aprobado. Nueve vistas y comprobaciones adicionales; sin 5xx en el tráfico de páginas registrado. `npm run typecheck`, ESLint del script y `git diff --check` aprobados. No se modificaron pantallas para adaptar nombres SQL: esos cambios se resuelven en Java.

Capturas, peticiones y resultado: `/tmp/salud-u-es10-evidence/resultado.json` y PNG por rol/vista. Es un recorrido de navegador automatizado por el agente; la validación humana institucional y SUS siguen en C-03.

Diccionario, regla del borde, cambios SQL/Java, pruebas y preservación de datos: [base en español](../../salud-u-backend/docs/operations/base-en-espanol.md).
