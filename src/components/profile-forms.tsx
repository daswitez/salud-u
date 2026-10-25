"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiRequestError, apiJson } from "@/lib/api/client";

type ProfileFormsProps = {
  name: string;
  email: string;
};

function messageFor(error: unknown) {
  if (error instanceof ApiRequestError) return error.message;
  return "No pudimos comunicarnos con el servidor. Revisa tu conexión e inténtalo nuevamente.";
}

/** Formularios de BE-PER: el backend comprueba la clave y revoca las sesiones al cambiar credenciales. */
export function ProfileForms({ name: initialName, email: initialEmail }: ProfileFormsProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [profilePassword, setProfilePassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  function sessionEnded() {
    router.replace("/iniciar-sesion?success=profile-updated");
    router.refresh();
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setSubmittingProfile(true);
    try {
      await apiJson<void>("/api/v1/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName: name.trim(), email: email.trim().toLowerCase(), currentPassword: profilePassword }),
      });
      sessionEnded();
    } catch (error) {
      setProfileError(messageFor(error));
      setSubmittingProfile(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setSubmittingPassword(true);
    try {
      await apiJson<void>("/api/v1/profile/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      sessionEnded();
    } catch (error) {
      setPasswordError(messageFor(error));
      setSubmittingPassword(false);
    }
  }

  return <>
    <form onSubmit={submitProfile} className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-bold text-text-primary">Datos personales</h2>
      <p className="mt-1 text-sm text-text-secondary">Para proteger tu cuenta, confirma tu contraseña antes de guardar.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-text-secondary">Nombre completo<input name="name" required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-text-primary" /></label>
        <label className="text-sm font-semibold text-text-secondary">Correo electrónico<input name="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-text-primary" /></label>
      </div>
      <label className="mt-4 block text-sm font-semibold text-text-secondary">Contraseña actual<input name="profileCurrentPassword" required type="password" autoComplete="current-password" value={profilePassword} onChange={(event) => setProfilePassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-text-primary" /></label>
      {profileError && <p role="alert" className="mt-4 text-sm font-medium text-error">{profileError}</p>}
      <fieldset className="mt-6 border-t border-divider pt-5"><legend className="text-sm font-bold text-text-primary">Avisos</legend><p className="mt-1 text-sm text-text-secondary">Los avisos pueden informar cambios de cita o derivación sin incluir datos clínicos sensibles.</p></fieldset>
      <button disabled={submittingProfile} className="mt-6 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70">{submittingProfile ? "Guardando…" : "Guardar datos"}</button>
    </form>
    <form onSubmit={submitPassword} className="mt-5 rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-bold text-text-primary">Seguridad</h2>
      <p className="mt-1 text-sm text-text-secondary">Actualiza tu contraseña de acceso.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-text-secondary">Contraseña actual<input required name="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5" /></label>
        <label className="text-sm font-semibold text-text-secondary">Nueva contraseña<input name="newPassword" required type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5" /></label>
      </div>
      {passwordError && <p role="alert" className="mt-4 text-sm font-medium text-error">{passwordError}</p>}
      <button disabled={submittingPassword} className="mt-6 rounded-lg border border-primary px-5 py-3 text-sm font-semibold text-primary hover:bg-primary-container disabled:cursor-wait disabled:opacity-70">{submittingPassword ? "Actualizando…" : "Actualizar contraseña"}</button>
    </form>
  </>;
}
