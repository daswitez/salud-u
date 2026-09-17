# Guía UI/UX

## Objetivo de experiencia

La interfaz debe reducir el tiempo para registrar una atención real, recuperar antecedentes y generar el informe diario. La cita no domina la navegación: los puntos de entrada principales son **Pacientes**, **Nueva atención**, **Derivaciones** y **Reportes**.

## Navegación por actor

| Actor | Navegación principal |
|---|---|
| Administrativo | Inicio, Estudiantes, Citas/cupos, Ingreso, Reportes. |
| Médico de revisión | Inicio, Mis pacientes, Nueva atención, Derivaciones, Reportes. |
| Especialista | Inicio, Derivaciones recibidas, Mis pacientes, Nueva evolución, Reportes. |
| Estudiante | Solicitar cita, Mis citas, Mi información habilitada. |

## Principios de pantalla

- Buscar al paciente primero por carnet, código de registro o nombre completo; ofrecer alta rápida solo a Administración.
- Mostrar una ficha compacta persistente: nombre, carnet, carrera, edad, última atención, alergias/alertas si el rol puede verlas y estado de derivación.
- Presentar el historial como línea de tiempo ordenada por fecha con filtros por diagnóstico, especialidad, tipo de adjunto y rango de fechas.
- La pantalla de atención abre un borrador y evita pérdida de datos; al cerrar, el contenido queda bloqueado y las correcciones son adendas.
- Los adjuntos deben previsualizarse con nombre, tipo, fecha de estudio, etiquetas y relación con la atención.
- Una derivación se crea dentro de la atención: especialidad, motivo, comentario al especialista, adjuntos incluidos y estado.
- Los dashboards muestran accesos rápidos antes que gráficos complejos: atendidos hoy, diagnósticos, derivaciones pendientes y cumplimiento de consulta.

## Formularios clínicos

1. Datos de la atención: motivo de consulta, fecha, profesional y tipo.
2. Evaluación: texto estructurado y texto libre según especialidad.
3. Mediciones: peso y otras medidas fechadas.
4. Diagnósticos: etiqueta buscable + observación.
5. Indicaciones y seguimiento.
6. Adjuntos: cargar archivo/foto, clasificar, describir y etiquetar.
7. Derivación opcional: destino, motivo y comentario.

No se debe forzar un formulario distinto por especialidad antes de validar el flujo clínico común. Las especialidades pueden añadir secciones específicas sin fragmentar el historial.

## Tablas y filtros

La tabla “Mis pacientes” debe incluir paciente, carrera, última atención, último diagnóstico, estado de derivación y acción para abrir historia. Filtros: búsqueda, fecha, diagnóstico/enfermedad, etiqueta, carrera, edad, especialidad y estado.

La tabla de reportes debe indicar siempre período y filtros activos, permitir limpiar filtros y diferenciar vista nominal de vista agregada según el permiso.

## Estados y mensajes

- Explicar claramente `Borrador`, `Atención cerrada`, `Derivación pendiente`, `Asignada`, `En atención`, `Devuelta` y `Cerrada`.
- Confirmar antes de cerrar una atención o exportar datos; explicar que el cierre se corrige mediante adenda.
- Cuando falte un examen de química sanguínea, mostrar “Pendiente/no presentado”, nunca un estado ambiguo.
- Nunca revelar datos clínicos en notificaciones genéricas, títulos de pestaña o mensajes de error.

## Accesibilidad

- Formularios navegables con teclado, etiquetas persistentes y errores junto al campo.
- No comunicar estados solo con color; usar texto e iconos.
- Previsualizaciones de imágenes con alternativa para descargar o ampliar, respetando permisos.
