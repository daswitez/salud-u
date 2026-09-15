import Link from "next/link";

export type AppRole = "estudiante" | "medico" | "administrativo";

type NavIcon = "home" | "search" | "calendar" | "bell" | "user" | "users" | "schedule" | "chart" | "queue" | "request";
type NavItem = { label: string; icon: NavIcon; href?: string; key: string };

const navigation: Record<AppRole, NavItem[]> = {
  estudiante: [
    { key: "home", href: "/estudiante", label: "Inicio", icon: "home" },
    { key: "search", href: "/estudiante/buscar", label: "Buscar", icon: "search" },
    { key: "appointments", href: "/estudiante/citas", label: "Mis citas", icon: "calendar" },
    { key: "notifications", href: "/estudiante/avisos", label: "Avisos", icon: "bell" },
    { key: "profile", href: "/perfil?rol=estudiante", label: "Perfil", icon: "user" },
  ],
  medico: [
    { key: "home", href: "/medico", label: "Inicio", icon: "home" },
    { key: "checkin", href: "/medico/check-in", label: "Check-in y QR", icon: "request" },
    { key: "schedule", href: "/medico/agenda", label: "Agenda y cola", icon: "schedule" },
    { key: "tele", href: "/medico/teleconsulta", label: "Teleconsultas", icon: "request" },
    { key: "requests", href: "/medico/solicitudes", label: "Solicitudes", icon: "request" },
    { key: "profile", href: "/perfil?rol=medico", label: "Perfil", icon: "user" },
  ],
  administrativo: [
    { key: "home", href: "/administrativo", label: "Dashboard", icon: "home" },
    { key: "staff", href: "/administrativo/personal-medico", label: "Personal médico", icon: "users" },
    { key: "schedule", href: "/administrativo/planificacion", label: "Planificación", icon: "schedule" },
    { key: "demand", href: "/administrativo/capacidad", label: "Capacidad y demanda", icon: "chart" },
    { key: "requests", href: "/administrativo/solicitudes", label: "Solicitudes", icon: "request" },
    { key: "audit", href: "/administrativo/auditoria", label: "Auditoría", icon: "chart" },
    { key: "profile", href: "/perfil?rol=administrativo", label: "Perfil", icon: "user" },
  ],
};

function Icon({ name }: { name: NavIcon }) {
  const content: Record<NavIcon, React.ReactNode> = {
    home: <path d="M3 10.75 12 3l9 7.75v8.5a1.75 1.75 0 0 1-1.75 1.75H4.75A1.75 1.75 0 0 1 3 19.25v-8.5ZM9 21v-6h6v6" />,
    search: <><circle cx="10.75" cy="10.75" r="6.75" /><path d="m16 16 4.25 4.25" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    users: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3 20a6 6 0 0 1 12 0m1-5a5 5 0 0 1 5 5" /></>,
    schedule: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-11 4h4m-4 3h7" /></>,
    chart: <><path d="M4 19V5m0 14h16M8 16v-4m4 4V8m4 8v-6" /></>,
    queue: <><circle cx="7" cy="7" r="2.5" /><circle cx="7" cy="17" r="2.5" /><path d="M12 7h8m-8 10h8" /></>,
    request: <><path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 13h8m-8 4h5" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0">{content[name]}</svg>;
}

export function AppSidebar({ role, active }: { role: AppRole; active: string }) {
  const items = navigation[role];
  return <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:static md:flex md:min-h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-t-0 md:px-3 md:py-6">
    <Link href={`/${role}`} className="mb-8 hidden items-center gap-3 px-3 md:flex"><span className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-bold text-on-primary">SU</span><span><span className="block text-sm font-semibold text-text-primary">Salud Universitaria</span><span className="block text-xs text-text-tertiary">{role === "medico" ? "Área médica" : role === "administrativo" ? "Área administrativa" : "Atención estudiantil"}</span></span></Link>
    <nav aria-label="Navegación principal" className="flex w-full justify-between md:block">{items.map((item) => {
      const classes = `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors md:mb-1 md:w-full md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-sm ${active === item.key ? "bg-primary-container text-primary" : item.href ? "text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary" : "cursor-not-allowed text-text-disabled"}`;
      const label = <><Icon name={item.icon} /><span className="text-center md:text-left">{item.label}</span></>;
      return item.href ? <Link key={item.key} href={item.href} className={classes}>{label}</Link> : <span key={item.key} aria-disabled="true" title="Disponible en el siguiente bloque" className={classes}>{label}</span>;
    })}</nav>
    <p className="mt-auto hidden px-3 pt-6 text-xs leading-5 text-text-tertiary md:block">{role === "estudiante" ? "Gestiona tu atención desde un solo lugar." : "Acceso según tus permisos asignados."}</p>
  </aside>;
}
