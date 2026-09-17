# Datos de prueba

## Cuentas de demostración

| Rol | Usuario | Escenario |
|---|---|---|
| Administrativo | maria.fernandez@demo.com | Registra estudiante, crea cita por cupo y consulta reportes. |
| Médico de revisión | valeria.mendoza@demo.com | Crea atención inicial, adjunta examen y deriva. |
| Dermatología | sofia.alvarez@demo.com | Atiende derivación recibida. |
| Estudiante | estudiante.demo@universidad.edu | Solicita cita y consulta su estado. |

## Pacientes mock recomendados

| Carnet | Código | Paciente | Carrera | Caso |
|---|---|---|---|---|
| 12345678 | REG-2026-001 | Daniela Rojas | Ingeniería de Sistemas | Atención inicial cerrada, química sanguínea adjunta y derivación asignada a Dermatología. |
| 12345679 | REG-2026-002 | Mateo Flores | Medicina | Paciente recurrente con cupo asignado y dos atenciones históricas. |
| 12345680 | REG-2026-003 | Lucía Quispe | Derecho | Atención inicial con diagnóstico etiquetado, sin derivación. |
| 12345681 | REG-2026-004 | Andrés Mamani | Arquitectura | Derivación pendiente a Oftalmología y fotografía de estudio adjunta. |

## Datos para demostrar filtros

- Atenciones de distintas fechas, médicos y carreras.
- Diagnósticos etiquetados repetidos y no repetidos para búsqueda por enfermedad frecuente.
- Documentos: química sanguínea, radiografía fotografiada, laboratorio escaneado y receta.
- Derivaciones en `PENDING_ASSIGNMENT`, `ASSIGNED`, `IN_PROGRESS`, `RETURNED` y `CLOSED`.
- Estudiantes con consulta cerrada y estudiantes sin consulta cerrada para informe de cumplimiento.

## Regla de seguridad

Los datos mock no deben reproducir pacientes reales ni usar documentos clínicos reales. En capturas y demos, ocultar o seudonimizar identificadores fuera del entorno de prueba.
