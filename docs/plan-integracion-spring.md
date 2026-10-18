# Plan de integración Next.js ↔ Spring

Este plan convierte gradualmente `salud-u` desde Next.js/Supabase hacia el backend Spring de `../salud-u-backend`. Complementa el [backlog de integración](backlog-frontend.md): el backlog define historias y aceptación funcional; este documento fija el orden técnico, los contratos de frontera y las puertas de avance.

## Estado de partida

- El frontend está en la rama `backend` y aún ejecuta 24 Route Handlers bajo `src/app/api`, Supabase Auth, `proxy.ts` y consultas SSR directas a Supabase.
- Spring ya publica rutas de compatibilidad `/api/**` para consumidores actuales, rutas versionadas `/api/v1/**`, `GET /api/health` y OpenAPI en `/openapi/salud-u-v1.yaml`.
- Los contratos heredados usan `error` como texto. Solo `/api/v1/**` devuelve el objeto `{code,message,details,requestId}`. El cliente no debe asumir una forma única sin normalizarla.
- H-CORTE todavía no está aceptado: faltan la suite limpia de Next, el ensayo completo Docker/backup/restore y el ensayo de migración sintético. Esto no impide planificar o integrar con datos de prueba, pero impide el corte productivo y la retirada definitiva de Supabase.

## Principios no negociables

1. No exponer `DB_*`, credenciales Supabase ni secretos de archivos al bundle del navegador.
2. Conservar la misma identidad en SSR, navegación y `fetch`: la cookie opaca Spring (`SALUD_U_SESSION`) y la cookie CSRF dedicada (`SALUD_U_CSRF`) deben viajar por el mismo origen.
3. Cada migración elimina la consulta Supabase del flujo afectado; no se acepta una escritura duplicada Next/Supabase/Spring.
4. Migrar por caso de uso completo: carga, vacío, error, permiso, recarga y concurrencia relevante. No declarar una pantalla lista sólo porque renderiza.
5. Mantener datos reales fuera de pruebas de integración, migración y rollback.

## Decisión de transporte (P0, antes de una pantalla)

La URL pública se conserva bajo el mismo origen. Hay dos alternativas válidas:

- **Preferida para despliegue:** el reverse proxy entrega Next para páginas y reenvía `/api/**`, `/api/v1/**` y `/actuator/health/**` a Spring. Al activar una ruta se elimina su Route Handler de Next, para que no exista competencia.
- **Transición local controlada:** `next.config.ts` reenvía exclusivamente rutas ya migradas a un origen configurado únicamente en servidor. Nunca habilitar una regla amplia que capture una ruta que todavía tiene handler serverless.

Antes de elegir una alternativa se debe documentar origen, TLS, cookies `Secure` y `SameSite`, cabeceras `X-Forwarded-*`, timeouts y el rollback. Una prueba debe demostrar que `/api/me` y una mutación ven la misma cookie desde SSR y navegador.

## Secuencia priorizada

| Orden | Backlog | Resultado mínimo verificable | Bloquea |
| --- | --- | --- | --- |
| P0.0 | Preparación | `pnpm install --frozen-lockfile`, lint, typecheck y build reproducibles; cuenta Spring sintética provisionada. | Todo consumo real. |
| P0.1 | FE-CON | Transporte mismo origen y `GET /api/health` muestra `service=backend`; retirar `GET /api/health/supabase`, sin fallback Supabase. | Sesión y flujos. |
| P0.2 | FE-CON | Cliente HTTP central obtiene `/api/v1/security/csrf`, reusa token/sesión y agrega el encabezado en mutaciones; no fuerza `Content-Type` para `FormData`. | Toda escritura. |
| P0.3 | FE-01 | Login, `/api/me`, logout, guardias y `proxy.ts` consumen Spring; eliminar Supabase Auth y `demo-session` de este flujo. | Autorización de pantalla. |
| P0.4 | FE-02, FE-04…FE-12 | Admisión → agenda → llegada → revisión/documentos → cierre, migrado por caso completo y probado por rol. | Flujo clínico principal. |
| P0.5 | FE-13…FE-17 | Derivación → asignación → especialidad → resolución → historia, incluyendo contexto remitido y permisos entre áreas. | Historia longitudinal. |
| P1 | FE-CAT, FE-PER, FE-18, FE-21…FE-26, H-INV | Catálogos/perfil, búsqueda, reportes, exportaciones, cumplimiento, auditoría, vacunas e investigación. | Retiro final. |
| P2 | FE-19, FE-20, FE-27 | Adendas, Word y carnet/cobertura. | Retiro final. |
| P0 final | FE-CORTE / F9 | Ausencia de Supabase y de Route Handlers de negocio; regresión, recuperación y aceptación conjunta. | Corte productivo. |

