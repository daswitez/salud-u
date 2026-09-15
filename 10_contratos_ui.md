# Contratos de UI y estados operativos

Este documento define la forma mínima que reemplazará los mocks sin reescribir las pantallas. Los resultados siguen `ApiResult<T>` de `src/lib/ui-contracts.ts`: éxito con `data` y `requestId`, o error con `code`, mensaje y si se puede recuperar.

| Dominio | Operación | Éxito | Errores y estado vacío |
|---|---|---|---|
| Reserva Tipo B | `POST /appointments/holds`, `POST /appointments` | Hold o cita confirmada | `CONFLICT`, `EXPIRED`; volver a resultados con filtros conservados. |
| Llegada y cola | `POST /check-ins`, `GET /queues/me` | Llegada y estado de cola | `VALIDATION`, `CONFLICT`; explicar que no se registró una segunda llegada. |
| Solicitudes/turnos | `POST /schedule-requests`, `POST /shifts`, `POST /shifts/:id/publish` | Solicitud o turno con bitácora | `VALIDATION`, `CONFLICT`; indicar campo/rango que debe corregirse. |
| Campaña Tipo A | `GET /campaigns/eligible`, `POST /campaigns/:id/bookings` | Estado y cita Tipo A | `CONFLICT`, `UNAUTHORIZED`; no crear segunda reserva. |
| Lista de espera | `PUT /waitlist/preferences`, `POST /waitlist/offers/:id/accept` | Preferencias u oferta aceptada | `EXPIRED`, `CONFLICT`; no prometer posición de cola. |
| Teleconsulta | `POST /telehealth/access/validate`, `POST /telehealth/sessions/:id/admit` | Sala autorizada o sesión admitida | `INVALID_TOKEN`/`EXPIRED` normalizados a `UNAUTHORIZED`/`EXPIRED`; bloquear reingreso. |

Estados de pantalla obligatorios: `loading`, `success`, `empty` y `error`. Cada error recuperable debe ofrecer reintento, volver al listado o corregir los datos, según corresponda. Las pantallas mock actuales ya mantienen esos estados mediante stores locales; los endpoints reales deben conservar estas formas.
