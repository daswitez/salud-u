import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AppRole = "estudiante" | "medico" | "administrativo";

export type DemoSession = {
  email: string;
  name: string;
  role: AppRole;
  notifications: { appointments: boolean; waitlist: boolean; changes: boolean };
};

const SESSION_COOKIE = "salud_universitaria_demo_session";

function defaultName(role: AppRole) {
  return role === "estudiante" ? "Daniela Rojas" : role === "medico" ? "Dra. Valeria Mendoza" : "María Fernández";
}

export async function getSession(): Promise<DemoSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as DemoSession;
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

export function createDemoSession(email: string, role: AppRole, name = defaultName(role)): DemoSession {
  return {
    email,
    name,
    role,
    notifications: { appointments: true, waitlist: true, changes: true },
  };
}
