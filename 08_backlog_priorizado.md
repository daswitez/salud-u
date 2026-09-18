# Backlog priorizado — Migración a gestión clínica universitaria

## 1. Propósito y resultado esperado

Este backlog transforma el frontend actual, centrado en búsqueda de citas, agenda, cola y teleconsulta, en una plataforma de gestión clínica. El recorrido objetivo es:

```text
Administración identifica/registra al estudiante
        ↓
Gestiona solicitud o cita por cupo para revisión estudiantil
        ↓
Médico de revisión crea o continúa la historia clínica
        ↓
Registra evaluación, diagnósticos, mediciones y documentos
        ↓
¿Necesita especialidad?
  ├─ No: cierra atención / seguimiento
  └─ Sí: deriva con motivo y comentario
                 ↓
      Especialista atiende, evoluciona y cierra/devuelve
                 ↓
Reportes diarios, cumplimiento y consultas autorizadas
```

Las citas se conservan como apoyo administrativo por cupos. No se elimina el portal del estudiante, pero deja de ofrecer reserva directa hacia una especialidad. El éxito del MVP se mide por poder registrar un paciente, realizar una atención inicial, adjuntar un estudio, derivar, atender la derivación y emitir un reporte diario desde datos consistentes.

## 2. Reglas para priorizar

- **P0:** sin esta entrega el flujo clínico no se puede demostrar con datos confiables.
- **P1:** completa la operación cotidiana, consulta y trazabilidad.
- **P2:** amplía calidad, automatización o especialización; no bloquea el MVP.
- Las tareas marcadas **Migrar** transforman una pantalla/componente/mock existente.
- Las tareas marcadas **Retirar** eliminan una lógica previa una vez exista su reemplazo clínico.
- No borrar una ruta o store antiguo antes de redirigirla, reemplazar sus enlaces y actualizar mocks/navegación.

## 3. P0 — Fundaciones y migración del flujo crítico

### B0. Modelo de dominio, permisos y contratos clínicos

**Tipo:** Nueva base transversal.
**Depende de:** —
**Estado:** Implementado en `src/lib/ui-contracts.ts`.

Implementar o definir los contratos de frontend para `Patient`, `ClinicalHistory`, `ClinicalEncounter`, `Diagnosis`, `Measurement`, `ClinicalDocument`, `Referral`, `Appointment` y `ReportFilter`.

**Criterios de terminado:**

- Existen tipos y mocks para los cuatro roles: administrativo, médico de revisión, especialista y estudiante.
- `carnet` y `registrationCode` son únicos en los mocks y formularios.
- Los estados de atención, documento, cita y derivación son enums/constantes compartidas; no texto libre repartido en páginas.
- Los permisos distinguen dato administrativo, contenido clínico, adjunto, derivación y exportación.
- Se actualiza [10_contratos_ui.md](./10_contratos_ui.md) si se modifica una forma pública de datos.

### B1. Store de datos clínicos demo y migración de mocks

**Tipo:** Nueva + Migrar.
**Depende de:** B0.
**Archivos a adaptar:** `src/lib/mock-clinic.ts`, `src/lib/demo-booking-store.ts`, `src/lib/demo-access-store.ts`, `src/lib/ui-contracts.ts`.
**Estado:** Implementado en `src/lib/demo-clinical-store.ts`; `mock-clinic.ts` funciona como adaptador temporal para rutas aún no migradas.

Crear un store de demostración centralizado, por ejemplo `demo-clinical-store.ts`, que sea la fuente de verdad de pacientes, atenciones, documentos, derivaciones y citas.

**Criterios de terminado:**

- Hay al menos cuatro pacientes con los casos definidos en `09_datos_de_prueba.md`.
- Una atención cerrada se conserva al crear una nueva evolución; no se sobrescribe.
- Diagnósticos, peso y adjuntos quedan vinculados a una atención y a un paciente.
- Una derivación enlaza atención origen, especialidad, motivo, comentario, estado y especialista opcional.
- Las citas existentes se convierten a `INITIAL` o `REFERRAL`; no contienen lógica de QR, cola, hold o teleconsulta.
- Los datos de pantallas administrativas, médicas y estudiantiles usan el mismo origen demo, sin duplicar pacientes incompatibles.

### B2. Inicio de sesión, roles y navegación clínica

