import "server-only";

import { cookies } from "next/headers";

function backendOrigin() {
  const value = process.env.SALUD_U_BACKEND_ORIGIN?.replace(/\/$/, "");
  if (!value) throw new Error("Falta SALUD_U_BACKEND_ORIGIN para consultar Spring desde SSR.");
  return value;
}

/**
 * Helper para lecturas SSR. Reenvía únicamente la cookie entrante al backend;
 * las mutaciones y Set-Cookie pertenecen a acciones/rutas de integración.
 */
export async function backendServerFetch(path: string, options?: RequestInit) {
  if (!path.startsWith("/api/")) throw new Error("La ruta backend debe comenzar con /api/.");
  const requestCookies = await cookies();
  const headers = new Headers(options?.headers);
  if (!headers.has("Cookie")) headers.set("Cookie", requestCookies.toString());

  return fetch(`${backendOrigin()}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
}
