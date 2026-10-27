import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { AssignedReferrals } from "@/components/assigned-referrals";
import { EmittedReferrals } from "@/components/emitted-referrals";
import { requireClinicalRole } from "@/lib/session";

export default async function MedicalReferralContextPage({ params }: { params: Promise<{ referralId: string }> }) {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const { referralId } = await params;
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="medico" active="referrals" clinicalRole={session.clinicalRole} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} /><div className="mx-auto max-w-5xl p-5 sm:p-8">{session.clinicalRole === "SPECIALIST" ? <AssignedReferrals key={referralId} referralId={referralId} /> : <EmittedReferrals referralId={referralId} />}</div></main></div>;
}
