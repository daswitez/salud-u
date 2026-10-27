import { redirect } from "next/navigation";

/** Módulo de cola de demostración retirado en FE-CORTE: el estado de la cita viene de Spring. */
export default function LegacyStudentQueuePage() { redirect("/estudiante/citas"); }
