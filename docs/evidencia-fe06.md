# F-06 · Bloqueos y reprogramación

La pantalla administrativa `/administrativo/bloqueos` permite proponer bloqueo de día completo o franja, consultar las citas afectadas y sus explicaciones, aceptar, rechazar con motivo o elegir otro cupo con motivo. El bloqueo se aplica cuando el backend confirma que el horario ya no tiene citas; tras rechazar una reprogramación se mantiene pendiente mientras exista una cita. El enlace contiene el identificador para recuperar y actualizar la propuesta tras recargar. Las rutas de API O-07 y O-06 ya cuentan con reglas de proxy en `next.config.ts`.

El backend O-07 no ofrece un listado de propuestas; para retomar una propuesta se usa su enlace o identificador. El recorrido `scripts/verificar-f0605.mjs` comprueba una aceptación y un rechazo persistidos tras recargar. `scripts/verificar-f06-modificar.mjs` comprueba la elección de otro cupo y su persistencia. Capturas y evidencia sintética en `ENTREGAS_CODEX/F-06-F-05/`.
