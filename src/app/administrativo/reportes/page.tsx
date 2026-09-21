import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { OperationalReports } from "@/components/operational-reports";
import { requireClinicalRole } from "@/lib/demo-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminReportsPage() {
  const session = await requireClinicalRole("ADMINISTRATIVE");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("rpc_daily_activity");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="reports" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-6xl p-5 sm:p-8"><OperationalReports activities={data ?? []} scope="administrative" /></div></main></div>;
}
