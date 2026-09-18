import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

function loadLocalEnvironment() {
  const environmentFile = resolve(".env.local");

  if (!existsSync(environmentFile)) {
    return;
  }

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

function assertNoError(error, operation) {
  if (error) {
    throw new Error(`${operation}: ${error.message}`);
  }
}

loadLocalEnvironment();

const projectUrl = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
const secretKey = requiredEnvironment("SUPABASE_SECRET_KEY");
// Sólo para cuentas ficticias locales. En producción siempre defina TEST_USERS_PASSWORD.
const password = process.env.TEST_USERS_PASSWORD || "SaludDemo2026!";

if (password.length < 12) {
  throw new Error("TEST_USERS_PASSWORD debe tener por lo menos 12 caracteres.");
}

const supabase = createClient(projectUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Se pueden cambiar estos correos antes de ejecutar. No use correos de pacientes reales.
const users = [
  { key: "admin", email: "admin.demo@salud-universitaria.test", name: "Administración Demo", role: "ADMINISTRATIVE" },
  { key: "reviewOne", email: "revision.ana.demo@salud-universitaria.test", name: "Dra. Ana Revisión Demo", role: "REVIEW_DOCTOR", employeeCode: "TEST-REV-001" },
  { key: "reviewTwo", email: "revision.carlos.demo@salud-universitaria.test", name: "Dr. Carlos Revisión Demo", role: "REVIEW_DOCTOR", employeeCode: "TEST-REV-002" },
  { key: "reviewThree", email: "revision.elena.demo@salud-universitaria.test", name: "Dra. Elena Revisión Demo", role: "REVIEW_DOCTOR", employeeCode: "TEST-REV-003" },
  { key: "dermatology", email: "dermatologia.demo@salud-universitaria.test", name: "Dra. Dermatología Demo", role: "SPECIALIST", employeeCode: "TEST-DER-001", specialty: "DERMATOLOGY" },
  { key: "ophthalmology", email: "oftalmologia.demo@salud-universitaria.test", name: "Dr. Oftalmología Demo", role: "SPECIALIST", employeeCode: "TEST-OFT-001", specialty: "OPHTHALMOLOGY" },
  { key: "internalMedicine", email: "interna.demo@salud-universitaria.test", name: "Dra. Medicina Interna Demo", role: "SPECIALIST", employeeCode: "TEST-INT-001", specialty: "INTERNAL_MEDICINE" },
  { key: "urology", email: "urologia.demo@salud-universitaria.test", name: "Dr. Urología Demo", role: "SPECIALIST", employeeCode: "TEST-URO-001", specialty: "UROLOGY" },
  { key: "student01", email: "estudiante.ana.demo@salud-universitaria.test", name: "Ana Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-001", registrationCode: "REG-TEST-001", givenNames: "Ana", familyNames: "Estudiante Demo" },
  { key: "student02", email: "estudiante.luis.demo@salud-universitaria.test", name: "Luis Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-002", registrationCode: "REG-TEST-002", givenNames: "Luis", familyNames: "Estudiante Demo" },
  { key: "student03", email: "estudiante.sofia.demo@salud-universitaria.test", name: "Sofía Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-003", registrationCode: "REG-TEST-003", givenNames: "Sofía", familyNames: "Estudiante Demo" },
  { key: "student04", email: "estudiante.diego.demo@salud-universitaria.test", name: "Diego Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-004", registrationCode: "REG-TEST-004", givenNames: "Diego", familyNames: "Estudiante Demo" },
  { key: "student05", email: "estudiante.valeria.demo@salud-universitaria.test", name: "Valeria Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-005", registrationCode: "REG-TEST-005", givenNames: "Valeria", familyNames: "Estudiante Demo" },
  { key: "student06", email: "estudiante.mateo.demo@salud-universitaria.test", name: "Mateo Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-006", registrationCode: "REG-TEST-006", givenNames: "Mateo", familyNames: "Estudiante Demo" },
  { key: "student07", email: "estudiante.camila.demo@salud-universitaria.test", name: "Camila Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-007", registrationCode: "REG-TEST-007", givenNames: "Camila", familyNames: "Estudiante Demo" },
  { key: "student08", email: "estudiante.jose.demo@salud-universitaria.test", name: "José Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-008", registrationCode: "REG-TEST-008", givenNames: "José", familyNames: "Estudiante Demo" },
  { key: "student09", email: "estudiante.maria.demo@salud-universitaria.test", name: "María Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-009", registrationCode: "REG-TEST-009", givenNames: "María", familyNames: "Estudiante Demo" },
  { key: "student10", email: "estudiante.andres.demo@salud-universitaria.test", name: "Andrés Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-010", registrationCode: "REG-TEST-010", givenNames: "Andrés", familyNames: "Estudiante Demo" },
  { key: "student11", email: "estudiante.laura.demo@salud-universitaria.test", name: "Laura Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-011", registrationCode: "REG-TEST-011", givenNames: "Laura", familyNames: "Estudiante Demo" },
  { key: "student12", email: "estudiante.pablo.demo@salud-universitaria.test", name: "Pablo Estudiante Demo", role: "STUDENT", carnet: "TEST-2026-012", registrationCode: "REG-TEST-012", givenNames: "Pablo", familyNames: "Estudiante Demo" },
];

async function findOrCreateAuthUser(definition) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  assertNoError(listError, `No se pudo buscar ${definition.email}`);

  const existing = listed.users.find((user) => user.email === definition.email);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email: definition.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: definition.name, seeded_for_testing: true },
  });
  assertNoError(error, `No se pudo crear ${definition.email}`);

  return data.user;
}

