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
};

type MePayload = {
  ok?: boolean;
  user?: AppSession;
};

function isClinicalRole(value: unknown): value is ClinicalRole {
  return typeof value === "string" && ["ADMINISTRATIVE", "REPORTING_OFFICER", "REVIEW_DOCTOR", "SPECIALIST", "STUDENT", "AUDITOR"].includes(value);
}

function isAppRole(value: unknown): value is AppRole {
  return value === "estudiante" || value === "medico" || value === "administrativo";
}

/** Spring o PostgreSQL no responden: no es una sesión vencida y lo muestra el límite de error con reintento. */
export class BackendUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("El servicio no está disponible en este momento.", { cause });
    this.name = "BackendUnavailableError";
  }
}

/** Obtiene la identidad vigente desde Spring usando la cookie HttpOnly entrante. */
export async function getSession(): Promise<AppSession | null> {
  let response: Response;
  try {
    response = await backendServerFetch("/api/me");
  } catch (cause) {
    // fetch sólo lanza TypeError ante fallas de red; el resto (p. ej. señales internas de Next) se propaga intacto.
    if (cause instanceof TypeError) throw new BackendUnavailableError(cause);
    throw cause;
  }

  if (response.status >= 500) throw new BackendUnavailableError(response.status);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as MePayload | null;
  const user = payload?.user;
  if (!payload?.ok || !user || typeof user.id !== "string" || typeof user.email !== "string" || typeof user.name !== "string" || !isAppRole(user.role) || !isClinicalRole(user.clinicalRole)) {
    return null;
  }

  return user;
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

/** Consulta la autoridad vigente completa cuando el caso admite usuarios con varios roles. */
export async function hasClinicalAuthority(role: ClinicalRole): Promise<boolean> {
  let response: Response;
  try {
    response = await backendServerFetch("/api/v1/session");
  } catch (cause) {
    if (cause instanceof TypeError) throw new BackendUnavailableError(cause);
    throw cause;
  }
  if (response.status >= 500) throw new BackendUnavailableError(response.status);
  if (!response.ok) return false;
  const body = await response.json().catch(() => null);
  return body?.ok === true && Array.isArray(body.data?.authorities) && body.data.authorities.includes(`ROLE_${role}`);
}
