# F-05 · Cupos sugeridos al asignar

En `administrativo/check-in`, al seleccionar una solicitud pendiente se consultan hasta tres cupos de `GET /api/appointment-requests/{id}/suggested-slots`, con puntaje, explicación, profesional y horario. Se conservan los demás cupos compatibles; elegir un resultado utiliza el mismo endpoint de asignación existente. Se muestran estados de carga, vacío y error con reintento. El proxy de O-05 ya estaba en `next.config.ts`.

El recorrido `scripts/verificar-f0605.mjs` consulta la API real en una pila sintética, compara las opciones presentadas y confirma que asignar envía el cupo elegido al endpoint existente. Captura y salida en `ENTREGAS_CODEX/F-06-F-05/`.
