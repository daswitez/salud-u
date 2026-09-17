# Requisitos y procesos de negocio

## Reglas de negocio

1. El estudiante se identifica de manera única por número de carnet y código de registro; ambos se validan contra duplicados.
2. Toda atención especializada requiere una derivación activa emitida desde revisión estudiantil, salvo autorización administrativa extraordinaria registrada y auditable.
3. Las especialidades iniciales son Dermatología, Oftalmología, Medicina Interna y Urología.
4. Una derivación debe incluir especialidad destino, motivo de consulta, comentario para el especialista, médico emisor, fecha y estado.
5. La primera atención debe permitir registrar o adjuntar el examen de química sanguínea cuando esté disponible; su ausencia debe quedar explícita, no inventarse.
6. La historia clínica es longitudinal: una nueva atención añade una evolución; no reemplaza el historial previo.
7. Todo diagnóstico, enfermedad o problema clínico debe poder registrarse con etiqueta normalizada y texto libre de respaldo.
8. Los adjuntos pueden ser documentos escaneados o fotografías clínicas/de exámenes. Se guardan con tipo, fecha, autor y relación a la atención.
9. Un médico solo consulta los pacientes que le fueron asignados, atendió o recibió por derivación, según sus permisos clínicos.
10. Las citas se controlan por cupos disponibles. Los pacientes recurrentes se atienden mediante los cupos que Administración habilite; no hay sobre-reserva automática.
11. Una consulta médica al menos una vez en la carrera cuenta como cumplimiento solo si existe una atención clínica cerrada.
12. Las correcciones clínicas son adendas auditables; no se permite borrar contenido asistencial cerrado.
13. Los reportes muestran solo los datos habilitados para el rol y propósito institucional, con filtros y trazabilidad de exportación.

## Requisitos de usuario

| ID | Actor | Necesidad |
|---|---|---|
| URS-01 | Administrativo | Registrar estudiantes por carnet, código de registro, nombre, edad/fecha de nacimiento, carrera, peso y contacto. |
| URS-02 | Administrativo | Buscar, actualizar y evitar duplicados de estudiantes. |
| URS-03 | Administrativo | Crear y gestionar citas por cupo para estudiantes y pacientes recurrentes. |
| URS-04 | Estudiante | Solicitar una cita y consultar su estado sin elegir directamente una especialidad. |
| URS-05 | Médico de revisión | Ver sus pacientes asignados y crear una nueva atención clínica. |
| URS-06 | Médico | Consultar el historial clínico permitido de un paciente atendido o asignado. |
| URS-07 | Médico de revisión | Registrar anamnesis, signos/datos relevantes, diagnóstico, indicaciones y seguimiento. |
| URS-08 | Médico | Cargar documentos escaneados y fotografías de exámenes, con descripción y etiquetas. |
| URS-09 | Médico de revisión | Crear una derivación a una especialidad con motivo de consulta y comentario para el especialista. |
| URS-10 | Especialista | Recibir derivaciones, revisar antecedentes y registrar evolución o cierre. |
| URS-11 | Médico | Filtrar su historial de pacientes por enfermedad/diagnóstico, fecha de atención, carrera, edad y estado. |
| URS-12 | Administrativo y médico | Consultar pacientes atendidos hoy, diagnósticos, derivaciones y datos demográficos relevantes. |
| URS-13 | Administrativo | Generar informes de cumplimiento de consulta médica obligatoria. |
| URS-14 | Personal autorizado | Exportar reportes filtrados para gestión o investigación conforme a permisos. |
| URS-15 | Auditor | Consultar la trazabilidad de accesos, cambios y exportaciones clínicas. |

## Procesos de negocio

### PRC-01 — Registro y actualización de estudiante

1. Administración busca por carnet o código de registro.
2. Si no existe, registra datos mínimos; si existe, valida y actualiza datos administrativos permitidos.
3. El sistema valida duplicados y deja auditoría.
4. Se crea o actualiza el perfil longitudinal del paciente.

### PRC-02 — Gestión de cita por cupo

1. El estudiante puede solicitar una cita; Administración puede crearla directamente al registrar su llegada.
2. La solicitud se dirige a atención inicial, no a una especialidad.
3. Administración confirma una cita contra un cupo disponible y asigna el médico de revisión cuando corresponda.
4. La cita queda como programada, atendida, cancelada o no asistió. El estado atendida se relaciona con una atención clínica.

