"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { createClinicalPatient, findPatientByIdentity } from "@/lib/demo-clinical-store";
import type { Patient } from "@/lib/ui-contracts";

type FormState = Pick<Patient, "carnet" | "registrationCode" | "fullName" | "birthDate" | "career" | "email" | "phone" | "academicStatus" | "isRecurrent">;
const initialForm: FormState = { carnet: "", registrationCode: "", fullName: "", birthDate: "", career: "", email: "", phone: "", academicStatus: "ACTIVE", isRecurrent: false };

function ageFromBirthDate(value: string) {
  if (!value) return "Ingresa una fecha";
  const today = new Date("2026-09-17T12:00:00.000Z");
  const birth = new Date(`${value}T12:00:00.000Z`);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return `${age} años`;
}

export default function NewStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setExistingPatientId(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createClinicalPatient(form);
    if (!result.ok) {
      setError(result.message);
      if (result.code === "CONFLICT") setExistingPatientId(findPatientByIdentity(form.carnet, form.registrationCode)?.id ?? null);
      return;
    }
    router.push(`/administrativo/estudiantes/${result.data.patient.id}/historia-inicial`);
  }

  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="students" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" clinicalRole="ADMINISTRATIVE" name="María Fernández" /><div className="mx-auto max-w-3xl p-5 sm:p-8"><Link href="/administrativo/estudiantes" className="text-sm font-semibold text-primary hover:underline">← Volver a estudiantes</Link><header className="mt-5"><p className="text-sm font-semibold tracking-wide text-primary">ADMISIÓN ADMINISTRATIVA</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Registrar estudiante</h1><p className="mt-2 text-text-secondary">Completa únicamente datos de identificación, contacto y condición institucional. El contenido clínico se registra durante la atención médica.</p></header>{error && <section role="alert" className="mt-6 rounded-xl border border-error-container bg-error-container p-4"><p className="font-semibold text-error">No se pudo guardar el registro</p><p className="mt-1 text-sm text-text-secondary">{error}</p>{existingPatientId && <Link href={`/administrativo/estudiantes/${existingPatientId}`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">Abrir estudiante existente →</Link>}</section>}<form onSubmit={submit} className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="text-sm font-semibold text-text-primary">Nombre completo</span><input required value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200" /></label><label className="block"><span className="text-sm font-semibold text-text-primary">Número de carnet</span><input required value={form.carnet} onChange={(event) => update("carnet", event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200" /></label><label className="block"><span className="text-sm font-semibold text-text-primary">Código de registro</span><input required value={form.registrationCode} onChange={(event) => update("registrationCode", event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200" /></label><label className="block"><span className="text-sm font-semibold text-text-primary">Fecha de nacimiento</span><input required type="date" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200" /><span className="mt-1 block text-xs text-text-tertiary">Edad calculada: {ageFromBirthDate(form.birthDate ?? "")}</span></label><label className="block"><span className="text-sm font-semibold text-text-primary">Carrera</span><input required value={form.career} onChange={(event) => update("career", event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200" /></label><label className="block"><span className="text-sm font-semibold text-text-primary">Correo electrónico</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200" /></label><label className="block"><span className="text-sm font-semibold text-text-primary">Teléfono</span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-200" /></label><label className="flex items-start gap-3 rounded-xl border border-divider p-4 sm:col-span-2"><input type="checkbox" checked={form.isRecurrent} onChange={(event) => update("isRecurrent", event.target.checked)} className="mt-0.5 size-4 accent-primary" /><span><span className="block text-sm font-semibold text-text-primary">Paciente recurrente</span><span className="mt-1 block text-xs text-text-secondary">Marca esta opción cuando ya recibe seguimiento, sin crear un historial clínico paralelo.</span></span></label></div><div className="mt-7 flex flex-wrap justify-end gap-3"><Link href="/administrativo/estudiantes" className="rounded-lg border border-divider px-4 py-2.5 text-sm font-semibold text-text-secondary hover:bg-surface-secondary">Cancelar</Link><button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Guardar registro administrativo</button></div></form></div></main></div>;
}
