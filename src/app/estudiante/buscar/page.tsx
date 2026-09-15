"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { StudentHeader } from "@/components/student-header";
import { StudentNavigation } from "@/components/student-navigation";
import { MOCK_SLOTS, type MockSlot } from "@/lib/mock-clinic";
import { getPublishedBookableSlots } from "@/lib/demo-workforce-store";

const demandStyle = { Baja: "bg-success-container text-success", Media: "bg-warning-container text-warning", Alta: "bg-error-container text-error" };

function updateQuery(router: ReturnType<typeof useRouter>, pathname: string, current: URLSearchParams, key: string, value: string) {
  const params = new URLSearchParams(current.toString());
  if (value && value !== "Todos") params.set(key, value); else params.delete(key);
  router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
}

function SearchCareContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedSlot, setSelectedSlot] = useState<MockSlot | null>(null);
  const [publishedSlots, setPublishedSlots] = useState<MockSlot[]>([]);
  const specialty = searchParams.get("especialidad") ?? "Especialidad 1";
  const doctor = searchParams.get("medico") ?? "Todos";
  const modality = searchParams.get("modalidad") ?? "Todos";
  const from = searchParams.get("desde") ?? "";
  const to = searchParams.get("hasta") ?? "";
  useEffect(() => { const timer = window.setTimeout(() => setPublishedSlots(getPublishedBookableSlots()), 0); return () => window.clearTimeout(timer); }, []);
  const allSlots = useMemo(() => [...MOCK_SLOTS, ...publishedSlots], [publishedSlots]);
  const matchingSlots = useMemo(() => allSlots.filter((slot) => slot.specialty === specialty && (doctor === "Todos" || slot.doctor === doctor) && (modality === "Todos" || slot.modality === modality) && (!from || slot.date >= from) && (!to || slot.date <= to)), [allSlots, specialty, doctor, modality, from, to]);
  const availableSlots = matchingSlots.filter((slot) => slot.available);
  const visibleSelectedSlot = selectedSlot && matchingSlots.some((slot) => slot.id === selectedSlot.id) ? selectedSlot : null;
  const waitlistHref = `/estudiante/lista-espera?especialidad=${encodeURIComponent(specialty)}&medico=${encodeURIComponent(doctor)}&modalidad=${encodeURIComponent(modality)}&desde=${encodeURIComponent(from)}&hasta=${encodeURIComponent(to)}`;

  return (
    <div className="min-h-screen bg-background md:flex">
      <StudentNavigation active="search" />
      <div className="min-w-0 flex-1 pb-22 md:pb-0"><StudentHeader />
        <main className="mx-auto max-w-6xl px-5 py-7 md:px-8 md:py-10">
          <Link href="/estudiante" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><span aria-hidden="true">←</span> Volver al inicio</Link>
          <div className="mt-5"><p className="text-sm font-semibold tracking-wide text-primary">BUSCAR ATENCIÓN</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">Encuentra un horario disponible</h1><p className="mt-2 max-w-2xl text-text-secondary">Elige la atención que necesitas. Te mostraremos horarios publicados y el tiempo de espera aproximado.</p></div>

          <section className="mt-7 rounded-2xl border border-divider bg-surface p-5 shadow-sm md:p-6" aria-label="Filtros de búsqueda">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="block text-sm font-medium text-text-secondary">Especialidad<select value={specialty} onChange={(event) => updateQuery(router, pathname, new URLSearchParams(searchParams.toString()), "especialidad", event.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-text-primary"><option>Especialidad 1</option><option>Especialidad 2</option><option>Especialidad 3</option><option>Especialidad 4</option></select></label>
              <label className="block text-sm font-medium text-text-secondary">Profesional<select value={doctor} onChange={(event) => updateQuery(router, pathname, new URLSearchParams(searchParams.toString()), "medico", event.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-text-primary"><option>Todos</option>{Array.from(new Set(allSlots.filter((slot) => slot.specialty === specialty).map((slot) => slot.doctor))).map((doctorName) => <option key={doctorName}>{doctorName}</option>)}</select></label>
              <label className="block text-sm font-medium text-text-secondary">Modalidad<select value={modality} onChange={(event) => updateQuery(router, pathname, new URLSearchParams(searchParams.toString()), "modalidad", event.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-text-primary"><option>Todos</option><option>Presencial</option><option>Teleconsulta</option></select></label>
              <label className="block text-sm font-medium text-text-secondary">Desde<input type="date" value={from} onChange={(event) => updateQuery(router, pathname, new URLSearchParams(searchParams.toString()), "desde", event.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-text-primary" /></label>
              <label className="block text-sm font-medium text-text-secondary">Hasta<input type="date" min={from || undefined} value={to} onChange={(event) => updateQuery(router, pathname, new URLSearchParams(searchParams.toString()), "hasta", event.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-text-primary" /></label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4"><p className="text-sm text-text-secondary"><span className="font-semibold text-text-primary">{availableSlots.length}</span> horarios disponibles para {specialty}</p><button onClick={() => router.replace(pathname)} className="text-sm font-semibold text-primary hover:underline">Limpiar filtros</button></div>
          </section>

          <section className="mt-7" aria-live="polite">
            {availableSlots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center sm:p-12"><div className="mx-auto grid size-12 place-items-center rounded-full bg-primary-container text-xl text-primary">⌕</div><h2 className="mt-5 text-xl font-bold text-text-primary">No encontramos horarios compatibles</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">No hay cupos publicados con los filtros seleccionados. Puedes recibir un aviso si se libera un horario que se ajuste a tus preferencias.</p><Link href={waitlistHref} className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary-hover">Unirme a la lista de espera</Link></div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1fr_19rem]">
                <div className="space-y-5">
                  {Array.from(new Set(matchingSlots.map((slot) => slot.date))).map((groupDate) => {
                    const groupSlots = matchingSlots.filter((slot) => slot.date === groupDate);
                    return <article key={groupDate} className="overflow-hidden rounded-2xl border border-divider bg-surface"><div className="border-b border-divider bg-surface-secondary px-5 py-4"><h2 className="font-semibold text-text-primary">{groupSlots[0].weekday}</h2><p className="mt-0.5 text-sm text-text-secondary">{groupSlots.filter((slot) => slot.available).length} horarios disponibles</p></div><div className="divide-y divide-divider">{groupSlots.map((slot) => <div key={slot.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-lg font-bold text-text-primary">{slot.time}</p><span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">{slot.modality}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${demandStyle[slot.demand]}`}>● Demanda {slot.demand.toLowerCase()}</span></div><p className="mt-1.5 text-sm font-medium text-text-primary">{slot.doctor}</p><p className="mt-1 text-sm text-text-secondary">Espera estimada: {slot.wait}</p></div>{slot.available ? <button onClick={() => setSelectedSlot(slot)} className="rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-container">Seleccionar horario</button> : <span className="rounded-lg border border-divider bg-surface-secondary px-4 py-2.5 text-center text-sm font-medium text-text-disabled">No disponible</span>}</div>)}</div></article>;
                  })}
                </div>
                <aside className="h-fit rounded-2xl border border-primary-200 bg-primary-container p-5 xl:sticky xl:top-6"><p className="text-sm font-semibold text-primary">TU SELECCIÓN</p>{visibleSelectedSlot ? <><h2 className="mt-3 text-lg font-bold text-text-primary">Horario seleccionado</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-text-secondary">Fecha y hora</dt><dd className="mt-0.5 font-semibold text-text-primary">{visibleSelectedSlot.weekday} · {visibleSelectedSlot.time}</dd></div><div><dt className="text-text-secondary">Profesional</dt><dd className="mt-0.5 font-semibold text-text-primary">{visibleSelectedSlot.doctor}</dd></div><div><dt className="text-text-secondary">Modalidad</dt><dd className="mt-0.5 font-semibold text-text-primary">{visibleSelectedSlot.modality}</dd></div></dl><p className="mt-5 rounded-lg bg-surface p-3 text-xs leading-5 text-text-secondary">Al continuar, este horario quedará retenido durante 10 minutos mientras confirmas la reserva.</p><Link href={`/estudiante/reservar?slotId=${encodeURIComponent(visibleSelectedSlot.id)}${searchParams.get("reprogramar") ? `&reprogramar=${encodeURIComponent(searchParams.get("reprogramar")!)}` : ""}`} className="mt-4 inline-flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Continuar a confirmar</Link></> : <><p className="mt-3 text-sm leading-6 text-text-secondary">Selecciona un horario disponible para revisar el detalle antes de confirmarlo.</p><div className="mt-5 h-1.5 rounded-full bg-primary-200"><div className="h-full w-1/3 rounded-full bg-primary" /></div><p className="mt-2 text-xs text-text-tertiary">Paso 1 de 2 · Elegir horario</p></>}</aside>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default function SearchCarePage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-background text-text-secondary">Cargando búsqueda de atención…</main>}>
      <SearchCareContent />
    </Suspense>
  );
}