**Tipo:** Migrar.
**Depende de:** B0.
**Archivos a adaptar:** `src/app/iniciar-sesion/page.tsx`, `src/app/actions/session.ts`, `src/lib/demo-session.ts`, `src/components/app-sidebar.tsx`, `src/components/app-header.tsx`, `src/components/student-navigation.tsx`.
**Estado:** Implementado. Teleconsulta permanece como módulo futuro sin sala ni flujo activo.

Rediseñar la navegación según el flujo actualizado.

| Actor | Menú final mínimo |
|---|---|
| Administración | Inicio, Estudiantes, Citas por cupo, Ingreso/asistencia y Reportes. |
| Médico de revisión | Inicio, Mis pacientes, Nueva atención, Derivaciones emitidas, Reportes. |
| Especialista | Inicio, Derivaciones recibidas, Mis pacientes, Reportes. |
| Estudiante | Solicitar cita, Mis citas, Mi información habilitada. |

**Criterios de terminado:**

- Cada cuenta demo abre únicamente las rutas permitidas.
- Las opciones de agenda, cola, lista de espera, teleconsulta y capacidad anterior desaparecen de navegación.
- La ruta de inicio médico muestra atenciones/derivaciones y no una agenda de turnos.
- La navegación preserva el contexto del paciente al ir de lista → historial → nueva atención → lista.

### B3. Admisión administrativa y registro único de estudiante

**Tipo:** Nueva + Migrar.
**Depende de:** B0, B1, B2.
**Ruta objetivo:** `/administrativo/estudiantes` y `/administrativo/estudiantes/nuevo`.
**Estado:** Implementado, incluida la ficha administrativa `/administrativo/estudiantes/[patientId]`.

Crear la primera pantalla del flujo real: búsqueda y registro administrativo del estudiante antes de su atención.

**Criterios de terminado:**

- Búsqueda por carnet, código de registro y nombre completo.
- Alta con nombre, carnet, código, fecha de nacimiento/edad, carrera, contacto y datos institucionales definidos.
- Validación visual de carnet/código duplicados y acción “Abrir paciente existente”.
- Edición separada de datos administrativos; no permite editar diagnóstico, evaluación ni documentos clínicos.
- Desde un paciente se puede crear/consultar una cita por cupo o abrir su resumen si el rol tiene permiso.
- La tabla indica última atención, estado de cumplimiento y derivación activa sin revelar contenido clínico sensible innecesario.

### B4. Citas por cupo para atención inicial

**Estado:** Implementado.

**Tipo:** Migrar.
**Depende de:** B1, B3.
**Archivos a adaptar:** `src/app/estudiante/buscar/page.tsx`, `src/app/estudiante/reservar/page.tsx`, `src/app/estudiante/citas/*`, `src/app/administrativo/check-in/page.tsx`, `src/lib/demo-booking-store.ts`.

Mantener únicamente la mínima gestión de solicitud, cupo, confirmación, cancelación, no asistencia y atención. La solicitud del estudiante siempre es para revisión estudiantil; Administración puede crear una cita inmediata para revisión o especialidad, identificando el origen directo cuando no proviene de una derivación.

**Criterios de terminado:**

- El estudiante solicita una cita sin escoger una especialidad.
- Administración crea o confirma una cita contra un cupo disponible.
- Estados visibles: `REQUESTED`, `SCHEDULED`, `CANCELLED`, `NO_SHOW`, `ATTENDED`.
- Pacientes recurrentes se identifican y usan cupos existentes; no hay sobre-reserva automática.
- Marcar `ATTENDED` requiere enlazar o iniciar una atención clínica en el mock.
- Se retiran mensajes, temporizadores o datos sobre hold, QR, tiempo de espera y cola.

### B4.1. Disponibilidad publicada por médicos

**Estado:** Implementado.

Cada médico configura por día sus rangos de atención, duración por cita y bloqueos. Al publicar, se generan turnos disponibles para que Administración reserve citas sin sobre-reserva. La disponibilidad de revisión solo puede ser publicada por el médico de revisión; la especializada se limita a la especialidad del médico.

### B5. Ficha de paciente e historia clínica longitudinal

**Estado:** Implementado.

**Ampliación implementada:** La admisión inicial incluye cuestionario clínico editable y adjuntos con tipo, descripción y etiquetas; el médico autorizado puede actualizar los mismos datos desde la ficha del paciente.

