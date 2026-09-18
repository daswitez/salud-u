import { NextResponse } from "next/server";

import { isApiError, requireApiRole, supabaseError } from "@/lib/api/route-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await requireApiRole("STUDENT", "ADMINISTRATIVE");
  if (isApiError(authorization)) return authorization;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointment_request")
    .select("id,status,requested_at,assigned_at,cancelled_at,cancellation_reason,patient:patient_id(id,carnet,given_names,family_names),appointment:appointment_id(id,status,scheduled_for,checked_in_at,cancelled_at,availability_slot:slot_id(starts_at,ends_at))")
    .order("requested_at", { ascending: false });
  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST() {
  const authorization = await requireApiRole("STUDENT");
  if (isApiError(authorization)) return authorization;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_create_initial_appointment_request");
  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true, data: { id: data } }, { status: 201 });
}
