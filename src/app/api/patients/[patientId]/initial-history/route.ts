import { NextResponse } from "next/server";

import { isApiError, requireApiRole, supabaseError, text } from "@/lib/api/route-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ patientId: string }> }) {
  const authorization = await requireApiRole("ADMINISTRATIVE");
  if (isApiError(authorization)) return authorization;
  const { patientId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_get_initial_history_intake", { p_patient_id: patientId });
  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true, data: data?.[0] ?? null });
}

export async function PUT(request: Request, context: { params: Promise<{ patientId: string }> }) {
  const authorization = await requireApiRole("ADMINISTRATIVE");
  if (isApiError(authorization)) return authorization;
  const { patientId } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "El cuerpo debe ser JSON." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_record_initial_history_intake", {
    p_patient_id: patientId,
    p_allergies: text(body.allergies, 4000) || null,
    p_chronic_conditions: text(body.chronicConditions, 4000) || null,
    p_current_medications: text(body.currentMedications, 4000) || null,
    p_relevant_history: text(body.relevantHistory, 4000) || null,
    p_emergency_contact_note: text(body.emergencyContact, 1000) || null,
  });
  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true, data: { versionNo: data } });
}
