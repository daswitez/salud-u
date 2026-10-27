import { redirect } from "next/navigation";

/** Solicitudes de personal de demostración retiradas en FE-CORTE: sin requisito ni backend. */
export default function LegacyStaffRequestsPage() { redirect("/administrativo"); }
