"use client";

import { useState } from "react";
import type { ClinicalEncounter, Diagnosis, Referral, Patient } from "@/lib/ui-contracts";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";

type AppState = ReturnType<typeof getClinicalDemoState>;

import Link from "next/link";

export function ReportsView({
  role,
  doctorId,
  isSpecialist,
  state
}: {
  role: "ADMINISTRATIVE" | "CLINICAL";
  doctorId?: string;
  isSpecialist?: boolean;
  state: AppState;
}) {
  const [activeTab, setActiveTab] = useState<"atenciones" | "diagnosticos" | "derivaciones" | "borradores">("atenciones");
  const dateKey = "2026-09-17"; // Demo fixed date
  
  // Filter data based on role and scope
  let encounters = state.encounters;
  let referrals = state.referrals;
  
  if (role === "CLINICAL" && doctorId) {
    encounters = encounters.filter(e => e.doctorId === doctorId);
    if (isSpecialist) {
      referrals = referrals.filter(r => r.assignedDoctorId === doctorId);
    } else {
      referrals = referrals.filter(r => r.requestedBy === doctorId);
    }
  }

  // Calculate metrics for today
  const attendedToday = encounters.filter(e => e.occurredAt.startsWith(dateKey) && e.status === "CLOSED");
  const diagnosesToday = state.diagnoses.filter(d => attendedToday.some(e => e.id === d.encounterId));
  const openDrafts = encounters.filter(e => e.status === "DRAFT");
  
  return (
    <div className="space-y-6">
      <header className="border-b border-divider pb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">{role === "ADMINISTRATIVE" ? "ÁREA ADMINISTRATIVA" : "ÁREA MÉDICA"}</p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">Reportes rápidos</h1>
          <p className="mt-2 text-text-secondary">Visión general de las atenciones, diagnósticos y derivaciones del día.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {role === "ADMINISTRATIVE" && (
            <>
              <Link href="/administrativo/reportes/cumplimiento" className="rounded-lg bg-surface-secondary border border-divider px-4 py-2 text-sm font-bold text-text-primary hover:bg-divider transition-colors">
                Cumplimiento de Revisión
              </Link>
              <Link href="/administrativo/auditoria" className="rounded-lg bg-surface-secondary border border-divider px-4 py-2 text-sm font-bold text-text-primary hover:bg-divider transition-colors">
                Bitácora de Auditoría
              </Link>
            </>
          )}
          <Link href={role === "ADMINISTRATIVE" ? "/administrativo/reportes/clinicos" : "/medico/reportes/clinicos"} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-600 transition-colors">
            Constructor Avanzado de Reportes
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setActiveTab("atenciones")} className={`p-4 rounded-xl border text-left transition-colors ${activeTab === "atenciones" ? "border-primary bg-primary-50" : "border-divider bg-surface hover:bg-surface-secondary"}`}>
          <p className="text-sm text-text-secondary font-semibold">Atendidos hoy</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{attendedToday.length}</p>
        </button>
        <button onClick={() => setActiveTab("diagnosticos")} className={`p-4 rounded-xl border text-left transition-colors ${activeTab === "diagnosticos" ? "border-primary bg-primary-50" : "border-divider bg-surface hover:bg-surface-secondary"}`}>
          <p className="text-sm text-text-secondary font-semibold">Diagnósticos hoy</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{diagnosesToday.length}</p>
        </button>
        <button onClick={() => setActiveTab("derivaciones")} className={`p-4 rounded-xl border text-left transition-colors ${activeTab === "derivaciones" ? "border-primary bg-primary-50" : "border-divider bg-surface hover:bg-surface-secondary"}`}>
          <p className="text-sm text-text-secondary font-semibold">Derivaciones</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{referrals.length}</p>
        </button>
        <button onClick={() => setActiveTab("borradores")} className={`p-4 rounded-xl border text-left transition-colors ${activeTab === "borradores" ? "border-primary bg-primary-50" : "border-divider bg-surface hover:bg-surface-secondary"}`}>
          <p className="text-sm text-text-secondary font-semibold">Borradores</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{openDrafts.length}</p>
        </button>
      </div>

      <div className="rounded-xl border border-divider bg-surface p-5">
        <div className="flex justify-between items-center mb-6 border-b border-divider pb-4">
          <h2 className="text-lg font-bold text-text-primary">
            {activeTab === "atenciones" && "Pacientes atendidos"}
            {activeTab === "diagnosticos" && "Diagnósticos registrados"}
            {activeTab === "derivaciones" && "Derivaciones"}
            {activeTab === "borradores" && "Borradores pendientes"}
          </h2>
          <span className="text-sm bg-surface-secondary px-3 py-1 rounded-full font-medium text-text-secondary">Fecha: {new Date(dateKey + "T00:00:00").toLocaleDateString("es-BO")}</span>
        </div>

        {activeTab === "atenciones" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-l-lg">Paciente</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold rounded-r-lg">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {attendedToday.length ? attendedToday.map(e => (
                  <tr key={e.id} className="hover:bg-surface-secondary/50">
                    <td className="px-4 py-3 font-medium text-text-primary">{state.patients.find(p => p.id === e.patientId)?.fullName || "Desconocido"}</td>
                    <td className="px-4 py-3 text-text-secondary">{e.type === "INITIAL" ? "Revisión" : "Especialidad"}</td>
                    <td className="px-4 py-3 text-text-secondary">{new Date(e.occurredAt).toLocaleTimeString("es-BO", {hour: "2-digit", minute:"2-digit"})}</td>
                  </tr>
                )) : <tr><td colSpan={3} className="px-4 py-8 text-center text-text-secondary">No hay atenciones hoy</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "diagnosticos" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-l-lg">Código</th>
                  <th className="px-4 py-3 font-semibold">Diagnóstico</th>
                  <th className="px-4 py-3 font-semibold rounded-r-lg">Paciente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {diagnosesToday.length ? diagnosesToday.map(d => {
                  const encounter = state.encounters.find(e => e.id === d.encounterId);
                  const patient = state.patients.find(p => p.id === encounter?.patientId);
                  return (
                    <tr key={d.id} className="hover:bg-surface-secondary/50">
                      <td className="px-4 py-3 text-text-secondary">{d.code || "-"}</td>
                      <td className="px-4 py-3 font-medium text-text-primary">{d.label}</td>
                      <td className="px-4 py-3 text-text-secondary">{patient?.fullName || "Desconocido"}</td>
                    </tr>
                  )
                }) : <tr><td colSpan={3} className="px-4 py-8 text-center text-text-secondary">No hay diagnósticos registrados hoy</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "derivaciones" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-l-lg">Especialidad</th>
                  <th className="px-4 py-3 font-semibold">Motivo</th>
                  <th className="px-4 py-3 font-semibold rounded-r-lg">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {referrals.length ? referrals.map(r => (
                  <tr key={r.id} className="hover:bg-surface-secondary/50">
                    <td className="px-4 py-3 font-medium text-text-primary">{r.specialty}</td>
                    <td className="px-4 py-3 text-text-secondary truncate max-w-[200px]">{r.reason}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-1 bg-surface-secondary rounded-md">{r.status}</span></td>
                  </tr>
                )) : <tr><td colSpan={3} className="px-4 py-8 text-center text-text-secondary">No hay derivaciones asociadas</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "borradores" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-l-lg">Paciente</th>
                  <th className="px-4 py-3 font-semibold">Motivo</th>
                  <th className="px-4 py-3 font-semibold rounded-r-lg">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {openDrafts.length ? openDrafts.map(e => (
                  <tr key={e.id} className="hover:bg-surface-secondary/50">
                    <td className="px-4 py-3 font-medium text-text-primary">{state.patients.find(p => p.id === e.patientId)?.fullName || "Desconocido"}</td>
                    <td className="px-4 py-3 text-text-secondary">{e.chiefComplaint}</td>
                    <td className="px-4 py-3 text-text-secondary">{new Date(e.occurredAt).toLocaleDateString("es-BO")}</td>
                  </tr>
                )) : <tr><td colSpan={3} className="px-4 py-8 text-center text-text-secondary">No hay borradores pendientes</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
