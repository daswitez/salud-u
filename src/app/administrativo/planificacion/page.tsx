import { redirect } from "next/navigation";

/** Planificación de demostración retirada en FE-CORTE: la disponibilidad real la publica cada médico. */
export default function LegacyPlanningPage() { redirect("/administrativo"); }
