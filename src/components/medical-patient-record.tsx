"use client";

import Link from "next/link";
import { EncounterAmendments } from "@/components/encounter-amendments";
import { referralPriorityLabel, referralStatusLabel } from "@/lib/referrals";
import { MedicalDocuments } from "@/components/medical-documents";
import { useCallback, useEffect, useRef, useState } from "react";

import { appointmentStatusLabel, formatAppointmentTime } from "@/components/medical-appointments";
import { ClinicalBackgroundSummary } from "@/components/clinical-background";
import { ClinicalBackgroundPanel } from "@/components/clinical-background-panel";
import { ApiRequestError, apiJson } from "@/lib/api/client";
import { relationshipLabels, type EmergencyContact } from "@/lib/emergency-contact";
import type { ClinicalBackgroundVersion } from "@/lib/clinical-background";
import { ClinicalWordDownload } from "@/components/clinical-word-download";
import { replaceUrl } from "@/lib/url-state";

export type PatientRecord = {
  patient: { id: string; carnet: string; registrationCode: string; fullName: string; birthDate: string | null; phone: string | null; email: string | null };
  emergencyContact: EmergencyContact | null;
  intake: { allergies: string | null; chronic_conditions: string | null; current_medications: string | null; relevant_history: string | null; emergency_contact_note: string | null; recorded_at: string } | null;
  clinicalBackground: ClinicalBackgroundVersion | null;
  encounters: { id: string; appointment_id: string | null; status: "DRAFT" | "CLOSED" | "VOIDED"; encounter_type: "INITIAL" | "SPECIALTY"; occurred_at: string; chief_complaint: string | null; assessment: string | null; instructions?: string | null; follow_up_text?: string | null; specialty: string | null; accessReason?: "AREA" | "REFERRAL_SOURCE"; reviewHistoryVersion?: number | null; specialtyHistoryVersion?: number | null; template?: { id: string; version: number } | null; reviewHistory?: Record<string, unknown> | null; specialtyHistory?: Record<string, unknown> | null; clinicalBackground?: ClinicalBackgroundVersion | null }[];
  diagnoses: { id: string; encounter_id: string; label: string }[];
  referrals: { id: string; status: keyof typeof referralStatusLabel; priority: keyof typeof referralPriorityLabel; reason: string; specialty: string }[];
  appointments: { id: string; status: "SCHEDULED" | "CHECKED_IN" | "CANCELLED" | "NO_SHOW" | "ATTENDED"; appointment_type: "INITIAL" | "REFERRAL" | "SPECIALTY"; scheduled_for: string; specialty: string | null; isAssignedToMe: boolean }[];
  documents: { id: string; encounter_id: string | null; document_type_code: string; original_filename: string; mime_type: string; size_bytes: number | null; study_date: string | null; description: string | null; uploaded_at: string }[];
};

