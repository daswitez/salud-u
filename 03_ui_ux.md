# Guía UI/UX

## 1. Objetivo de experiencia

La interfaz debe reducir tres fricciones principales:

1. No saber cuándo existe disponibilidad.
2. Tener que hacer fila física para obtener una ficha.
3. No saber cuánto tiempo falta para ser atendido.

La experiencia debe transmitir:

- claridad;
- tranquilidad;
- control;
- confianza;
- rapidez;
- privacidad.

## 2. Prioridad por actor

### Estudiante — mobile-first

La mayoría de acciones deben resolverse con pocos pasos:

```text
Inicio
→ Buscar atención
→ Elegir slot
→ Confirmar
→ QR / teleconsulta
```

### Médico — desktop/tablet-first

Debe priorizar:

- agenda;
- cola;
- paciente actual;
- ficha clínica;
- reducción de carga administrativa.

### Administrativo — desktop-first

Debe priorizar:

- planificación;
- capacidad;
- demanda;
- personal médico;
- incidencias.

## 3. Navegación del estudiante

Barra inferior sugerida:

```text
Inicio | Buscar | Mis citas | Avisos | Perfil
```

No agregar una sección principal de “Historia clínica” para estudiante salvo que exista una necesidad institucional validada.

## 4. Inicio del estudiante

Jerarquía recomendada:

1. Próxima cita.
2. Estado actual si está en cola.
3. Acción “Buscar atención”.
4. Chequeo obligatorio pendiente/completado.
5. Lista de espera activa.
6. Notificaciones recientes.

Ejemplo:

```text
Hola

Próxima cita
Especialidad 1
Hoy · 10:30
Presencial

[Ver QR]

Espera estimada actual
25–35 min

[Buscar atención]
```

## 5. Búsqueda de atención

Debe ser una de las pantallas más cuidadas del producto.

Filtros:

- especialidad;
- médico opcional;
- modalidad;
- fecha/rango.

Resultado:

```text
Especialidad 1
Martes 15

Médico A
09:00  Disponible
09:30  Disponible
10:00  Completo
10:30  Disponible

Demanda: Media
Espera estimada: 15–25 min
```

No saturar al estudiante con métricas administrativas.

## 6. Hold de 10 minutos

Debe mostrar claramente:

- fecha;
- hora;
- médico;
- especialidad;
- modalidad;
- contador visible;
- acción confirmar;
- acción cancelar.

Ejemplo:

```text
Tu horario está reservado temporalmente

09:42 restantes

[Confirmar cita]
```

Evitar lenguaje técnico como `slot`, `hold` o `lock` en la UI del estudiante.

## 7. Detalle de cita

Elementos:

- especialidad;
- médico;
- fecha/hora;
- modalidad;
- estado;
- QR o acceso virtual;
- cancelar;
- reprogramar;
- instrucciones de llegada.

## 8. Cola digital

Pantalla clave del proyecto.

Debe responder inmediatamente:

> “¿Ya estoy registrado?”

> “¿Cuánto falta aproximadamente?”

Propuesta:

```text
Especialidad 1

Estás registrado ✓

Estado
Esperando atención

Espera estimada
22–31 min

Última actualización
10:46
```

Evitar prometer una hora exacta.

Usar siempre términos como:

- “estimado”;
- “aproximadamente”;
- “el tiempo puede variar”.

## 9. Lista de espera

No mostrar una falsa “posición exacta” si el sistema aplica compatibilidad de fecha, modalidad o médico.

Mejor:

```text
Lista de espera activa
Especialidad 2

Preferencias
Lun–Vie · Mañana
Presencial

Te avisaremos si aparece un turno compatible.
```

Oferta:

```text
¡Se liberó un turno!

Especialidad 2
Mañana · 10:30

Disponible durante 14:32

[Aceptar]
[No me sirve]
```

## 10. Agenda del médico

Desktop/tablet.

Debe ofrecer:

- vista diaria;
- semanal;
- estado de citas;
- modalidad;
- bloqueos;
- accesos rápidos.

Evitar convertirla en una copia de Google Calendar. La información médica operacional debe tener prioridad.

## 11. Cola del médico

Layout sugerido:

```text
Pacientes esperando (6)

1. Estudiante ...    18 min
2. Estudiante ...    12 min
3. Estudiante ...     5 min

[LLAMAR SIGUIENTE]
```

En la misma interfaz puede existir un panel de:

- paciente actual;
- pacientes esperando;
- siguientes citas.

## 12. Encuentro clínico

Debe evitar un formulario infinito.

Estructura recomendada:

```text
Resumen paciente
      ↓
Motivo / contexto
      ↓
Ficha especializada
      ↓
Evaluación / hallazgos
      ↓
Plan / seguimiento
      ↓
Guardar borrador / Finalizar
```

La navegación puede usar secciones laterales o pestañas, según la complejidad real de cada especialidad.

## 13. Especialidades 1–4

Las fichas deben compartir:

- header del paciente;
- metadata del encuentro;
- acciones guardar/finalizar;
- historial;
- auditoría.

Pero cada una puede tener componentes y estructura propia.

No construir primero “un formulario genérico” para luego llenarlo de campos opcionales.

## 14. Dashboard administrativo

Información prioritaria:

- citas de hoy;
- médicos activos;
- pacientes en cola;
- especialidades saturadas;
- demanda;
- lista de espera;
- incidencias.

## 15. Planificación de turnos médicos

Debe ser una de las pantallas centrales del administrador.

Propuesta:

```text
Semana 14–20 septiembre
Especialidad 1

Médico A     Lun 08–12    Mar 08–12
Médico B     Mar 14–18    Jue 14–18
Médico C     Mié 08–12    Vie 08–12

Demanda prevista: ALTA
Capacidad: 84
Demanda estimada: 112
Déficit: 28

[Asignar turno]
```

Al asignar:

- médico;
- fecha;
- hora inicio/fin;
- modalidad;
- duración de cita;
- pausas/bloqueos;
- preview de slots.

## 16. Capacidad y demanda

Evitar dashboard “decorativo”. Cada métrica debe ayudar a tomar una decisión.

Preguntas que debe responder:

- ¿Dónde falta capacidad?
- ¿Qué especialidad está saturada?
- ¿Qué periodos suelen ser críticos?
- ¿Cuántos slots están publicados?
- ¿Cuántas personas hay en lista de espera?
- ¿Conviene abrir otro turno?

## 17. Estados y feedback

Toda operación importante debe tener estado visible:

```text
Procesando
Confirmado
Falló
Expirado
Cancelado
```

Especialmente:

- reserva;
- hold;
- pago no aplica;
- check-in;
- lista de espera;
- teleconsulta.

## 18. Diseño visual

Recomendaciones:

- diseño limpio y sobrio;
- alto contraste;
- espacios amplios;
- uso moderado de color;
- no usar estética “hospitalaria fría” obligatoriamente;
- estados importantes diferenciados visualmente;
- iconografía consistente;
- tipografía legible.

## 19. Accesibilidad

- contraste WCAG AA como objetivo.
- áreas táctiles >= 44 px.
- no depender solo del color.
- labels visibles.
- mensajes de error accionables.
- navegación por teclado en web.

## 20. Métrica de usabilidad

Objetivo sugerido:

- SUS > 75.

Pruebas prioritarias:

1. encontrar una cita;
2. reservar;
3. reprogramar;
4. hacer check-in;
5. interpretar espera estimada;
6. médico inicia encuentro;
7. administrador asigna turno.

