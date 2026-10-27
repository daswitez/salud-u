import { redirect } from "next/navigation";

/** Llegadas de demostración retiradas en FE-CORTE: la agenda real muestra llegadas registradas por Administración. */
export default function LegacyDoctorCheckInPage() { redirect("/medico/agenda"); }
