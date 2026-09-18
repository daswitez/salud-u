import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { requireClinicalRole } from "@/lib/demo-session";
import { AuditoriaClient } from "./auditoria-client";

export default async function AuditoriaPage() {
  const session = await requireClinicalRole("ADMINISTRATIVE");

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="administrativo" active="reports" />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="administrativo" name={session.name} />
        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          <AuditoriaClient />
        </div>
      </main>
    </div>
  );
}
