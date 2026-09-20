import { NextResponse } from "next/server";

import { isApiError, requireApiRole, supabaseError } from "@/lib/api/route-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function first<T>(value: T | T[] | null | undefined) { return Array.isArray(value) ? value[0] ?? null : value ?? null; }

export async function GET(_request: Request, context: { params: Promise<{ patientId: string }> }) {
  const authorization = await requireApiRole("REVIEW_DOCTOR", "SPECIALIST");
  if (isApiError(authorization)) return authorization;
  const { patientId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: staff, error: staffError } = await supabase.from("staff_member").select("id").eq("profile_id", authorization.id).eq("is_active", true).maybeSingle();
  if (staffError) return supabaseError(staffError);
  if (!staff) return NextResponse.json({ ok: false, error: "No existe una ficha de personal activa." }, { status: 404 });

  const { data: patient, error: patientError } = await supabase.from("patient").select("id,carnet,registration_code,given_names,family_names,birth_date,phone,email").eq("id", patientId).maybeSingle();
  if (patientError) return supabaseError(patientError);
  if (!patient) return NextResponse.json({ ok: false, error: "No tienes acceso clínico a este paciente." }, { status: 404 });

  const [encounterResult, referralResult, appointmentResult, intakeResult, documentResult] = await Promise.all([
    supabase.from("clinical_encounter").select("id,appointment_id,status,encounter_type,occurred_at,closed_at,chief_complaint,assessment,instructions,follow_up_text,blood_chemistry_status,specialty:specialty_id(name)").eq("patient_id", patientId).order("occurred_at", { ascending: false }),
    supabase.from("referral").select("id,status,priority,reason,comment_for_specialist,created_at,specialty:specialty_id(name)").eq("patient_id", patientId).order("created_at", { ascending: false }),
    supabase.from("appointment").select("id,status,appointment_type,scheduled_for,checked_in_at,assigned_staff_id").eq("patient_id", patientId).order("scheduled_for", { ascending: false }),
    supabase.rpc("rpc_get_initial_history_intake", { p_patient_id: patientId }),
    supabase.from("clinical_document").select("id,encounter_id,document_type_code,status,original_filename,mime_type,size_bytes,study_date,description,uploaded_at").eq("patient_id", patientId).eq("status", "AVAILABLE").order("uploaded_at", { ascending: false }),
  ]);
  for (const result of [encounterResult, referralResult, appointmentResult, intakeResult, documentResult]) if (result.error) return supabaseError(result.error);

  const encounters = (encounterResult.data ?? []).map((row) => {
    const relation = row as typeof row & { specialty: { name: string } | { name: string }[] | null };
    return { ...row, specialty: first(relation.specialty)?.name ?? null };
  });
  const encounterIds = encounters.map((item) => item.id);
  const { data: diagnoses, error: diagnosisError } = encounterIds.length
    ? await supabase.from("encounter_diagnosis").select("id,encounter_id,free_text,diagnosis_kind,is_primary,condition:condition_id(display_name)").in("encounter_id", encounterIds)
    : { data: [], error: null };
  if (diagnosisError) return supabaseError(diagnosisError);
  const referrals = (referralResult.data ?? []).map((row) => {
    const relation = row as typeof row & { specialty: { name: string } | { name: string }[] | null };
    return { ...row, specialty: first(relation.specialty)?.name ?? "Especialidad" };
  });
  const diagnosisRows = (diagnoses ?? []).map((row) => {
    const relation = row as typeof row & { condition: { display_name: string } | { display_name: string }[] | null };
    return { ...row, label: first(relation.condition)?.display_name ?? row.free_text ?? "Diagnóstico registrado" };
  });
  const intake = Array.isArray(intakeResult.data) ? intakeResult.data[0] ?? null : intakeResult.data ?? null;

  return NextResponse.json({ ok: true, data: {
    patient: { id: patient.id, carnet: patient.carnet, registrationCode: patient.registration_code, fullName: `${patient.given_names} ${patient.family_names}`.trim(), birthDate: patient.birth_date, phone: patient.phone, email: patient.email },
    intake,
    encounters,
    diagnoses: diagnosisRows,
    referrals,
    appointments: (appointmentResult.data ?? []).map((appointment) => ({ ...appointment, isAssignedToMe: appointment.assigned_staff_id === staff.id })),
    documents: documentResult.data ?? [],
  } });
}
