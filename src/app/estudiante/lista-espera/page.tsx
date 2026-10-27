import { redirect } from "next/navigation";

/** Lista de espera de demostración retirada en FE-CORTE: sin requisito ni backend. */
export default function LegacyStudentWaitlistPage() { redirect("/estudiante/citas"); }
