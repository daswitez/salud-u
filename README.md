# Salud Universitaria — Frontend

Frontend de una plataforma universitaria orientada a historias clínicas, atención inicial, derivaciones a especialidades y reportes autorizados. Las citas por cupo son un apoyo administrativo; no son el centro del producto.

## Alcance actual

- Registro único de estudiantes por carnet y código de registro.
- Historia clínica longitudinal, atenciones, diagnósticos, etiquetas y adjuntos.
- Derivaciones desde revisión estudiantil a Dermatología, Oftalmología, Medicina Interna y Urología.
- Consulta de pacientes por médico y reportes filtrables de atención.

## Desarrollo

```bash
pnpm install
pnpm dev
```

## Documentación funcional

Comenzar por [00_contexto_maestro_para_agentes.md](./00_contexto_maestro_para_agentes.md), seguido de [01_requisitos_y_procesos.md](./01_requisitos_y_procesos.md) y [08_backlog_priorizado.md](./08_backlog_priorizado.md). Para la implementación del backend con Supabase, consultar [11_arquitectura_supabase_y_modelo_datos.md](./11_arquitectura_supabase_y_modelo_datos.md).

La migración inicial ejecutable para Supabase se encuentra en [20260918150000_initial_clinical_schema.sql](./supabase/migrations/20260918150000_initial_clinical_schema.sql).
