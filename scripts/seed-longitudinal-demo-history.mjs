import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const DEMO_PASSWORD = process.env.TEST_USERS_PASSWORD || "SaludDemo2026!";
const REVIEW_EMAIL = "revision.ana.demo@salud-universitaria.test";
const OPHTHALMOLOGY_EMAIL = "oftalmologia.demo@salud-universitaria.test";
const GYNECOLOGY_EMAIL = "ginecologia.demo@salud-universitaria.test";
const ADMIN_EMAIL = "admin.demo@salud-universitaria.test";
const MARKER = "Seguimiento preventivo de demostración";

function loadLocalEnvironment() {
  const environmentFile = resolve(".env.local");
  if (!existsSync(environmentFile)) return;

  for (const line of readFileSync(environmentFile, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name}.`);
  return value;
}

function fail(error, operation) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

loadLocalEnvironment();
const projectUrl = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
const publicKey = requiredEnvironment("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

function client() {
  return createClient(projectUrl, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function signIn(email) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  fail(error, `No se pudo iniciar sesión con ${email}`);
  return supabase;
}

async function call(supabase, name, args, operation) {
  const { data, error } = await supabase.rpc(name, args);
  fail(error, operation);
  return data;
}

function reviewHistory(index, hasReferral) {
  const samples = [
    { bp: [112, 72], weight: 58, height: 1.62, diet: "ADEQUATE", activity: "YES", diagnosis: "Control preventivo sin hallazgos de alarma" },
    { bp: [118, 76], weight: 71, height: 1.74, diet: "REGULAR", activity: "YES", diagnosis: "Consejería de hábitos y control preventivo" },
    { bp: [110, 70], weight: 54, height: 1.59, diet: "ADEQUATE", activity: "YES", diagnosis: "Seguimiento de salud integral" },
    { bp: [122, 78], weight: 79, height: 1.76, diet: "REGULAR", activity: "NO", diagnosis: "Sobrepeso en seguimiento preventivo" },
  ][index % 4];

  return {
    schemaVersion: 1,
    sex: index % 2 ? "MASCULINO" : "FEMENINO",
    personalHistory: {
      pathological: index % 3 === 0 ? "Niega enfermedades crónicas." : "Sin antecedentes patológicos relevantes.",
      surgical: "Niega antecedentes quirúrgicos.",
      allergic: index % 4 === 1 ? "Niega alergias conocidas." : "Sin alergias medicamentosas conocidas.",
      regularMedications: "No usa medicación de forma regular.",
      familyRelevant: index % 3 === 0 ? "Antecedente familiar de hipertensión arterial." : "Sin antecedentes familiares de relevancia.",
    },
    habits: { diet: samples.diet, physicalActivity: samples.activity, tobacco: "NO", alcohol: index % 3 === 1 ? "YES" : "NO" },
    vitals: {
      bloodPressureSystolic: samples.bp[0], bloodPressureDiastolic: samples.bp[1], heartRate: 70 + (index % 6),
      respiratoryRate: 16, temperature: 36.5, oxygenSaturation: 98, weight: samples.weight, height: samples.height,
    },
    physicalExam: {
      generalState: "Paciente en buen estado general, consciente y orientado.",
      cardiopulmonary: "Ruidos cardiacos rítmicos; murmullo vesicular conservado.",
      abdomen: "Blando, depresible, no doloroso.",
      otherFindings: hasReferral ? "Se recomienda valoración especializada según motivo de derivación." : "Sin hallazgos clínicos relevantes.",
    },
    laboratory: { hemogram: "No requerido en este control.", bloodGroup: "No registrado", vdrl: "No solicitado", chagas: "No solicitado", coproparasitological: "No solicitado", other: "Sin estudios complementarios indicados." },
    conduct: { healthEducation: true, treatment: false, complementaryStudies: false, referral: hasReferral, medicalFollowUp: true, noObservations: false },
    observations: "Registro ficticio para demostración del historial clínico longitudinal.",
  };
}

function backgroundFromReview(history) {
  const status = (details) => {
    const value = details.trim();
    const entryStatus = /^(niega|sin |no usa|no refiere)/i.test(value) ? "NONE" : value ? "PRESENT" : "UNKNOWN";
    return { status: entryStatus, items: entryStatus === "PRESENT" ? [value] : [] };
  };
  return {
    schemaVersion: 1,
    allergies: status(history.personalHistory.allergic),
    personalConditions: status(history.personalHistory.pathological),
    surgeries: status(history.personalHistory.surgical),
    medications: status(history.personalHistory.regularMedications),
    familyHistory: status(history.personalHistory.familyRelevant),
    habits: history.habits,
  };
}

function ophthalmologyHistory() {
  return {
    schemaVersion: 1, specialtyCode: "OPHTHALMOLOGY",
    personalHistory: { pathological: "Sin enfermedades crónicas conocidas.", surgical: "Niega cirugías oculares.", allergic: "Sin alergias medicamentosas conocidas.", family: "Sin antecedentes oftalmológicos familiares de relevancia." },
    ophthalmology: { currentIllness: "Consulta por fatiga visual ocasional durante el estudio y uso prolongado de pantallas.", visualAcuityRight: "20/20", visualAcuityLeft: "20/20" },
    gynecology: {},
  };
}

function gynecologyHistory() {
  return {
    schemaVersion: 1, specialtyCode: "GYNECOLOGY",
    personalHistory: { pathological: "Sin antecedentes patológicos relevantes.", surgical: "Niega cirugías previas.", allergic: "Sin alergias medicamentosas conocidas.", family: "Sin antecedentes familiares de cáncer ginecológico o mamario." },
    ophthalmology: {},
    gynecology: {
      onset: "CHRONIC", symptoms: "Dismenorrea leve durante los dos primeros días de menstruación.", previousTreatments: "Medidas generales y analgésico ocasional con buena respuesta.",
      menarcheAge: 12, menstrualPattern: "REGULAR", cycleDays: 28, lastMenstrualPeriod: "2026-09-12", dysmenorrhea: "YES", leucorrhea: "NO", previousSti: "NO", stiDetails: "Niega ITS previas.",
      contraceptiveMethods: ["CONDOM"], contraceptiveOther: "", lastPap: "2025-10-15", papResult: "NORMAL", papDetails: "Citología previa normal.",
      familyGynecologicalCancer: false, familyBreastCancer: false, familyDiabetes: false, familyOther: "Sin otros antecedentes relevantes.",
      breastExam: "Sin lesiones palpables ni secreción anormal.", externalGenitalExam: "Sin alteraciones aparentes.", speculumExam: "Cuello uterino de aspecto conservado.", vaginalExam: "Sin dolor a la movilización cervical.", cervixExam: "Sin lesiones visibles.",
    },
  };
}

async function selectSlots(admin, staffId, specialtyId, count) {
  const afterTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  let query = admin
    .from("availability_slot")
    .select("id, starts_at, booked_count, capacity")
    .eq("staff_member_id", staffId)
    .eq("status", "PUBLISHED")
    .gte("starts_at", afterTomorrow)
    .order("starts_at")
    .limit(Math.max(count * 8, 20));
  query = specialtyId ? query.eq("specialty_id", specialtyId) : query.is("specialty_id", null);
  const { data, error } = await query;
  fail(error, "No se pudieron consultar los cupos publicados");
  const available = (data ?? []).filter((slot) => slot.booked_count < slot.capacity).slice(0, count);
  if (available.length < count) throw new Error(`No hay ${count} cupos futuros disponibles para completar la demostración.`);
  return available;
}

async function main() {
  const admin = await signIn(ADMIN_EMAIL);
  const { data: patients, error: patientsError } = await admin
    .from("patient")
    .select("id, carnet, given_names, family_names")
    .like("carnet", "TEST-%")
    .order("carnet");
  fail(patientsError, "No se pudieron leer los pacientes de demostración");
  if (!patients?.length) throw new Error("No existen pacientes TEST-* para poblar.");

  const { data: staff, error: staffError } = await admin
    .from("staff_member")
    .select("id, profile!inner(email)")
    .in("profile.email", [REVIEW_EMAIL, OPHTHALMOLOGY_EMAIL, GYNECOLOGY_EMAIL]);
  fail(staffError, "No se pudieron leer los profesionales de demostración");
  const staffByEmail = new Map(staff.map((row) => [row.profile.email, row.id]));
  for (const email of [REVIEW_EMAIL, OPHTHALMOLOGY_EMAIL, GYNECOLOGY_EMAIL]) {
    if (!staffByEmail.has(email)) throw new Error(`No se encontró el profesional ${email}. Ejecute primero create-test-users.mjs actualizado.`);
  }

  const { data: specialties, error: specialtiesError } = await admin.from("specialty").select("id, code").in("code", ["OPHTHALMOLOGY", "GYNECOLOGY"]);
  fail(specialtiesError, "No se pudieron leer las especialidades");
  const specialtyByCode = new Map(specialties.map((row) => [row.code, row.id]));
  if (!specialtyByCode.has("OPHTHALMOLOGY") || !specialtyByCode.has("GYNECOLOGY")) throw new Error("Faltan las especialidades de oftalmología o ginecología.");

  const historyReader = await signIn(REVIEW_EMAIL);
  const { data: existing, error: existingError } = await historyReader.from("clinical_encounter").select("patient_id, chief_complaint").like("chief_complaint", `${MARKER}%`);
  fail(existingError, "No se pudieron verificar los datos de demostración existentes");
  const alreadySeeded = new Set(existing.filter((row) => row.chief_complaint?.startsWith(MARKER)).map((row) => row.patient_id));
  const candidates = patients.filter((patient) => !alreadySeeded.has(patient.id));
  const { data: activeInitialAppointments, error: activeInitialError } = await admin
    .from("appointment")
    .select("id, patient_id, status, assigned_staff_id")
    .eq("appointment_type", "INITIAL")
    .in("status", ["SCHEDULED", "CHECKED_IN"])
    .eq("assigned_staff_id", staffByEmail.get(REVIEW_EMAIL));
  fail(activeInitialError, "No se pudieron leer las citas de revisión activas");
  const activeAppointmentByPatient = new Map(activeInitialAppointments.map((appointment) => [appointment.patient_id, appointment]));

  const { data: pendingInitialRequests, error: pendingInitialError } = await admin
    .from("appointment_request")
    .select("patient_id")
    .eq("appointment_type", "INITIAL")
    .eq("status", "PENDING");
  fail(pendingInitialError, "No se pudieron leer las solicitudes de revisión pendientes");
  const pendingPatientIds = new Set(pendingInitialRequests.map((request) => request.patient_id));

  const patientsToCreate = candidates.filter((patient) => !activeAppointmentByPatient.has(patient.id) && !pendingPatientIds.has(patient.id));
  const reviewSlots = patientsToCreate.length ? await selectSlots(admin, staffByEmail.get(REVIEW_EMAIL), null, patientsToCreate.length) : [];
  const reviewAppointments = candidates
    .filter((patient) => activeAppointmentByPatient.has(patient.id))
    .map((patient) => ({ patient, appointmentId: activeAppointmentByPatient.get(patient.id).id }));

  for (let index = 0; index < patientsToCreate.length; index += 1) {
    const patient = patientsToCreate[index];
    const requestId = await call(admin, "rpc_create_appointment_request_for_patient", { p_patient_id: patient.id, p_appointment_type: "INITIAL", p_referral_id: null, p_specialty_id: null }, `No se pudo crear la solicitud de ${patient.carnet}`);
    const appointmentId = await call(admin, "rpc_assign_appointment_request", { p_request_id: requestId, p_slot_id: reviewSlots[index].id }, `No se pudo asignar la cita de ${patient.carnet}`);
    await call(admin, "rpc_check_in_appointment", { p_appointment_id: appointmentId }, `No se pudo registrar el check-in de ${patient.carnet}`);
    reviewAppointments.push({ patient, appointmentId });
  }

  reviewAppointments.sort((left, right) => left.patient.carnet.localeCompare(right.patient.carnet));

  const reviewer = historyReader;
  const referrals = [];
  for (const [index, item] of reviewAppointments.entries()) {
    const needsReferral = index < 4;
    const specialtyCode = index % 2 === 0 ? "OPHTHALMOLOGY" : "GYNECOLOGY";
    const encounterId = await call(reviewer, "rpc_open_encounter", { p_patient_id: item.patient.id, p_appointment_id: item.appointmentId, p_referral_id: null, p_chief_complaint: "Pendiente de entrevista clínica." }, `No se pudo abrir la atención de ${item.patient.carnet}`);
    const history = reviewHistory(index, needsReferral);
    const background = await call(reviewer, "rpc_get_clinical_background", { p_patient_id: item.patient.id, p_encounter_id: encounterId }, `No se pudieron consultar los antecedentes de ${item.patient.carnet}`);
    if (!background?.current) {
      await call(reviewer, "rpc_save_clinical_background", { p_patient_id: item.patient.id, p_data: backgroundFromReview(history), p_expected_version: 0, p_encounter_id: encounterId, p_change_reason: "Carga inicial de datos ficticios longitudinales" }, `No se pudieron crear los antecedentes de ${item.patient.carnet}`);
    }
    const result = await call(reviewer, "rpc_finalize_initial_encounter", {
      p_encounter_id: encounterId,
      p_chief_complaint: `${MARKER} · control ${index + 1}`,
      p_assessment: [
        "Control preventivo; signos vitales dentro de parámetros esperados.",
        "Se brinda consejería de hábitos saludables y control periódico.",
        "Sin signos de alarma en esta valoración clínica.",
        "Se identifican hábitos a reforzar con seguimiento ambulatorio.",
      ][index % 4],
      p_instructions: "Mantener hidratación, alimentación equilibrada y actividad física regular según tolerancia.",
      p_follow_up_text: "Control médico preventivo anual o antes si aparecen síntomas.",
      p_blood_chemistry_status: "NOT_PRESENTED",
      p_diagnosis_text: ["Control preventivo sin hallazgos de alarma", "Consejería de hábitos saludables", "Seguimiento de salud integral", "Sobrepeso en seguimiento preventivo"][index % 4],
      p_referral_specialty_id: needsReferral ? specialtyByCode.get(specialtyCode) : null,
      p_referral_reason: needsReferral ? (specialtyCode === "OPHTHALMOLOGY" ? "Fatiga visual asociada a uso prolongado de pantallas." : "Dismenorrea leve de evolución crónica para valoración ginecológica.") : null,
      p_referral_comment: needsReferral ? "Paciente estable; se deriva para valoración no urgente y continuidad de manejo." : null,
      p_referral_priority: "ROUTINE",
      p_review_history: history,
    }, `No se pudo finalizar la atención de ${item.patient.carnet}`);
    if (needsReferral && result?.referralId) referrals.push({ patient: item.patient, referralId: result.referralId, specialtyCode });
  }

  const patientsById = new Map(patients.map((patient) => [patient.id, patient]));
  const { data: testReferrals, error: referralReadError } = await historyReader
    .from("referral")
    .select("id, patient_id, source_encounter_id, specialty_id, status")
    .in("patient_id", patients.map((patient) => patient.id))
    .in("status", ["PENDING_ASSIGNMENT", "ASSIGNED"]);
  fail(referralReadError, "No se pudieron leer las derivaciones de demostración");
  const sourceEncounterIds = [...new Set(testReferrals.map((referral) => referral.source_encounter_id).filter(Boolean))];
  if (sourceEncounterIds.length) {
    const { data: sources, error: sourcesError } = await historyReader.from("clinical_encounter").select("id, chief_complaint").in("id", sourceEncounterIds);
    fail(sourcesError, "No se pudieron verificar las atenciones de origen");
    const demoSourceIds = new Set(sources.filter((source) => source.chief_complaint?.startsWith(MARKER)).map((source) => source.id));
    for (const referral of testReferrals) {
      const specialtyCode = [...specialtyByCode.entries()].find(([, id]) => id === referral.specialty_id)?.[0];
      const patient = patientsById.get(referral.patient_id);
      if (demoSourceIds.has(referral.source_encounter_id) && specialtyCode && patient && !referrals.some((item) => item.referralId === referral.id)) {
        referrals.push({ patient, referralId: referral.id, specialtyCode });
      }
    }
  }

  const specialtiesToClose = ["OPHTHALMOLOGY", "GYNECOLOGY"];
  for (const specialtyCode of specialtiesToClose) {
    const cases = referrals.filter((item) => item.specialtyCode === specialtyCode);
    if (!cases.length) continue;
    const specialistEmail = specialtyCode === "OPHTHALMOLOGY" ? OPHTHALMOLOGY_EMAIL : GYNECOLOGY_EMAIL;
    const slots = await selectSlots(admin, staffByEmail.get(specialistEmail), specialtyByCode.get(specialtyCode), cases.length);
    const specialistAppointments = [];
    for (let index = 0; index < cases.length; index += 1) {
      const item = cases[index];
      const requestId = await call(admin, "rpc_create_appointment_request_for_patient", { p_patient_id: item.patient.id, p_appointment_type: "REFERRAL", p_referral_id: item.referralId, p_specialty_id: null }, `No se pudo crear la solicitud de especialidad de ${item.patient.carnet}`);
      const appointmentId = await call(admin, "rpc_assign_appointment_request", { p_request_id: requestId, p_slot_id: slots[index].id }, `No se pudo asignar la especialidad de ${item.patient.carnet}`);
      await call(admin, "rpc_check_in_appointment", { p_appointment_id: appointmentId }, `No se pudo registrar el check-in especializado de ${item.patient.carnet}`);
      specialistAppointments.push({ ...item, appointmentId });
    }

    const specialist = await signIn(specialistEmail);
    for (const item of specialistAppointments) {
      const encounterId = await call(specialist, "rpc_open_encounter", { p_patient_id: item.patient.id, p_appointment_id: item.appointmentId, p_referral_id: item.referralId, p_chief_complaint: "Pendiente de entrevista clínica." }, `No se pudo abrir la especialidad de ${item.patient.carnet}`);
      const isEye = specialtyCode === "OPHTHALMOLOGY";
      await call(specialist, "rpc_finalize_specialty_encounter", {
        p_encounter_id: encounterId,
        p_chief_complaint: isEye ? "Fatiga visual ocasional durante actividades académicas." : "Dismenorrea leve de evolución crónica.",
        p_assessment: isEye ? "Valoración oftalmológica sin alteraciones funcionales relevantes; se refuerzan medidas de higiene visual." : "Valoración ginecológica sin hallazgos de alarma; se indica manejo conservador y seguimiento.",
        p_instructions: isEye ? "Pausas visuales 20-20-20, iluminación adecuada y control si presenta disminución visual." : "Medidas generales, registro de síntomas y consulta antes si aumenta el dolor.",
        p_follow_up_text: "Control por especialidad en seis meses o antes según evolución.",
        p_diagnosis_text: isEye ? "Astenopia asociada a pantallas" : "Dismenorrea primaria",
        p_specialty_history: isEye ? ophthalmologyHistory() : gynecologyHistory(),
      }, `No se pudo finalizar la especialidad de ${item.patient.carnet}`);
    }
  }

  console.log(`Se agregaron ${reviewAppointments.length} revisiones y ${referrals.length} atenciones de especialidad de demostración.`);
}

main().catch((error) => {
  console.error(`Seed longitudinal falló: ${error.message}`);
  process.exitCode = 1;
});
