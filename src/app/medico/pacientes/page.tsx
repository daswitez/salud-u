import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function MedicalPatientsPage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const state = getClinicalDemoState();
  const professional = state.professionals.find((item) => item.fullName === session.name);
  const patientIds = new Set<string>();
  state.encounters.filter((item) => item.doctorId === professional?.id).forEach((item) => patientIds.add(item.patientId));
  state.referrals.filter((item) => item.requestedBy === professional?.id || item.assignedDoctorId === professional?.id).forEach((item) => patientIds.add(item.patientId));
  state.appointments.filter((item) => item.assignedDoctorId === professional?.id).forEach((item) => patientIds.add(item.patientId));
  const patients = state.patients.filter((item) => patientIds.has(item.id));
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="patients" clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} /><div className="mx-auto max-w-6xl p-5 sm:p-8"><header><p className="text-sm font-semibold tracking-wide text-primary">MIS PACIENTES</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Historias clínicas autorizadas</h1><p className="mt-2 text-text-secondary">Solo se muestran pacientes con atención, cita o derivación relacionada a tu cuenta.</p></header><section className="mt-7 overflow-hidden rounded-2xl border border-divider bg-surface"><table className="w-full text-left text-sm"><thead className="border-b border-divider text-xs uppercase text-text-tertiary"><tr><th className="px-5 py-3">Paciente</th><th className="px-5 py-3">Carnet / código</th><th className="px-5 py-3">Carrera</th><th className="px-5 py-3 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-divider">{patients.map((patient) => <tr key={patient.id}><td className="px-5 py-4 font-semibold text-text-primary">{patient.fullName}</td><td className="px-5 py-4 text-text-secondary">{patient.carnet} · {patient.registrationCode}</td><td className="px-5 py-4 text-text-secondary">{patient.career}</td><td className="px-5 py-4 text-right"><Link href={"/medico/pacientes/" + patient.id} className="mr-4 font-semibold text-primary hover:underline">Abrir ficha</Link><Link href={"/medico/pacientes/" + patient.id + "/historia-inicial"} className="font-semibold text-primary hover:underline">Historia inicial</Link></td></tr>)}{!patients.length && <tr><td colSpan={4} className="px-5 py-10 text-center text-text-secondary">No tienes pacientes clínicamente vinculados.</td></tr>}</tbody></table></section></div></main></div>;
}