**Tipo:** Nueva + Migrar.
**Depende de:** B1, B3.
**Ruta objetivo:** `/medico/pacientes/[patientId]`.
**Archivos a adaptar:** `src/app/medico/atencion/[id]/page.tsx`, `src/app/medico/encuentro/[id]/page.tsx`, `src/components/clinical-form.tsx`.

Crear la ficha clínica principal para médicos autorizados. Es la pantalla más importante del nuevo producto.

**Criterios de terminado:**

- Cabecera persistente: nombre, carnet, código, edad, carrera, última atención y estado de derivación.
- Línea de tiempo de atenciones, con tipo inicial/especializada, fecha, médico, diagnósticos y estado.
- Secciones para diagnósticos, mediciones, documentos y derivaciones.
- Una atención cerrada se visualiza como solo lectura y ofrece “Crear adenda” o “Nueva evolución”, no “Editar”.
- El médico sin relación asistencial ve estado de acceso denegado, no datos de otro paciente.
- Los enlaces desde Administración no exponen información clínica fuera de sus permisos.

### B6. Nueva atención inicial y evolución clínica

**Tipo:** Migrar.
**Depende de:** B1, B5.
**Ruta objetivo:** `/medico/pacientes/[patientId]/atenciones/nueva`.
**Archivo a adaptar:** `src/components/clinical-form.tsx`.

Transformar el formulario actual en el **formulario de historia clínica base**. Esta es la revisión mínima necesaria para todos los pacientes. Aunque existe una historia clínica longitudinal unificada, por detrás cada especialidad extenderá o tendrá su propio sub-modelo/plantilla relacionado a esta base para capturar datos categóricos específicos (necesarios para sus propios reportes).

**Criterios de terminado:**

- El formulario base incluye motivo de consulta, evaluación, diagnósticos, indicaciones, seguimiento y estado de borrador/cierre.
- Representa la revisión general; los datos especializados se añaden sobre esta base o mediante un historial relacionado a la especialidad.
- Permite registrar peso con valor, unidad y fecha como medición histórica.
- Incluye estado del examen de química sanguínea: adjunto, pendiente o no presentado.
- Permite guardar borrador sin contar la consulta como cumplimiento.
- Al cerrar, agrega la atención al historial, actualiza la cita vinculada y bloquea edición directa.
- Una adenda conserva autor, fecha y motivo de corrección.

### B7. Adjuntos clínicos: escaneo, foto y clasificación

**Tipo:** Nueva.
**Depende de:** B5, B6.
**Ruta objetivo:** integrada en la ficha y formulario de atención.

Incorporar la interfaz y contrato para adjuntar documentos escaneados o fotografías, pensando específicamente en química sanguínea, radiografías y otros estudios.

**Criterios de terminado:**

- El usuario selecciona archivo/foto, tipo, fecha del estudio, descripción y etiquetas.
- Tipos: química sanguínea, resultado de laboratorio, radiografía, receta, foto clínica, documento de derivación y otro.
- La ficha muestra lista/miniatura segura con autor, fecha y atención relacionada.
- Cargar un adjunto no borra ni reemplaza adjuntos anteriores de forma silenciosa.
- Existen estados de carga, disponible, error y sin permiso.
- Los mocks usan solo recursos de demostración y no datos clínicos reales.

### B8. Creación de derivación desde revisión estudiantil

**Tipo:** Nueva.
**Depende de:** B5, B6, B7.
**Ruta objetivo:** panel/modal dentro de una atención y `/medico/derivaciones`.

La derivación es el puente entre la atención inicial y la especialidad.

**Criterios de terminado:**

- Disponible solo para médico de revisión y desde una atención válida.
- Especialidades: Dermatología, Oftalmología, Medicina Interna y Urología.
- Campos obligatorios: especialidad, motivo de consulta y comentario para el especialista.
- Permite seleccionar diagnósticos y adjuntos relevantes que se mostrarán al especialista.
- Crea derivación `PENDING_ASSIGNMENT` con fecha y médico emisor.
- Administración puede gestionar la cita asociada, pero no editar el motivo/comentario clínico.

### B8.5. Refactor del Paradigma de Flujo de Consultas (UX/UI Crítico)

