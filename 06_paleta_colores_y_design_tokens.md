# Paleta de colores y Design Tokens

## 1. Objetivo

Este documento define la paleta de colores y las reglas de uso visual del sistema web y móvil de gestión de atención médica universitaria.

La propuesta sigue un enfoque usado en productos digitales reales: **tokens semánticos**, contraste accesible y estados consistentes. La referencia conceptual es **Material Design 3** para roles de color y **WCAG 2.2 AA** como objetivo mínimo de contraste.

> Esta paleta es una decisión de diseño del proyecto; no representa una norma médica obligatoria.

## 2. Dirección visual

La interfaz debe transmitir confianza, claridad, calma, orden, seguridad y profesionalismo. La base visual será:

- azul clínico como color primario;
- teal como color secundario;
- superficies blancas y grises fríos;
- colores semánticos reservados para estados;
- alto contraste para texto y controles;
- uso moderado del color en pantallas clínicas y administrativas.

## 3. Paleta principal

### Primary — Clinical Blue

| Token | Hex | Uso |
|---|---:|---|
| `primary-50` | `#EFF6FF` | Fondos muy suaves |
| `primary-100` | `#DBEAFE` | Estados seleccionados suaves |
| `primary-200` | `#BFDBFE` | Bordes/acento ligero |
| `primary-300` | `#93C5FD` | Focus y elementos informativos |
| `primary-500` | `#3B82F6` | Elementos gráficos |
| `primary-600` | `#0B5CAD` | **Primary principal** |
| `primary-700` | `#094C90` | Hover |
| `primary-800` | `#123B65` | Texto sobre contenedores claros |
| `primary-900` | `#102F4F` | Alto contraste |

`#0B5CAD` se utiliza para botones primarios, enlaces principales, tabs activos, navegación seleccionada, acciones de reserva y acciones clínicas principales.

Texto sobre `primary-600`: `#FFFFFF`.

## 4. Secondary — Care Teal

| Token | Hex | Uso |
|---|---:|---|
| `secondary-50` | `#F0FDFA` | Fondos suaves |
| `secondary-100` | `#D7F4F4` | Contenedores informativos |
| `secondary-500` | `#0F8B8D` | Acentos |
| `secondary-600` | `#0B6E75` | Secundario principal |
| `secondary-700` | `#0B5258` | Hover/texto fuerte |
| `secondary-900` | `#123B3D` | Alto contraste |

Usar para flujo asistencial, check-in, sala de espera virtual, indicadores secundarios y gráficos auxiliares. No sustituye al azul para la acción primaria.

## 5. Colores neutros

| Token | Hex | Uso |
|---|---:|---|
| `neutral-0` | `#FFFFFF` | Superficie principal |
| `neutral-50` | `#F8FAFC` | Fondo general |
| `neutral-100` | `#F1F5F9` | Superficie secundaria |
| `neutral-200` | `#E2E8F0` | Divisores suaves |
| `neutral-300` | `#CBD5E1` | Bordes |
| `neutral-400` | `#94A3B8` | Disabled / placeholder |
| `neutral-500` | `#64748B` | Texto terciario |
| `neutral-600` | `#475569` | Texto secundario |
| `neutral-700` | `#334155` | Texto fuerte secundario |
| `neutral-800` | `#1E293B` | Encabezados |
| `neutral-900` | `#0F172A` | Texto principal |

Tokens base:

```text
background          = #F8FAFC
surface             = #FFFFFF
surface-secondary   = #F1F5F9
border              = #CBD5E1
divider             = #E2E8F0
text-primary        = #0F172A
text-secondary      = #475569
text-tertiary       = #64748B
text-disabled       = #94A3B8
```

## 6. Colores semánticos de estado

### Success

```text
success-main         = #2E7D32
success-container    = #E8F5E9
success-on-container = #1B5E20
```

Usos: cita confirmada, check-in completado, guardado exitoso, turno correctamente asignado.

### Warning

```text
warning-main         = #A15C00
warning-container    = #FFF8E1
warning-on-container = #7C5A00
```

Usos: cita pendiente de confirmación, pocos cupos, hold por expirar, capacidad cercana al límite.

### Error / Critical

```text
error-main         = #B3261E
error-container    = #FDECEC
error-on-container = #9F1D17
```