### PRC-03 — Atención inicial e historia clínica

1. El médico abre el perfil del paciente asignado y consulta antecedentes y documentos autorizados.
2. Crea una atención con fecha, motivo, evaluación, diagnóstico(s), indicaciones y estado de cierre.
3. Registra peso u otros datos medidos cuando correspondan; no sobrescribe el valor histórico.
4. Adjunta el examen de química sanguínea, si existe, o registra que está pendiente/no presentado.
5. Cierra la evolución o la deja en borrador clínico.

### PRC-04 — Adjuntar examen o documento clínico

1. El médico selecciona la atención o el historial del paciente.
2. Carga un archivo o fotografía y clasifica su tipo (química sanguínea, radiografía, laboratorio, receta u otro).
3. Añade fecha del estudio, descripción y etiquetas.
4. El sistema conserva archivo original, metadatos, autor y auditoría.

### PRC-05 — Derivación a especialidad

1. El médico de revisión selecciona una especialidad habilitada.
2. Registra motivo de consulta, comentario/instrucción para el especialista y prioridad si la institución la configura.
3. El sistema vincula diagnóstico, atención y adjuntos relevantes.
4. La derivación queda pendiente de asignación o asignada; el especialista la acepta, atiende, devuelve o cierra.
5. Administración puede gestionar el cupo de la cita especializada sin alterar el contenido clínico.

### PRC-06 — Atención especializada y seguimiento

1. El especialista abre una derivación asignada y revisa el contexto permitido.
2. Crea una evolución especializada, agrega diagnóstico, indicaciones y adjuntos.
3. Cierra la derivación, solicita seguimiento o la devuelve con una nota clínica auditable.

### PRC-07 — Historial y búsqueda de pacientes del médico

1. El médico abre “Mis pacientes”.
2. El sistema muestra pacientes asignados, atendidos o derivados hacia él.
3. Puede filtrar por diagnóstico/enfermedad, etiqueta, fecha, carrera, rango de edad, estado de atención y estado de derivación.
4. Puede abrir el historial longitudinal y crear una nueva evolución solo si conserva autorización.

### PRC-08 — Reportes

1. El usuario autorizado elige un acceso rápido o define filtros.
2. El sistema muestra resultados agregados o nominales según permiso.
3. Los accesos rápidos incluyen: pacientes atendidos hoy, diagnósticos del día, derivaciones del día y cumplimiento de consulta obligatoria.
4. Los filtros incluyen fecha, médico, especialidad, diagnóstico, carrera, edad, sexo si está autorizado, estado de derivación y asistencia.
5. Toda exportación registra quién, cuándo, filtros y finalidad declarada.

## Requerimientos funcionales

- RF-01: Registrar y buscar pacientes por carnet, código y nombre completo.
- RF-02: Mantener una historia clínica longitudinal por paciente.
- RF-03: Crear atenciones, evoluciones y adendas auditables.
- RF-04: Administrar diagnósticos y etiquetas consultables.
- RF-05: Cargar, previsualizar con control de acceso y descargar adjuntos clínicos autorizados.
- RF-06: Crear, asignar, atender y cerrar derivaciones.
- RF-07: Gestionar cupos y estados de cita sin usar la cita como sustituto de la atención clínica.
- RF-08: Mostrar cartera de pacientes del médico con filtros combinables.
- RF-09: Emitir reportes rápidos diarios y reportes filtrables/exportables.
- RF-10: Calcular y exponer el estado de cumplimiento de consulta obligatoria.
- RF-11: Aplicar permisos por rol, relación clínica y especialidad.
- RF-12: Auditar cambios clínicos, accesos a historia y exportaciones.

## Requerimientos no funcionales

- RNF-01: Datos clínicos cifrados en tránsito y en reposo.
- RNF-02: Archivos validados por tipo/tamaño, con almacenamiento privado y URL temporal.
- RNF-03: Las búsquedas y filtros habituales deben responder en menos de 3 segundos con la carga objetivo.
- RNF-04: La auditoría es inmutable para usuarios operativos.
- RNF-05: Las exportaciones deben respetar minimización de datos y permisos institucionales.