**Tipo:** Refactorización Arquitectónica.
**Depende de:** B6, B8.
**Ruta objetivo:** `/medico/citas/[id]`, `/medico/derivaciones/[id]`, `/medico/pacientes/[id]/atenciones/nueva`.

**Corrección conceptual requerida:** El médico NO llena el cuestionario mientras transcurre la consulta de forma simultánea. La "Sala de Consulta" debe ser un visor de sólo lectura que contenga TODO el historial médico. El cuestionario clínico de evolución es un paso final de cierre documental.

**Criterios de terminado:**
- La Sala de Consulta (`citas/[id]` y `derivaciones/[id]`) no muestra el formulario de evolución ni redirige a él de inmediato.
- La Sala de Consulta muestra el Historial Completo a pantalla completa (Antecedentes, Línea de Tiempo, Diagnósticos, Archivos adjuntos).
- El botón "Empezar consulta" simplemente activa el estado de la cita, permitiendo revisar la historia sin distracciones.
- Se debe agregar un botón **"Finalizar Consulta"** en la Sala, el cual ES el único que redirige al cuestionario clínico de evolución (`/atenciones/nueva` o los formularios de la especialidad).
- El formulario de evolución vuelve a ser de foco central, diseñado para que el médico vacíe todo lo que diagnosticó durante la sesión presencial.

### B9. Bandeja de derivaciones y atención especializada

**Tipo:** Nueva + Migrar.
**Depende de:** B1, B5, B8.
**Archivos a retirar/reemplazar:** `src/app/medico/fichas/especialidad-1/page.tsx`, `especialidad-2`, `especialidad-3`, `especialidad-4`.

Crear una bandeja única para especialistas y usar plantillas/formularios específicos por especialidad para la evolución, manteniendo la relación con la historia base.

**Criterios de terminado:**

- El especialista ve solo derivaciones asignadas/autorizadas para su especialidad.
- Estados: `PENDING_ASSIGNMENT`, `ASSIGNED`, `IN_PROGRESS`, `RETURNED`, `CLOSED`, `CANCELLED`.
- El detalle muestra motivo, comentario, atención origen, diagnósticos y adjuntos vinculados.
- El especialista crea una evolución `SPECIALTY` que **utiliza el formulario específico de su especialidad**, capturando datos categóricos propios (ej. exámenes ginecológicos vs oftalmológicos) sin sobrescribir la atención inicial y relacionados al núcleo base.
- Puede cerrar o devolver la derivación con nota clínica.
- Las cuatro rutas de “especialidad-N” dejan de estar enlazadas y se sustituyen por rutas/plantillas con nombres reales de especialidad (Dermatología, Oftalmología, Medicina Interna, Urología).

## 4. P1 — Consulta diaria, reportes y trazabilidad

### B10. Inicio médico y accesos rápidos clínicos

**Tipo:** Migrar.
**Depende de:** B5, B8, B9.
**Archivo a adaptar:** `src/app/medico/page.tsx`.

**Criterios de terminado:**

- Tarjetas: pacientes atendidos hoy, borradores abiertos, derivaciones pendientes y derivaciones en curso.
- Atajos a “Mis pacientes”, “Nueva atención” y “Derivaciones”.
- Los números se alimentan del store clínico único.
- No muestra métricas de agenda, cola, espera o teleconsulta.

### B11. Mis pacientes e historial filtrable

**Tipo:** Nueva.
**Depende de:** B1, B5, B9.
**Ruta objetivo:** `/medico/pacientes`.

**Criterios de terminado:**

- Incluye pacientes asignados, atendidos o recibidos mediante derivación conforme a permisos.
- Tabla con paciente, carnet/código, carrera, edad, última atención, último diagnóstico y estado de derivación.
- Filtros combinables: búsqueda, fecha, diagnóstico/enfermedad, etiqueta, carrera, edad, especialidad, tipo de documento y estado de derivación.
- Conserva filtros al volver desde la ficha del paciente.
- Diferencia correctamente lista vacía por filtros y ausencia de pacientes autorizados.

### B12. Dashboard administrativo adaptado

**Tipo:** Migrar.
**Depende de:** B1, B3, B4, B6, B8.
**Archivo a adaptar:** `src/app/administrativo/page.tsx`.

Reemplazar indicadores de oferta/demanda por información operativa útil para recepción y seguimiento clínico.

**Criterios de terminado:**

