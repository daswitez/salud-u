import { redirect } from "next/navigation";

/** Lista de espera de demostración retirada en FE-CORTE: las solicitudes reales se asignan en Citas y asistencia. */
export default function LegacyWaitlistPage() { redirect("/administrativo/check-in"); }
