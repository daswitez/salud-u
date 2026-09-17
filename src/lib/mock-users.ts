import type { ClinicalRole } from "@/lib/ui-contracts";

export type MockRole = "estudiante" | "medico" | "administrativo";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  role: MockRole;
  clinicalRole: ClinicalRole;
  passwordHint: string;
};

export const MOCK_USERS: MockUser[] = [
  { id: "U-EST-001", name: "Daniela Rojas", email: "daniela.rojas@demo.com", role: "estudiante", clinicalRole: "STUDENT", passwordHint: "Demo2026!" },
  { id: "U-REV-001", name: "Dra. Valeria Mendoza", email: "valeria.mendoza@demo.com", role: "medico", clinicalRole: "REVIEW_DOCTOR", passwordHint: "Demo2026!" },
  { id: "U-ESP-001", name: "Dra. Sofía Álvarez", email: "sofia.alvarez@demo.com", role: "medico", clinicalRole: "SPECIALIST", passwordHint: "Demo2026!" },
  { id: "U-ADM-001", name: "María Fernández", email: "maria.fernandez@demo.com", role: "administrativo", clinicalRole: "ADMINISTRATIVE", passwordHint: "Demo2026!" },
];

export function findMockUser(email: string) {
  return MOCK_USERS.find((user) => user.email.toLowerCase() === email.trim().toLowerCase());
}
