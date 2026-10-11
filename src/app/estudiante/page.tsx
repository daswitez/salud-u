import Link from "next/link";
import { StudentHeader } from "@/components/student-header";
import { StudentNavigation } from "@/components/student-navigation";
import { GuidanceCard, PageIntro } from "@/components/ux-primitives";

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function StudentHomePage() {
  return (
    <div className="min-h-screen bg-transparent md:flex">
      <StudentNavigation active="home" />
      <div className="min-w-0 flex-1 pb-24 md:pb-10">
        <StudentHeader />
        <main className="mx-auto max-w-7xl space-y-7 px-5 py-6 md:px-8 md:py-8">
          <PageIntro eyebrow="Mi salud universitaria" title="Hola, Daniela. Tu atención de hoy está preparada." description="Aquí puedes ver qué viene después, qué necesitas llevar y dónde consultar cada cambio de tu atención." primaryAction={{ href: "/estudiante/citas/proxima", label: "Ver próxima cita" }} secondaryAction={{ href: "/estudiante/buscar", label: "Solicitar otra atención" }} context={{ label: "Próximo evento", value: "Hoy · 10:30" }} />

          <GuidanceCard eyebrow="Antes de tu cita" title="Realiza tu llegada al centro de atención" description="Cuando llegues, presenta el comprobante de tu cita. El personal registrará tu asistencia y podrás seguir el estado desde aquí." action={{ href: "/estudiante/citas/proxima", label: "Abrir mi comprobante" }} steps={["Revisar la cita", "Presentar comprobante", "Esperar llamado"]} activeStep={1} tone="warning" />

          <section aria-labelledby="next-appointment-heading">
            <div className="mb-3 flex items-center justify-between"><h2 id="next-appointment-heading" className="text-lg font-semibold text-text-primary">Próxima cita</h2><Link href="/estudiante/citas" className="text-sm font-semibold text-primary hover:underline">Ver mis citas</Link></div>
            <article className="overflow-hidden rounded-2xl border border-primary-200 bg-surface shadow-sm">
              <div className="h-1.5 bg-primary" />
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-container text-primary"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6"><path d="M12 6v12m-6-6h12M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" strokeLinecap="round" /></svg></div>
                  <div><p className="text-sm font-medium text-primary">Especialidad 1</p><h3 className="mt-1 text-xl font-bold text-text-primary">Consulta de seguimiento</h3><p className="mt-2 text-sm text-text-secondary">Hoy · 10:30 · Consultorio B-12</p><p className="mt-1 text-sm text-text-secondary">Dra. Valeria Mendoza · Presencial</p></div>
                </div>
                <Link href="/estudiante/citas/proxima" className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-container">Ver comprobante <ArrowIcon /></Link>
              </div>
            </article>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-secondary">ATENCIÓN DE HOY</p><h2 className="mt-2 text-xl font-bold text-text-primary">Tu estado de atención</h2></div><span className="rounded-full bg-warning-container px-3 py-1 text-xs font-semibold text-warning">Pendiente de llegada</span></div>
              <div className="mt-5 border-l-2 border-secondary pl-4"><p className="text-sm text-text-secondary">Estado actual</p><p className="mt-1 font-semibold text-text-primary">Aún no realizaste el check-in</p><p className="mt-2 text-sm leading-6 text-text-secondary">Presenta tu comprobante QR al llegar al centro de atención.</p></div>
              <Link href="/estudiante/cola" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Ver estado de llegada <ArrowIcon /></Link>
            </article>

            <article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-warning">CHEQUEO OBLIGATORIO</p><h2 className="mt-2 text-xl font-bold text-text-primary">Chequeo médico Tipo A</h2></div><span className="rounded-full bg-warning-container px-3 py-1 text-xs font-semibold text-warning">Pendiente</span></div>
              <p className="mt-4 text-sm leading-6 text-text-secondary">Tienes una campaña habilitada para realizar tu chequeo obligatorio de la gestión.</p>
              <Link href="/estudiante/chequeo" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Ver campañas disponibles <ArrowIcon /></Link>
            </article>
          </section>

          <section className="grid gap-5 md:grid-cols-[1.35fr_1fr]">
            <article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
              <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-text-primary">Lista de espera</h2><span className="rounded-full bg-info-container px-3 py-1 text-xs font-semibold text-info">1 activa</span></div>
              <div className="mt-5 flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-info-container text-info">i</span><div><p className="font-medium text-text-primary">Especialidad 2 · Presencial</p><p className="mt-1 text-sm leading-6 text-text-secondary">Preferencia: lunes a viernes, por la mañana. Te avisaremos si aparece un turno compatible.</p><Link href="/estudiante/lista-espera" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Ver preferencias <ArrowIcon /></Link></div></div>
            </article>
            <article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-text-primary">Avisos recientes</h2><Link href="/estudiante/avisos" className="text-sm font-semibold text-primary hover:underline">Ver todos</Link></div><ul className="mt-4 divide-y divide-divider"><li className="py-3 text-sm"><p className="font-medium text-text-primary">Recordatorio de cita</p><p className="mt-1 text-text-secondary">Tu cita es hoy a las 10:30.</p></li><li className="py-3 text-sm"><p className="font-medium text-text-primary">Campaña disponible</p><p className="mt-1 text-text-secondary">Ya puedes programar tu chequeo obligatorio.</p></li></ul></article>
          </section>
        </main>
      </div>
    </div>
  );
}
