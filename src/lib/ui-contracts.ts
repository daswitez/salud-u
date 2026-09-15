/** Contratos de transición para sustituir mocks por endpoints sin cambiar la UI. */
export type ApiErrorCode = "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "EXPIRED" | "UNAUTHORIZED" | "NETWORK" | "UNAVAILABLE";
export type ApiError = { code: ApiErrorCode; message: string; recoverable: boolean; retryAfter?: number };
export type ApiSuccess<T> = { ok: true; data: T; requestId: string };
export type ApiFailure = { ok: false; error: ApiError; requestId: string };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type AsyncView<T> =
  | { state: "idle"; data?: T }
  | { state: "loading"; data?: T }
  | { state: "success"; data: T }
  | { state: "empty"; message: string; actionLabel?: string }
  | { state: "error"; error: ApiError; data?: T };

export const recoveryCopy: Record<ApiErrorCode, string> = {
  VALIDATION: "Revisa los datos indicados y vuelve a intentarlo.",
  NOT_FOUND: "El recurso ya no está disponible. Vuelve a la lista anterior.",
  CONFLICT: "Otro cambio ocupó este recurso. Actualiza los datos y elige otra opción.",
  EXPIRED: "El tiempo disponible venció. Vuelve a iniciar el proceso.",
  UNAUTHORIZED: "No tienes permisos para realizar esta acción.",
  NETWORK: "No pudimos conectarnos. Revisa tu conexión y vuelve a intentarlo.",
  UNAVAILABLE: "El servicio no está disponible temporalmente. Intenta nuevamente más tarde.",
};
