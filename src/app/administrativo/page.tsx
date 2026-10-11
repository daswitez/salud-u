import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { GuidanceCard, MetricCard, PageIntro, SectionHeading } from "@/components/ux-primitives";
import { requireClinicalRole } from "@/lib/demo-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActivityRow = { total_closed: number };
type ReferralRow = { status: string };

const todayLabel = new Intl.DateTimeFormat("es-BO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/La_Paz",
}).format(new Date());

export default async function AdminHomePage() {
  const session = await requireClinicalRole("ADMINISTRATIVE");
  const supabase = await createSupabaseServerClient();
  const [patients, appointments, slots, referrals, activity] = await Promise.all([
    supabase.from("patient").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("appointment").select("id,status"),
    supabase.from("availability_slot").select("capacity,booked_count").eq("status", "PUBLISHED"),
    supabase.rpc("rpc_list_referrals_for_administration"),
    supabase.rpc("rpc_daily_activity"),
  ]);

  const availableSlots = (slots.data ?? []).reduce((total, slot) => total + Math.max(0, slot.capacity - slot.booked_count), 0);
  const attended = ((activity.data ?? []) as ActivityRow[]).reduce((total, row) => total + Number(row.total_closed), 0);
  const pendingReferrals = ((referrals.data ?? []) as ReferralRow[]).filter((referral) => referral.status === "PENDING_ASSIGNMENT").length;
  const scheduled = (appointments.data ?? []).filter((appointment) => appointment.status === "SCHEDULED" || appointment.status === "CHECKED_IN").length;

  return (
    <div className="min-h-screen bg-transparent md:flex">
      <AppSidebar role="administrativo" active="home" />
      <main className="min-w-0 flex-1 pb-24 md:pb-10">
        <AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} />
        <div className="mx-auto max-w-7xl space-y-7 px-5 py-6 sm:px-8 sm:py-8">
          <PageIntro
            eyebrow="Centro de coordinación"
            title="Ordena la jornada antes de que se acumule la demanda"
            description="Revisa primero las tareas que bloquean una atención: ingreso, asistencia y derivaciones pendientes. Los indicadores de abajo te llevan directamente a la acción correspondiente."
            primaryAction={{ href: "/administrativo/estudiantes", label: "Buscar estudiante" }}
            secondaryAction={{ href: "/administrativo/estudiantes/nuevo", label: "Registrar nuevo" }}
            context={{ label: "Jornada actual", value: todayLabel }}
          />

          <GuidanceCard
            eyebrow={pendingReferrals ? "Prioridad recomendada" : "Ruta de trabajo"}
            title={pendingReferrals ? `${pendingReferrals} derivación${pendingReferrals === 1 ? " requiere" : " requieren"} programación` : "La bandeja de derivaciones está al día"}
            description={pendingReferrals ? "Asignar estas solicitudes evita que el paciente quede detenido entre revisión y especialidad." : "Puedes continuar con la llegada de estudiantes y la programación de citas del día."}
            action={{ href: pendingReferrals ? "/administrativo/derivaciones" : "/administrativo/check-in", label: pendingReferrals ? "Resolver derivaciones" : "Gestionar llegadas" }}
            steps={["Identificar solicitud", "Confirmar disponibilidad", "Asignar y registrar"]}
            activeStep={pendingReferrals ? 0 : 2}
            tone={pendingReferrals ? "warning" : "success"}
          />

          <section>
            <SectionHeading title="Panorama operativo" description="Cada dato responde una pregunta concreta de la jornada." />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Estudiantes activos" value={patients.count ?? 0} detail="Personas registradas" tone="primary" />
              <MetricCard label="Citas por atender" value={scheduled} detail="Programadas o en espera" tone={scheduled ? "warning" : "success"} />
              <MetricCard label="Atenciones cerradas" value={attended} detail="Completadas hoy" tone="success" />
              <MetricCard label="Derivaciones pendientes" value={pendingReferrals} detail={pendingReferrals ? "Necesitan asignación" : "Bandeja al día"} tone={pendingReferrals ? "warning" : "success"} />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="rounded-2xl border border-divider bg-surface p-5 shadow-[0_16px_45px_-38px_rgba(18,49,111,0.75)] sm:p-6">
              <SectionHeading title="Operación de hoy" description="Acciones frecuentes, ordenadas según el flujo de atención." />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link href="/administrativo/check-in" className="group rounded-2xl border border-primary-200 bg-primary-container/55 p-5 transition hover:border-primary hover:bg-primary-container">
                  <span className="inline-flex rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-on-primary">{availableSlots} cupos disponibles</span>
                  <h3 className="mt-4 text-lg font-bold text-text-primary">Gestionar citas y asistencia</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">Programa una cita, registra la llegada y mantén visible el estado del estudiante.</p>
                  <span className="mt-4 inline-flex text-sm font-bold text-primary group-hover:underline">Abrir módulo →</span>
                </Link>
                <Link href="/administrativo/derivaciones" className="group rounded-2xl border border-divider bg-surface-secondary/65 p-5 transition hover:border-secondary/40 hover:bg-secondary-container/45">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${pendingReferrals ? "bg-warning-container text-warning" : "bg-success-container text-success"}`}>{pendingReferrals ? `${pendingReferrals} por programar` : "Sin pendientes"}</span>
                  <h3 className="mt-4 text-lg font-bold text-text-primary">Coordinar derivaciones</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">Conecta la solicitud clínica con un profesional y horario disponibles.</p>
                  <span className="mt-4 inline-flex text-sm font-bold text-primary group-hover:underline">Abrir bandeja →</span>
                </Link>
              </div>
            </article>

            <aside className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
              <SectionHeading title="Continuar con" description="Herramientas de consulta y control." />
              <nav className="mt-5 space-y-2" aria-label="Herramientas administrativas">
                <Link href="/administrativo/estudiantes" className="flex items-center justify-between rounded-xl border border-transparent bg-surface-secondary px-4 py-3.5 transition hover:border-primary-200 hover:bg-primary-container"><span><span className="block text-sm font-bold text-text-primary">Directorio de estudiantes</span><span className="mt-0.5 block text-xs text-text-secondary">Identificación y datos administrativos</span></span><span className="text-primary">→</span></Link>
                <Link href="/administrativo/reportes" className="flex items-center justify-between rounded-xl border border-transparent bg-surface-secondary px-4 py-3.5 transition hover:border-primary-200 hover:bg-primary-container"><span><span className="block text-sm font-bold text-text-primary">Reportes de control</span><span className="mt-0.5 block text-xs text-text-secondary">Actividad y cumplimiento</span></span><span className="text-primary">→</span></Link>
              </nav>
              <p className="mt-5 border-t border-divider pt-4 text-xs leading-5 text-text-tertiary">Las decisiones clínicas permanecen en el área médica. Aquí solo coordinas el acceso y la continuidad operativa.</p>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
