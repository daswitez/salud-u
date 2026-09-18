export type CareerOption = { id: string; code: string; name: string };

export type AdministrativePatient = {
  id: string;
  carnet: string;
  registrationCode: string;
  fullName: string;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  academicStatus: "ACTIVE" | "INACTIVE" | "GRADUATED" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
  career: CareerOption | null;
  enrollment: { id: string; academicPeriod: string; startedOn: string; status: string } | null;
};

export async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const payload = await response.json().catch(() => ({ ok: false, error: "Respuesta inválida del servidor." }));
  if (!response.ok || !payload.ok) throw new Error(payload.error ?? "No se pudo completar la operación.");
  return payload.data as T;
}