Usos: validación fallida, cita cancelada, acceso rechazado, conflicto de agenda, acción destructiva.

### Information

```text
info-main         = #1565C0
info-container    = #E8F1FC
info-on-container = #123B65
```

Usos: información contextual, recomendaciones y avisos no críticos.

## 7. Nivel de demanda

La demanda debe mostrarse mediante **color + texto + icono**, nunca solo mediante color.

| Estado | Fondo | Texto | Presentación |
|---|---|---|---|
| BAJA | `#E8F5E9` | `#1B5E20` | `● Demanda baja` |
| MEDIA | `#FFF8E1` | `#7C5A00` | `● Demanda media` |
| ALTA | `#FFF3E0` | `#9A3412` | `▲ Demanda alta` |
| MUY ALTA | `#FDECEC` | `#9F1D17` | `▲ Demanda muy alta` |

Ejemplo:

```text
Especialidad 2
Espera estimada: 35–50 min
[ ▲ Demanda alta ]
```

## 8. Estados de cita

| Estado | Tratamiento visual |
|---|---|
| Pendiente | Warning |
| Confirmada | Success |
| Check-in realizado | Secondary / teal |
| En espera | Primary soft |
| Llamado | Primary |
| En consulta | Secondary |
| Completada | Neutral + icono success |
| Cancelada | Error soft |
| No-show | Error / neutral dark |
| Reprogramada | Information |

Evitar asignar un color distinto a cada estado. Preferir familias semánticas consistentes.

## 9. Tiempo de espera

La estimación debe priorizar legibilidad sobre color:

```text
Tiempo estimado de espera
35–50 min
Demanda alta
Actualizado hace 1 min
```

El valor `35–50 min` usa `text-primary`; el color se reserva para el indicador de demanda.

## 10. Botones

### Primary button

```text
background    = #0B5CAD
text          = #FFFFFF
hover         = #094C90
focus-ring    = #93C5FD
disabled      = #CBD5E1
disabled-text = #64748B
```

Usos: Confirmar cita, Reservar, Guardar, Iniciar atención, Aprobar.

### Secondary button

```text
background = #FFFFFF
text       = #0B5CAD
border     = #0B5CAD
hover-bg   = #EFF6FF
```

### Destructive button

```text
background = #FFFFFF
text       = #B3261E
border     = #B3261E
hover-bg   = #FDECEC
```

Reservar para cancelar cita, desactivar médico o acciones destructivas equivalentes.

## 11. Inputs y formularios

Normal:

```text
background  = #FFFFFF
border      = #CBD5E1
text        = #0F172A
label       = #334155
placeholder = #64748B
```

Focus:

```text
border     = #0B5CAD
focus-ring = #BFDBFE
```

Error:

```text
border     = #B3261E
message    = #9F1D17
background = #FFFFFF
```

No comunicar errores solo con un borde rojo. Añadir icono y mensaje.

## 12. Cards y superficies

```text
background = #FFFFFF
border     = #E2E8F0
text       = #0F172A
secondary  = #475569
```

Evitar sombras grandes. La jerarquía se construye con espaciado, tipografía, agrupación y bordes suaves.

## 13. Navegación

Sidebar médico/administrativo:

```text
background        = #FFFFFF
text              = #475569
active-background = #EFF6FF
active-text       = #0B5CAD
active-indicator  = #0B5CAD
divider           = #E2E8F0
```

Bottom navigation del estudiante:

```text
background = #FFFFFF
inactive   = #64748B
active     = #0B5CAD
```

El estado activo debe distinguirse por color más icono y peso/indicador visual.

## 14. Tablas administrativas

```text
table-background  = #FFFFFF
header-background = #F8FAFC
header-text       = #334155
row-text          = #0F172A
row-secondary     = #475569
border            = #E2E8F0
row-hover         = #F8FAFC
selected-row      = #EFF6FF
```

Los estados aparecen como badges; no colorear filas completas salvo casos críticos.

## 15. Historias clínicas

Las historias de Especialidad 1, 2, 3 y 4 deben ser la zona visual más neutral del sistema.

```text
surface        = #FFFFFF
background     = #F8FAFC
heading        = #0F172A
label          = #334155
divider        = #E2E8F0
primary-action = #0B5CAD
```