- Muestra estudiantes registrados hoy, citas por estado, pacientes atendidos hoy y derivaciones pendientes.
- Incluye accesos a Estudiantes, Citas por cupo, Ingreso/asistencia y Reportes.
- No muestra previsiones de demanda, turnos médicos, capacidad de agenda ni lista de espera.
- Presenta alertas no clínicas: datos administrativos incompletos, cupos agotados y derivaciones sin asignar.

### B13. Reportes rápidos diarios

**Tipo:** Nueva.
**Depende de:** B1, B6, B8, B9.
**Ruta objetivo:** `/administrativo/reportes` y `/medico/reportes`.

**Criterios de terminado:**

- Accesos rápidos para pacientes atendidos hoy, diagnósticos del día, derivaciones creadas/pendientes/cerradas y documentos pendientes.
- Cada reporte muestra período, filtros activos, total y tabla con columnas según permiso.
- El médico visualiza únicamente sus atenciones/derivaciones o el alcance autorizado.
- Administración ve la información operacional que su permiso permite sin editar texto clínico.

### B14. Reportes filtrables, investigación y exportación

**Tipo:** Nueva.
**Depende de:** B13, B0.
**Ruta objetivo:** `/administrativo/reportes/clinicos`.

**Criterios de terminado:**

- Filtros por fecha, médico, especialidad, diagnóstico/etiqueta, carrera, edad, asistencia, paciente recurrente y estado de derivación.
- Soporta modo agregado y nominal según permiso.
- Solicita finalidad de exportación y muestra resumen de filtros antes de confirmar.
- El mock registra quién exportó, cuándo, qué filtros usó y formato solicitado.
- Para investigación, ofrece una opción de vista seudonimizada cuando el caso demo lo permita.

### B15. Cumplimiento de consulta médica obligatoria

**Tipo:** Nueva.
**Depende de:** B1, B6, B13.
**Ruta objetivo:** `/administrativo/reportes/cumplimiento`.

**Criterios de terminado:**

- Un estudiante cuenta como cumplido solo con al menos una atención `CLOSED` durante su carrera.
- Filtros por carrera y período/gestión si los datos mock lo incluyen.
- Tabla de cumplidos y pendientes; los pendientes no son bloqueo automático de inscripción.
- El resultado puede alimentar una exportación autorizada y auditoría.

### B16. Auditoría clínica y de reportes

**Tipo:** Migrar.
**Depende de:** B1–B15.
**Archivo a adaptar:** `src/app/administrativo/auditoria/page.tsx`, `src/lib/demo-audit-store.ts`.

**Criterios de terminado:**

- Eventos: registro/actualización administrativa, creación/cierre/adenda de atención, carga/acceso a adjunto, creación/cambio de derivación y exportación de reporte.
- Cada evento incluye actor, fecha/hora, recurso, acción, resultado y contexto mínimo.
- La bitácora nunca muestra el contenido completo de notas, diagnósticos o archivos.
- Filtros por actor, recurso, acción y fecha.

## 5. P1 — Retiro y reemplazo de la lógica anterior

Estas tareas se realizan cuando B2–B13 ya proporcionen una ruta alternativa visible. El objetivo es que no sobrevivan enlaces ni datos contradictorios.

| ID | Elemento actual | Acción de adaptación |
|---|---|---|
| R1 | `src/app/medico/agenda/*` | Retirar del menú y redirigir a `Mis pacientes` o `Derivaciones`. |
| R2 | `src/app/medico/cola/*`, `src/app/estudiante/cola/*` | Retirar; la atención se representa mediante cita/atención, no cola digital. |
| R3 | `src/app/estudiante/lista-espera/*`, `src/app/administrativo/lista-espera/*` | Retirar enlaces y stores; los cupos se administran sin lista de espera en este alcance. |
| R4 | `src/app/**/teleconsulta*`, `src/lib/demo-telehealth-store.ts` | Retirar rutas, navegación y mocks de teleconsulta. |
| R5 | `src/app/administrativo/capacidad/*`, `planificacion/*`, `solicitudes/*`, `personal-medico/*` | Retirar o dejar fuera de navegación hasta que exista un requerimiento clínico/administrativo concreto. No reutilizar para reportes. |
| R6 | `src/app/administrativo/incidencias/page.tsx` | Evaluar si se reemplaza por incidencias de registro/derivación; no mantener incidencias de agenda. |
| R7 | `src/app/estudiante/chequeo/page.tsx` | Convertir en estado informativo de cumplimiento de consulta o integrar en “Mis citas”. |
| R8 | `src/app/estudiante/buscar`, `reservar`, `citas` | Conservar solo las rutas necesarias para solicitud de atención inicial y consulta de estado. |
| R9 | `src/lib/demo-workforce-store.ts` | Retirar dependencias de turnos/horarios; conservar únicamente datos de profesionales y especialidades si son necesarios para derivación. |
| R10 | `src/lib/demo-notifications-store.ts`, `notification-preferences.tsx` | Conservar solo notificaciones de cita y derivación sin datos clínicos sensibles; posponer si no son necesarias para el MVP. |

