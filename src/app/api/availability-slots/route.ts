import { NextRequest, NextResponse } from "next/server";

import { isApiError, requireApiRole, supabaseError, text } from "@/lib/api/route-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole("ADMINISTRATIVE", "REVIEW_DOCTOR", "SPECIALIST");
  if (isApiError(authorization)) return authorization;
  const supabase = await createSupabaseServerClient();
  let statement = supabase.from("availability_slot").select("id,specialty_id,starts_at,ends_at,capacity,booked_count,status").eq("status", "PUBLISHED").gt("starts_at", new Date().toISOString()).order("starts_at").limit(100);
  if (authorization.clinicalRole !== "ADMINISTRATIVE") {
    const { data: staff, error: staffError } = await supabase.from("staff_member").select("id").eq("profile_id", authorization.id).maybeSingle();
    if (staffError) return supabaseError(staffError);
    if (!staff) return NextResponse.json({ ok: false, error: "No existe una ficha de personal para esta cuenta." }, { status: 404 });
    statement = statement.eq("staff_member_id", staff.id);
  }
  if (request.nextUrl.searchParams.get("initial") === "true") statement = statement.is("specialty_id", null);
  const { data, error } = await statement;
  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(request: Request) {
  const authorization = await requireApiRole("REVIEW_DOCTOR", "SPECIALIST");
  if (isApiError(authorization)) return authorization;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const startsAt = text(body?.startsAt, 40); const endsAt = text(body?.endsAt, 40);
  const capacity = typeof body?.capacity === "number" ? body.capacity : Number(body?.capacity);
  if (!startsAt || !endsAt || !Number.isInteger(capacity)) return NextResponse.json({ ok: false, error: "Fecha, hora y capacidad son obligatorias." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_publish_availability_slot", { p_starts_at: startsAt, p_ends_at: endsAt, p_capacity: capacity, p_specialty_id: text(body?.specialtyId, 50) || null });
  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true, data: { id: data } }, { status: 201 });
}
