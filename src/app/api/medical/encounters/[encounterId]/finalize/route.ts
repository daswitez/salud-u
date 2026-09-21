import { NextResponse } from "next/server";

import { isApiError, requireApiRole, supabaseError, text } from "@/lib/api/route-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ encounterId: string }> }) {
  const authorization = await requireApiRole("REVIEW_DOCTOR", "SPECIALIST");
  if (isApiError(authorization)) return authorization;
  const { encounterId } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const chiefComplaint = text(body?.chiefComplaint, 4000); const assessment = text(body?.assessment, 8000);
  if (!chiefComplaint || !assessment) return NextResponse.json({ ok: false, error: "El motivo de consulta y la evaluación son obligatorios." }, { status: 400 });
  const bloodStatus = text(body?.bloodChemistryStatus, 30) || "NOT_PRESENTED";
  if (!(["ATTACHED", "PENDING", "NOT_PRESENTED"] as string[]).includes(bloodStatus)) return NextResponse.json({ ok: false, error: "Estado de química sanguínea inválido." }, { status: 400 });
  const referralSpecialtyId = authorization.clinicalRole === "REVIEW_DOCTOR" ? text(body?.referralSpecialtyId, 50) || null : null;
  if (referralSpecialtyId && (!text(body?.referralReason, 2000) || !text(body?.referralComment, 4000))) return NextResponse.json({ ok: false, error: "Completa el motivo y el resumen para el especialista." }, { status: 400 });
  const priority = text(body?.referralPriority, 20) || "ROUTINE";
  if (!(["ROUTINE", "PRIORITY", "URGENT"] as string[]).includes(priority)) return NextResponse.json({ ok: false, error: "Prioridad de derivación inválida." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const result = authorization.clinicalRole === "REVIEW_DOCTOR"
    ? await supabase.rpc("rpc_finalize_initial_encounter", {
      p_encounter_id: encounterId, p_chief_complaint: chiefComplaint, p_assessment: assessment,
      p_instructions: text(body?.instructions, 8000) || null, p_follow_up_text: text(body?.followUpText, 4000) || null,
      p_blood_chemistry_status: bloodStatus, p_diagnosis_text: text(body?.diagnosisText, 2000) || null,
      p_referral_specialty_id: referralSpecialtyId, p_referral_reason: text(body?.referralReason, 2000) || null,
      p_referral_comment: text(body?.referralComment, 4000) || null, p_referral_priority: priority,
    })
    : await supabase.rpc("rpc_finalize_specialty_encounter", {
      p_encounter_id: encounterId, p_chief_complaint: chiefComplaint, p_assessment: assessment,
      p_instructions: text(body?.instructions, 8000) || null, p_follow_up_text: text(body?.followUpText, 4000) || null,
      p_diagnosis_text: text(body?.diagnosisText, 2000) || null,
    });
  const { data, error } = result;
  if (error) return supabaseError(error);
  if (authorization.clinicalRole === "SPECIALIST" && text(body?.specialtyHistory, 8000)) {
    const { error: historyError } = await supabase.rpc("rpc_record_specialty_history_intake", { p_encounter_id: encounterId, p_data: { summary: text(body?.specialtyHistory, 8000) }, p_template_id: null });
    if (historyError) return supabaseError(historyError);
  }
  return NextResponse.json({ ok: true, data });
}
