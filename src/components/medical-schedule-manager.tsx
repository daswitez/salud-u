"use client";

import { useEffect, useState } from "react";
import { getMedicalSchedules, saveMedicalSchedule, type MedicalSchedule } from "@/lib/demo-booking-store";
import type { Specialty } from "@/lib/ui-contracts";

const DAYS_OF_WEEK = [
  { id: 1, name: "Lunes" },
  { id: 2, name: "Martes" },
  { id: 3, name: "Miércoles" },
  { id: 4, name: "Jueves" },
  { id: 5, name: "Viernes" },
  { id: 6, name: "Sábado" },
  { id: 7, name: "Domingo" },
];

type DayConfig = {
  active: boolean;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  blockStart: string;
  blockEnd: string;
  blockReason: string;
};

export function MedicalScheduleManager({ doctorId, isReviewDoctor, specialty }: { doctorId: string; isReviewDoctor: boolean; specialty?: Specialty }) {
  const [schedules, setSchedules] = useState<MedicalSchedule[]>([]);
  const [message, setMessage] = useState("");
  
  // Para la demo, el inicio de la semana se define fijo en un lunes próximo (ej: 2026-09-21)
  const [weekStartDate, setWeekStartDate] = useState("2026-09-21");

  const [weekConfig, setWeekConfig] = useState<Record<number, DayConfig>>(() => {
    const initial: Record<number, DayConfig> = {};
    DAYS_OF_WEEK.forEach(day => {
      // Por defecto lunes a viernes activos
      initial[day.id] = {
        active: day.id <= 5,
        startTime: "09:00",
        endTime: "13:00",
        durationMinutes: 30,
        blockStart: "",
        blockEnd: "",
        blockReason: "",
      };
    });
    return initial;
  });

  function refresh() {
    setSchedules(getMedicalSchedules(doctorId));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [doctorId]);

  function updateDay(dayId: number, field: keyof DayConfig, value: any) {
    setWeekConfig(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value }
    }));
  }

  function applyToAll(sourceDayId: number) {
    const source = weekConfig[sourceDayId];
    setWeekConfig(prev => {
      const next = { ...prev };
      DAYS_OF_WEEK.forEach(day => {
        if (day.id !== sourceDayId && prev[day.id].active) {
          next[day.id] = { ...prev[day.id], startTime: source.startTime, endTime: source.endTime, durationMinutes: source.durationMinutes, blockStart: source.blockStart, blockEnd: source.blockEnd, blockReason: source.blockReason };
        }
      });
      return next;
    });
    setMessage("Configuración copiada a los demás días activos.");
  }

  function save() {
    setMessage("");
    const start = new Date(`${weekStartDate}T12:00:00`); // Evitar problemas de zona horaria
    
    let successCount = 0;
    let errorCount = 0;
    let lastError = "";

    DAYS_OF_WEEK.forEach((day, index) => {
      const config = weekConfig[day.id];
      if (!config.active) return;

      const dateObj = new Date(start);
      dateObj.setDate(start.getDate() + index); // Lunes + 0, Martes + 1, etc.
      const dateStr = dateObj.toISOString().split("T")[0];

      const blocks = config.blockStart && config.blockEnd 
        ? [{ startTime: config.blockStart, endTime: config.blockEnd, reason: config.blockReason || "Bloqueo/Descanso" }] 
        : [];

      const result = saveMedicalSchedule({
        doctorId,
        appointmentType: isReviewDoctor ? "INITIAL" : "SPECIALTY",
        specialty: isReviewDoctor ? undefined : specialty,
        date: dateStr,
        startTime: config.startTime,
        endTime: config.endTime,
        durationMinutes: config.durationMinutes,
        blocks,
      });

      if (result.ok) {
        successCount++;
      } else {
        errorCount++;
        lastError = result.message;
      }
    });

    if (successCount > 0 && errorCount === 0) {
      setMessage(`Se han publicado exitosamente los horarios para ${successCount} día(s).`);
    } else if (successCount > 0 && errorCount > 0) {
      setMessage(`Se publicaron ${successCount} día(s), pero fallaron ${errorCount}. Último error: ${lastError}`);
    } else if (errorCount > 0) {
      setMessage(`No se pudo publicar la disponibilidad. Error: ${lastError}`);
    } else {
      setMessage("No se seleccionó ningún día activo para publicar.");
    }
    
    refresh();
  }

  return (
    <div>
      <section className="mt-6 rounded-2xl border border-divider bg-surface p-5 sm:p-7">
        <header>
          <p className="text-sm font-semibold tracking-wide text-primary">PLANIFICACIÓN SEMANAL</p>
          <h1 className="mt-1 text-3xl font-bold text-text-primary">Disponibilidad Médica</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Selecciona la semana y define rápidamente qué días asistes y en qué horarios. Puedes registrar descansos o bloqueos por día.
          </p>
        </header>

        {message && (
          <p role="status" className="mt-5 rounded-xl bg-primary-container p-4 text-sm font-medium text-primary">
            {message}
          </p>
        )}

        <div className="mt-6 border-b border-divider pb-6">
          <label className="block max-w-xs">
            <span className="text-sm font-semibold text-text-primary">Semana que inicia el (Lunes)</span>
            <input 
              type="date" 
              value={weekStartDate} 
              onChange={(e) => setWeekStartDate(e.target.value)} 
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary-200" 
            />
          </label>
        </div>

        <div className="mt-6 grid gap-6">
          {DAYS_OF_WEEK.map((day) => {
            const config = weekConfig[day.id];
            return (
              <div key={day.id} className={`rounded-xl border ${config.active ? 'border-primary-200 bg-surface' : 'border-divider bg-surface-secondary opacity-75'} p-4 transition-colors`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.active} 
                      onChange={(e) => updateDay(day.id, "active", e.target.checked)} 
                      className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className={`font-bold ${config.active ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {day.name}
                    </span>
                  </label>
                  {config.active && day.id === 1 && (
                    <button onClick={() => applyToAll(day.id)} className="text-xs font-semibold text-primary hover:underline">
                      Copiar a demás días
                    </button>
                  )}
                </div>

                {config.active && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label>
                      <span className="text-xs font-semibold text-text-secondary">Desde</span>
                      <input 
                        type="time" 
                        value={config.startTime} 
                        onChange={(e) => updateDay(day.id, "startTime", e.target.value)} 
                        className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" 
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold text-text-secondary">Hasta</span>
                      <input 
                        type="time" 
                        value={config.endTime} 
                        onChange={(e) => updateDay(day.id, "endTime", e.target.value)} 
                        className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" 
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold text-text-secondary">Duración/Cita</span>
                      <select 
                        value={config.durationMinutes} 
                        onChange={(e) => updateDay(day.id, "durationMinutes", Number(e.target.value))} 
                        className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <option value={15}>15 min</option>
                        <option value={20}>20 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                      </select>
                    </label>
                    
                    <div className="sm:col-span-2 lg:col-span-4 rounded-lg bg-warning-container/30 p-3 mt-1 border border-warning-container">
                      <p className="text-xs font-semibold text-warning-700 mb-2">Bloqueo o descanso (opcional)</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <input 
                          type="time" 
                          value={config.blockStart} 
                          onChange={(e) => updateDay(day.id, "blockStart", e.target.value)} 
                          className="w-full rounded-md border border-border px-3 py-2 text-sm" 
                          placeholder="Inicio"
                        />
                        <input 
                          type="time" 
                          value={config.blockEnd} 
                          onChange={(e) => updateDay(day.id, "blockEnd", e.target.value)} 
                          className="w-full rounded-md border border-border px-3 py-2 text-sm" 
                          placeholder="Fin"
                        />
                        <input 
                          type="text" 
                          value={config.blockReason} 
                          onChange={(e) => updateDay(day.id, "blockReason", e.target.value)} 
                          className="w-full rounded-md border border-border px-3 py-2 text-sm" 
                          placeholder="Motivo (ej: Almuerzo)"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 border-t border-divider pt-6">
          <button 
            onClick={save} 
            className="w-full sm:w-auto rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-sm hover:bg-primary-hover focus:ring-4 focus:ring-primary-200 transition-all"
          >
            Publicar Disponibilidad Semanal
          </button>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-divider bg-surface p-5 sm:p-7">
        <h2 className="text-xl font-bold text-text-primary">Horarios publicados recientemente</h2>
        <p className="mt-1 text-sm text-text-secondary">Estos son los días y cupos que el personal administrativo podrá ver y asignar.</p>
        
        <div className="mt-6 grid gap-4">
          {schedules.map((schedule) => (
            <article key={schedule.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-divider bg-surface-secondary p-4">
              <div>
                <p className="font-bold text-text-primary">
                  {new Date(`${schedule.date}T12:00:00`).toLocaleDateString("es-BO", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="mt-1 text-sm font-medium text-primary">
                  {schedule.startTime} a {schedule.endTime} · {schedule.durationMinutes} min por cita
                </p>
              </div>
              <div className="text-right">
                {schedule.blocks.length ? (
                  <div className="inline-flex flex-col items-end gap-1">
                    {schedule.blocks.map((block, i) => (
                      <span key={i} className="rounded bg-warning-container px-2 py-1 text-xs font-semibold text-warning-700">
                        Bloqueo: {block.startTime} a {block.endTime} ({block.reason})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="rounded bg-success-container px-2 py-1 text-xs font-semibold text-success">
                    Sin bloqueos
                  </span>
                )}
              </div>
            </article>
          ))}
          {!schedules.length && (
            <div className="rounded-xl border border-dashed border-divider p-8 text-center">
              <p className="text-sm text-text-secondary">Todavía no has publicado ningún horario.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
