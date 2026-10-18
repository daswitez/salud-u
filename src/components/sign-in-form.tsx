"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { ApiRequestError, apiJson } from "@/lib/api/client";
import type { AppRole } from "@/lib/session";

type LoginResponse = { user: { role: AppRole } };

export function SignInForm({ initialEmail }: { initialEmail?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setMessage("Ingresa tu correo y contraseña para continuar.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiJson<LoginResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.replace(`/${result.user.role}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiRequestError) setMessage(error.status === 401 ? "El correo o la contraseña son incorrectos." : error.message);
      else setMessage("No pudimos conectarnos. Revisa tu red e inténtalo nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
    {message && <p role="alert" className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm font-semibold text-error">{message}</p>}
    <label className="block text-sm font-bold text-text-secondary">Correo electrónico<input required name="email" type="email" autoComplete="username" defaultValue={initialEmail} placeholder="nombre@correo.com" disabled={submitting} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary-100 disabled:cursor-wait disabled:opacity-70" /></label>
    <label className="block text-sm font-bold text-text-secondary">Contraseña<input required name="password" type="password" autoComplete="current-password" minLength={8} placeholder="Ingresa tu contraseña" disabled={submitting} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary-100 disabled:cursor-wait disabled:opacity-70" /></label>
    <div className="flex items-center justify-between gap-3"><span className="text-xs text-text-tertiary">La sesión se mantiene en una cookie segura del sistema.</span><span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-success"><span className="size-1.5 rounded-full bg-success" />Acceso protegido</span></div>
    <button type="submit" disabled={submitting} className="min-h-12 w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-on-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70">{submitting ? "Verificando acceso…" : "Ingresar a mi espacio"}</button>
  </form>;
}
