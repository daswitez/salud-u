import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { AdministrativeOverview } from "@/components/administrative-overview";
import { requireClinicalRole } from "@/lib/session";
export default async function AdminHomePage(){const session=await requireClinicalRole("ADMINISTRATIVE","REPORTING_OFFICER","AUDITOR");if(session.clinicalRole==="AUDITOR")redirect("/administrativo/auditoria");if(session.clinicalRole==="REPORTING_OFFICER")redirect("/administrativo/reportes");return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="home"/><main className="min-w-0 flex-1"><AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name}/><div className="mx-auto max-w-7xl p-5 sm:p-8"><AdministrativeOverview/></div></main></div>;}
