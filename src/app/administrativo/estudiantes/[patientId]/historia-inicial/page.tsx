import { redirect } from "next/navigation";

/** La ficha clínica de revisión la llena el médico durante una cita, no Administración. */
export default async function AdministrativeInitialHistoryPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  redirect(`/administrativo/estudiantes/${patientId}`);
}
