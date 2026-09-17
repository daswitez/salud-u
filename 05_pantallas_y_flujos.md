# Pantallas y flujos

## Pantallas prioritarias

| # | Pantalla | Actor | Propósito |
|---|---|---|---|
| 1 | Inicio de sesión | Todos | Acceso seguro por rol. |
| 2 | Registro y búsqueda de estudiante | Administrativo | Buscar por carnet/código y crear o actualizar perfil. |
| 3 | Solicitudes y citas por cupo | Administrativo/Estudiante | Gestionar solicitud, cupo, cita y asistencia. |
| 4 | Inicio médico | Médico | Atajos: atendidos hoy, nueva atención, derivaciones pendientes y reportes. |
| 5 | Mis pacientes | Médico | Cartera de pacientes asignados/atendidos con filtros. |
| 6 | Ficha e historial del paciente | Médico autorizado | Línea de tiempo de atenciones, diagnósticos, adjuntos y derivaciones. |
| 7 | Nueva atención / evolución | Médico | Crear borrador, registrar evaluación, diagnóstico, indicaciones y cierre. |
| 8 | Adjuntos clínicos | Médico | Cargar, clasificar y consultar documentos o fotografías. |
| 9 | Nueva derivación | Médico de revisión | Enviar a especialidad con motivo y comentario. |
| 10 | Derivaciones recibidas | Especialista | Asignar, atender, devolver o cerrar derivaciones. |
| 11 | Reportes | Administrativo/Médico | Accesos rápidos, filtros, tabla y exportación autorizada. |
| 12 | Auditoría | Auditor/Administrativo autorizado | Consultar accesos, cambios y exportaciones. |
| 13 | Portal del estudiante | Estudiante | Solicitar cita y consultar información habilitada. |

## Flujos prioritarios

### A. Ingreso y atención inicial

Administración busca o registra estudiante → crea/confirmar cita por cupo si aplica → médico abre paciente asignado → crea atención inicial → registra diagnóstico y adjuntos → cierra evolución.

### B. Derivación

Médico de revisión cierra evaluación → selecciona Dermatología, Oftalmología, Medicina Interna o Urología → escribe motivo y comentario → adjunta antecedentes/exámenes relevantes → especialista recibe y atiende → agrega evolución → cierra o devuelve la derivación.

### C. Historial y seguimiento médico

Médico abre “Mis pacientes” → filtra por enfermedad, fecha, carrera o estado → abre ficha → revisa línea de tiempo y documentos → crea nueva evolución autorizada.

### D. Reporte diario

Usuario autorizado abre Reportes → selecciona “Atendidos hoy” o “Derivaciones del día” → ajusta filtros → revisa resultados → exporta solo con finalidad y permisos válidos.

### E. Cumplimiento institucional

Administración filtra estudiantes por gestión/carrera → sistema identifica atención clínica cerrada durante la carrera → genera informe de cumplidos y pendientes para el proceso que corresponda.
