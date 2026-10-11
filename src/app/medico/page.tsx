import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MedicalDashboard } from "@/components/medical-dashboard";
import { PageIntro } from "@/components/ux-primitives";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function DoctorHomePage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const isSpecialist = session.clinicalRole === "SPECIALIST";
  return <div className="min-h-screen bg-transparent md:flex"><AppSidebar role="medico" clinicalRole={session.clinicalRole} active="home" /><main className="min-w-0 flex-1 pb-24 md:pb-10"><AppHeader role="medico" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-7xl space-y-7 px-5 py-6 sm:px-8 sm:py-8"><PageIntro eyebrow={isSpecialist ? "Atención especializada" : "Revisión estudiantil"} title={`Buen día, ${session.name}`} description={isSpecialist ? "Revisa primero las derivaciones recibidas y continúa desde la historia autorizada de cada paciente." : "Empieza por las llegadas de hoy, abre la atención desde la cita y mantén cada decisión dentro de la historia clínica."} primaryAction={{ href: isSpecialist ? "/medico/derivaciones" : "/medico/agenda", label: isSpecialist ? "Ver derivaciones" : "Abrir agenda" }} secondaryAction={{ href: "/medico/pacientes", label: "Mis pacientes" }} context={{ label: "Tu función", value: isSpecialist ? "Médico especialista" : "Médico de revisión" }} /><MedicalDashboard isSpecialist={isSpecialist} /></div></main></div>;
}
