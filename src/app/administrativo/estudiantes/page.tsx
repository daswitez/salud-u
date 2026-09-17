"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { getClinicalDemoState, searchClinicalPatients } from "@/lib/demo-clinical-store";
import type { Patient, ReferralStatus } from "@/lib/ui-contracts";

type PatientRow = Patient & { lastEncounterAt?: string; referralStatus?: ReferralStatus; fulfilled: boolean };

function ageFromBirthDate(value?: string) {
  if (!value) return "—";
  const today = new Date("2026-09-17T12:00:00.000Z");
  const birth = new Date(`${value}T12:00:00.000Z`);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return String(age);
}

function referralLabel(status?: ReferralStatus) {
  if (!status) return "Sin derivación activa";
  const labels: Record<ReferralStatus, string> = { PENDING_ASSIGNMENT: "Pendiente de asignación", ASSIGNED: "Asignada", IN_PROGRESS: "En atención", RETURNED: "Devuelta", CLOSED: "Cerrada", CANCELLED: "Cancelada" };
  return labels[status];
}

export default function AdministrativeStudentsPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<PatientRow[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const state = getClinicalDemoState();
      const patientRows = searchClinicalPatients(query).map((patient) => {
        const encounters = state.encounters.filter((encounter) => encounter.patientId === patient.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
        const referrals = state.referrals.filter((referral) => referral.patientId === patient.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return { ...patient, lastEncounterAt: encounters[0]?.occurredAt, referralStatus: referrals.find((referral) => ["PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS"].includes(referral.status))?.status, fulfilled: encounters.some((encounter) => encounter.status === "CLOSED") };
      });
      setRows(patientRows);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  const resultMessage = useMemo(() => query.trim() ? `${rows.length} resultado(s) para “${query.trim()}”` : `${rows.length} estudiante(s) registrados`, [query, rows.length]);

  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="administrativo" active="students" /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="administrativo" name="María Fernández" clinicalRole="ADMINISTRATIVE" /><div className="mx-auto max-w-7xl p-5 sm:p-8"><Link href="/administrativo" className="text-sm font-semibold text-primary hover:underline">← Inicio administrativo</Link><header className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-primary">ADMISIÓN ADMINISTRATIVA</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Estudiantes</h1><p className="mt-2 max-w-2xl text-text-secondary">Busca un registro antes de crear uno nuevo. Esta vista solo presenta datos administrativos y estados resumidos de atención.</p></div><Link href="/administrativo/estudiantes/nuevo" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Registrar estudiante</Link></header><section className="mt-7 rounded-2xl border border-divider bg-surface p-5 sm:p-6"><label className="block"><span className="text-sm font-semibold text-text-primary">Buscar estudiante</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Carnet, código de registro o nombre completo" className="mt-2 w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary-200" /></label><p className="mt-3 text-sm text-text-secondary">{resultMessage}</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-230 text-left text-sm"><thead className="border-b border-divider text-xs uppercase tracking-wide text-text-tertiary"><tr><th className="px-3 py-3 font-semibold">Estudiante</th><th className="px-3 py-3 font-semibold">Carnet / código</th><th className="px-3 py-3 font-semibold">Carrera</th><th className="px-3 py-3 font-semibold">Edad</th><th className="px-3 py-3 font-semibold">Última atención</th><th className="px-3 py-3 font-semibold">Cumplimiento</th><th className="px-3 py-3 font-semibold">Derivación</th><th className="px-3 py-3 font-semibold"><span className="sr-only">Acciones</span></th></tr></thead><tbody className="divide-y divide-divider">{rows.map((patient) => <tr key={patient.id} className="hover:bg-surface-secondary/60"><td className="px-3 py-4"><p className="font-semibold text-text-primary">{patient.fullName}</p><p className="mt-1 text-xs text-text-tertiary">{patient.isRecurrent ? "Paciente recurrente" : "Registro inicial"}</p></td><td className="px-3 py-4 text-text-secondary"><p>{patient.carnet}</p><p className="mt-1 text-xs text-text-tertiary">{patient.registrationCode}</p></td><td className="px-3 py-4 text-text-secondary">{patient.career}</td><td className="px-3 py-4 text-text-secondary">{ageFromBirthDate(patient.birthDate)}</td><td className="px-3 py-4 text-text-secondary">{patient.lastEncounterAt ? new Date(patient.lastEncounterAt).toLocaleDateString("es-BO") : "Sin atención"}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${patient.fulfilled ? "bg-success-container text-success" : "bg-warning-container text-warning"}`}>{patient.fulfilled ? "Cumplido" : "Pendiente"}</span></td><td className="px-3 py-4 text-text-secondary">{referralLabel(patient.referralStatus)}</td><td className="px-3 py-4 text-right"><Link href={`/administrativo/estudiantes/${patient.id}`} className="font-semibold text-primary hover:underline">Abrir registro</Link></td></tr>)}{!rows.length && <tr><td colSpan={8} className="px-3 py-10 text-center text-text-secondary">No se encontraron estudiantes. Revisa el carnet, código o nombre ingresado.</td></tr>}</tbody></table></div></section></div></main></div>;
}
