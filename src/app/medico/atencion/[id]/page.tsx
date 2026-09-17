import { redirect } from "next/navigation";

/** Ruta heredada de cola: la ficha clínica longitudinal reemplaza este contexto. */
export default function LegacyMedicalAttentionPage() { redirect("/medico"); }
