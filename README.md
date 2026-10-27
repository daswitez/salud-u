# Salud Universitaria — Frontend

Frontend de una plataforma universitaria orientada a historias clínicas, atención inicial, derivaciones a especialidades y reportes autorizados. Las citas por cupo son un apoyo administrativo; no son el centro del producto.

## Alcance actual

- Registro único de estudiantes por carnet y código de registro.
- Historia clínica longitudinal, atenciones, diagnósticos, etiquetas y adjuntos.
- Derivaciones desde revisión estudiantil a especialidades.
- Consulta de pacientes por médico, reportes filtrables, cumplimiento, vacunación, exportación para investigación y auditoría.

## Arquitectura

Next.js sólo presenta pantallas. Toda la lógica, la sesión y los datos están en el backend Spring Boot + PostgreSQL de `../salud-u-backend`. Las rutas `/api/**` se reenvían de forma exacta a Spring mediante los rewrites de `next.config.ts`, y las pantallas SSR consultan la identidad con `/api/me`. No hay Route Handlers, Server Actions, Supabase ni claves de servicio en el frontend.

## Desarrollo

1. Levantar el backend (ver `../salud-u-backend/README.md`): `docker compose up --build -d`.
2. Copiar `.env.example` a `.env.local` y ajustar `SALUD_U_BACKEND_ORIGIN` si Spring no está en `http://localhost:8080`.
3. Instalar con el gestor del lockfile y arrancar:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

`SALUD_U_TEST_ACCESS_PASSWORD` sólo muestra en el login la ayuda de cuentas sintéticas en entornos locales; no se define en un despliegue institucional.

## Verificación

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
node scripts/check-fecorte-inventory.mjs
```

Los recorridos de aceptación por historia (`scripts/test-*.mjs`) usan Playwright contra Next en producción y Spring/PostgreSQL locales, sólo con datos sintéticos. La aceptación integral está en [docs/evidencia-fecorte.md](docs/evidencia-fecorte.md).

## Documentación funcional

Comenzar por [00_contexto_maestro_para_agentes.md](./00_contexto_maestro_para_agentes.md), seguido de [01_requisitos_y_procesos.md](./01_requisitos_y_procesos.md) y [08_backlog_priorizado.md](./08_backlog_priorizado.md). La migración a Spring está en [docs/backlog-frontend.md](docs/backlog-frontend.md) y [docs/plan-integracion-spring.md](docs/plan-integracion-spring.md). [11_arquitectura_supabase_y_modelo_datos.md](./11_arquitectura_supabase_y_modelo_datos.md) describe la arquitectura Supabase anterior y se conserva como referencia histórica; el SQL original quedó archivado en `../salud-u-backend/docs/reference-t01/sources/supabase`.
