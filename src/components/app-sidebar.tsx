import Image from "next/image";
import Link from "next/link";

import type { ClinicalRole } from "@/lib/ui-contracts";

export type AppRole = "estudiante" | "medico" | "administrativo";
type NavIcon = "home" | "search" | "calendar" | "bell" | "user" | "users" | "chart" | "document" | "folder" | "referral" | "tele";
type NavItem = { label: string; mobileLabel?: string; icon: NavIcon; href?: string; key: string; comingSoon?: boolean; mobileHidden?: boolean };

function medicalNavigation(clinicalRole: ClinicalRole): NavItem[] {
  const isSpecialist = clinicalRole === "SPECIALIST";
  return [
    { key: "home", href: "/medico", label: "Inicio", icon: "home" },
    { key: "availability", href: "/medico/horarios", label: "Mi disponibilidad", mobileLabel: "Horarios", icon: "calendar" },
    { key: "patients", href: "/medico/pacientes", label: "Mis pacientes", mobileLabel: "Pacientes", icon: "users" },
    { key: "referrals", href: "/medico/derivaciones", label: isSpecialist ? "Derivaciones recibidas" : "Derivaciones emitidas", mobileLabel: "Derivaciones", icon: "referral" },
    { key: "reports", href: "/medico/reportes", label: "Reportes", icon: "chart", mobileHidden: true },
    { key: "tele", label: "Teleconsulta · próximamente", icon: "tele", comingSoon: true, mobileHidden: true },
    { key: "profile", href: "/perfil?rol=medico", label: "Perfil y preferencias", icon: "user", mobileHidden: true },
  ];
}

function navigationFor(role: AppRole, clinicalRole?: ClinicalRole): NavItem[] {
  if (role === "estudiante") return [
    { key: "home", href: "/estudiante", label: "Inicio", icon: "home" },
    { key: "request", href: "/estudiante/buscar", label: "Solicitar cita", mobileLabel: "Solicitar", icon: "search" },
    { key: "appointments", href: "/estudiante/citas", label: "Mis citas", mobileLabel: "Citas", icon: "calendar" },
    { key: "profile", href: "/perfil?rol=estudiante", label: "Mi información", mobileLabel: "Perfil", icon: "user" },
  ];
  if (role === "administrativo") return [
    { key: "home", href: "/administrativo", label: "Inicio", icon: "home" },
    { key: "students", href: "/administrativo/estudiantes", label: "Estudiantes", icon: "users" },
    { key: "admission", href: "/administrativo/check-in", label: "Citas y asistencia", mobileLabel: "Citas", icon: "calendar" },
    { key: "referrals", href: "/administrativo/derivaciones", label: "Derivaciones", icon: "referral" },
    { key: "reports", href: "/administrativo/reportes", label: "Reportes", icon: "chart" },
    { key: "profile", href: "/perfil?rol=administrativo", label: "Perfil y preferencias", icon: "user", mobileHidden: true },
  ];
  return medicalNavigation(clinicalRole ?? "REVIEW_DOCTOR");
}

