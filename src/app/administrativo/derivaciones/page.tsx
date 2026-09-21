import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { AdministrativeReferralInbox } from "@/components/administrative-referral-inbox";
import { requireClinicalRole } from "@/lib/demo-session";

export default async function AdministrativeReferralsPage() {
  const session = await requireClinicalRole("ADMINISTRATIVE");
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="referrals" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole={session.clinicalRole} name={session.name} /><div className="mx-auto max-w-6xl p-5 sm:p-8"><AdministrativeReferralInbox /></div></main></div>;
}
