import Link from "next/link";
import Image from "next/image";
import type { AppRole } from "@/components/app-sidebar";
import type { ClinicalRole } from "@/lib/ui-contracts";

const areaLabels: Record<AppRole, string> = {
  estudiante: "Atención médica estudiantil",
  medico: "Área médica",
  administrativo: "Área administrativa",
};

export function AppHeader({ role, name, clinicalRole }: { role: AppRole; name: string; clinicalRole?: ClinicalRole }) {
  const initials = name.split(" ").filter(Boolean).map((word) => word[0]).slice(0, 2).join("");
  const roleLabel = clinicalRole === "AUDITOR" ? "Auditor" : clinicalRole === "REPORTING_OFFICER" ? "Responsable de Reportes" : clinicalRole === "REVIEW_DOCTOR" ? "Médico de revisión" : clinicalRole === "SPECIALIST" ? "Médico especialista" : role === "administrativo" ? "Administrativo" : "Estudiante";

  return <header className="sticky top-0 z-20 flex min-h-18 items-center justify-between border-b border-divider bg-surface/90 px-5 py-3 backdrop-blur-xl md:px-8">
    <Link href={clinicalRole === "AUDITOR" ? "/administrativo/auditoria" : `/${role}`} className="flex items-center gap-3 text-text-primary">
      <span className="flex items-center -space-x-2" aria-hidden="true"><Image src="/branding/fcsh-uagrm-emblem.png" alt="" width={96} height={96} className="size-10 rounded-full bg-white object-contain p-0.5 ring-1 ring-secondary-container" /><Image src="/branding/centro-especialidades-emblem.png" alt="" width={96} height={96} className="size-10 rounded-full bg-white object-contain p-0.5 ring-1 ring-primary-200" /></span>
      <span><span className="block text-sm font-bold leading-4 tracking-tight">Salud Universitaria<span className="sr-only">, ir al inicio</span></span><span className="mt-0.5 block text-xs text-text-tertiary">{clinicalRole === "AUDITOR" ? "Auditoría institucional" : clinicalRole === "REPORTING_OFFICER" ? "Reportes institucionales" : clinicalRole === "REVIEW_DOCTOR" ? "Revisión estudiantil" : clinicalRole === "SPECIALIST" ? "Atención especializada" : areaLabels[role]}</span></span>
    </Link>
    <div className="flex items-center gap-3">
      <Link href={`/perfil?rol=${role}`} className="flex items-center gap-2 rounded-xl p-1.5 text-sm text-text-secondary transition hover:bg-surface-secondary">
        <span className="hidden text-right sm:block"><span className="block font-medium text-text-primary">{name}</span><span className="block text-xs">{roleLabel}</span></span>
        <span className="sr-only">Abrir mi perfil</span>
        <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-secondary-container text-xs font-bold text-secondary ring-1 ring-secondary/10">{initials}</span>
      </Link>
    </div>
  </header>;
}