function Icon({ name }: { name: NavIcon }) {
  const content: Record<NavIcon, React.ReactNode> = {
    home: <path d="M3 10.75 12 3l9 7.75v8.5a1.75 1.75 0 0 1-1.75 1.75H4.75A1.75 1.75 0 0 1 3 19.25v-8.5ZM9 21v-6h6v6" />,
    search: <><circle cx="10.75" cy="10.75" r="6.75" /><path d="m16 16 4.25 4.25" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    users: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3 20a6 6 0 0 1 12 0m1-5a5 5 0 0 1 5 5" /></>,
    chart: <><path d="M4 19V5m0 14h16M8 16v-4m4 4V8m4 8v-6" /></>,
    document: <><path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 13h8m-8 4h5" /></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /><path d="M3 10h18" /></>,
    referral: <><path d="M5 5h8a3 3 0 0 1 3 3v1" /><path d="m13 6 3 3-3 3M19 19h-8a3 3 0 0 1-3-3v-1" /><path d="m11 18-3-3 3-3" /></>,
    tele: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0">{content[name]}</svg>;
}

const activeAliases: Record<string, string[]> = {
  admission: ["admission", "appointments", "check-in"],
  availability: ["availability", "schedule"],
  patients: ["patients", "attention"],
  reports: ["reports", "audit", "demand"],
};

function isItemActive(item: NavItem, active: string) {
  return item.key === active || activeAliases[item.key]?.includes(active);
}

function guidanceFor(role: AppRole, clinicalRole?: ClinicalRole) {
  if (role === "estudiante") return { label: "¿Qué hago ahora?", title: "Revisa tu próxima cita", detail: "Confirma hora, lugar y requisitos antes de salir.", href: "/estudiante/citas" };
  if (role === "administrativo") return { label: "Ruta recomendada", title: "Empieza por admisión", detail: "Busca al estudiante antes de crear un registro nuevo.", href: "/administrativo/estudiantes" };
  if (clinicalRole === "SPECIALIST") return { label: "Ruta clínica", title: "Revisa tus derivaciones", detail: "Prioriza las asignadas y abre después la historia autorizada.", href: "/medico/derivaciones" };
  return { label: "Ruta clínica", title: "Empieza por tu agenda", detail: "Revisa llegadas y abre la atención desde la cita asignada.", href: "/medico/agenda" };
}

export function AppSidebar({ role, active, clinicalRole }: { role: AppRole; active: string; clinicalRole?: ClinicalRole }) {
  const items = navigationFor(role, clinicalRole);
  const subtitle = clinicalRole === "REVIEW_DOCTOR" ? "Revisión estudiantil" : clinicalRole === "SPECIALIST" ? "Atención especializada" : role === "administrativo" ? "Área administrativa" : "Atención estudiantil";
  const guidance = guidanceFor(role, clinicalRole);

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_-28px_rgba(18,49,111,0.75)] backdrop-blur-xl md:sticky md:top-0 md:flex md:h-screen md:w-72 md:shrink-0 md:flex-col md:border-r md:border-t-0 md:px-4 md:py-6 md:shadow-none">
      <Link href={`/${role}`} className="mb-7 hidden items-center gap-3 rounded-2xl px-2 py-1 md:flex">
        <span className="flex items-center -space-x-2" aria-hidden="true"><Image src="/branding/fcsh-uagrm-emblem.png" alt="" width={96} height={96} className="size-11 rounded-full bg-white object-contain p-0.5 ring-1 ring-secondary-container" /><Image src="/branding/centro-especialidades-emblem.png" alt="" width={96} height={96} className="size-11 rounded-full bg-white object-contain p-0.5 ring-1 ring-primary-200" /></span>
        <span><span className="block text-sm font-bold tracking-tight text-text-primary">Salud Universitaria</span><span className="mt-0.5 block text-xs text-text-tertiary">{subtitle}</span></span>
      </Link>
      <p className="mb-2 hidden px-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-text-tertiary md:block">Espacio de trabajo</p>
      <nav aria-label="Navegación principal" className="flex w-full justify-around gap-1 md:block">
        {items.map((item) => {
          const disabled = !item.href;
          const current = isItemActive(item, active);
          const classes = `min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[0.68rem] font-semibold transition md:mb-1 md:w-full md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-sm ${item.mobileHidden ? "hidden md:flex" : "flex"} ${current ? "bg-primary text-on-primary shadow-sm md:bg-primary-container md:text-primary md:shadow-none" : disabled ? "cursor-not-allowed text-text-disabled" : "text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"}`;
          const label = <><Icon name={item.icon} /><span className="truncate text-center md:hidden">{item.mobileLabel ?? item.label}</span><span className="hidden min-w-0 truncate md:inline">{item.label}</span>{current && <span className="sr-only">, página actual</span>}</>;
          return item.href ? <Link key={item.key} href={item.href} aria-current={current ? "page" : undefined} className={classes}>{label}</Link> : <span key={item.key} aria-disabled="true" title={item.comingSoon ? "Disponible en el siguiente bloque" : undefined} className={classes}>{label}</span>;
        })}
      </nav>
      <div className="mt-auto hidden md:block">
        <Link href={guidance.href} className="group block rounded-2xl border border-primary-200 bg-primary-container/70 p-4 transition hover:border-primary hover:bg-primary-container">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-secondary">{guidance.label}</p>
          <p className="mt-2 text-sm font-bold text-text-primary">{guidance.title}</p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">{guidance.detail}</p>
          <span className="mt-3 inline-flex text-xs font-bold text-primary group-hover:underline">Abrir ruta →</span>
        </Link>
        <p className="px-3 pt-4 text-[0.68rem] leading-4 text-text-tertiary">La información visible depende de tu rol y permisos activos.</p>
      </div>
    </aside>
  );
}
