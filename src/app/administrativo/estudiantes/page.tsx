"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { apiJson, type AdministrativePatient } from "@/lib/api/client";

export default function AdministrativeStudentsPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AdministrativePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        const data = await apiJson<AdministrativePatient[]>(`/api/patients?${params}`, { signal: controller.signal });
        setRows(data); setError("");
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar la admisión.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);

  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="students" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" name="Administración" clinicalRole="ADMINISTRATIVE" /><div className="mx-auto max-w-7xl p-5 sm:p-8"><Link href="/administrativo" className="text-sm font-semibold text-primary hover:underline">← Inicio administrativo</Link><header className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-primary">ADMISIÓN ADMINISTRATIVA</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Estudiantes</h1><p className="mt-2 max-w-2xl text-text-secondary">Datos reales de identificación, contacto y matrícula. El contenido clínico no se expone en este módulo.</p></div><Link href="/administrativo/estudiantes/nuevo" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Registrar estudiante</Link></header><section className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-6"><label className="block"><span className="text-sm font-semibold text-text-primary">Buscar estudiante</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Carnet, código o nombre" className="mt-2 w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary-200" /></label><p className="mt-3 text-sm text-text-secondary">{loading ? "Cargando registros…" : `${rows.length} estudiante(s) registrado(s)`}</p>{error && <p role="alert" className="mt-4 rounded-xl bg-error-container p-4 text-sm text-error">{error}</p>}<div className="mt-5 overflow-x-auto"><table className="w-full min-w-210 text-left text-sm"><thead className="border-b border-divider text-xs uppercase tracking-wide text-text-tertiary"><tr><th className="px-3 py-3">Estudiante</th><th className="px-3 py-3">Carnet / código</th><th className="px-3 py-3">Carrera</th><th className="px-3 py-3">Período</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3"><span className="sr-only">Acción</span></th></tr></thead><tbody className="divide-y divide-divider">{rows.map((patient) => <tr key={patient.id} className="hover:bg-surface-secondary/60"><td className="px-3 py-4"><p className="font-semibold text-text-primary">{patient.fullName}</p><p className="mt-1 text-xs text-text-tertiary">Registrado {new Date(patient.createdAt).toLocaleDateString("es-BO")}</p></td><td className="px-3 py-4 text-text-secondary"><p>{patient.carnet}</p><p className="mt-1 text-xs text-text-tertiary">{patient.registrationCode}</p></td><td className="px-3 py-4 text-text-secondary">{patient.career?.name ?? "Sin matrícula"}</td><td className="px-3 py-4 text-text-secondary">{patient.enrollment?.academicPeriod ?? "—"}</td><td className="px-3 py-4"><span className="rounded-full bg-success-container px-2.5 py-1 text-xs font-semibold text-success">{patient.academicStatus === "ACTIVE" ? "Activo" : patient.academicStatus}</span></td><td className="px-3 py-4 text-right"><Link href={`/administrativo/estudiantes/${patient.id}`} className="font-semibold text-primary hover:underline">Abrir registro</Link></td></tr>)}{!loading && !rows.length && <tr><td colSpan={6} className="px-3 py-10 text-center text-text-secondary">No se encontraron estudiantes.</td></tr>}</tbody></table></div></section></div></main></div>;
}
