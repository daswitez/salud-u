import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";

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
  const pendingReferrals = referrals.filter((referral) => ["PENDING_ASSIGNMENT", "ASSIGNED"].includes(referral.status)).length;
  const inProgressReferrals = referrals.filter((referral) => referral.status === "IN_PROGRESS").length;

  const recentPatients = encounters.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 4).map((encounter) => ({ encounter, patient: state.patients.find((patient) => patient.id === encounter.patientId) }));

  const cards = [
    { label: "Pacientes atendidos hoy", value: attendedToday, detail: "Registro clínico del día", tone: "text-success" },
    { label: "Borradores abiertos", value: openDrafts, detail: "Requieren completar o cerrar", tone: "text-warning" },
    { label: "Derivaciones pendientes", value: pendingReferrals, detail: "Por asignar o revisar", tone: "text-primary" },
    { label: "Derivaciones en curso", value: inProgressReferrals, detail: "Actualmente en atención", tone: "text-text-secondary" },
  ];

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="medico" clinicalRole={session.clinicalRole} active="home" />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} />
        <div className="mx-auto max-w-6xl p-5 sm:p-8">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-divider pb-5">
            <div>
              <p className="text-sm font-semibold text-secondary">{isSpecialist ? "ATENCIÓN ESPECIALIZADA" : "REVISIÓN ESTUDIANTIL"}</p>
              <h1 className="mt-1 text-2xl font-bold text-text-primary">Buen día, {session.name}</h1>
              <p className="mt-1 text-sm text-text-secondary">Consulta tus pacientes, atenciones y derivaciones clínicas.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/medico/pacientes" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-600 transition-colors">
                Mis Pacientes
              </Link>
              {!isSpecialist && (
                <Link href="/medico/citas" className="rounded-lg border border-primary text-primary px-4 py-2 text-sm font-bold hover:bg-primary-50 transition-colors">
                  Nueva Atención
                </Link>
              )}
              <Link href="/medico/derivaciones" className="rounded-lg border border-divider text-text-primary px-4 py-2 text-sm font-bold hover:bg-surface-secondary transition-colors">
                Derivaciones
              </Link>
            </div>
          </header>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <article key={card.label} className="rounded-2xl border border-divider bg-surface p-5 hover:border-primary-200 transition-colors">
                <p className="text-sm font-semibold text-text-secondary">{card.label}</p>
                <p className="mt-3 text-3xl font-black text-text-primary tracking-tight">{card.value}</p>
                <p className={`mt-2 text-xs font-medium ${card.tone}`}>{card.detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-6">
              <article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Pacientes recientes</h2>
                  <p className="mt-1 text-sm text-text-secondary">Atenciones que forman parte de tu contexto clínico autorizado.</p>
                </div>
                <div className="mt-5 divide-y divide-divider">
                  {recentPatients.length ? recentPatients.map(({ encounter, patient }) => (
                    <div key={encounter.id} className="flex flex-wrap items-center justify-between gap-3 py-4 group">
                      <div>
                        <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">{patient?.fullName ?? "Paciente autorizado"}</p>
                        <p className="mt-1 text-sm text-text-secondary">{patient?.registrationCode} · {encounter.type === "INITIAL" ? "Revisión estudiantil" : "Atención especializada"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-text-primary">{new Date(encounter.occurredAt).toLocaleDateString("es-BO")}</p>
                        <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${encounter.status === "CLOSED" ? "bg-success-container text-success" : "bg-warning-container text-warning"}`}>
                          {encounter.status === "CLOSED" ? "Cerrada" : "Borrador"}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <p className="py-8 text-center text-sm text-text-secondary">Todavía no hay pacientes vinculados a tu cuenta demo.</p>
                  )}
                </div>
              </article>
            </div>

            <aside className="space-y-6">
              <article className="rounded-2xl border border-divider bg-surface p-5 sm:p-6 shadow-sm">
                <h2 className="text-lg font-bold text-text-primary">Accesos Rápidos</h2>
                <div className="mt-5 space-y-3">
                  <Link href="/medico/pacientes" className="block rounded-xl border border-transparent bg-surface-secondary p-4 hover:border-primary-200 transition-colors">
                    <p className="font-bold text-text-primary">Mis pacientes</p>
                    <p className="mt-1 text-xs text-text-secondary">Búsqueda, filtros e historial clínico longitudinal.</p>
                  </Link>
                  <Link href="/medico/derivaciones" className="block rounded-xl border border-transparent bg-surface-secondary p-4 hover:border-primary-200 transition-colors">
                    <p className="font-bold text-text-primary">Bandeja de Derivaciones</p>
                    <p className="mt-1 text-xs text-text-secondary">{isSpecialist ? "Ver casos recibidos." : "Gestionar derivaciones emitidas."}</p>
                  </Link>
                  {!isSpecialist && (
                    <Link href="/medico/citas" className="block rounded-xl border border-transparent bg-surface-secondary p-4 hover:border-primary-200 transition-colors">
                      <p className="font-bold text-text-primary">Nueva Atención</p>
                      <p className="mt-1 text-xs text-text-secondary">Iniciar consulta para revisión estudiantil.</p>
                    </Link>
                  )}
                </div>
              </article>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
