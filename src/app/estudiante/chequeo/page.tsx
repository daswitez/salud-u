import { redirect } from "next/navigation";

/** Campañas de chequeo de demostración retiradas en FE-CORTE: sin requisito ni backend; la revisión se solicita a Administración. */
export default function LegacyCheckupPage() { redirect("/estudiante/buscar"); }
