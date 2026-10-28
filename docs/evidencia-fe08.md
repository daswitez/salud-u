# F-08 · Sexo y contacto de emergencia

El alta y la edición administrativa permiten registrar el sexo y un contacto opcional. «Sin registrar» corresponde a NULL; «No declara» envía NOT_RECORDED. En edición, quitar el contacto envía explícitamente `emergencyContact: null`. El sexo existente no puede borrarse a NULL mediante el contrato A-01: se puede cambiar a otro valor admitido.

El perfil de estudiante consulta y guarda el contacto propio mediante GET y PUT `/api/me/emergency-contact`. La API no ofrece eliminación desde el perfil. La ficha autorizada del médico presenta el contacto recibido de `/api/medical/patients/{id}` en solo lectura. El campo antiguo `ClinicalIntake.emergencyContact` se retiró del contrato de interfaz.

El recorrido `scripts/verificar-f08.mjs` usa solo la pila de demostración aislada, comprueba alta y modificación, recarga, eliminación administrativa con null, lectura y actualización del estudiante, y lectura médica sin controles de edición. La ejecución, las capturas con datos sintéticos y los resultados de pruebas están en `ENTREGAS_CODEX/F-08/`.

Las rutas ya existían y la regla de proxy de `/api/me/emergency-contact` ya estaba en `next.config.ts`; no se agregaron rutas nuevas.