No asignar un color fuerte diferente a cada especialidad. Si se requiere diferenciación, usar iconografía, etiquetas o indicadores secundarios discretos.

## 16. Dashboard de capacidad y demanda

Usar pocas series cromáticas:

```text
Serie principal   = #0B5CAD
Serie secundaria  = #0B6E75
Serie comparativa = #64748B
Success           = #2E7D32
Warning           = #A15C00
Critical          = #B3261E
```

Ejemplo:

```text
Capacidad publicada → Primary
Demanda estimada    → Secondary
Déficit             → Error
```

Evitar gráficos tipo “rainbow”.

## 17. Accesibilidad

Objetivo mínimo WCAG AA:

```text
Texto normal                      >= 4.5 : 1
Texto grande                      >= 3 : 1
Controles/estados visuales clave  >= 3 : 1
```

Nunca depender exclusivamente del color.

Incorrecto:

```text
●
```

Correcto:

```text
▲ Demanda alta
```

Incorrecto: input con borde rojo únicamente.

Correcto: borde rojo + icono + `Campo obligatorio`.

## 18. Design tokens recomendados

Los colores hexadecimales no deben repetirse directamente dentro de los componentes. El frontend debe consumir tokens semánticos.

```css
:root {
  /* Brand */
  --color-primary: #0B5CAD;
  --color-primary-hover: #094C90;
  --color-primary-container: #EFF6FF;
  --color-on-primary: #FFFFFF;

  --color-secondary: #0B6E75;
  --color-secondary-hover: #0B5258;
  --color-secondary-container: #D7F4F4;

  /* Surface */
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-secondary: #F1F5F9;

  /* Text */
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-text-tertiary: #64748B;
  --color-text-disabled: #94A3B8;

  /* Border */
  --color-border: #CBD5E1;
  --color-divider: #E2E8F0;

  /* Semantic */
  --color-success: #2E7D32;
  --color-success-container: #E8F5E9;

  --color-warning: #A15C00;
  --color-warning-container: #FFF8E1;

  --color-error: #B3261E;
  --color-error-container: #FDECEC;

  --color-info: #1565C0;
  --color-info-container: #E8F1FC;

  /* Focus */
  --color-focus-ring: #93C5FD;
}
```

## 19. Convención para Figma

Crear variables/tokens en Figma con estos grupos:

### Brand
- Primary
- Primary Hover
- Primary Container
- Secondary
- Secondary Hover
- Secondary Container

### Surface
- Background
- Surface
- Surface Secondary
- Border
- Divider

### Text
- Text Primary
- Text Secondary
- Text Tertiary
- Text Disabled

### Status
- Success
- Success Container
- Warning
- Warning Container
- Error
- Error Container
- Info
- Info Container

## 20. Reglas obligatorias para agentes de desarrollo

1. No inventar colores nuevos dentro de componentes.
2. Utilizar tokens semánticos.
3. `Primary` representa la acción principal, no decoración general.
4. Rojo se reserva para error, peligro o acciones destructivas.
5. Verde se reserva principalmente para confirmación/éxito.
6. Warning no debe usarse para información normal.
7. Estados incluyen texto o iconografía además del color.
8. Historias clínicas mantienen superficies neutras y alta legibilidad.
9. Evitar fondos saturados en grandes superficies.
10. No diferenciar Especialidad 1–4 exclusivamente mediante color.
11. Toda nueva combinación foreground/background debe validarse contra WCAG AA.
12. Mantener los mismos tokens semánticos en web y móvil.
13. Gráficos no deben depender únicamente del color.
14. No usar gradientes en controles críticos ni información clínica.
15. Si se modifica la paleta, modificar los tokens globales y no componentes individuales.

## 21. Resumen ejecutivo de la paleta

```text
PRIMARY        #0B5CAD   Clinical Blue
SECONDARY      #0B6E75   Care Teal
BACKGROUND     #F8FAFC
SURFACE        #FFFFFF
TEXT PRIMARY   #0F172A
TEXT SECONDARY #475569
BORDER         #CBD5E1
SUCCESS        #2E7D32
WARNING        #A15C00
ERROR          #B3261E
INFO           #1565C0
```

La intención es que la interfaz se sienta **institucional y clínica sin parecer anticuada**, y moderna sin parecer una aplicación de consumo genérica.
