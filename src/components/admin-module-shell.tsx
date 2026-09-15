import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MOCK_USERS } from "@/lib/mock-users";

export function AdminModuleShell({ active, title, description, items }: { active: string; title: string; description: string; items: { title: string; detail: string; status: string }[] }) {
  const admin = MOCK_USERS.find((user) => user.role === "administrativo")!;
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active={active} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" name={admin.name} /><div className="mx-auto max-w-5xl p-5 sm:p-8"><Link href="/administrativo" className="text-sm font-semibold text-primary hover:underline">← Dashboard</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-primary">ÁREA ADMINISTRATIVA</p><h1 className="mt-1 text-3xl font-bold text-text-primary">{title}</h1><p className="mt-2 text-text-secondary">{description}</p></header><section className="mt-7 divide-y divide-divider overflow-hidden rounded-2xl border border-divider bg-surface">{items.map((item) => <article key={item.title} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-text-primary">{item.title}</h2><p className="mt-1 text-sm text-text-secondary">{item.detail}</p></div><span className="rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-primary">{item.status}</span></article>)}</section><p className="mt-5 text-xs text-text-tertiary">Vista operativa mock. Las acciones de asignación o atención médica siguen fuera del alcance administrativo.</p></div></main></div>;
}