function object(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function value(item: unknown) { return typeof item === "string" || typeof item === "number" ? String(item) : "No registrado"; }
function yesNo(item: unknown) { return item === true ? "Sí" : item === false ? "No" : "No registrado"; }
function code(item: unknown, labels: Record<string, string>) { return typeof item === "string" && labels[item] ? labels[item] : "No registrado"; }
function list(item: unknown, labels: Record<string, string>) { return Array.isArray(item) && item.length ? item.map((entry) => typeof entry === "string" && labels[entry] ? labels[entry] : String(entry)).join(", ") : "No registrado"; }
export function ReviewSnapshot({ data, hideGeneral = false }: { data: Record<string, unknown> | null | undefined; hideGeneral?: boolean }) {
  if (!data) return null;
  const history = object(data.personalHistory); const habits = object(data.habits); const vitals = object(data.vitals); const physical = object(data.physicalExam); const laboratory = object(data.laboratory); const conduct = object(data.conduct);
  const block = (title: string, rows: [string, unknown][]) => <section className="mt-5"><h3 className="font-bold">{title}</h3><dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{rows.map(([label, item]) => <div key={label}><dt className="text-text-secondary">{label}</dt><dd>{value(item)}</dd></div>)}</dl></section>;
  return <>{!hideGeneral && block("Antecedentes personales", [["Patológicos", history.pathological], ["Quirúrgicos", history.surgical], ["Alérgicos", history.allergic], ["Medicamentos habituales", history.regularMedications], ["Familiares relevantes", history.familyRelevant]])}{!hideGeneral && block("Hábitos y estilo de vida", [["Alimentación", habits.diet === "ADEQUATE" ? "Adecuada" : habits.diet === "INADEQUATE" ? "Inadecuada" : habits.diet === "REGULAR" ? "Regular" : null], ["Actividad física", habits.physicalActivity === "YES" ? "Sí" : habits.physicalActivity === "NO" ? "No" : null], ["Tabaco", habits.tobacco === "YES" ? "Sí" : habits.tobacco === "NO" ? "No" : null], ["Alcohol", habits.alcohol === "YES" ? "Sí" : habits.alcohol === "NO" ? "No" : null]])}{block("Signos vitales y antropometría", [["PA", `${value(vitals.bloodPressureSystolic)} / ${value(vitals.bloodPressureDiastolic)} mmHg`], ["FC", `${value(vitals.heartRate)} lpm`], ["FR", `${value(vitals.respiratoryRate)} rpm`], ["Temperatura", `${value(vitals.temperature)} °C`], ["SpO₂", `${value(vitals.oxygenSaturation)} %`], ["Peso", `${value(vitals.weight)} kg`], ["Talla", `${value(vitals.height)} m`]])}{block("Examen físico", [["Estado general", physical.generalState], ["Cardiopulmonar", physical.cardiopulmonary], ["Abdomen", physical.abdomen], ["Otros hallazgos", physical.otherFindings]])}{block("Laboratorio", [["Hemograma", laboratory.hemogram], ["Grupo sanguíneo", laboratory.bloodGroup], ["VDRL", laboratory.vdrl], ["Chagas", laboratory.chagas], ["Coproparasitológico", laboratory.coproparasitological], ["Otros", laboratory.other]])}{block("Conducta", [["Orientación en salud", yesNo(conduct.healthEducation)], ["Tratamiento", yesNo(conduct.treatment)], ["Estudios complementarios", yesNo(conduct.complementaryStudies)], ["Derivación", yesNo(conduct.referral)], ["Control médico", yesNo(conduct.medicalFollowUp)], ["Sin observaciones", yesNo(conduct.noObservations)]])}{block("Observaciones e indicaciones", [["Registro", data.observations]])}</>;
}

export function SpecialtySnapshot({ data, hideGeneral = false }: { data: Record<string, unknown> | null | undefined; hideGeneral?: boolean }) {
  if (!data) return <p className="mt-5 text-sm text-text-secondary">No se encontró la ficha estructurada de esta especialidad.</p>;
  const history = object(data.personalHistory); const eye = object(data.ophthalmology); const gyn = object(data.gynecology); const specialtyCode = data.specialtyCode;
  const block = (title: string, rows: [string, unknown][]) => <section className="mt-5"><h3 className="font-bold">{title}</h3><dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{rows.map(([label, item]) => <div key={label}><dt className="text-text-secondary">{label}</dt><dd>{value(item)}</dd></div>)}</dl></section>;
  const common = hideGeneral ? null : block("Antecedentes personales de especialidad", [["Patológicos", history.pathological], ["Quirúrgicos", history.surgical], ["Alérgicos", history.allergic], ["Familiares", history.family]]);
  if (specialtyCode === "OPHTHALMOLOGY") return <>{common}{block("Examen oftalmológico", [["Enfermedad actual", eye.currentIllness], ["Agudeza visual ojo derecho (V.D.)", eye.visualAcuityRight], ["Agudeza visual ojo izquierdo (V.I.)", eye.visualAcuityLeft]])}</>;
  if (specialtyCode === "GYNECOLOGY") return <>{common}{block("Enfermedad y antecedentes ginecológicos", [["Inicio", code(gyn.onset, { ACUTE: "Agudo", SUBACUTE: "Subagudo", CHRONIC: "Crónico" })], ["Síntomas principales", gyn.symptoms], ["Tratamientos previos", gyn.previousTreatments], ["Menarca", gyn.menarcheAge], ["Ritmo menstrual", code(gyn.menstrualPattern, { REGULAR: "Regular", IRREGULAR: "Irregular" })], ["Ciclo", gyn.cycleDays], ["FUM", gyn.lastMenstrualPeriod], ["Dismenorrea", code(gyn.dysmenorrhea, { YES: "Sí", NO: "No" })], ["Leucorrea", code(gyn.leucorrhea, { YES: "Sí", NO: "No" })], ["ITS previas", code(gyn.previousSti, { YES: "Sí", NO: "No" })], ["Detalle ITS", gyn.stiDetails]])}{block("Anticoncepción, PAP y antecedentes familiares", [["Métodos anticonceptivos", list(gyn.contraceptiveMethods, { NONE: "Ninguno", ORAL: "Oral", INJECTABLE: "Inyectable", IUD: "DIU", IMPLANT: "Implante", CONDOM: "Preservativo" })], ["Otro método", gyn.contraceptiveOther], ["Último PAP", gyn.lastPap], ["Resultado PAP", code(gyn.papResult, { NORMAL: "Normal", ALTERED: "Alterado" })], ["Detalle PAP", gyn.papDetails], ["CA ginecológico familiar", yesNo(gyn.familyGynecologicalCancer)], ["CA mama familiar", yesNo(gyn.familyBreastCancer)], ["Diabetes familiar", yesNo(gyn.familyDiabetes)], ["Otros antecedentes familiares", gyn.familyOther]])}{block("Examen físico ginecológico", [["Mamas", gyn.breastExam], ["Genitales externos", gyn.externalGenitalExam], ["Especuloscopía", gyn.speculumExam], ["Tacto vaginal", gyn.vaginalExam], ["Cuello uterino", gyn.cervixExam]])}</>;
  return <>{common}<p className="mt-5 text-sm text-text-secondary">La especialidad no tiene campos estructurados adicionales en esta versión.</p></>;
}

export type HistoryFilters = { q: string; from: string; to: string };
type SearchResult = { id: string; occurredAt: string; encounterType: string; status: string; chiefComplaint: string | null; assessment: string | null; specialty: string | null };
const emptyFilters: HistoryFilters = { q: "", from: "", to: "" };

export function MedicalPatientRecord({ patientId, clinicalRole, initialFilters = emptyFilters }: { patientId: string; clinicalRole: "REVIEW_DOCTOR" | "SPECIALIST"; initialFilters?: HistoryFilters }) {
  const [record, setRecord] = useState<PatientRecord | null>(null), [selected, setSelected] = useState<PatientRecord["encounters"][number] | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>(initialFilters), [applied, setApplied] = useState<HistoryFilters | null>(null);
  const [matchingIds, setMatchingIds] = useState<string[] | null>(null), [resultsError, setResultsError] = useState(false);
  const [error, setError] = useState(""), [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const feedback = useRef<HTMLDivElement>(null), dialog = useRef<HTMLDialogElement>(null);
  const requestGeneration = useRef(0);
  const amendmentDirty = useRef(false);
  const canCloseRecord = () => !amendmentDirty.current || window.confirm("Hay una adenda sin guardar. ¿Quieres cerrar y descartar lo escrito?");
  const activeFilters = useRef<HistoryFilters | null>(Object.values(initialFilters).some(Boolean) ? initialFilters : null);
  const read = useCallback(async (requested: HistoryFilters | null) => {
    const generation = ++requestGeneration.current; setLoading(true);
    try {
      const params = new URLSearchParams();
      if (requested) for (const key of ["q","from","to"] as const) if (requested[key]) params.set(key, requested[key]);
      const [data, found] = await Promise.all([
        apiJson<PatientRecord>(`/api/medical/patients/${patientId}`),
        requested ? apiJson<SearchResult[]>(`/api/medical/patients/${patientId}/search?${params}`) : Promise.resolve(null),
      ]);
      if (generation !== requestGeneration.current) return false;
      if (found?.some(item => !data.encounters.some(e => e.id === item.id && e.status === "CLOSED"))) throw new Error("Historia actualizada durante la búsqueda");
      setRecord(data); setMatchingIds(found?.map(item => item.id) ?? null); setApplied(requested); setResultsError(false);
      activeFilters.current = requested;
      setSelected(previous => previous ? data.encounters.find(e => e.id === previous.id) ?? null : null); setError(""); setExpired(false);
      return true;
    } catch (cause) {
      if (generation !== requestGeneration.current) return false;
      setError(cause instanceof ApiRequestError ? cause.message : "No pudimos actualizar la búsqueda. Se conservan los filtros; vuelve a buscar.");
      setExpired(cause instanceof ApiRequestError && cause.status === 401); setResultsError(true); setMatchingIds([]);
      if (cause instanceof ApiRequestError && [401,403,404].includes(cause.status)) { setRecord(null); setSelected(null); }
      return false;
    } finally { if (generation === requestGeneration.current) setLoading(false); }
  }, [patientId]);
  const load = useCallback(() => read(activeFilters.current), [read]);
  const invalidateSearch = useCallback(() => { requestGeneration.current++; }, []);
  async function search(event?: React.FormEvent, next = filters) {
    event?.preventDefault();
    if (!await read(next)) return;
    const url = new URL(window.location.href);
    for (const key of ["q","from","to"] as const) { if (next[key]) url.searchParams.set(key,next[key]); else url.searchParams.delete(key); }
    replaceUrl(url);
  }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => { window.clearTimeout(timer); invalidateSearch(); }; }, [load, invalidateSearch]);
  useEffect(() => { if (error) feedback.current?.focus(); }, [error]);
  useEffect(() => { if (selected) dialog.current?.showModal(); }, [selected]);
  // Search and authorization are decided by Spring. Only hydrate server result IDs from the fresh authorized history.
  const encounters = matchingIds === null ? record?.encounters.filter(e => e.status === "CLOSED") ?? [] : matchingIds.flatMap(id => record?.encounters.find(e => e.id === id) ?? []);
  const active = record?.appointments.find(a => a.isAssignedToMe && ["SCHEDULED","CHECKED_IN"].includes(a.status));
  const diagnoses = selected ? record?.diagnoses.filter(d => d.encounter_id === selected.id) ?? [] : [];
  return <section className="space-y-5" aria-busy={loading}>
    <Link href="/medico/pacientes" className="font-semibold text-primary">← Mis pacientes</Link>
    <div ref={feedback} tabIndex={-1}>{error && <p role="alert" className="rounded-xl bg-error-container p-4 text-error">{error}</p>}</div>
    {expired && <Link target="_blank" rel="noopener" href="/iniciar-sesion?error=session" className="block font-semibold text-primary">Iniciar sesión en otra pestaña y volver a la historia</Link>}
    <button type="button" disabled={loading} onClick={() => void load()} className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Actualizar historia</button>
    {loading && <p role="status">Cargando historial clínico…</p>}
    <form onSubmit={event => void search(event)} className="space-y-4 rounded-xl border border-divider bg-surface p-5" aria-label="Buscar en historia autorizada"><fieldset disabled={loading} className="space-y-4">
      <label className="block">Buscar en el historial visible<input maxLength={200} value={filters.q} onChange={e => setFilters({ ...filters,q:e.target.value })} className="mt-2 block w-full rounded-lg border border-divider bg-surface p-3" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label>Desde<input type="date" value={filters.from} onChange={e => setFilters({ ...filters,from:e.target.value })} className="mt-2 block w-full rounded-lg border border-divider bg-surface p-3" /></label><label>Hasta<input type="date" value={filters.to} onChange={e => setFilters({ ...filters,to:e.target.value })} className="mt-2 block w-full rounded-lg border border-divider bg-surface p-3" /></label></div>
      <p className="text-sm text-text-secondary">Busca coincidencias parciales en las atenciones cerradas autorizadas. Las fechas incluyen ambos días y usan la hora de Bolivia. Aplica los filtros con Buscar.</p>
      <div className="flex gap-3"><button type="submit" className="rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary">Buscar en historia</button><button type="button" onClick={() => { setFilters(emptyFilters); void search(undefined,emptyFilters); }} className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Limpiar filtros</button></div>
    </fieldset></form>
    {record && <>
      <header className="rounded-2xl border border-divider bg-surface p-6"><h1 className="text-3xl font-bold">{record.patient.fullName}</h1><p>CI {record.patient.carnet} · Registro {record.patient.registrationCode ?? "—"}</p>
        <section className="mt-4 rounded-xl bg-surface-secondary p-4" aria-label="Contacto de emergencia"><h2 className="font-bold">Contacto de emergencia</h2>{record.emergencyContact ? <p className="mt-1">{record.emergencyContact.fullName} · {relationshipLabels[record.emergencyContact.relationship] ?? record.emergencyContact.relationship} · {record.emergencyContact.phone}</p> : <p className="mt-1 text-text-secondary">No registrado.</p>}</section>
        {active && <Link href={`/medico/citas/${active.id}`} className="mt-4 block font-semibold text-primary">Abrir cita pendiente →</Link>}
      </header>
      <ClinicalBackgroundPanel embedded patientId={patientId} onSaved={version => setRecord(previous => previous ? { ...previous, clinicalBackground: version } : previous)} />
      <section className="rounded-xl border border-divider bg-surface p-6"><h2 className="text-xl font-bold">{clinicalRole === "REVIEW_DOCTOR" ? "Historial de revisiones" : "Historial del área y orígenes remitidos"}</h2><p>Atenciones cerradas autorizadas, con los datos y versiones que quedaron guardados.</p>
        {applied && !resultsError && <p role="status">Resultados: {encounters.length} · Texto: {applied.q || "Todos"} · Desde: {applied.from || "Sin límite"} · Hasta: {applied.to || "Sin límite"}</p>}
        <div className="mt-4 space-y-3">{encounters.map(e => <button key={e.id} data-history-encounter-id={e.id} onClick={() => setSelected(e)} className="block w-full rounded-xl border border-divider p-4 text-left hover:border-primary"><strong>{e.accessReason === "REFERRAL_SOURCE" ? "Origen de derivación autorizado" : e.encounter_type === "INITIAL" ? "Revisión médica" : e.specialty ?? "Especialidad"}</strong><p>{formatAppointmentTime(e.occurred_at)} · {e.chief_complaint ?? "Motivo no registrado"}</p><p>Versión de ficha: {e.encounter_type === "INITIAL" ? e.reviewHistoryVersion ?? "—" : e.specialtyHistoryVersion ?? "—"}</p><span className="font-semibold text-primary">Abrir ficha y archivos →</span></button>)}{!encounters.length && !resultsError && <p>{applied && Object.values(applied).some(Boolean) ? "No hay atenciones que coincidan con la búsqueda." : "No hay atenciones cerradas en este historial."}</p>}</div>
      </section>
      <section className="rounded-xl border border-divider bg-surface p-6"><h2 className="text-xl font-bold">Mis citas con este paciente</h2>{record.appointments.length ? <ul className="mt-3 space-y-3">{record.appointments.map(a => <li key={a.id}><Link href={`/medico/citas/${a.id}`} className="font-semibold text-primary">{formatAppointmentTime(a.scheduled_for)} · {a.specialty ?? "Revisión médica"}</Link><p>{appointmentStatusLabel(a.status)}</p></li>)}</ul> : <p>No hay citas propias registradas.</p>}</section>
      <section className="rounded-xl border border-divider bg-surface p-6"><h2 className="text-xl font-bold">Derivaciones autorizadas</h2>{record.referrals.length ? <ul className="mt-3 space-y-3">{record.referrals.map(r => <li key={r.id}><p>{r.specialty} · {referralStatusLabel[r.status]} · {referralPriorityLabel[r.priority]}</p><p>{r.reason}</p></li>)}</ul> : <p>No hay derivaciones autorizadas en esta historia.</p>}</section>
      {selected && <dialog ref={dialog} aria-label="Ficha clínica autorizada" onCancel={event => { if (event.target === event.currentTarget && !canCloseRecord()) event.preventDefault(); }} onClose={event => { if(event.target === event.currentTarget) setSelected(null); }} className="fixed inset-0 m-auto max-h-[90vh] w-[95vw] max-w-3xl overflow-auto rounded-2xl bg-surface p-6 backdrop:bg-black/40">
        <button type="button" autoFocus onClick={() => { if (canCloseRecord()) dialog.current?.close(); }} className="float-right rounded-lg border border-primary px-3 py-2 font-semibold text-primary">Cerrar ficha</button>
        <h2 className="mr-28 text-xl font-bold">{selected.chief_complaint ?? "Motivo no registrado"}</h2><p>{formatAppointmentTime(selected.occurred_at)}</p>
        {selected.accessReason === "REFERRAL_SOURCE" && <p className="font-semibold text-primary">Origen de derivación autorizado</p>}
        <p>Versión de ficha: {selected.encounter_type === "INITIAL" ? selected.reviewHistoryVersion ?? "—" : selected.specialtyHistoryVersion ?? "—"}</p>{selected.template && <p>Plantilla: versión {selected.template.version}</p>}
        <ClinicalWordDownload key={selected.id} encounterId={selected.id} />
        {selected.clinicalBackground ? <ClinicalBackgroundSummary version={selected.clinicalBackground} compact /> : <p className="mt-4">Sin antecedentes generales vinculados a esta atención.</p>}
        <h3 className="mt-5 font-bold">Evaluación</h3><p>{selected.assessment ?? "Sin evaluación registrada."}</p><h3 className="mt-4 font-bold">Diagnósticos</h3><p>{diagnoses.map(d => d.label).join(" · ") || "Sin diagnósticos registrados."}</p>
        <h3 className="mt-4 font-bold">Indicaciones</h3><p>{selected.instructions ?? "Sin indicaciones registradas."}</p><h3 className="mt-4 font-bold">Seguimiento</h3><p>{selected.follow_up_text ?? "Sin seguimiento registrado."}</p>
        {selected.encounter_type === "INITIAL" ? <ReviewSnapshot data={selected.reviewHistory} hideGeneral={Boolean(selected.clinicalBackground)} /> : <SpecialtySnapshot data={selected.specialtyHistory} />}
        <EncounterAmendments key={selected.id} encounterId={selected.id} onDirtyChange={dirty => { amendmentDirty.current=dirty; }} />
        <div className="mt-5"><MedicalDocuments patientId={patientId} encounterId={selected.id} editable={false} /></div>
      </dialog>}
    </>}
  </section>;
}
