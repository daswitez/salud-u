# Resumen del proyecto

## Nombre conceptual

**Plataforma de Historia Clínica, Atención Primaria y Derivación Médica Universitaria.**

## Contexto y cambio de enfoque

La plataforma deja de ser principalmente un sistema de agendamiento. Su propósito central es concentrar y hacer consultable la información clínica de los estudiantes: sus atenciones, diagnósticos, documentos, exámenes, derivaciones y reportes institucionales.

La cita puede ser solicitada por el estudiante o creada por el personal administrativo, pero es un dato de apoyo. En la operación real, el estudiante normalmente se registra con Administración y es atendido inicialmente por un médico de revisión estudiantil. Solo después de esa evaluación puede ser derivado, si corresponde, a Dermatología, Oftalmología, Medicina Interna o Urología.

## Actores

### Estudiante

- Puede registrarse y solicitar una cita.
- Consulta sus próximas citas, atenciones y documentos que tenga permiso de ver.
- Debe realizar al menos una consulta médica durante su carrera; el sistema permite verificar ese cumplimiento.

### Personal administrativo

- Registra o actualiza estudiantes y su primera toma de datos.
- Crea, confirma y administra citas por cupos limitados, especialmente para pacientes recurrentes.
- Gestiona el ingreso de pacientes y consulta reportes institucionales.
- No sustituye el criterio clínico ni modifica historias clínicas cerradas.

### Médico de revisión estudiantil

- Realiza la primera evaluación clínica.
- Crea y actualiza la historia clínica, registra diagnóstico y adjunta exámenes.
- Deriva al estudiante a una especialidad con motivo clínico y comentario.
- Consulta su cartera de pacientes y reportes de sus atenciones.

### Médico especialista

- Atiende únicamente derivaciones asignadas a su especialidad.
- Consulta la historia, documentos y motivo de derivación autorizados.
- Añade evoluciones, diagnósticos, indicaciones, adjuntos y cierra o devuelve la derivación.

## Datos mínimos del estudiante

Cada paciente se identifica de forma única por número de carnet y código de registro. Debe conservarse nombre completo, fecha de nacimiento o edad, carrera, peso, datos de contacto y estado académico. Carnet y código de registro no pueden duplicarse.

## Flujo clínico principal

```text
Registro / actualización administrativa
        ↓
Solicitud o creación administrativa de cita
        ↓
Atención inicial por médico de revisión estudiantil
        ↓
Historia clínica + diagnóstico + documentos/exámenes
        ↓
¿Requiere especialidad?
  ├─ No: cerrar atención y mantener seguimiento
  └─ Sí: derivación con motivo y comentario
                ↓
       Atención por especialista asignado
                ↓
       Evolución, diagnóstico y cierre/retorno
                ↓
Reportes clínicos y administrativos con filtros
```

## Alcance funcional

- Registro de estudiantes y datos clínicamente relevantes.
- Gestión de citas por cupos limitados, creadas por Administración o solicitadas por el estudiante.
- Atención inicial obligatoria antes de una especialidad.
- Historias clínicas longitudinales con evoluciones, diagnósticos, etiquetas y adjuntos.
- Carga segura de documentos escaneados y fotografías de exámenes, incluidas radiografías.
- Derivaciones a Dermatología, Oftalmología, Medicina Interna y Urología, con motivo y comentario.
- Historial de pacientes asignados a cada médico, con filtros por enfermedad/diagnóstico, fecha, carrera, edad y estado de derivación.
- Reportes rápidos diarios y reportes filtrables para Administración y personal médico.
- Auditoría, control de acceso por rol y trazabilidad clínica.

## Fuera de alcance inicial

- Optimización de horarios, tiempos de espera, cola digital, QR, teleconsulta y predicción de demanda.
- Decisiones o recomendaciones clínicas automáticas.
- Eliminación física de historias, evoluciones o adjuntos clínicos.
