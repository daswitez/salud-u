# F-07 · Panel de métricas del componente

Fecha: 27 de octubre de 2026. Trazabilidad: O-08, RF-41, cuadro 3.70. Rama frontend: `backend`.

## Resultado

La pantalla `/administrativo/metricas` («Métricas de agenda» en el menú de Administración) consume `GET /api/scheduling/metrics?from&to`, cuya regla exacta ya estaba en `next.config.ts`. Muestra, para el período elegido:

- **Uso de la capacidad:** cupos ociosos y jornadas con sobrecarga, con el riesgo máximo configurado y las jornadas con sobrecupo.
- **Espera hasta la cita:** media, mediana y percentil 90, en días.
- **Calidad del pronóstico:** puntuación de Brier frente a la asistencia constante inicial (con la mejora relativa) y error absoluto medio de la demanda frente a repetir la semana anterior. Cada tarjeta dice si el modelo es mejor o peor que su línea base.
- **Aceptación de sugerencias:** tasa, rechazadas o vencidas, pendientes y tabla por tipo.
- **Avisos de la bandeja:** entregados, leídos, tasa de lectura y tabla por tipo de evento.

Un indicador `null` se muestra como «Sin datos», nunca como cero. El período se valida antes de llamar al backend, se conserva en la URL y sin parámetros se usan los 30 días que terminan ayer (valor por defecto de Spring). Solo Administración: el endpoint responde 403 a los demás roles, el médico vuelve a su espacio y Reportes ve el acceso restringido.

Archivos: `src/components/scheduling-metrics.tsx`, `src/app/administrativo/metricas/page.tsx`, entrada `metrics` en `src/components/app-sidebar.tsx`.

## Verificación

- `npx tsc --noEmit` y `npx eslint .` sin errores; `next build` de una copia del árbol sin errores.
- `scripts/verificar-f07-f09.mjs` sobre la pila desechable `salud-u-capturas` (Spring 20080, Next 3100) con cuentas `@demo.invalid`: 5/5 PASS.

## Captura

`ENTREGAS_CLAUDE/F-07/`, período 01/10/2026 a 30/11/2026. **Los datos son sintéticos.** La base de capturas no tiene jornadas pasadas cerradas, así que para que capacidad, sobrecarga, Brier y error de demanda tuvieran valores se insertaron 25 jornadas sintéticas (21/09 a 23/10/2026, revisión inicial del Dr. Carlos Méndez) directamente en `observacion_jornada` de esa base desechable. Los valores de la captura no son resultados del componente y no deben citarse como tales.
