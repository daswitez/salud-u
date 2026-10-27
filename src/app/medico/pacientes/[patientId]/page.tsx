import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MedicalPatientRecord } from "@/components/medical-patient-record";
import { VaccinationDoses } from "@/components/vaccination-doses";
import { requireClinicalRole } from "@/lib/session";

export default async function PatientClinicalRecordPage({ params, searchParams }: { params: Promise<{ patientId: string }>; searchParams: Promise<{ q?: string | string[]; from?: string | string[]; to?: string | string[] }> }) {
  const { patientId } = await params;
  const query = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const initialFilters = { q: first(query.q), from: first(query.from), to: first(query.to) };
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="patients" clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} /><div className="mx-auto max-w-7xl p-5 sm:p-8"><MedicalPatientRecord key={`${patientId}:${JSON.stringify(initialFilters)}`} initialFilters={initialFilters} patientId={patientId} clinicalRole={session.clinicalRole as "REVIEW_DOCTOR" | "SPECIALIST"} />{session.clinicalRole === "REVIEW_DOCTOR" && <VaccinationDoses patientId={patientId} actor="REVIEW_DOCTOR" />}</div></main></div>;
}
