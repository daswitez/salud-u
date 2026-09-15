# Resumen del proyecto

## 1. Nombre conceptual

**Sistema Web y Móvil de Gestión de Atención Médica Universitaria con Historias Clínicas Especializadas e Inteligencia Artificial para la Estimación de Tiempos de Espera.**

## 2. Contexto

El proyecto busca digitalizar el recorrido de atención del estudiante universitario, desde la exploración de disponibilidad hasta la atención clínica y el registro especializado del encuentro médico.

El problema actual se caracteriza por procesos manuales, fichas presenciales, filas físicas, dificultad para conocer disponibilidad real, variaciones fuertes en la demanda, tiempos de espera impredecibles y registros clínicos no integrados al flujo digital.

La solución propuesta reemplaza la lógica de “ir a buscar ficha” por un flujo digital de reserva, check-in y cola, donde el estudiante puede conocer disponibilidad y estimaciones de espera antes y durante su atención.

## 3. Actores

### Estudiante Universitario

- Busca atención.
- Reserva citas.
- Programa chequeo obligatorio.
- Cancela y reprograma.
- Recibe QR o acceso de teleconsulta.
- Realiza check-in.
- Consulta tiempo de espera.
- Ingresa a lista de espera.
- Recibe notificaciones.

### Personal Médico Especialista

- Consulta su agenda.
- Solicita modificaciones de disponibilidad.
- Visualiza pacientes en cola.
- Inicia y finaliza consultas.
- Registra historia clínica correspondiente a su especialidad.
- Participa en teleconsultas.

### Personal Administrativo

- Gestiona médicos.
- Asocia especialidades y modalidades.
- Resuelve solicitudes de agenda.
- Asigna y publica turnos médicos.
- Configura campañas Tipo A.
- Analiza capacidad y demanda.
- Gestiona incidencias de agenda.
- Realiza o asiste check-in cuando corresponda.

No existe el rol de “Coordinador de Salud”. Las responsabilidades de coordinación operativa se modelan mediante permisos del Personal Administrativo.

## 4. Tipos de demanda

### Tipo A — Chequeo médico obligatorio único

- Se realiza una sola vez durante la carrera.
- Se maneja mediante campañas masivas.
- La capacidad de campaña es independiente de los cupos de especialidades.
- No debe consumir slots destinados a atención especializada.

### Tipo B — Atención por especialidad

- El estudiante puede reservar atención en una de las cuatro especialidades.
- La oferta depende de turnos médicos publicados.
- Existe fuerte variabilidad de demanda según fecha, horario y periodo académico.

## 5. Flujo general del sistema

```text
Administración de médicos
        ↓
Asignación de turnos
        ↓
Generación de slots
        ↓
Exploración de disponibilidad
        ↓
Reserva / campaña
        ↓
QR o teleconsulta
        ↓
Check-in
        ↓
Cola digital
        ↓
Estimación de espera
        ↓
Atención
        ↓
Historia clínica especializada
        ↓
Datos históricos
        ↓
Mejor estimación y planificación de capacidad
```

## 6. Objetivo general propuesto

Desarrollar un sistema web y móvil para la gestión de citas, agenda, atención e historias clínicas especializadas, incorporando herramientas de gestión de capacidad, cola digital y un modelo de inteligencia artificial para la estimación de tiempos de espera, con el propósito de mejorar la accesibilidad, eficiencia administrativa y continuidad de la atención médica universitaria.

## 7. Alcance funcional

### Gestión de oferta médica

- Alta y mantenimiento de médicos.
- Especialidades y modalidades habilitadas.
- Solicitudes de cambio de agenda.
- Asignación de turnos.
- Generación automática de slots.
- Bloqueos y excepciones.

### Citas y campañas

- Búsqueda por especialidad, médico, fecha y modalidad.
- Hold temporal de 10 minutos.
- Reserva Tipo B.
- Campañas Tipo A.
- Cancelación y reprogramación.

### Atención multimodal

- Presencial con QR.
- Teleconsulta con token temporal.
- Sala de espera virtual.
- Check-in digital.

### Demanda y espera

- Cola digital.
- Estimación de tiempo de espera.
- Clasificación de demanda.
- Lista de espera.
- Reasignación automática de slots liberados.
- Dashboard capacidad vs demanda.

### Historia clínica

- Núcleo común de encuentro clínico.
- Ficha Especialidad 1.
- Ficha Especialidad 2.
- Ficha Especialidad 3.
- Ficha Especialidad 4.

## 8. Fuera de alcance inicial recomendado

Para no convertir el proyecto en una plataforma hospitalaria completa, se recomienda dejar fuera del MVP:

- Laboratorio clínico.
- Farmacia y dispensación.
- Facturación.
- Interoperabilidad nacional o externa.
- Diagnóstico automatizado por IA.
- Prescripción electrónica avanzada.
- Gestión hospitalaria o internación.

