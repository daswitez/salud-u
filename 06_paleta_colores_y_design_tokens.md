# Paleta de colores y Design Tokens

## Objetivo

La interfaz debe transmitir claridad clínica y dar prioridad a la lectura segura de historias, documentos, estados de atención, derivaciones y reportes. El color nunca debe ser el único indicador de información clínica u operativa.

## Paleta base

| Token | Valor | Uso |
|---|---:|---|
| `primary-600` | `#1769AA` | Acciones principales y navegación activa. |
| `primary-700` | `#0D4F82` | Hover/énfasis. |
| `teal-600` | `#0F766E` | Información clínica positiva y enlaces secundarios. |
| `surface-0` | `#FFFFFF` | Superficie principal. |
| `surface-50` | `#F8FAFC` | Fondo de aplicación. |
| `surface-100` | `#F1F5F9` | Secciones y filas alternas. |
| `text-900` | `#0F172A` | Texto principal. |
| `text-600` | `#475569` | Texto secundario. |
| `border-200` | `#E2E8F0` | Bordes y separadores. |

## Estados semánticos

| Estado | Color | Uso |
|---|---:|---|
| Éxito | `#15803D` | Atención cerrada, derivación cerrada, operación guardada. |
| Información | `#2563EB` | Derivación asignada, datos informativos. |
| Advertencia | `#B45309` | Borrador, documento pendiente, dato incompleto. |
| Crítico | `#B91C1C` | Error de carga, acceso denegado, cancelación. |
| Neutro | `#64748B` | Inactivo, sin datos, no asistió. |

## Aplicación clínica

- Atención: borrador (advertencia), cerrada (éxito), adenda (información).
- Derivación: pendiente de asignación (advertencia), asignada/en curso (información), cerrada (éxito), devuelta/cancelada (crítico con texto explícito).
- Documentos: disponible, procesando, pendiente/no presentado y rechazado deben tener etiqueta textual además de color.
- Usar superficies limpias, bordes discretos y suficiente espacio para líneas de tiempo, tablas y formularios extensos.

## Tokens de layout

```text
spacing: 4, 8, 12, 16, 24, 32
radius: 6 (campo), 8 (card), 12 (modal)
shadow: none o suave en elevaciones temporales
font: interfaz sans-serif legible; 14px mínimo en contenido clínico
focus: anillo de 2px primary-600 con contraste visible
```

## Reglas de accesibilidad

- Mantener contraste AA para texto y controles.
- Asociar cada campo clínico a una etiqueta persistente y un mensaje de error claro.
- No usar rojo para comunicar un diagnóstico; los colores expresan estado de interfaz, no gravedad clínica.
- No mostrar datos clínicos sensibles en badges, notificaciones o vistas previas sin autorización.