`FE-03` (antecedentes) se integra junto a revisión entre FE-09 y FE-10; no se pospone pese a su numeración. Cada fila se cierra sólo si también cumple los criterios individuales ya definidos en `backlog-frontend.md`.

## Evidencia local de FE-01 (2026-10-18)

- Se reemplazaron Supabase Auth, `demo-session.ts` y el Route Handler local de `/api/me` por sesión Spring; `proxy.ts` ya no inicializa Supabase.
- El navegador obtiene CSRF desde `/api/v1/security/csrf`, usa `POST /api/v1/auth/login`, consulta `/api/me` desde SSR y cierra por `/api/v1/session/logout`.
- Se separó `SALUD_U_CSRF` de la cookie opaca `SALUD_U_SESSION`; ambas son requeridas para mutaciones autenticadas y no comparten nombre.
- Recorrido HTTP local aprobado con cuenta sintética: login `200`, `/api/me` `200`, recarga SSR de `/perfil` `200`, logout `204`, `/api/me` posterior `401` y credenciales inválidas `401`.
- Validación de archivos modificados: TypeScript y ESLint sin errores. Las acciones de perfil siguen explícitamente en FE-PER y no forman parte del cierre de FE-01.

## Contratos de frontera a implementar en FE-CON

### Health

El reemplazo exacto es `GET /api/health`. Respuesta disponible:

```json
{"ok":true,"service":"backend","status":"UP","error":null}
```

No renombrar el servicio como Supabase ni conservar un fallback hacia `/api/health/supabase`. Los probes operativos profundos permanecen en `/actuator/health/readiness` y no son una API de pantalla.

### Sesión y CSRF

1. Al cargar la aplicación o antes del primer `POST`, `PATCH`, `PUT` o `DELETE`, solicitar `GET /api/v1/security/csrf` con credenciales del mismo origen.
2. Mantener token y nombre de cabecera en memoria; enviar el token sólo en mutaciones. Una respuesta `403/CSRF_INVALID` obliga a obtenerlo una vez y reintentar sólo la petición segura de reintentar.
3. Autenticar por `POST /api/v1/auth/login`, leer identidad mediante `/api/me` y cerrar por `POST /api/v1/session/logout`; nunca leer la cookie HttpOnly.
4. Cuando sesión caduque, preservar borradores no clínicos en memoria y redirigir a login sin reintentar ciegamente escrituras clínicas.

### Errores

El adaptador debe normalizar a un mensaje de UI sin perder el request id:

- `/api/**`: `error` es texto (`unauthenticated`, `forbidden` o mensaje).
- `/api/v1/**`: `error.message` es el texto y `error.code` clasifica el caso.
- Respuestas no JSON, red y `503` deben mostrarse como indisponibilidad; nunca como éxito ni con contenido clínico en el mensaje.

## Migración de cada ruta

Para una ruta ya publicada por Spring, el orden es: caracterizar fixture T-01, actualizar consumidor, eliminar la lógica de negocio del Route Handler de Next, probar navegador y comprobar ausencia de tráfico Supabase para ese caso. Si se mantiene un proxy temporal, éste solo reenvía método, query, cuerpo, cookies, `Set-Cookie`, `X-CSRF-TOKEN` y `X-Request-Id`; no interpreta reglas clínicas.

Las consultas SSR de `src/app/administrativo/page.tsx` y `src/app/administrativo/reportes/cumplimiento/page.tsx` son trabajo explícito: deben usar endpoints backend de resumen/reportes o requerir un contrato nuevo. No se sustituyen por acceso directo de navegador a PostgreSQL.

## Evidencia de cierre por incremento

- Pruebas del frontend: lint, typecheck, build y casos de navegador por rol.
- Pruebas HTTP: éxito, validación, sesión vencida, actor ajeno, CSRF y recarga.
- Evidencia de red: sin llamadas Supabase ni claves Supabase para el flujo migrado; cookies y cabeceras no exponen secretos.
- Regresión de datos: el resultado tras recargar coincide con Spring; archivos se validan por permiso, contenido y vigencia, no por URL firmada literal.
- Rollback documentado: desactivar el routeo/proxy del incremento sin mezclar escrituras ni alterar datos clínicos.

El corte completo solo puede aprobarse cuando H-CORTE y FE-CORTE estén aprobados con el mismo entorno de ensayo y datos sintéticos.

