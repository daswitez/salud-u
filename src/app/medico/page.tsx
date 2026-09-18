import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";
import { DashboardAppointmentItem } from "@/components/dashboard-appointment-item";

const dateKey = "2026-09-17";

export default async function DoctorHomePage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const state = getClinicalDemoState();
  const doctor = state.professionals.find((professional) => professional.fullName === session.name);
  const doctorId = doctor?.id;
  const isSpecialist = session.clinicalRole === "SPECIALIST";
  const encounters = doctorId ? state.encounters.filter((encounter) => encounter.doctorId === doctorId) : [];
  const referrals = isSpecialist
    ? state.referrals.filter((referral) => referral.assignedDoctorId === doctorId)
    : state.referrals.filter((referral) => referral.requestedBy === doctorId);
  const attendedToday = encounters.filter((encounter) => encounter.occurredAt.startsWith(dateKey) && encounter.status === "CLOSED").length;
  const openDrafts = encounters.filter((encounter) => encounter.status === "DRAFT").length;
  const activeReferrals = referrals.filter((referral) => ["PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS"].includes(referral.status)).length;
  const recentPatients = encounters.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 4).map((encounter) => ({ encounter, patient: state.patients.find((patient) => patient.id === encounter.patientId) }));

  const scheduledAppointments = doctorId ? state.appointments.filter(a => a.assignedDoctorId === doctorId && a.scheduledFor.startsWith(dateKey) && a.status === "SCHEDULED") : [];

  const cards = [
    { label: "Atenciones cerradas hoy", value: attendedToday, detail: "Registro clínico del día", tone: "text-success" },
    { label: "Borradores abiertos", value: openDrafts, detail: "Requieren completar o cerrar", tone: "text-warning" },
    { label: isSpecialist ? "Derivaciones recibidas" : "Derivaciones emitidas", value: referrals.length, detail: `${activeReferrals} activas`, tone: "text-primary" },
    { label: "Pacientes vinculados", value: new Set(encounters.map((encounter) => encounter.patientId)).size, detail: "Atendidos o asignados", tone: "text-text-secondary" },
  ];

  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" clinicalRole={session.clinicalRole} active="home" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-6xl p-5 sm:p-8"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-divider pb-5"><div><p className="text-sm font-semibold text-secondary">{isSpecialist ? "ATENCIÓN ESPECIALIZADA" : "REVISIÓN ESTUDIANTIL"}</p><h1 className="mt-1 text-2xl font-bold text-text-primary">Buen día, {session.name}</h1><p className="mt-1 text-sm text-text-secondary">Consulta tus pacientes, atenciones y derivaciones clínicas.</p></div><div className="flex flex-wrap gap-2"><span aria-disabled="true" className="rounded-lg border border-divider px-4 py-2 text-sm font-semibold text-text-disabled">{isSpecialist ? "Derivaciones recibidas" : "Nueva atención"} · próximamente</span><span aria-disabled="true" className="rounded-lg border border-divider px-4 py-2 text-sm font-semibold text-text-disabled">Teleconsulta · próximamente</span></div></header><section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <article key={card.label} className="rounded-2xl border border-divider bg-surface p-5"><p className="text-sm text-text-secondary">{card.label}</p><p className="mt-2 text-3xl font-bold text-text-primary">{card.value}</p><p className={`mt-1 text-sm ${card.tone}`}>{card.detail}</p></article>)}</section><section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"><div className="space-y-6">
  
  {scheduledAppointments.length > 0 && (
    <article className="rounded-2xl border border-primary-200 bg-surface p-5 sm:p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-primary-900">Atenciones de Hoy</h2>
        <p className="mt-1 text-sm text-primary-800">Citas programadas pendientes de inicio.</p>
      </div>
      <div className="grid gap-3">
        {scheduledAppointments.map(appointment => (
          <DashboardAppointmentItem 
            key={appointment.id} 
            appointment={appointment} 
            patient={state.patients.find(p => p.id === appointment.patientId)} 
            doctorId={doctorId!} 
          />
        ))}
      </div>
    </article>
  )}
  
  <article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><div><h2 className="text-lg font-bold text-text-primary">Pacientes recientes</h2><p className="mt-1 text-sm text-text-secondary">Atenciones que forman parte de tu contexto clínico autorizado.</p></div><div className="mt-5 divide-y divide-divider">{recentPatients.length ? recentPatients.map(({ encounter, patient }) => <div key={encounter.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold text-text-primary">{patient?.fullName ?? "Paciente autorizado"}</p><p className="mt-1 text-sm text-text-secondary">{patient?.registrationCode} · {encounter.type === "INITIAL" ? "Revisión estudiantil" : "Atención especializada"}</p></div><div className="text-right"><p className="text-sm font-medium text-text-primary">{new Date(encounter.occurredAt).toLocaleDateString("es-BO")}</p><p className="mt-1 text-xs text-text-tertiary">{encounter.status === "CLOSED" ? "Atención cerrada" : "Borrador"}</p></div></div>) : <p className="py-8 text-sm text-text-secondary">Todavía no hay pacientes vinculados a tu cuenta demo.</p>}</div></article></div><article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 className="text-lg font-bold text-text-primary">Próximos módulos</h2><div className="mt-5 space-y-3 text-sm"><div className="rounded-xl bg-surface-secondary p-4"><p className="font-semibold text-text-primary">Mis pacientes</p><p className="mt-1 text-text-secondary">Búsqueda, filtros e historial longitudinal.</p></div><div className="rounded-xl bg-surface-secondary p-4"><p className="font-semibold text-text-primary">Derivaciones</p><p className="mt-1 text-text-secondary">{isSpecialist ? "Bandeja de casos recibidos." : "Creación de derivaciones con motivo y comentario."}</p></div><div className="rounded-xl bg-surface-secondary p-4"><p className="font-semibold text-text-primary">Teleconsulta</p><p className="mt-1 text-text-secondary">Se conserva como módulo futuro; su flujo aún no está definido.</p></div></div></article></section></div></main></div>;
}
