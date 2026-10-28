#!/usr/bin/env python3
"""C-03 / Apéndice A.5: calcular SUS solo a partir de respuestas reales completas."""
import argparse
import csv
import json
from pathlib import Path
from statistics import mean, variance


def puntuacion(respuestas):
    if len(respuestas) != 10 or any(type(x) is not int or not 1 <= x <= 5 for x in respuestas):
        raise ValueError("Se necesitan diez respuestas enteras entre 1 y 5, sin imputar valores ausentes.")
    return 2.5 * sum(x - 1 if i % 2 == 0 else 5 - x for i, x in enumerate(respuestas))


def informe(filas):
    versiones = {(fila.get("version") or "").strip() for fila in filas}
    if len(versiones) > 1:
        raise ValueError("Analiza cada versión en un archivo separado; no se mezclan resultados de versiones distintas.")
    participantes = []
    ids = set()
    por_rol = {}
    for numero, fila in enumerate(filas, 2):
        for clave in ("participante", "rol", "fecha", "version"):
            if not (fila.get(clave) or "").strip():
                raise ValueError(f"Fila {numero}: falta {clave}.")
        identidad = (fila["participante"], fila["version"])
        if identidad in ids:
            raise ValueError(f"Fila {numero}: participante/versión repetidos.")
        ids.add(identidad)
        try:
            respuestas = [int(fila[f"p{i}"]) for i in range(1, 11)]
        except (ValueError, KeyError, TypeError) as error:
            raise ValueError(f"Fila {numero}: respuestas incompletas o no enteras.") from error
        score = puntuacion(respuestas)
        participantes.append({"participante": fila["participante"], "rol": fila["rol"], "version": fila["version"], "sus": score})
        por_rol.setdefault(fila["rol"], []).append(score)
    promedio = mean(p["sus"] for p in participantes) if participantes else None
    # La consistencia se calcula invirtiendo los ítems pares, sin sustituir una muestra real.
    armonizadas = [[int(f[f"p{i}"]) if i % 2 else 6 - int(f[f"p{i}"]) for i in range(1, 11)] for f in filas]
    alfa = None
    if len(armonizadas) >= 2:
        var_total = variance(sum(r) for r in armonizadas)
        if var_total > 0:
            alfa = (10 / 9) * (1 - sum(variance(r[i] for r in armonizadas) for i in range(10)) / var_total)
    return {"estado": "CALCULADO" if participantes else "PENDIENTE_RESPUESTAS_REALES", "n": len(participantes), "promedio_sus": promedio, "cumple_umbral_70": promedio >= 70 if promedio is not None else None, "promedio_por_rol": {k: mean(v) for k, v in por_rol.items()}, "alfa_cronbach": alfa, "participantes": participantes, "aceptacion_global": "PENDIENTE_EVALUACION_TAREAS_Y_VALIDACION_HUMANA", "nota": "SUS es una puntuación de 0 a 100, no un porcentaje. El umbral SUS no demuestra finalización sin ayuda ni tiempos de tareas. No mezclar versiones/incrementos en una conclusión sin distinguirlos."}


def autoprueba():
    assert puntuacion([5, 1] * 5) == 100
    assert puntuacion([1, 5] * 5) == 0
    assert puntuacion([3] * 10) == 50
    assert puntuacion([4, 2, 4, 1, 5, 2, 4, 2, 4, 1]) == 82.5
    for caso in ([3] * 9, [3] * 9 + [6], [3] * 9 + [True]):
        try:
            puntuacion(caso)
        except ValueError:
            pass
        else:
            raise AssertionError("No rechazó respuestas inválidas")
    assert informe([])["promedio_sus"] is None
    assert informe([])["cumple_umbral_70"] is None
    fila = {"participante": "UNIDAD", "rol": "PRUEBA_UNITARIA", "fecha": "2026-01-01", "version": "algoritmo", **{f"p{i}": "3" for i in range(1, 11)}}
    assert informe([fila])["promedio_sus"] == 50
    try:
        informe([fila, {**fila, "participante": "OTRO", "version": "otra"}])
    except ValueError:
        pass
    else:
        raise AssertionError("No rechazó mezclar versiones")
    try:
        informe([fila, fila])
    except ValueError:
        pass
    else:
        raise AssertionError("No rechazó el registro duplicado")
    print("SUS: autopruebas aprobadas; datos sintéticos de algoritmo, no participantes.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("entrada", type=Path, nargs="?")
    parser.add_argument("--salida", type=Path)
    parser.add_argument("--autoprueba", action="store_true")
    args = parser.parse_args()
    if args.autoprueba:
        autoprueba()
    elif args.entrada:
        with args.entrada.open(encoding="utf-8-sig", newline="") as archivo:
            salida = json.dumps(informe(list(csv.DictReader(archivo))), ensure_ascii=False, indent=2) + "\n"
        if args.salida:
            args.salida.write_text(salida)
        else:
            print(salida, end="")
    else:
        parser.error("Indica el CSV de respuestas o --autoprueba.")
