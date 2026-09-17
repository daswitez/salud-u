# Datos, reportes e investigación

## Prioridad del módulo de datos

La prioridad no es predecir tiempos de espera. El sistema debe producir datos clínicos y administrativos consistentes para reportes diarios, seguimiento institucional e investigación autorizada.

## Accesos rápidos obligatorios

- Pacientes atendidos hoy: nombre/carnet solo para quien tenga permiso, médico, fecha y estado.
- Diagnósticos registrados hoy: conteo por diagnóstico o etiqueta y detalle permitido.
- Derivaciones creadas, pendientes y cerradas hoy.
- Estudiantes con consulta médica cumplida y pendientes de cumplimiento, para el proceso institucional de inscripción.
- Pacientes recurrentes y próximas atenciones por cupo.

## Filtros de reporte

| Dimensión | Ejemplos |
|---|---|
| Tiempo | día, rango, gestión académica. |
| Atención | médico, tipo inicial/especializada, especialidad, estado. |
| Clínica | diagnóstico, enfermedad/etiqueta, tipo de examen, derivación. |
| Demográfica | carrera, rango de edad y otros datos solo con autorización. |
| Operativa | cita, asistencia, paciente recurrente, cumplimiento obligatorio. |

## Calidad de datos

- Diagnósticos y etiquetas deben provenir de un catálogo administrable, con texto libre complementario.
- Mantener valores históricos: fecha de medición, fecha de atención y fecha de estudio no son intercambiables.
- Los valores desconocidos se registran como ausentes/pendientes, no como cero ni como texto ficticio.
- Los datos usados para investigación deben definir período, población, filtros y responsable de la exportación.

## Privacidad y uso responsable

Los reportes operativos pueden requerir identificación de pacientes; los de investigación deberían usar agregación o seudonimización cuando el propósito lo permita. El sistema debe limitar campos por rol, registrar exportaciones y no aplicar IA para diagnosticar, priorizar clínicamente ni decidir una derivación.

## Evolución futura opcional

Cuando existan datos suficientemente completos y autorización institucional, se pueden añadir tableros descriptivos de prevalencia, tendencias de atención y carga por especialidad. Cualquier análisis predictivo deberá ser secundario, explicable y validado fuera del flujo de decisión clínica.
