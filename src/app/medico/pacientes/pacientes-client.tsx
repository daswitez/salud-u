"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";

function age(birthDate?: string) { 
  if (!birthDate) return "—"; 
  const diff = Date.now() - new Date(birthDate).getTime(); 
  return Math.abs(new Date(diff).getUTCFullYear() - 1970); 
}

const specialtyLabels: Record<string, string> = { 
  DERMATOLOGY: "Dermatología", 
  OPHTHALMOLOGY: "Oftalmología", 
  INTERNAL_MEDICINE: "Medicina interna", 
  UROLOGY: "Urología",
  GYNECOLOGY: "Ginecología"
};

const referralLabels: Record<string, string> = { 
  PENDING_ASSIGNMENT: "Pend. Asignación", 
  ASSIGNED: "Asignada", 
  IN_PROGRESS: "En Atención", 
  RETURNED: "Devuelta", 
  CLOSED: "Cerrada", 
  CANCELLED: "Cancelada" 
};

export function PacientesClient({ doctorId, doctorRole }: { doctorId: string; doctorRole: string }) {
  const [state, setState] = useState<any>(null);

  // Filtros combinables
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [careerFilter, setCareerFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [referralStatusFilter, setReferralStatusFilter] = useState("");

  useEffect(() => {
    setState(getClinicalDemoState());
  }, []);

  if (!state) return <div className="p-10 text-center text-text-secondary">Cargando pacientes...</div>;

  // 1. Encontrar pacientes vinculados al doctor
  const patientIds = new Set<string>();
  state.encounters.filter((item: any) => item.doctorId === doctorId).forEach((item: any) => patientIds.add(item.patientId));
  state.referrals.filter((item: any) => item.requestedBy === doctorId || item.assignedDoctorId === doctorId).forEach((item: any) => patientIds.add(item.patientId));
  state.appointments.filter((item: any) => item.assignedDoctorId === doctorId).forEach((item: any) => patientIds.add(item.patientId));
  
  const basePatients = state.patients.filter((item: any) => patientIds.has(item.id));

  if (basePatients.length === 0) {
    return (
      <div className="py-16 text-center bg-surface border border-divider rounded-2xl shadow-sm">
        <p className="text-text-secondary text-lg font-semibold">No tienes pacientes clínicamente vinculados.</p>
        <p className="text-text-tertiary mt-2">Los pacientes aparecerán aquí cuando tengas citas programadas, inicies atenciones o recibas derivaciones.</p>
      </div>
    );
  }

  // 2. Mapear datos extra para cada paciente (última atención, diagnóstico, derivación activa)
  const mappedPatients = basePatients.map((patient: any) => {
    const patientEncounters = state.encounters.filter((e: any) => e.patientId === patient.id).sort((a: any, b: any) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    const lastEncounter = patientEncounters[0];
    
    const patientDiagnoses = state.diagnoses.filter((d: any) => d.patientId === patient.id).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastDiagnosis = patientDiagnoses[0];

    const activeReferrals = state.referrals.filter((r: any) => r.patientId === patient.id && ["PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS"].includes(r.status));
    const activeReferral = doctorRole === "SPECIALIST" 
      ? activeReferrals.find((r: any) => r.assignedDoctorId === doctorId)
      : activeReferrals.find((r: any) => r.requestedBy === doctorId);
    
    return {
      patient,
      lastEncounter,
      lastDiagnosis,
      activeReferral,
      patientEncounters,
      age: age(patient.birthDate),
    };
  });

  // 3. Aplicar Filtros
  const filteredPatients = mappedPatients.filter((item: any) => {
    // Buscar texto (Nombre, CI, Código, Diagnóstico)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesText = 
        item.patient.fullName.toLowerCase().includes(q) || 
        item.patient.registrationCode?.toLowerCase().includes(q) || 
        item.patient.carnet?.toLowerCase().includes(q) ||
        (item.lastDiagnosis && item.lastDiagnosis.label.toLowerCase().includes(q));
      if (!matchesText) return false;
    }

    if (careerFilter && item.patient.career !== careerFilter) return false;

    if (dateFilter) {
      const hasEncounterOnDate = item.patientEncounters.some((e: any) => e.occurredAt.startsWith(dateFilter));
      if (!hasEncounterOnDate) return false;
    }

    if (specialtyFilter) {
      const hasSpecialty = item.patientEncounters.some((e: any) => e.specialty === specialtyFilter);
      if (!hasSpecialty) return false;
    }

    if (referralStatusFilter) {
      if (!item.activeReferral) return false;
      if (item.activeReferral.status !== referralStatusFilter) return false;
    }

    return true;
  });

  // Opciones únicas para filtros
  const uniqueCareers = Array.from(new Set(basePatients.map((p: any) => p.career).filter(Boolean)));
  const uniqueSpecialties = Array.from(new Set(state.encounters.map((e: any) => e.specialty).filter(Boolean)));

  return (
    <div>
      {/* Panel de Filtros */}
      <section className="mb-6 bg-surface p-5 rounded-2xl border border-divider shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Buscar Paciente o Dx</label>
          <input 
            type="search" 
            placeholder="Nombre, CI, Diagnóstico..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Carrera</label>
          <select 
            value={careerFilter}
            onChange={e => setCareerFilter(e.target.value)}
            className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          >
            <option value="">Todas las carreras</option>
            {uniqueCareers.map((c: any) => <option key={c as string} value={c as string}>{c as string}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Especialidad Recibida</label>
          <select 
            value={specialtyFilter}
            onChange={e => setSpecialtyFilter(e.target.value)}
            className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          >
            <option value="">Cualquiera</option>
            {uniqueSpecialties.map((s: any) => <option key={s as string} value={s as string}>{specialtyLabels[s as string] || s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Estado Derivación</label>
          <select 
            value={referralStatusFilter}
            onChange={e => setReferralStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          >
            <option value="">Todos los estados</option>
            {Object.entries(referralLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Fecha de Atención</label>
          <input 
            type="date" 
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow text-text-primary"
          />
        </div>
      </section>

      {/* Tabla de Resultados */}
      <section className="overflow-hidden rounded-2xl border border-divider bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-divider bg-surface-secondary text-[11px] uppercase tracking-wider text-text-tertiary">
              <tr>
                <th className="px-5 py-4 font-bold">Paciente</th>
                <th className="px-5 py-4 font-bold">Edad y Carrera</th>
                <th className="px-5 py-4 font-bold">Última Atención</th>
                <th className="px-5 py-4 font-bold">Último Diagnóstico</th>
                <th className="px-5 py-4 font-bold">Derivación Activa</th>
                <th className="px-5 py-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {filteredPatients.map(({ patient, age, lastEncounter, lastDiagnosis, activeReferral }: any) => (
                <tr key={patient.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-text-primary">{patient.fullName}</p>
                    <p className="text-xs text-text-secondary mt-1">{patient.carnet} · {patient.registrationCode}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-text-primary font-medium">{age} años</p>
                    <p className="text-xs text-text-secondary mt-1 truncate max-w-[150px]" title={patient.career}>{patient.career || "No registrada"}</p>
                  </td>
                  <td className="px-5 py-4 text-text-secondary">
                    {lastEncounter ? new Date(lastEncounter.occurredAt).toLocaleDateString("es-BO") : "—"}
                  </td>
                  <td className="px-5 py-4">
                    {lastDiagnosis ? (
                      <div>
                        <p className="text-text-primary max-w-[200px] truncate font-medium" title={lastDiagnosis.label}>{lastDiagnosis.label}</p>
                        {lastDiagnosis.code && <span className="text-[10px] font-mono bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded mt-1 inline-block border border-primary-100">{lastDiagnosis.code}</span>}
                      </div>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {activeReferral ? (
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        activeReferral.status === "ASSIGNED" ? "bg-primary-100 text-primary-800" :
                        activeReferral.status === "IN_PROGRESS" ? "bg-warning-100 text-warning-800" :
                        "bg-surface-secondary text-text-secondary border border-divider"
                      }`}>
                        {referralLabels[activeReferral.status] || activeReferral.status}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/medico/pacientes/${patient.id}`} className="inline-flex items-center justify-center rounded-lg bg-surface-secondary px-4 py-2 text-xs font-bold text-primary hover:bg-primary-50 transition-colors border border-transparent hover:border-primary-100">
                      Ver Ficha Clínica
                    </Link>
                  </td>
                </tr>
              ))}
              {!filteredPatients.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center bg-surface-secondary/30">
                    <p className="text-text-secondary font-semibold text-base">No se encontraron pacientes que coincidan con los filtros.</p>
                    <button 
                      onClick={() => { setSearchQuery(""); setCareerFilter(""); setDateFilter(""); setSpecialtyFilter(""); setReferralStatusFilter(""); }}
                      className="mt-3 text-sm font-bold text-primary hover:text-primary-600 hover:underline"
                    >
                      Limpiar todos los filtros
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
