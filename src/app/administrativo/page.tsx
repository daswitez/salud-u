import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";

const dateKey = "2026-09-17";

export default async function AdminHomePage() {
  const session = await requireClinicalRole("ADMINISTRATIVE");
  const state = getClinicalDemoState();
  const attendedToday = state.encounters.filter((encounter) => encounter.occurredAt.startsWith(dateKey) && encounter.status === "CLOSED").length;
  const scheduled = state.appointments.filter((appointment) => appointment.status === "SCHEDULED").length;
  const pendingReferrals = state.referrals.filter((referral) => referral.status === "PENDING_ASSIGNMENT").length;
  const metrics = [
    { label: "Estudiantes registrados", value: state.patients.length, detail: "Perfiles clínicos únicos" },
    { label: "Citas por cupo", value: scheduled, detail: "Programadas para atención" },
    { label: "Atenciones cerradas hoy", value: attendedToday, detail: "Con historia clínica registrada" },
    { label: "Derivaciones pendientes", value: pendingReferrals, detail: "A la espera de asignación" },
  ];
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="home" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-6xl p-5 sm:p-8"><header className="border-b border-divider pb-5"><p className="text-sm font-semibold text-primary">ÁREA ADMINISTRATIVA</p><h1 className="mt-1 text-2xl font-bold text-text-primary">Ingreso y seguimiento de atención</h1><p className="mt-2 text-text-secondary">Gestiona el registro de estudiantes, citas por cupo y reportes operativos autorizados.</p></header><section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <article key={metric.label} className="rounded-2xl border border-divider bg-surface p-5"><p className="text-sm text-text-secondary">{metric.label}</p><p className="mt-2 text-3xl font-bold text-text-primary">{metric.value}</p><p className="mt-1 text-sm text-text-secondary">{metric.detail}</p></article>)}</section><section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 className="text-lg font-bold text-text-primary">Flujo administrativo</h2><div className="mt-5 divide-y divide-divider"><div className="py-4"><p className="font-semibold text-text-primary">1. Identificar o registrar estudiante</p><p className="mt-1 text-sm text-text-secondary">Buscar por carnet, código de registro o nombre completo.</p></div><div className="py-4"><p className="font-semibold text-text-primary">2. Gestionar cita por cupo</p><p className="mt-1 text-sm text-text-secondary">La cita se dirige a revisión estudiantil, no a una especialidad elegida por el estudiante.</p></div><div className="py-4"><p className="font-semibold text-text-primary">3. Consultar reportes autorizados</p><p className="mt-1 text-sm text-text-secondary">Atenciones, derivaciones y cumplimiento a partir de datos clínicos registrados.</p></div></div></article><article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 className="text-lg font-bold text-text-primary">Accesos disponibles</h2><div className="mt-5 grid gap-3"><span aria-disabled="true" className="rounded-lg border border-divider px-4 py-3 text-center text-sm font-semibold text-text-disabled">Estudiantes · próximo bloque</span><span aria-disabled="true" className="rounded-lg border border-divider px-4 py-3 text-center text-sm font-semibold text-text-disabled">Citas por cupo · próximo bloque</span><Link href="/administrativo/auditoria" className="rounded-lg border border-primary px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-primary-container">Abrir auditoría</Link></div></article></section></div></main></div>;
}
