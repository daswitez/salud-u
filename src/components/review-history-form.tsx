"use client";

import type { ReviewHistoryDraft } from "@/lib/review-history";

type Props = {
  value: ReviewHistoryDraft;
  onChange: (next: ReviewHistoryDraft) => void;
  patientName: string;
  birthDate: string | null;
  scheduledFor: string;
};

function currentAge(birthDate: string | null) {
  if (!birthDate) return "No registrada";
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return `${age} años`;
}

const inputClass = "mt-2 w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary";
const areaClass = `${inputClass} resize-y`;
const historyFields: [keyof ReviewHistoryDraft["personalHistory"], string][] = [["pathological", "Patológicos"], ["surgical", "Quirúrgicos"], ["allergic", "Alérgicos"], ["regularMedications", "Medicamentos habituales"], ["familyRelevant", "Antecedentes familiares relevantes"]];
const examFields: [keyof ReviewHistoryDraft["physicalExam"], string][] = [["generalState", "Estado general"], ["cardiopulmonary", "Cardiopulmonar"], ["abdomen", "Abdomen"], ["otherFindings", "Otros hallazgos"]];
const laboratoryFields: [keyof ReviewHistoryDraft["laboratory"], string][] = [["hemogram", "Hemograma"], ["bloodGroup", "Grupo sanguíneo"], ["vdrl", "VDRL"], ["chagas", "Chagas"], ["coproparasitological", "Coproparasitológico"], ["other", "Otros"]];
const conductFields: [keyof ReviewHistoryDraft["conduct"], string][] = [["healthEducation", "Orientación y educación en salud"], ["treatment", "Tratamiento"], ["complementaryStudies", "Solicitud de estudios complementarios"], ["referral", "Derivación a especialidad"], ["medicalFollowUp", "Control médico"], ["noObservations", "Sin observaciones"]];

