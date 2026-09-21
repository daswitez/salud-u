import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { requireClinicalRole } from "@/lib/demo-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActivityRow = { total_closed: number };
type ReferralRow = { status: string };

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
  const metrics = [
    { label: "Estudiantes activos", value: patients.count ?? 0, detail: "Registrados en Supabase" },
    { label: "Citas pendientes", value: scheduled, detail: "Programadas o en espera" },
    { label: "Atenciones cerradas", value: attended, detail: "Actividad del día" },
    { label: "Derivaciones por programar", value: pendingReferrals, detail: "Pendientes de asignación" },
  ];

  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="home" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-6xl p-5 sm:p-8"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-divider pb-5"><div><p className="text-sm font-semibold text-primary">ÁREA ADMINISTRATIVA</p><h1 className="mt-1 text-2xl font-bold text-text-primary">Ingreso y seguimiento de atención</h1><p className="mt-2 text-text-secondary">Indicadores calculados desde la base clínica, sin datos de demostración.</p></div><Link href="/administrativo/estudiantes/nuevo" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:bg-primary-hover">Nuevo registro</Link></header><section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <article key={metric.label} className="rounded-2xl border border-divider bg-surface p-5"><p className="text-sm font-semibold text-text-secondary">{metric.label}</p><p className="mt-2 text-3xl font-black text-text-primary">{metric.value}</p><p className="mt-1 text-xs text-text-secondary">{metric.detail}</p></article>)}</section><section className="mt-6 grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-divider bg-surface p-6"><p className="text-sm font-semibold text-text-secondary">Cupos publicados disponibles</p><p className="mt-2 text-3xl font-black text-text-primary">{availableSlots}</p><Link href="/administrativo/check-in" className="mt-4 inline-block text-sm font-bold text-primary hover:underline">Gestionar citas y cupos →</Link></article><article className="rounded-2xl border border-divider bg-surface p-6"><p className="text-sm font-semibold text-text-secondary">Acción clínica pendiente</p><p className="mt-2 text-lg font-bold text-text-primary">{pendingReferrals ? `${pendingReferrals} derivación(es) por programar` : "No hay derivaciones pendientes"}</p><Link href="/administrativo/derivaciones" className="mt-4 inline-block text-sm font-bold text-primary hover:underline">Abrir bandeja de derivaciones →</Link></article></section><section className="mt-6 grid gap-4 sm:grid-cols-2"><Link href="/administrativo/estudiantes" className="rounded-2xl border border-divider bg-surface p-5 hover:border-primary-200"><p className="font-bold text-text-primary">Directorio de estudiantes</p><p className="mt-1 text-sm text-text-secondary">Registro y datos administrativos autorizados.</p></Link><Link href="/administrativo/reportes" className="rounded-2xl border border-divider bg-surface p-5 hover:border-primary-200"><p className="font-bold text-text-primary">Reportes de control</p><p className="mt-1 text-sm text-text-secondary">Actividad clínica y cumplimiento calculados desde Supabase.</p></Link></section></div></main></div>;
}
