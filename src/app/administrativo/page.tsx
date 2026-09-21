import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";

const dateKey = "2026-09-17";

export default async function AdminHomePage() {
  const session = await requireClinicalRole("ADMINISTRATIVE");
  const state = getClinicalDemoState();

  // Metrics calculation
  const registeredToday = state.patients.filter((p) => p.createdAt.startsWith(dateKey)).length;
  
  const todayAppointments = state.appointments.filter(a => a.scheduledFor.startsWith(dateKey));
  const scheduledCount = todayAppointments.filter((a) => a.status === "SCHEDULED").length;
  const completedCount = todayAppointments.filter((a) => a.status === "ATTENDED").length;
  
  const attendedToday = state.encounters.filter((encounter) => encounter.occurredAt.startsWith(dateKey) && encounter.status === "CLOSED").length;
  const pendingReferrals = state.referrals.filter((referral) => referral.status === "PENDING_ASSIGNMENT").length;

  const incompleteProfiles = state.patients.filter((p) => !p.birthDate || !p.career || !p.phone).length;
  const totalCapacity = 20; // Demo limit
  const remainingCapacity = Math.max(0, totalCapacity - todayAppointments.length);

  const metrics = [
    { label: "Estudiantes registrados hoy", value: registeredToday, detail: "Alta de nuevo perfil clínico" },
    { label: "Citas programadas", value: scheduledCount, detail: `${completedCount} ya completadas` },
    { label: "Pacientes atendidos hoy", value: attendedToday, detail: "Registros de evolución cerrados" },
    { label: "Derivaciones pendientes", value: pendingReferrals, detail: "Requieren asignación manual" },
  ];

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="administrativo" active="home" />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} />
        
        <div className="mx-auto max-w-6xl p-5 sm:p-8">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-divider pb-5">
            <div>
              <p className="text-sm font-semibold text-primary">ÁREA ADMINISTRATIVA</p>
              <h1 className="mt-1 text-2xl font-bold text-text-primary">Ingreso y seguimiento de atención</h1>
              <p className="mt-2 text-text-secondary">Gestiona el registro de estudiantes, citas por cupo y reportes operativos autorizados.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/administrativo/estudiantes/nuevo" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-600 transition-colors">
                Nuevo Registro
              </Link>
            </div>
          </header>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article key={metric.label} className="rounded-2xl border border-divider bg-surface p-5 hover:border-primary-200 transition-colors shadow-sm">
                <p className="text-sm font-semibold text-text-secondary">{metric.label}</p>
                <p className="mt-2 text-3xl font-black text-text-primary">{metric.value}</p>
                <p className="mt-1 text-xs text-text-secondary">{metric.detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="space-y-6">
              <div className="rounded-2xl border border-error-200 bg-error-50 p-5 sm:p-6 shadow-sm">
                <h2 className="text-lg font-bold text-error-900 mb-4 flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  Alertas Operativas
                </h2>
                
                <div className="space-y-3">
                  {remainingCapacity <= 5 && (
                    <div className="bg-surface p-4 rounded-xl border border-error-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-error-800">Cupos de atención agotándose</p>
                        <p className="text-sm text-error-700 mt-1">Solo quedan {remainingCapacity} cupos disponibles para revisión estudiantil hoy.</p>
                      </div>
                      <Link href="/administrativo/check-in" className="text-sm font-bold text-error-900 bg-error-100 px-3 py-1.5 rounded-lg hover:bg-error-200 transition-colors">Revisar agenda</Link>
                    </div>
                  )}

                  {incompleteProfiles > 0 && (
                    <div className="bg-surface p-4 rounded-xl border border-warning-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-warning-900">Datos administrativos incompletos</p>
                        <p className="text-sm text-warning-800 mt-1">{incompleteProfiles} pacientes carecen de carrera, teléfono o fecha de nacimiento.</p>
                      </div>
                      <Link href="/administrativo/estudiantes" className="text-sm font-bold text-warning-900 bg-warning-100 px-3 py-1.5 rounded-lg hover:bg-warning-200 transition-colors">Actualizar datos</Link>
                    </div>
                  )}

                  {pendingReferrals > 0 && (
                    <div className="bg-surface p-4 rounded-xl border border-primary-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-primary-900">Derivaciones sin asignar</p>
                        <p className="text-sm text-primary-800 mt-1">Hay {pendingReferrals} derivaciones médicas a la espera de ser asignadas a un especialista.</p>
                      </div>
                      <Link href="/administrativo/derivaciones" className="text-sm font-bold text-primary-900 bg-primary-100 px-3 py-1.5 rounded-lg hover:bg-primary-200 transition-colors">Asignar ahora</Link>
                    </div>
                  )}
                  
                  {remainingCapacity > 5 && incompleteProfiles === 0 && pendingReferrals === 0 && (
                    <div className="bg-surface p-4 rounded-xl border border-success-200">
                      <p className="font-bold text-success-800">Todo en orden</p>
                      <p className="text-sm text-success-700 mt-1">No hay alertas operativas en este momento.</p>
                    </div>
                  )}
                </div>
              </div>
            </article>

            <aside className="space-y-6">
              <article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6 shadow-sm">
                <h2 className="text-lg font-bold text-text-primary">Accesos Rápidos</h2>
                <div className="mt-5 space-y-3">
                  <Link href="/administrativo/estudiantes" className="block rounded-xl border border-transparent bg-surface-secondary p-4 hover:border-primary-200 transition-colors">
                    <p className="font-bold text-text-primary">Directorio de Estudiantes</p>
                    <p className="mt-1 text-xs text-text-secondary">Registro, búsqueda y modificación de perfiles básicos.</p>
                  </Link>
                  <Link href="/administrativo/check-in" className="block rounded-xl border border-transparent bg-surface-secondary p-4 hover:border-primary-200 transition-colors">
                    <p className="font-bold text-text-primary">Ingreso y Asistencia (Check-in)</p>
                    <p className="mt-1 text-xs text-text-secondary">Control de citas por cupo y confirmación presencial.</p>
                  </Link>
                  <Link href="/administrativo/derivaciones" className="block rounded-xl border border-transparent bg-surface-secondary p-4 hover:border-primary-200 transition-colors">
                    <p className="font-bold text-text-primary">Gestión de Derivaciones</p>
                    <p className="mt-1 text-xs text-text-secondary">Asignación de casos derivados a especialistas.</p>
                  </Link>
                  <Link href="/administrativo/reportes" className="block rounded-xl border border-transparent bg-surface-secondary p-4 hover:border-primary-200 transition-colors">
                    <p className="font-bold text-text-primary">Reportes de Control</p>
                    <p className="mt-1 text-xs text-text-secondary">Visión general operativa, derivaciones y rendimiento.</p>
                  </Link>
                </div>
              </article>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
