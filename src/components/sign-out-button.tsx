"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ApiRequestError, apiJson } from "@/lib/api/client";

export function SignOutButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function signOut() {
    setMessage(null); setSubmitting(true);
    try { await apiJson<void>("/api/v1/session/logout", { method: "POST" }); router.replace("/iniciar-sesion?success=logout"); router.refresh(); }
    catch (error) { setMessage(error instanceof ApiRequestError ? error.message : "No pudimos cerrar la sesión. Inténtalo nuevamente."); setSubmitting(false); }
  }
  return <div className="mt-5"><button type="button" onClick={signOut} disabled={submitting} className="rounded-lg border border-error px-5 py-3 text-sm font-semibold text-error hover:bg-error-container disabled:cursor-wait disabled:opacity-70">{submitting ? "Cerrando sesión…" : "Cerrar sesión"}</button>{message && <p role="alert" className="mt-3 text-sm text-error">{message}</p>}</div>;
}
