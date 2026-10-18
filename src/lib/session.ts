import "server-only";

import { redirect } from "next/navigation";

import { backendServerFetch } from "@/lib/api/server";
import type { ClinicalRole } from "@/lib/ui-contracts";

export type AppRole = "estudiante" | "medico" | "administrativo";

export type AppSession = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  clinicalRole: ClinicalRole;
  notifications: { appointments: boolean; waitlist: boolean; changes: boolean };
};

type MePayload = {
  ok?: boolean;
  user?: Omit<AppSession, "notifications">;
};

function isClinicalRole(value: unknown): value is ClinicalRole {
  return typeof value === "string" && ["ADMINISTRATIVE", "REPORTING_OFFICER", "REVIEW_DOCTOR", "SPECIALIST", "STUDENT", "AUDITOR"].includes(value);
}

function isAppRole(value: unknown): value is AppRole {
  return value === "estudiante" || value === "medico" || value === "administrativo";
}

/** Obtiene la identidad vigente desde Spring usando la cookie HttpOnly entrante. */
export async function getSession(): Promise<AppSession | null> {
  let response: Response;
  try {
    response = await backendServerFetch("/api/me");
  } catch {
    return null;
  }

  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as MePayload | null;
  const user = payload?.user;
  if (!payload?.ok || !user || typeof user.id !== "string" || typeof user.email !== "string" || typeof user.name !== "string" || !isAppRole(user.role) || !isClinicalRole(user.clinicalRole)) {
    return null;
  }

  return {
    ...user,
    notifications: { appointments: true, waitlist: false, changes: true },
  };
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
