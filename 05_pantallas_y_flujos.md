# Pantallas y flujos

## 1. Total recomendado

**32 pantallas principales**.

No se cuentan como pantallas independientes:

- modales;
- diálogos de confirmación;
- estados vacíos;
- toasts;
- drawers;
- errores inline.

## 2. Compartidas

### 1. Inicio de sesión

Autenticación y redirección por rol.

### 2. Perfil y preferencias

Datos básicos, preferencias de notificación, seguridad y sesión.

---

# 3. Estudiante — 10 pantallas

### 3. Inicio del estudiante

Resumen de próxima cita, estado de cola, chequeo obligatorio, lista de espera y accesos rápidos.

### 4. Buscar atención

Filtros por especialidad, médico, fecha y modalidad. Muestra disponibilidad y tiempo estimado cuando aplique.

### 5. Confirmación de reserva / hold

Resumen de slot y contador de 10 minutos.

### 6. Mis citas

Futuras, anteriores, canceladas y completadas.

### 7. Detalle de cita

QR, acceso de teleconsulta, cancelar, reprogramar y estado.

### 8. Chequeo obligatorio Tipo A

Estado del chequeo y campañas disponibles.

### 9. Lista de espera

Preferencias, ofertas y estado.

### 10. Cola digital

Estado de atención y espera estimada.

### 11. Teleconsulta

Sala de espera y acceso a consulta.

### 12. Notificaciones

Recordatorios, ofertas y cambios.

---

# 4. Médico — 11 pantallas

### 13. Inicio médico

Resumen operativo del día.

### 14. Mi agenda

Vista diaria/semanal/mensual.

### 15. Solicitudes de agenda

Crear y consultar solicitudes de cambios.

### 16. Cola de pacientes

Pacientes con check-in y acciones de llamado.

### 17. Detalle paciente/cita

Contexto previo a la atención.

### 18. Resumen clínico

Encuentros anteriores permitidos.

### 19. Historia clínica Especialidad 1

Ficha especializada.

### 20. Historia clínica Especialidad 2

Ficha especializada.

### 21. Historia clínica Especialidad 3

Ficha especializada.

### 22. Historia clínica Especialidad 4

Ficha especializada.

### 23. Teleconsulta médica

Sala virtual, pacientes conectados y consulta.

---

# 5. Administrativo — 9 pantallas

### 24. Dashboard administrativo

Capacidad, saturación, citas, médicos e incidencias.

### 25. Gestión de personal médico

Alta, edición, activación y configuración profesional.

### 26. Planificación de agenda y turnos

Asignar turnos, generar slots, bloquear horarios y publicar capacidad.

### 27. Solicitudes médicas

Resolver ausencias, cambios y turnos adicionales.

### 28. Capacidad y demanda

Comparar demanda, capacidad, espera y lista de espera.

### 29. Campañas Tipo A

Crear campañas y administrar capacidad independiente.

### 30. Gestión de citas y lista de espera

Administrar excepciones operativas y reasignaciones.

### 31. Recepción y check-in

Validar QR y registrar llegada.

### 32. Auditoría y trazabilidad

Consultar cambios de agenda, citas y registros críticos según permisos.

---

# 6. Pantallas prioritarias para Figma

Diseñar primero estas 12:

1. Inicio de sesión.
2. Inicio estudiante.
3. Buscar atención.
4. Confirmación de reserva.
5. Detalle de cita.
6. Cola digital.
7. Inicio médico.
8. Agenda médica.
9. Historia especializada base.
10. Dashboard administrativo.
11. Planificación de turnos.
12. Capacidad y demanda.

Con estas se define la mayor parte del design system.

---

# 7. Flujos prioritarios

## Flujo A — Reserva Tipo B

```text
Inicio estudiante
→ Buscar atención
→ Aplicar filtros
→ Seleccionar slot
→ Hold 10 min
→ Confirmar
→ Detalle cita
```

## Flujo B — Presencial

```text
Detalle cita
→ QR
→ Recepción
→ Check-in
→ Cola digital
→ Médico llama
→ Consulta
→ Encuentro finalizado
```

## Flujo C — Teleconsulta

```text
Detalle cita
→ Acceso virtual
→ Sala de espera
→ Médico recibe alerta
→ Médico admite
→ Consulta
→ Finalización
```

## Flujo D — Lista de espera

```text
Sin disponibilidad
→ Unirse a lista
→ Slot liberado
→ Oferta temporal
→ Aceptar
→ Cita confirmada
```

## Flujo E — Planificación médica

```text
Dashboard admin
→ Capacidad y demanda
→ Déficit detectado
→ Planificación de turnos
→ Seleccionar médico
→ Crear turno
→ Generar slots
→ Publicar
```

## Flujo F — Cambio solicitado por médico

```text
Agenda médica
→ Solicitar cambio
→ Impacto calculado
→ Administrativo revisa
→ Aprobar/rechazar
→ Ajustar agenda
→ Notificar afectados
```

