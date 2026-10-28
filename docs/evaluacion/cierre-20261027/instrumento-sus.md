# C-03 · Protocolo de tareas y cuestionario SUS

Fuente vigente: **MSD-Documento proyecto de grado Ver.1.10 u.docx**, sección 3.5.3, Cuadro 3.69 y Apéndices A.5/A.6. Fecha de preparación: 27/10/2026. **Instrumento listo; sin respuestas reales ni aceptación humana acreditada.** El usuario confirmó que aún no existen respuestas. Los recorridos del agente no son participantes SUS.

## Aplicación

1. Registrar versión/huella del sistema, fecha, entorno y observador. Usar cuentas y casos de prueba; asignar un seudónimo a cada participante, sin nombre ni datos clínicos personales en la planilla.
2. Explicar la tarea sin enseñar el recorrido. Cronometrar inicio y fin, anotar errores, dificultades y cada ayuda; no convertir una tarea asistida en «sin ayuda». Cada participante realiza las tareas de su rol.
3. Registrar los resultados en `tareas-usuarios.csv`; conservar la evidencia correspondiente. «Éxito» y «sin ayuda» son SI/NO. El límite de cuatro minutos solo se aplica donde lo especifica el documento.
4. Al terminar, entregar las diez afirmaciones sin respuestas preseleccionadas. Cada participante responde individualmente según su experiencia. Una respuesta omitida queda pendiente; no se completa con una media ni con una respuesta del evaluador.
5. Introducir las respuestas completas en `sus-respuestas.csv`. Separar sesiones/versión; el calculador rechaza duplicar participante/versión. No publicar un promedio combinado de versiones diferentes como si fuera una sola evaluación.

## Tareas por rol — Cuadro 3.69

| ID de registro | Rol | Tarea | Criterio de éxito |
|---|---|---|---|
| U-01 | Administración | Registrar un estudiante y asignarle revisión en un cupo disponible | Sin asistencia en menos de 4 minutos |
| U-02 | Administración | Asignar una derivación pendiente | Cita vinculada; solo cupos compatibles |
| U-03 | Médico de revisión | Iniciar atención, registrar antecedentes/ficha, adjuntar laboratorio y cerrar con derivación | Cierre y derivación sin pérdida de datos |
| U-04 | Médico de revisión | Abrir una atención anterior sin abandonar el formulario activo | Detalle/archivos autorizados y borrador conservado |
| U-05 | Especialista | Abrir derivación, revisar contexto, completar ficha y resolver con nota | Nueva versión cerrada y derivación resuelta |
| U-06 | Reportes | Reporte semestral con dos filtros clínicos y exportación XLSX | Archivo/filtros/filas coincidentes y auditoría |
| U-07 | Administración | Crear vacuna de dos dosis y registrar una aplicada | Lote/médico persistidos y esquema incompleto visible |
| U-08 | Reportes | Conjunto para investigación con finalidad | Sin identificadores, con diccionario y auditoría |
| U-09 | Administración | Revisar sugerencias de mañana, aceptar una y modificar otra | Decisiones persistidas; agenda solo cambia al confirmar y explicación comprensible. **Pendiente F-04** |

Estudiante y Auditor tienen recorridos técnicos complementarios de C-03; no se inventa para ellos una participación SUS ni una tarea del Cuadro 3.69.

## Cuestionario — Apéndice A.5

Indique el grado de acuerdo con cada afirmación: **1** totalmente en desacuerdo; **2** en desacuerdo; **3** neutral; **4** de acuerdo; **5** totalmente de acuerdo. Marque una respuesta por fila después de usar el sistema.

| N.º | Afirmación | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 1 | Creo que me gustaría utilizar este sistema con frecuencia. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2 | Encontré el sistema innecesariamente complejo. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 3 | Pensé que el sistema era fácil de usar. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 4 | Creo que necesitaría el apoyo de una persona técnica para poder utilizar este sistema. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 5 | Encontré que las distintas funciones del sistema estaban bien integradas. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 6 | Pensé que había demasiada inconsistencia en este sistema. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 7 | Imagino que la mayoría de las personas aprendería a utilizar este sistema muy rápidamente. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 8 | Encontré el sistema muy engorroso de utilizar. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 9 | Me sentí muy seguro utilizando el sistema. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 10 | Necesité aprender muchas cosas antes de poder manejarme con el sistema. | ☐ | ☐ | ☐ | ☐ | ☐ |

Texto transcrito del instrumento incluido en el documento proporcionado; este lo atribuye a Brooke (1996).

## Cálculo y aceptación

Para ítems impares: respuesta − 1. Para pares: 5 − respuesta. Sumar las diez contribuciones y multiplicar por 2,5. La puntuación va de 0 a 100; no es un porcentaje de tareas exitosas. El criterio documental es **promedio SUS ≥ 70 y todas las tareas críticas completadas sin ayuda**. Un promedio suficiente no cierra las tareas pendientes ni valida F-04.

```bash
python3 scripts/calcular-sus.py --autoprueba
python3 scripts/calcular-sus.py docs/evaluacion/cierre-20261027/sus-respuestas.csv \
  --salida docs/evaluacion/cierre-20261027/sus-resultado.json
```

El calculador entrega resultados individuales, media y media por rol. Informa alfa de Cronbach con ítems pares invertidos solo cuando hay al menos dos registros y varianza total no nula; no lo interpreta como validación de fiabilidad con una muestra pequeña. Las versiones deben analizarse por separado.

**Estado actual:** n = 0, promedio = null, umbral = null. Planillas vacías, sin filas de ejemplo que puedan confundirse con participantes reales. Las autopruebas del algoritmo utilizan datos sintéticos internos y no se mezclan con estas planillas.
