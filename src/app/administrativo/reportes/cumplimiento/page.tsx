import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { ComplianceReport } from "@/components/operational-reports";
import { requireClinicalRole } from "@/lib/demo-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CumplimientoPage() {
  const session = await requireClinicalRole("ADMINISTRATIVE");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("rpc_compliance_report");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="reports" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-7xl p-5 sm:p-8"><Link href="/administrativo/reportes" className="text-sm font-semibold text-primary hover:underline">← Reportes</Link><div className="mt-6"><ComplianceReport rows={data ?? []} /></div></div></main></div>;
}