async function main() {
  const authUsers = new Map();

  for (const definition of users) {
    const user = await findOrCreateAuthUser(definition);
    authUsers.set(definition.key, user);
  }

  const profiles = users.map((definition) => ({
    id: authUsers.get(definition.key).id,
    email: definition.email,
    display_name: definition.name,
    status: "ACTIVE",
  }));
  const { error: profileError } = await supabase.from("profile").upsert(profiles, { onConflict: "id" });
  assertNoError(profileError, "No se pudieron sincronizar perfiles");

  const adminId = authUsers.get("admin").id;
  const profileIds = profiles.map((profile) => profile.id);
  const { data: currentRoles, error: roleReadError } = await supabase
    .from("profile_role")
    .select("profile_id, role_code")
    .in("profile_id", profileIds)
    .is("revoked_at", null);
  assertNoError(roleReadError, "No se pudieron consultar roles existentes");

  const currentRoleKeys = new Set(currentRoles.map((role) => `${role.profile_id}:${role.role_code}`));
  const rolesToInsert = users
    .filter((definition) => !currentRoleKeys.has(`${authUsers.get(definition.key).id}:${definition.role}`))
    .map((definition) => ({
      profile_id: authUsers.get(definition.key).id,
      role_code: definition.role,
      granted_by: adminId,
    }));
  if (rolesToInsert.length) {
    const { error } = await supabase.from("profile_role").insert(rolesToInsert);
    assertNoError(error, "No se pudieron asignar roles");
  }

  const clinicians = users.filter((definition) => definition.employeeCode);
  const { data: staffRows, error: staffError } = await supabase
    .from("staff_member")
    .upsert(
      clinicians.map((definition) => ({
        profile_id: authUsers.get(definition.key).id,
        employee_code: definition.employeeCode,
        professional_license: `LIC-${definition.employeeCode}`,
        is_active: true,
      })),
      { onConflict: "profile_id" },
    )
    .select("id, profile_id");
  assertNoError(staffError, "No se pudieron crear profesionales");
  const staffByProfile = new Map(staffRows.map((staff) => [staff.profile_id, staff.id]));

  const { data: specialties, error: specialtyError } = await supabase
    .from("specialty")
    .select("id, code")
    .in("code", clinicians.filter((clinician) => clinician.specialty).map((clinician) => clinician.specialty));
  assertNoError(specialtyError, "No se pudieron consultar especialidades");
  const specialtyByCode = new Map(specialties.map((specialty) => [specialty.code, specialty.id]));

  for (const clinician of clinicians.filter((item) => item.specialty)) {
    const staffMemberId = staffByProfile.get(authUsers.get(clinician.key).id);
    const specialtyId = specialtyByCode.get(clinician.specialty);
    const { data: existing, error: existingError } = await supabase
      .from("staff_specialty")
      .select("staff_member_id")
      .eq("staff_member_id", staffMemberId)
      .eq("specialty_id", specialtyId)
      .is("active_to", null)
      .maybeSingle();
    assertNoError(existingError, `No se pudo revisar especialidad de ${clinician.email}`);

    if (!existing) {
      const { error } = await supabase.from("staff_specialty").insert({
        staff_member_id: staffMemberId,
        specialty_id: specialtyId,
        is_primary: true,
      });
      assertNoError(error, `No se pudo asignar especialidad a ${clinician.email}`);
    }
  }

  const { data: career, error: careerError } = await supabase
    .from("career")
    .upsert({ code: "TEST-CAREER", name: "Carrera de prueba", is_active: true }, { onConflict: "code" })
    .select("id")
    .single();
  assertNoError(careerError, "No se pudo crear la carrera de prueba");

  const students = users.filter((definition) => definition.role === "STUDENT");
  const { data: patients, error: patientError } = await supabase
    .from("patient")
    .upsert(
      students.map((student, index) => ({
        profile_id: authUsers.get(student.key).id,
        carnet: student.carnet,
        carnet_normalized: student.carnet,
        registration_code: student.registrationCode,
        registration_code_normalized: student.registrationCode,
        given_names: student.givenNames,
        family_names: student.familyNames,
        birth_date: index === 0 ? "2003-05-12" : "2002-11-24",
        email: student.email,
        created_by: adminId,
        updated_by: adminId,
      })),
      { onConflict: "profile_id" },
    )
    .select("id, profile_id");
  assertNoError(patientError, "No se pudieron crear pacientes de prueba");

  const patientByProfile = new Map(patients.map((patient) => [patient.profile_id, patient.id]));
  const histories = patients.map((patient) => ({ patient_id: patient.id, opened_by: adminId }));
  const { error: historyError } = await supabase.from("clinical_history").upsert(histories, { onConflict: "patient_id" });
  assertNoError(historyError, "No se pudieron crear historias clínicas");

  const enrollments = students.map((student) => ({
    patient_id: patientByProfile.get(authUsers.get(student.key).id),
    career_id: career.id,
    academic_period: "2026-2",
    started_on: "2026-07-01",
    status: "ACTIVE",
    source: "TEST_SEED",
  }));
  const { error: enrollmentError } = await supabase
    .from("academic_enrollment")
    .upsert(enrollments, { onConflict: "patient_id,career_id,academic_period" });
  assertNoError(enrollmentError, "No se pudieron crear matrículas de prueba");

  console.log("Cuentas de prueba listas:");
  for (const definition of users) {
    console.log(`- ${definition.role}: ${definition.email} (${authUsers.get(definition.key).id})`);
  }
  console.log("Contraseña de prueba: SaludDemo2026! (o el valor de TEST_USERS_PASSWORD si lo definiste).");
}

main().catch((error) => {
  console.error(`Seed falló: ${error.message}`);
  process.exitCode = 1;
});
