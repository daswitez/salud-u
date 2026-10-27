"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { useSessionName } from "@/components/session-name";
import { PageIntro } from "@/components/ux-primitives";
import { apiJson, type AdministrativePatient } from "@/lib/api/client";

type AgeFilter = "ALL" | "UNDER_20" | "20_24" | "25_PLUS" | "UNKNOWN";
type ContactFilter = "ALL" | "WITH_CONTACT" | "WITHOUT_CONTACT";
type SortOption = "NAME_ASC" | "NAME_DESC" | "NEWEST" | "OLDEST";

function ageFromBirthDate(birthDate: string | null) {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function statusLabel(status: AdministrativePatient["academicStatus"]) {
  return ({ ACTIVE: "Activo", INACTIVE: "Inactivo", GRADUATED: "Graduado", SUSPENDED: "Suspendido" })[status];
}

function statusClass(status: AdministrativePatient["academicStatus"]) {
  return status === "ACTIVE" ? "bg-success-container text-success" : status === "SUSPENDED" ? "bg-warning-container text-warning" : "bg-surface-secondary text-text-secondary";
}

export default function AdministrativeStudentsPage() {const sessionName=useSessionName();
  const [query, setQuery] = useState("");
  const [career, setCareer] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [period, setPeriod] = useState("ALL");
  const [age, setAge] = useState<AgeFilter>("ALL");
  const [contact, setContact] = useState<ContactFilter>("ALL");
  const [sort, setSort] = useState<SortOption>("NAME_ASC");
  const [rows, setRows] = useState<AdministrativePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiJson<AdministrativePatient[]>("/api/patients", { signal: controller.signal })
      .then((data) => { setRows(data); setError(""); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar la admisión."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const careers = useMemo(() => [...new Set(rows.map((patient) => patient.career?.name).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "es")), [rows]);
  const periods = useMemo(() => [...new Set(rows.map((patient) => patient.enrollment?.academicPeriod).filter((value): value is string => Boolean(value)))].sort((a, b) => b.localeCompare(a, "es")), [rows]);

  const visibleRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es-BO");
    const result = rows.filter((patient) => {
      const patientAge = ageFromBirthDate(patient.birthDate);
      const hasContact = Boolean(patient.phone || patient.email);
      if (term && ![patient.fullName, patient.carnet, patient.registrationCode, patient.career?.name ?? "", patient.phone ?? "", patient.email ?? ""].some((value) => value.toLocaleLowerCase("es-BO").includes(term))) return false;
      if (career === "NONE" && patient.career) return false;
      if (career !== "ALL" && career !== "NONE" && patient.career?.name !== career) return false;
      if (status !== "ALL" && patient.academicStatus !== status) return false;
      if (period !== "ALL" && patient.enrollment?.academicPeriod !== period) return false;
      if (age === "UNDER_20" && (patientAge === null || patientAge >= 20)) return false;
      if (age === "20_24" && (patientAge === null || patientAge < 20 || patientAge > 24)) return false;
      if (age === "25_PLUS" && (patientAge === null || patientAge < 25)) return false;
      if (age === "UNKNOWN" && patientAge !== null) return false;
      if (contact === "WITH_CONTACT" && !hasContact) return false;
      if (contact === "WITHOUT_CONTACT" && hasContact) return false;
      return true;
    });
    return result.sort((first, second) => {
      if (sort === "NAME_DESC") return second.fullName.localeCompare(first.fullName, "es");
      if (sort === "NEWEST") return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
      if (sort === "OLDEST") return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
      return first.fullName.localeCompare(second.fullName, "es");
    });
  }, [age, career, contact, period, query, rows, sort, status]);

  const activeFilterCount = [career, status, period, age, contact].filter((value) => value !== "ALL").length + (query.trim() ? 1 : 0);
  function clearFilters() {
    setQuery(""); setCareer("ALL"); setStatus("ALL"); setPeriod("ALL"); setAge("ALL"); setContact("ALL"); setSort("NAME_ASC");
  }

  return (
    <div className="min-h-screen bg-transparent md:flex">
      <AppSidebar role="administrativo" active="students" />
      <main className="min-w-0 flex-1 pb-24 md:pb-10">
        <AppHeader role="administrativo" name={sessionName||"Administración"} clinicalRole="ADMINISTRATIVE" />
        <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 sm:px-8 sm:py-8">
          <PageIntro eyebrow="Admisión administrativa" title="Encuentra al estudiante antes de crear un registro" description="Combina nombre, carnet, carrera, período y estado académico. El contenido clínico permanece fuera de este módulo." primaryAction={{ href: "/administrativo/estudiantes/nuevo", label: "Registrar estudiante" }} secondaryAction={{ href: "/administrativo", label: "Volver al inicio" }} context={{ label: "Directorio", value: loading ? "Cargando registros…" : `${rows.length} estudiantes` }} />

          <section className="rounded-2xl border border-divider bg-surface p-5 shadow-[0_16px_45px_-38px_rgba(18,49,111,0.75)] sm:p-6" aria-labelledby="student-filters-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 id="student-filters-title" className="text-lg font-bold text-text-primary">Filtrar directorio</h2><p className="mt-1 text-sm text-text-secondary">Puedes combinar todos los criterios.</p></div>
              {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className="rounded-lg px-3 py-2 text-sm font-bold text-primary hover:bg-primary-container">Limpiar {activeFilterCount} filtro{activeFilterCount === 1 ? "" : "s"}</button>}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="xl:col-span-2"><span className="text-sm font-bold text-text-primary">Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, carnet, código, correo o teléfono" className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary-100" /></label>
              <label><span className="text-sm font-bold text-text-primary">Carrera</span><select value={career} onChange={(event) => setCareer(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary"><option value="ALL">Todas las carreras</option><option value="NONE">Sin matrícula</option>{careers.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span className="text-sm font-bold text-text-primary">Estado académico</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary"><option value="ALL">Todos los estados</option><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="GRADUATED">Graduado</option><option value="SUSPENDED">Suspendido</option></select></label>
              <label><span className="text-sm font-bold text-text-primary">Período académico</span><select value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary"><option value="ALL">Todos los períodos</option>{periods.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span className="text-sm font-bold text-text-primary">Edad</span><select value={age} onChange={(event) => setAge(event.target.value as AgeFilter)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary"><option value="ALL">Todas las edades</option><option value="UNDER_20">Menores de 20</option><option value="20_24">De 20 a 24</option><option value="25_PLUS">25 o más</option><option value="UNKNOWN">Sin fecha de nacimiento</option></select></label>
              <label><span className="text-sm font-bold text-text-primary">Datos de contacto</span><select value={contact} onChange={(event) => setContact(event.target.value as ContactFilter)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary"><option value="ALL">Con y sin contacto</option><option value="WITH_CONTACT">Con teléfono o correo</option><option value="WITHOUT_CONTACT">Sin datos de contacto</option></select></label>
              <label><span className="text-sm font-bold text-text-primary">Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary"><option value="NAME_ASC">Nombre A–Z</option><option value="NAME_DESC">Nombre Z–A</option><option value="NEWEST">Registro más reciente</option><option value="OLDEST">Registro más antiguo</option></select></label>
            </div>
          </section>

          <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6" aria-labelledby="student-results-title">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="student-results-title" className="text-lg font-bold text-text-primary">Resultados</h2><p aria-live="polite" className="mt-1 text-sm text-text-secondary">{loading ? "Cargando registros…" : `${visibleRows.length} de ${rows.length} estudiantes`}</p></div>{activeFilterCount > 0 && <span className="rounded-full bg-primary-container px-3 py-1.5 text-xs font-bold text-primary">Filtros activos: {activeFilterCount}</span>}</div>
            {error && <p role="alert" className="mt-4 rounded-xl bg-error-container p-4 text-sm font-semibold text-error">{error}</p>}

            <div className="mt-5 grid gap-3 md:hidden">
              {visibleRows.map((patient) => { const patientAge = ageFromBirthDate(patient.birthDate); return <article key={patient.id} className="rounded-xl border border-divider p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-text-primary">{patient.fullName}</h3><p className="mt-1 text-xs text-text-secondary">CI {patient.carnet} · {patient.registrationCode}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(patient.academicStatus)}`}>{statusLabel(patient.academicStatus)}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-text-tertiary">Carrera</dt><dd className="mt-1 font-semibold text-text-primary">{patient.career?.name ?? "Sin matrícula"}</dd></div><div><dt className="text-text-tertiary">Edad</dt><dd className="mt-1 font-semibold text-text-primary">{patientAge === null ? "Sin dato" : `${patientAge} años`}</dd></div><div><dt className="text-text-tertiary">Período</dt><dd className="mt-1 font-semibold text-text-primary">{patient.enrollment?.academicPeriod ?? "—"}</dd></div><div><dt className="text-text-tertiary">Contacto</dt><dd className="mt-1 font-semibold text-text-primary">{patient.phone || patient.email || "No registrado"}</dd></div></dl><Link href={`/administrativo/estudiantes/${patient.id}`} className="mt-4 inline-flex text-sm font-bold text-primary">Abrir registro →</Link></article>; })}
            </div>

            <div className="mt-5 hidden relative overflow-x-auto md:block"><table className="w-full min-w-230 text-left text-sm"><thead className="border-b border-divider text-xs uppercase tracking-wide text-text-tertiary"><tr><th className="px-3 py-3">Estudiante</th><th className="px-3 py-3">Carnet / código</th><th className="px-3 py-3">Carrera</th><th className="px-3 py-3">Edad</th><th className="px-3 py-3">Período</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3"><span className="sr-only">Acción</span></th></tr></thead><tbody className="divide-y divide-divider">{visibleRows.map((patient) => { const patientAge = ageFromBirthDate(patient.birthDate); return <tr key={patient.id} className="hover:bg-surface-secondary/60"><td className="px-3 py-4"><p className="font-bold text-text-primary">{patient.fullName}</p><p className="mt-1 text-xs text-text-tertiary">Registrado {new Date(patient.createdAt).toLocaleDateString("es-BO")}</p></td><td className="px-3 py-4 text-text-secondary"><p>{patient.carnet}</p><p className="mt-1 text-xs text-text-tertiary">{patient.registrationCode}</p></td><td className="px-3 py-4 text-text-secondary">{patient.career?.name ?? "Sin matrícula"}</td><td className="px-3 py-4 text-text-secondary">{patientAge === null ? "—" : patientAge}</td><td className="px-3 py-4 text-text-secondary">{patient.enrollment?.academicPeriod ?? "—"}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(patient.academicStatus)}`}>{statusLabel(patient.academicStatus)}</span></td><td className="px-3 py-4 text-right"><Link href={`/administrativo/estudiantes/${patient.id}`} className="font-bold text-primary hover:underline">Abrir registro</Link></td></tr>; })}</tbody></table></div>
            {!loading && !visibleRows.length && <div className="mt-5 rounded-xl border border-dashed border-divider bg-surface-secondary/55 p-8 text-center"><p className="font-semibold text-text-primary">No hay estudiantes que coincidan</p><p className="mt-1 text-sm text-text-secondary">Cambia un criterio o limpia los filtros para ampliar los resultados.</p></div>}
          </section>
        </div>
      </main>
    </div>
  );
}
