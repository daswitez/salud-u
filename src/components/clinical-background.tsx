"use client";

import { useState } from "react";

import { backgroundEntryText, emptyClinicalBackground, type ClinicalBackgroundDraft, type ClinicalBackgroundEntry, type ClinicalBackgroundVersion } from "@/lib/clinical-background";

const input = "mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary";
const labels = {
  allergies: "Alergias",
  personalConditions: "Enfermedades y antecedentes personales",
  surgeries: "Operaciones y antecedentes quirúrgicos",
  medications: "Medicamentos actuales",
  familyHistory: "Antecedentes familiares",
} as const;
const itemLabels: Record<keyof typeof labels, string> = {
  allergies: "alergia",
  personalConditions: "enfermedad o antecedente",
  surgeries: "operación",
  medications: "medicamento",
  familyHistory: "antecedente familiar",
};

export function ClinicalBackgroundSummary({ version, onEdit, compact = false }: { version: ClinicalBackgroundVersion | null; onEdit?: () => void; compact?: boolean }) {
  if (!version) return <section className="rounded-2xl border border-warning-container bg-warning-container p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-text-primary">Datos clínicos generales pendientes</h2><p className="mt-1 text-sm text-text-secondary">Registra alergias, medicamentos, antecedentes y hábitos antes de cerrar una atención.</p></div>{onEdit && <button type="button" onClick={onEdit} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary">Completar datos</button>}</div></section>;
  const data = version.data;
  const habit = (value: string, map: Record<string, string>) => map[value] ?? "No registrado";
  return <section className={`rounded-2xl border ${data.allergies.status === "PRESENT" ? "border-error bg-error-container/30" : "border-divider bg-surface"} ${compact ? "p-4" : "p-5 sm:p-6"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold tracking-wide text-primary">DATOS CLÍNICOS GENERALES</p><h2 className="mt-1 text-lg font-bold text-text-primary">Antecedentes compartidos por todas las áreas</h2><p className="mt-1 text-xs text-text-secondary">Versión {version.versionNo} · {version.verificationStatus === "NEEDS_REVIEW" ? "Pendiente de confirmación" : `Actualizada ${new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(new Date(version.recordedAt))}`}</p></div>{onEdit && <button type="button" onClick={onEdit} className="rounded-lg border border-primary px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary-container">Editar datos generales</button>}</div>
    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
      {(Object.entries(labels) as [keyof typeof labels, string][]).map(([key, label]) => <div key={key} className={key === "allergies" && data.allergies.status === "PRESENT" ? "rounded-lg bg-error-container p-3" : ""}><dt className="font-semibold text-text-primary">{label}</dt><dd className="mt-1 text-text-secondary">{backgroundEntryText(data[key])}</dd></div>)}
      <div className="sm:col-span-2"><dt className="font-semibold text-text-primary">Hábitos</dt><dd className="mt-1 text-text-secondary">Alimentación: {habit(data.habits.diet, { ADEQUATE: "adecuada", REGULAR: "regular", INADEQUATE: "inadecuada" })} · Actividad física: {habit(data.habits.physicalActivity, { YES: "sí", NO: "no" })} · Tabaco: {habit(data.habits.tobacco, { YES: "sí", NO: "no" })} · Alcohol: {habit(data.habits.alcohol, { YES: "sí", NO: "no" })}</dd></div>
    </dl>
  </section>;
}

export function ClinicalBackgroundModal({ open, initial, saving, error, required, onClose, onSave }: { open: boolean; initial: ClinicalBackgroundVersion | null; saving: boolean; error: string; required: boolean; onClose: () => void; onSave: (draft: ClinicalBackgroundDraft, reason: string) => Promise<void> | void }) {
  const [draft, setDraft] = useState<ClinicalBackgroundDraft>(initial?.data ?? emptyClinicalBackground());
  const [reason, setReason] = useState(initial ? "Actualización durante la atención" : "Registro inicial de antecedentes generales");
  if (!open) return null;
  const updateEntry = (key: keyof typeof labels, next: ClinicalBackgroundEntry) => setDraft({ ...draft, [key]: next });
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-3" role="presentation" onMouseDown={() => { if (!required) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="background-modal-title" onMouseDown={(event) => event.stopPropagation()} className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-primary">PERFIL CLÍNICO GENERAL</p><h2 id="background-modal-title" className="mt-1 text-2xl font-bold text-text-primary">{initial ? "Revisar antecedentes generales" : "Registrar antecedentes generales"}</h2><p className="mt-2 max-w-2xl text-sm text-text-secondary">Estos datos se comparten entre Revisión y todas las especialidades. Cada modificación crea una versión nueva y las consultas cerradas conservan la versión que utilizaron.</p></div>{!required && <button type="button" onClick={onClose} className="rounded-lg p-2 text-xl text-text-secondary hover:bg-surface-secondary" aria-label="Cerrar">×</button>}</div>
      {initial?.verificationStatus === "NEEDS_REVIEW" && <p className="mt-5 rounded-xl bg-warning-container p-4 text-sm text-warning">Estos datos se recuperaron de una ficha anterior. Revísalos y guárdalos para confirmarlos.</p>}
      {error && <p className="mt-5 rounded-xl bg-error-container p-4 text-sm text-error">{error}</p>}
      <form onSubmit={(event) => { event.preventDefault(); void onSave(draft, reason); }} className="mt-6 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">{(Object.entries(labels) as [keyof typeof labels, string][]).map(([key, label]) => <BackgroundField key={key} label={label} itemLabel={itemLabels[key]} value={draft[key]} onChange={(next) => updateEntry(key, next)} />)}</div>
        <fieldset className="rounded-xl border border-divider p-4"><legend className="px-2 font-bold text-text-primary">Hábitos y estilo de vida</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Choice label="Alimentación" value={draft.habits.diet} options={[['','No registrado'],['ADEQUATE','Adecuada'],['REGULAR','Regular'],['INADEQUATE','Inadecuada']]} onChange={(value) => setDraft({ ...draft, habits: { ...draft.habits, diet: value as ClinicalBackgroundDraft['habits']['diet'] } })} /><Choice label="Actividad física" value={draft.habits.physicalActivity} options={[['','No registrado'],['YES','Sí'],['NO','No']]} onChange={(value) => setDraft({ ...draft, habits: { ...draft.habits, physicalActivity: value as ClinicalBackgroundDraft['habits']['physicalActivity'] } })} /><Choice label="Tabaco" value={draft.habits.tobacco} options={[['','No registrado'],['YES','Sí'],['NO','No']]} onChange={(value) => setDraft({ ...draft, habits: { ...draft.habits, tobacco: value as ClinicalBackgroundDraft['habits']['tobacco'] } })} /><Choice label="Alcohol" value={draft.habits.alcohol} options={[['','No registrado'],['YES','Sí'],['NO','No']]} onChange={(value) => setDraft({ ...draft, habits: { ...draft.habits, alcohol: value as ClinicalBackgroundDraft['habits']['alcohol'] } })} /></div></fieldset>
        <label className="block"><span className="text-sm font-semibold text-text-primary">Motivo de actualización</span><input required value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className={input} /></label>
        <div className="flex flex-wrap justify-end gap-3">{!required && <button type="button" onClick={onClose} className="rounded-lg border border-divider px-5 py-3 text-sm font-semibold text-text-primary">Cancelar</button>}<button disabled={saving} className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-50">{saving ? "Guardando…" : initial?.verificationStatus === "NEEDS_REVIEW" ? "Confirmar y continuar" : "Guardar datos generales"}</button></div>
      </form>
    </section>
  </div>;
}

function BackgroundField({ label, itemLabel, value, onChange }: { label: string; itemLabel: string; value: ClinicalBackgroundEntry; onChange: (next: ClinicalBackgroundEntry) => void }) {
  const setStatus = (status: ClinicalBackgroundEntry["status"]) => onChange({ status, items: status === "PRESENT" ? (value.items.length ? value.items : [""]) : [] });
  const updateItem = (index: number, item: string) => onChange({ ...value, items: value.items.map((current, currentIndex) => currentIndex === index ? item : current) });
  const removeItem = (index: number) => onChange({ ...value, items: value.items.length === 1 ? [""] : value.items.filter((_, currentIndex) => currentIndex !== index) });
  const addItem = () => {
    if (value.items.length < 50) onChange({ ...value, items: [...value.items, ""] });
  };
  return <fieldset className="rounded-xl border border-divider p-4"><legend className="px-2 font-bold text-text-primary">{label}</legend><div className="grid gap-2 sm:grid-cols-3">{([['PRESENT','Sí'],['NONE','Niega'],['UNKNOWN','No conocido']] as const).map(([status, text]) => <label key={status} className="flex items-center gap-2 text-sm"><input type="radio" name={label} checked={value.status === status} onChange={() => setStatus(status)} className="accent-primary" />{text}</label>)}</div>{value.status === "PRESENT" && <div className="mt-4 rounded-xl border border-primary-200 bg-primary-container/35 p-3"><div className="space-y-2">{value.items.map((item, index) => <div key={index} className="flex items-center gap-2"><input required value={item} onChange={(event) => updateItem(index, event.target.value)} maxLength={500} placeholder={`Escribe ${itemLabel}`} aria-label={`${label} ${index + 1}`} className="min-w-0 flex-1 rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" /><button type="button" onClick={() => removeItem(index)} className="grid size-10 shrink-0 place-items-center rounded-lg border border-divider bg-surface text-lg text-error hover:bg-error-container" aria-label={`Quitar ${itemLabel}`}>×</button></div>)}</div><button type="button" onClick={addItem} disabled={value.items.length >= 50} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary px-3 py-2.5 text-sm font-bold text-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"><span aria-hidden="true" className="text-xl leading-none">+</span>Añadir {itemLabel}</button></div>}</fieldset>;
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string,string])[]; onChange: (value: string) => void }) {
  return <label><span className="text-sm font-semibold text-text-primary">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={input}>{options.map(([id,text]) => <option key={id} value={id}>{text}</option>)}</select></label>;
}
