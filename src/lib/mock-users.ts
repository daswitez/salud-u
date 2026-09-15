export type MockRole = "estudiante" | "medico" | "administrativo";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  role: MockRole;
  passwordHint: string;
};

export const MOCK_USERS: MockUser[] = [
  { id: "U-EST-001", name: "Daniela Rojas", email: "daniela.rojas@demo.com", role: "estudiante", passwordHint: "Demo2026!" },
  { id: "U-MED-001", name: "Dra. Valeria Mendoza", email: "valeria.mendoza@demo.com", role: "medico", passwordHint: "Demo2026!" },
  { id: "U-ADM-001", name: "María Fernández", email: "maria.fernandez@demo.com", role: "administrativo", passwordHint: "Demo2026!" },
];

export function findMockUser(email: string) {
  return MOCK_USERS.find((user) => user.email.toLowerCase() === email.trim().toLowerCase());
}
