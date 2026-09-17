import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ClinicalRole } from "@/lib/ui-contracts";

export type AppRole = "estudiante" | "medico" | "administrativo";

export type DemoSession = {
  email: string;
  name: string;
  role: AppRole;
  clinicalRole: ClinicalRole;
  notifications: { appointments: boolean; waitlist: boolean; changes: boolean };
};

const SESSION_COOKIE = "salud_universitaria_demo_session";

function areaForClinicalRole(role: ClinicalRole): AppRole {
  if (role === "STUDENT") return "estudiante";
  if (role === "ADMINISTRATIVE") return "administrativo";
  return "medico";
}

function clinicalRoleForArea(role: AppRole): ClinicalRole {
  if (role === "estudiante") return "STUDENT";
  if (role === "administrativo") return "ADMINISTRATIVE";
  return "REVIEW_DOCTOR";
}

function defaultName(role: ClinicalRole) {
  if (role === "STUDENT") return "Daniela Rojas";
  if (role === "ADMINISTRATIVE") return "María Fernández";
  if (role === "SPECIALIST") return "Dra. Sofía Álvarez";
  return "Dra. Valeria Mendoza";
}

function normalizeSession(value: Partial<DemoSession>): DemoSession | null {
  if (!value.email || !value.name || !value.role) return null;
  const role = value.role as AppRole;
  if (!["estudiante", "medico", "administrativo"].includes(role)) return null;
  const clinicalRole = value.clinicalRole ?? clinicalRoleForArea(role);
  return {
    email: value.email,
    name: value.name,
    role: areaForClinicalRole(clinicalRole),
    clinicalRole,
    notifications: value.notifications ?? { appointments: true, waitlist: false, changes: true },
  };
}

export async function getSession(): Promise<DemoSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    return normalizeSession(JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<DemoSession>);
  } catch {
    return null;
  }
}

export async function requireRole(role: AppRole) {
  const session = await getSession();
  if (!session) redirect("/iniciar-sesion?error=session");
  if (session.role !== role) redirect(`/${session.role}`);
  return session;
}

export async function requireClinicalRole(...allowedRoles: ClinicalRole[]) {
  const session = await getSession();
  if (!session) redirect("/iniciar-sesion?error=session");
  if (!allowedRoles.includes(session.clinicalRole)) redirect(`/${session.role}`);
  return session;
}

export async function writeSession(session: DemoSession, remember = false) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, Buffer.from(JSON.stringify(session)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 14 : 60 * 60 * 8,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function createDemoSession(email: string, clinicalRole: ClinicalRole, name = defaultName(clinicalRole)): DemoSession {
  return {
    email,
    name,
    role: areaForClinicalRole(clinicalRole),
    clinicalRole,
    notifications: { appointments: true, waitlist: false, changes: true },
  };
}
