import Link from "next/link";
import type { AppRole } from "@/components/app-sidebar";
import type { ClinicalRole } from "@/lib/ui-contracts";

const areaLabels: Record<AppRole, string> = {
  estudiante: "Atención médica estudiantil",
  medico: "Área médica",
  administrativo: "Área administrativa",
};

export function AppHeader({ role, name, clinicalRole }: { role: AppRole; name: string; clinicalRole?: ClinicalRole }) {
  const initials = name.split(" ").filter(Boolean).map((word) => word[0]).slice(0, 2).join("");
  const roleLabel = clinicalRole === "REVIEW_DOCTOR" ? "Médico de revisión" : clinicalRole === "SPECIALIST" ? "Médico especialista" : role === "administrativo" ? "Administrativo" : "Estudiante";

  return <header className="flex min-h-18 items-center justify-between border-b border-divider bg-surface px-5 py-3 md:px-8">
    <Link href={`/${role}`} className="flex items-center gap-3 text-text-primary" aria-label="Ir al inicio">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-on-primary">SU</span>
      <span><span className="block text-sm font-semibold leading-4">Salud Universitaria</span><span className="block text-xs text-text-tertiary">{clinicalRole === "REVIEW_DOCTOR" ? "Revisión estudiantil" : clinicalRole === "SPECIALIST" ? "Atención especializada" : areaLabels[role]}</span></span>
    </Link>
    <Link href={`/perfil?rol=${role}`} className="flex items-center gap-2 rounded-lg p-1 text-sm text-text-secondary transition hover:bg-surface-secondary" aria-label="Abrir mi perfil">
      <span className="hidden text-right sm:block"><span className="block font-medium text-text-primary">{name}</span><span className="block text-xs">{roleLabel}</span></span>
      <span className="grid size-9 place-items-center rounded-full bg-secondary-container text-xs font-semibold text-secondary">{initials}</span>
    </Link>
  </header>;
}
