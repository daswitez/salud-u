import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";
import { requireClinicalRole } from "@/lib/demo-session";
import { CumplimientoClient } from "./cumplimiento-client";
import Link from "next/link";

export default async function CumplimientoPage() {
  const session = await requireClinicalRole("ADMINISTRATIVE");
  const state = getClinicalDemoState();

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="administrativo" active="reports" />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="administrativo" name={session.name} />
        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          <div className="mb-6 flex gap-4">
            <Link href="/administrativo/reportes" className="text-sm font-semibold text-text-secondary hover:text-primary">Reportes rápidos</Link>
            <span className="text-text-disabled">/</span>
            <span className="text-sm font-bold text-primary">Cumplimiento de revisión médica</span>
          </div>
          <CumplimientoClient state={state} userName={session.name} />
        </div>
      </main>
    </div>
  );
}
