# F-10 · Términos y consentimiento para investigación

El portal de estudiante consulta `/api/me/consents` y bloquea sus pantallas si hay textos vigentes pendientes. El formulario exige aceptar los términos y escoger Sí o No, sin preselección; envía las versiones visualizadas y recarga ambos textos ante un 409. El perfil permite cambiar la respuesta.

En Administración, el alta consulta `/api/consent-texts`, muestra ambos textos y envía la respuesta en la misma transacción de creación. El check-in abre un diálogo al recibir 422 `CONSENTIMIENTO_PENDIENTE` y reenvía el cuerpo de la solicitud con las decisiones. `/administrativo/solicitudes` actualmente es una redirección sin creación de solicitudes; el flujo operativo está en check-in. La ficha del paciente muestra y permite cambiar la respuesta vigente.

La migración V97 agrega la lectura de textos vigentes sin paciente previo, limitada a Administración. Se añadió su proxy y se corrige la lectura del código de error en el cliente. La configuración local de Compose habilita `SALUD_U_CONSENTS_REQUIRED` por defecto; el entorno puede sobrescribirla.

El recorrido `scripts/verificar-f10.mjs`, con datos ficticios en una pila aislada, verifica bloqueo, decisiones sin preselección, recarga ante 409 simulado, alta, diálogo, persistencia y que responder No permite solicitar una cita. La salida, capturas y condiciones de antes y después están en `ENTREGAS_CODEX/F-10/`.

Los textos actuales de A-03 son borradores que el centro debe revisar. Una nueva versión deja pendientes las respuestas de versiones anteriores; no se altera la historia de consentimientos.
