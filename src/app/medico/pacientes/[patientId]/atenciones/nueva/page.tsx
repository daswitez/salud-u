import { redirect } from "next/navigation";

export default async function NewPatientEncounterPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  redirect(`/medico/pacientes/${patientId}?accion=nueva`);
}
