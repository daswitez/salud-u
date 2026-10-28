"use client";

import { useEffect, useState } from "react";
import { AcademicCalendar } from "@/components/academic-calendar";
import { SchedulingInitialValues } from "@/components/scheduling-initial-values";
import { replaceUrl } from "@/lib/url-state";

export function SchedulingSetup() {
  const [view, setView] = useState<"calendario" | "valores">("calendario");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("vista") === "valores") setView("valores");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function change(next: "calendario" | "valores") { setView(next); replaceUrl("/administrativo/calendario?vista=" + next); }
  return <>
    <header><p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">CONFIGURACIÓN DE AGENDA</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">Calendario académico y valores iniciales</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">Registra los períodos y configura las referencias de asistencia y demanda por especialidad.</p></header>
    <nav aria-label="Secciones de configuración de agenda" className="mt-6 flex flex-wrap gap-2 border-b border-divider pb-3"><button type="button" aria-pressed={view === "calendario"} onClick={() => change("calendario")} className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold ${view === "calendario" ? "bg-primary text-on-primary" : "border border-primary-200 text-primary"}`}>Calendario académico</button><button type="button" aria-pressed={view === "valores"} onClick={() => change("valores")} className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold ${view === "valores" ? "bg-primary text-on-primary" : "border border-primary-200 text-primary"}`}>Valores iniciales</button></nav>
    <div hidden={view !== "calendario"}><AcademicCalendar /></div><div hidden={view !== "valores"}><SchedulingInitialValues /></div>
  </>;
}
