# IA, datos y gestión de demanda

## 1. Objetivo de la IA

El objetivo principal del componente de IA es **estimar el tiempo de espera** para atención, no predecir prioridad clínica ni decidir quién debe recibir atención.

La estimación debe ayudar a:

- estudiantes;
- médicos;
- personal administrativo.

## 2. Variable objetivo

```text
wait_time_minutes = consultation_started_at - checked_in_at
```

El sistema debe registrar esos timestamps automáticamente.

## 3. Features posibles

### Estado actual

- `queue_length`
- `patients_in_consultation`
- `active_doctors`
- `recent_arrivals`
- `recent_completions`
- `appointments_next_60_minutes`

### Contexto temporal

- hora;
- día de semana;
- mes;
- periodo académico;
- proximidad a campañas;
- feriados institucionales si se dispone del dato.

### Históricas

- duración media de consulta;
- mediana;
- espera media en el mismo rango horario;
- tasa histórica de llegada;
- tasa histórica de finalización.

## 4. Salida recomendada

No mostrar un valor único como una promesa.

Mostrar:

```text
Espera estimada: 25–35 min
Demanda: Alta
```

Respuesta API ejemplo:

```json
{
  "estimatedWaitMinutes": 30,
  "lowerBound": 24,
  "upperBound": 38,
  "demandLevel": "HIGH",
  "modelVersion": "wait-time-1.0.0"
}
```

## 5. Modelos candidatos

Baseline:

- promedio histórico;
- mediana histórica;
- fórmula aproximada cola × duración / médicos.

Modelos a comparar:

- Linear Regression;
- Random Forest Regressor;
- Gradient Boosting Regressor;
- HistGradientBoostingRegressor.

No elegir el modelo final antes de medir.

## 6. Métricas

### Principal

**MAE — Mean Absolute Error**

Interpretación:

> MAE = 7.5 minutos significa que la predicción se desvía aproximadamente 7.5 minutos del valor real, en promedio.

### Secundarias

- RMSE.
- R².

## 7. Objetivo experimental

Meta inicial razonable:

- MAE <= 10 minutos.

Debe tratarse como meta experimental, no como garantía previa.

## 8. Cold start

El sistema actual no dispone necesariamente de suficiente información digital histórica.

### Fase 1 — Baseline

Usar:

```text
queue_length × average_consultation_duration / active_doctors
```

ajustado con estadísticas simples.

### Fase 2 — Recolección

Registrar cada atención:

```text
checked_in_at
consultation_started_at
consultation_finished_at
```

### Fase 3 — Entrenamiento

- limpiar dataset;
- separar entrenamiento/validación/test;
- entrenar modelos candidatos;
- comparar con baseline.

### Fase 4 — Despliegue

Solo publicar un modelo si mejora suficientemente el baseline.

## 9. Reentrenamiento

El reentrenamiento no necesita ser en tiempo real.

Para el proyecto puede implementarse como proceso controlado:

1. extraer dataset;
2. entrenar offline;
3. evaluar;
4. versionar;
5. publicar nueva versión.

## 10. Versionado

Toda predicción debería almacenar:

```text
prediction_id
specialty_id
predicted_minutes
lower_bound
upper_bound
model_version
generated_at
```

Y posteriormente:

```text
actual_wait_minutes
```

Esto permite medir el error real.

## 11. Fallback

Si el servicio Python no responde:

1. la reserva continúa funcionando;
2. la cola continúa funcionando;
3. el backend utiliza baseline estadístico;
4. la UI puede indicar que el tiempo es una aproximación basada en histórico.

La IA nunca debe ser un punto único de falla para las citas.

## 12. Gestión de demanda

Además de la espera actual, los datos pueden ayudar a estimar demanda por periodo.

Ejemplo administrativo:

```text
Especialidad 1

Capacidad próxima semana: 96
Demanda estimada: 124
Lista de espera: 21
Déficit previsto: 28
```

El sistema puede sugerir:

> “Capacidad prevista insuficiente”.

Pero la decisión de abrir turnos adicionales debe seguir siendo humana/administrativa.

## 13. Flujo oferta-demanda

```text
Demanda histórica
+ cola actual
+ lista de espera
+ capacidad publicada
        ↓
Análisis
        ↓
Déficit detectado
        ↓
Decisión administrativa
        ↓
Turno médico adicional
        ↓
Nuevos slots
        ↓
Mayor capacidad
```

## 14. Consideraciones éticas

- No usar variables sensibles sin justificación operacional clara.
- No inferir prioridad clínica con el modelo.
- No negar atención por una predicción.
- Mantener trazabilidad de versión del modelo.
- Documentar error y limitaciones.

