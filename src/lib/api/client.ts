import type { EmergencyContact, PatientSex } from "@/lib/emergency-contact";
import { clinicalPayload } from "@/lib/clinical-json";

export type CareerOption = { id: string; code: string; name: string };

export type AdministrativePatient = {
  id: string;
  carnet: string;
  registrationCode: string;
  fullName: string;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  sex?: PatientSex | null;
  emergencyContact?: EmergencyContact | null;
  academicStatus: "ACTIVE" | "INACTIVE" | "GRADUATED" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
  career: CareerOption | null;
  enrollment: { id: string; academicPeriod: string; startedOn: string; status: string } | null;
};

export type MedicalAppointment = {
  id: string;
  appointmentType: "INITIAL" | "REFERRAL" | "SPECIALTY";
  status: "SCHEDULED" | "CHECKED_IN" | "CANCELLED" | "NO_SHOW" | "ATTENDED";
  scheduledFor: string;
  checkedInAt: string | null;
  endsAt: string | null;
  specialty: string;
  specialtyCode: string | null;
  encounter?: { id: string; status: "DRAFT" | "CLOSED" | "VOIDED" } | null;
  patient: {
    id: string;
    carnet: string;
    registrationCode: string;
    fullName: string;
    birthDate: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

type VersionedError = { code?: string; message?: string; requestId?: string };
type ApiPayload = { ok?: boolean; data?: unknown; error?: unknown; code?: string };

type CsrfToken = { token: string; headerName: string };

export type BackendHealth = {
  ok: boolean;
  service: "backend";
  status: string;
  error: "backend_unavailable" | null;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

let csrfToken: CsrfToken | null = null;
let csrfRequest: Promise<CsrfToken> | null = null;

function isMutation(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
}

function isFormData(body: BodyInit | null | undefined) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function errorFromPayload(status: number, payload: ApiPayload): ApiRequestError {
  if (typeof payload.error === "string") {
    return new ApiRequestError(payload.error, status, payload.code);
  }
  if (payload.error && typeof payload.error === "object") {
    const error = payload.error as VersionedError;
    return new ApiRequestError(error.message ?? "No se pudo completar la operación.", status, error.code, error.requestId);
  }
  return new ApiRequestError("Respuesta inválida del servidor.", status);
}

async function jsonPayload(response: Response): Promise<ApiPayload> {
  return response.json().catch(() => ({ ok: false, error: "Respuesta inválida del servidor." }));
}

async function getCsrfToken(refresh = false): Promise<CsrfToken> {
  if (!refresh && csrfToken) return csrfToken;
  if (!refresh && csrfRequest) return csrfRequest;

  const request = fetch("/api/v1/security/csrf", {
    credentials: "same-origin",
    cache: "no-store",
  }).then(async (response) => {
    const payload = await jsonPayload(response);
    if (!response.ok || !payload.ok || !payload.data || typeof payload.data !== "object") {
      throw errorFromPayload(response.status, payload);
    }
    const data = payload.data as Partial<CsrfToken>;
    if (!data.token || !data.headerName) {
      throw new ApiRequestError("El servidor no devolvió un token CSRF válido.", response.status);
    }
    csrfToken = { token: data.token, headerName: data.headerName };
    return csrfToken;
  });

  csrfRequest = request;
  try {
    return await request;
  } finally {
    if (csrfRequest === request) csrfRequest = null;
  }
}

async function requestJson<T>(url: string, options?: RequestInit, retryCsrf = true, envelope = false): Promise<T> {
  const method = (options?.method ?? "GET").toUpperCase();
  const headers = new Headers(options?.headers);
  if (options?.body && !isFormData(options.body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (isMutation(method)) {
    const csrf = await getCsrfToken();
    headers.set(csrf.headerName, csrf.token);
  }

  const response = await fetch(url, {
    ...options,
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers,
  });
  const payload = await jsonPayload(response);
  if (response.status === 403 && retryCsrf && (response.headers.get("X-Error-Code") === "CSRF_INVALID" || errorFromPayload(response.status, payload).code === "CSRF_INVALID")) {
    csrfToken = null;
    await getCsrfToken(true);
    return requestJson<T>(url, options, false, envelope);
  }
  if (!response.ok || !payload.ok) throw errorFromPayload(response.status, payload);
  return (envelope ? payload : payload.data) as T;
}

/** Client-side JSON request with same-origin cookies, CSRF and both error contracts. */
export function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const background = /\/api\/medical\/patients\/[^/]+\/clinical-background(?:\?|$)/.test(url);
  const finalize = /\/api\/medical\/encounters\/[^/]+\/finalize(?:\?|$)/.test(url);
  let request = options;
  if ((background || finalize) && typeof options?.body === "string") {
    request = { ...options, body: JSON.stringify(clinicalPayload(JSON.parse(options.body), true, background)) };
  }
  return requestJson<unknown>(url, request).then(data =>
    (url.startsWith("/api/medical/") || url.startsWith("/api/reports/clinical") ? clinicalPayload(data, false, background) : data) as T);
}

/** Preserve top-level metadata such as report filters/presentation. */
export function apiEnvelope<T>(url: string, options?: RequestInit): Promise<T> {
  return requestJson<unknown>(url, options, true, true).then(payload => clinicalPayload(payload, false) as T);
}

/** Private binary GET with the same session and error contracts as JSON requests. */
export async function apiFile(url: string, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", signal });
  if (!response.ok) throw errorFromPayload(response.status, await jsonPayload(response));
  return response;
}

/** Binary requests share cookies, CSRF and both error contracts. CSRF retry occurs before business execution only. */
export async function apiBinary(url: string, options: RequestInit, retryCsrf = true): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase(), headers = new Headers(options.headers);
  if (options.body && !isFormData(options.body)) headers.set("Content-Type", "application/json");
  if (isMutation(method)) { const csrf = await getCsrfToken(); headers.set(csrf.headerName, csrf.token); }
  const response = await fetch(url, { ...options, method, headers, credentials: "same-origin", cache: "no-store" });
  if (response.ok) return response;
  const error = errorFromPayload(response.status, await jsonPayload(response));
  if (response.status === 403 && retryCsrf && (response.headers.get("X-Error-Code") === "CSRF_INVALID" || error.code === "CSRF_INVALID")) {
    csrfToken = null; await getCsrfToken(true); return apiBinary(url, options, false);
  }
  throw error;
}

/** Health is intentionally not an ApiEnvelope: it is the public Spring probe. */
export async function backendHealth(): Promise<BackendHealth> {
  const response = await fetch("/api/health", { credentials: "same-origin", cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    throw new ApiRequestError("Respuesta inválida del servidor.", response.status);
  }
  const health = payload as Partial<BackendHealth>;
  if (health.service !== "backend" || typeof health.ok !== "boolean" || typeof health.status !== "string") {
    throw new ApiRequestError("Respuesta inválida del servidor.", response.status);
  }
  if (!response.ok || !health.ok) {
    throw new ApiRequestError(health.error ?? "El backend no está disponible.", response.status);
  }
  return health as BackendHealth;
}