**Criterio global de terminado:** una búsqueda global en `src` no encuentra enlaces de navegación activos hacia agenda, cola, lista de espera, QR, teleconsulta o especialidades numeradas.

## 6. P2 — Extensiones posteriores al MVP

| ID | Entrega | Resultado esperado |
|---|---|---|
| B17 | Catálogos clínicos administrables | Diagnósticos, etiquetas, tipos de documento y carreras gestionables sin cambiar código. |
| B18 | Plantillas específicas por especialidad | Secciones adicionales para Dermatología, Oftalmología, Medicina Interna y Urología sobre el formulario común. |
| B19 | Mejoras de documentos | Recorte/rotación de fotos, vista ampliada, control de calidad y reintentos. |
| B20 | Notificaciones seguras | Avisos de cita/derivación sin diagnóstico, documento ni contenido clínico. |
| B21 | Integración institucional | Consulta de datos académicos y entrega de reporte de cumplimiento mediante contrato aprobado. |
| B22 | Analítica agregada | Tendencias, prevalencia y tableros con controles de privacidad para investigación autorizada. |
| B23 | Backend real y almacenamiento privado | Sustituir stores demo por API, autorización contextual, base de datos y archivos privados. |
| B24 | Pruebas E2E y accesibilidad | Recorridos por actor, validaciones, teclado, lectores de pantalla y responsive. |

## 7. Dependencias y orden de entrega

```text
B0 → B1 → B2
          ├── B3 → B4
          └── B5 → B6 → B7 → B8 → B9
                         ↓
                   B10 → B11
                   B12 → B13 → B14 → B15 → B16
```

Interpretación:

1. Primero unificar datos y permisos.
2. Luego habilitar admisión y cita por cupo.
3. Construir historia, atención y documentos antes de derivar.
4. Atender derivaciones antes de diseñar reportes que dependan de ellas.
5. Retirar las rutas antiguas solo después de que los reemplazos sean navegables.

## 8. Corte recomendado del MVP demostrable

El MVP está listo para demostración cuando una persona pueda ejecutar este guion sin pantallas previas contradictorias:

1. Ingresa como Administración y registra o encuentra a Daniela Rojas por carnet/código.
2. Crea una cita de revisión por cupo y registra su asistencia.
3. Ingresa como médico de revisión, abre la ficha, registra una atención inicial, peso, diagnóstico y química sanguínea/foto adjunta.
4. Crea una derivación a Dermatología con motivo y comentario.
5. Ingresa como especialista, abre la derivación, registra su evolución y la cierra.
6. Ingresa como Administración o médico autorizado y ve atendidos hoy, diagnóstico, derivación y estado de cumplimiento.
7. Abre auditoría y comprueba los eventos principales sin exponer texto clínico sensible.

## 9. Criterios transversales de terminado

- El vocabulario visible usa **paciente**, **atención**, **historia clínica**, **derivación** y **cupo** de forma consistente.
- Todo dato clínico tiene paciente, autor, fecha y relación con atención/derivación cuando aplique.
- No se simula un diagnóstico, documento ni dato personal real en datos de prueba.
- Cada pantalla incluye estados de carga, vacío, error, sin permiso y éxito cuando corresponda.
- Las acciones destructivas no eliminan información clínica cerrada: crean adenda, cancelación o cambio de estado auditable.
- Los filtros y reportes muestran siempre el período consultado y respetan permisos.
- Antes de cerrar cada bloque, se actualizan `09_datos_de_prueba.md`, `10_contratos_ui.md` y las rutas de navegación afectadas.
