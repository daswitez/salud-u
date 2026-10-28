# F-09 · Limpieza

Fecha: 27 de octubre de 2026. Rama frontend: `backend`.

- **Redirecciones heredadas:** se borraron las ocho páginas que solo redirigían y que nada enlazaba (ni el menú, ni componentes, ni scripts): `administrativo/capacidad`, `administrativo/incidencias`, `administrativo/lista-espera`, `estudiante/chequeo`, `estudiante/cola`, `estudiante/lista-espera`, `medico/cola` y `medico/check-in`. Ahora responden 404.
- **Se mantienen:** `administrativo/planificacion` (sugerencias de agenda, F-04) y `administrativo/check-in` (citas y asistencia) son pantallas reales con entrada en el menú.
- **`emergencyContact` en `ClinicalIntake`:** ya no estaba; lo quitó F-08. El contacto vive en los datos del paciente.
- **Teleconsulta:** el usuario la sacó del alcance el 27/10/2026. Ya se habían quitado la entrada del menú del médico, su ícono y las páginas `/medico/teleconsulta` y `/estudiante/teleconsulta/[id]`. Inventario actual: `grep -rni "teleconsulta" src` no devuelve nada.
- Verificación: `scripts/verificar-f07-f09.mjs` comprueba los 404 y que las dos pantallas reales siguen respondiendo.
