import { redirect } from "next/navigation";

/** Detalle de agenda de demostración retirado en FE-CORTE: cada cita real se abre en /medico/citas/{id}. */
export default function LegacyAgendaDetailPage() { redirect("/medico/agenda"); }
