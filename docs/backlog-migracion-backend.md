# Plan de trabajo Salud-U: backend primero, frontend después

Este índice reemplaza el backlog combinado anterior.

1. [Backlog backend](../../salud-u-backend/docs/backlog-backend.md): desarrollo y pruebas independientes, épicas técnicas y funcionales, UC-01–27, RF-01–34, actores, historias, comportamiento esperado, referencias HTTP/RPC y aceptación.
2. [Backlog frontend](backlog-frontend.md): integración posterior de cada caso con el backend probado, en la rama `backend`.

Fuente: `Proyecto Daniel Mercado v2 db.md` y código actual Next.js/Supabase. La paridad todavía está pendiente de captura y pruebas reales.

El backend vive en `codigo/salud-u-backend` y este frontend en `codigo/salud-u`. No inicializar Git en el backend ni en `codigo`. Primero construir y probar backend; después conectar las pantallas. Las ampliaciones documentales sin endpoint actual se identifican como contratos nuevos, no como paridad ya existente.

## Evidencia de T-01

[Referencia de contratos y ensayo](../../salud-u-backend/docs/reference-t01/README.md): inventario, fixtures sintéticas, SQL/RLS caracterizadas y 129 casos locales aprobados. La comprobación HTTP/SQL real queda pendiente de entorno de prueba.
