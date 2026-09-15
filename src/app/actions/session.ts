"use server";

import { redirect } from "next/navigation";
import { AppRole, clearSession, createDemoSession, getSession, writeSession } from "@/lib/demo-session";
import { findMockUser } from "@/lib/mock-users";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const mockUser = findMockUser(email);
  const role: AppRole = mockUser?.role ?? "estudiante";

  if (!email.includes("@") || password.length < 8) {
    redirect("/iniciar-sesion?error=credentials");
  }

  await writeSession(createDemoSession(email, role, mockUser?.name), remember);
  redirect(`/${role}`);
}

export async function updateProfile(formData: FormData) {
  const requestedRole = String(formData.get("role") ?? "") as AppRole;
  const session = await getSession() ?? createDemoSession("", ["estudiante", "medico", "administrativo"].includes(requestedRole) ? requestedRole : "estudiante");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!name || !email.includes("@")) redirect("/perfil?error=profile");

  await writeSession({
    ...session,
    name,
    email,
    notifications: {
      appointments: formData.get("appointments") === "on",
      waitlist: formData.get("waitlist") === "on",
      changes: formData.get("changes") === "on",
    },
  });
  redirect("/perfil?success=profile");
}

export async function updatePassword(formData: FormData) {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (currentPassword.length < 8 || newPassword.length < 8) redirect("/perfil?error=password");
  redirect("/perfil?success=password");
}

export async function signOut() {
  await clearSession();
  redirect("/iniciar-sesion?success=logout");
}