export function ReviewHistoryForm({ value, onChange, patientName, birthDate, scheduledFor }: Props) {
  const change = <K extends keyof ReviewHistoryDraft>(key: K, next: ReviewHistoryDraft[K]) => onChange({ ...value, [key]: next });
  const history = (key: keyof ReviewHistoryDraft["personalHistory"], next: string) => change("personalHistory", { ...value.personalHistory, [key]: next });
  const habit = (key: keyof ReviewHistoryDraft["habits"], next: ReviewHistoryDraft["habits"][typeof key]) => change("habits", { ...value.habits, [key]: next });
  const vital = (key: keyof ReviewHistoryDraft["vitals"], next: string) => change("vitals", { ...value.vitals, [key]: next });
  const exam = (key: keyof ReviewHistoryDraft["physicalExam"], next: string) => change("physicalExam", { ...value.physicalExam, [key]: next });
  const lab = (key: keyof ReviewHistoryDraft["laboratory"], next: string) => change("laboratory", { ...value.laboratory, [key]: next });
  const conduct = (key: keyof ReviewHistoryDraft["conduct"], checked: boolean) => {
    if (key === "noObservations") return change("conduct", { ...value.conduct, noObservations: checked, healthEducation: checked ? false : value.conduct.healthEducation, treatment: checked ? false : value.conduct.treatment, complementaryStudies: checked ? false : value.conduct.complementaryStudies, referral: checked ? false : value.conduct.referral, medicalFollowUp: checked ? false : value.conduct.medicalFollowUp });
    change("conduct", { ...value.conduct, [key]: checked, noObservations: checked ? false : value.conduct.noObservations });
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-primary">1. DATOS PERSONALES</p>
      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <p><span className="block text-text-secondary">Nombre y apellido</span><span className="font-semibold text-text-primary">{patientName}</span></p>
        <p><span className="block text-text-secondary">Fecha de atención</span><span className="font-semibold text-text-primary">{new Intl.DateTimeFormat("es-BO", { dateStyle: "long" }).format(new Date(scheduledFor))}</span></p>
        <p><span className="block text-text-secondary">Edad</span><span className="font-semibold text-text-primary">{currentAge(birthDate)}</span></p>
        <p><span className="block text-text-secondary">Sexo, carrera y semestre</span><span className="font-semibold text-text-primary">Datos administrativos del estudiante</span></p>
      </div>
    </section>

    <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-primary">3. ANTECEDENTES PERSONALES</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {historyFields.map(([key, label]) => <label key={key}><span className="text-sm font-semibold text-text-primary">{label}</span><textarea value={value.personalHistory[key]} onChange={(event) => history(key, event.target.value)} rows={3} className={areaClass} /></label>)}
      </div>
    </section>

    <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-primary">4. HÁBITOS Y ESTILO DE VIDA</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Choice label="Alimentación" value={value.habits.diet} onChange={(next) => habit("diet", next as ReviewHistoryDraft["habits"]["diet"])} options={[["", "No registrado"], ["ADEQUATE", "Adecuada"], ["REGULAR", "Regular"], ["INADEQUATE", "Inadecuada"]]} />
        <Choice label="Actividad física" value={value.habits.physicalActivity} onChange={(next) => habit("physicalActivity", next as ReviewHistoryDraft["habits"]["physicalActivity"])} options={[["", "No registrado"], ["YES", "Sí"], ["NO", "No"]]} />
        <Choice label="Tabaco" value={value.habits.tobacco} onChange={(next) => habit("tobacco", next as ReviewHistoryDraft["habits"]["tobacco"])} options={[["", "No registrado"], ["YES", "Sí"], ["NO", "No"]]} />
        <Choice label="Alcohol" value={value.habits.alcohol} onChange={(next) => habit("alcohol", next as ReviewHistoryDraft["habits"]["alcohol"])} options={[["", "No registrado"], ["YES", "Sí"], ["NO", "No"]]} />
      </div>
    </section>

    <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-primary">5. SIGNOS VITALES Y ANTROPOMETRÍA</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField label="PA sistólica" unit="mmHg" value={value.vitals.bloodPressureSystolic} onChange={(next) => vital("bloodPressureSystolic", next)} />
        <NumberField label="PA diastólica" unit="mmHg" value={value.vitals.bloodPressureDiastolic} onChange={(next) => vital("bloodPressureDiastolic", next)} />
        <NumberField label="FC" unit="lpm" value={value.vitals.heartRate} onChange={(next) => vital("heartRate", next)} />
        <NumberField label="FR" unit="rpm" value={value.vitals.respiratoryRate} onChange={(next) => vital("respiratoryRate", next)} />
        <NumberField label="Temperatura" unit="°C" step="0.1" value={value.vitals.temperature} onChange={(next) => vital("temperature", next)} />
        <NumberField label="SpO₂" unit="%" value={value.vitals.oxygenSaturation} onChange={(next) => vital("oxygenSaturation", next)} />
        <NumberField label="Peso" unit="kg" step="0.1" value={value.vitals.weight} onChange={(next) => vital("weight", next)} />
        <NumberField label="Talla" unit="m" step="0.01" value={value.vitals.height} onChange={(next) => vital("height", next)} />
      </div>
    </section>

    <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-primary">6. EXAMEN FÍSICO BREVE</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {examFields.map(([key, label]) => <label key={key}><span className="text-sm font-semibold text-text-primary">{label}</span><textarea value={value.physicalExam[key]} onChange={(event) => exam(key, event.target.value)} rows={3} className={areaClass} /></label>)}
      </div>
    </section>

    <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-primary">7. RESULTADOS DE LABORATORIO</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {laboratoryFields.map(([key, label]) => <label key={key}><span className="text-sm font-semibold text-text-primary">{label}</span><input value={value.laboratory[key]} onChange={(event) => lab(key, event.target.value)} className={inputClass} /></label>)}
      </div>
    </section>

    <section className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-primary">9. CONDUCTA</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {conductFields.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-divider p-3 text-sm text-text-primary"><input type="checkbox" checked={value.conduct[key]} onChange={(event) => conduct(key, event.target.checked)} className="size-4 accent-primary" />{label}</label>)}
      </div>
      <label className="mt-5 block"><span className="text-sm font-semibold text-text-primary">Observaciones e indicaciones</span><textarea value={value.observations} onChange={(event) => change("observations", event.target.value)} rows={4} className={areaClass} /></label>
    </section>
  </div>;
}

function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[] }) {
  return <label><span className="text-sm font-semibold text-text-primary">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>;
}

function NumberField({ label, unit, value, onChange, step = "1" }: { label: string; unit: string; value: string; onChange: (value: string) => void; step?: string }) {
  return <label><span className="text-sm font-semibold text-text-primary">{label}</span><div className="mt-2 flex items-center gap-2"><input type="number" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" /><span className="text-xs text-text-secondary">{unit}</span></div></label>;
}
