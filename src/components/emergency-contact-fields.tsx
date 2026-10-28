"use client";
import { relationshipLabels, type EmergencyContact, type Relationship } from "@/lib/emergency-contact";

export function EmergencyContactFields({ value, onChange }: { value: EmergencyContact; onChange: (value: EmergencyContact) => void }) {
  const cls = "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5";
  return <div className="grid gap-4 sm:grid-cols-2">
    <label className="sm:col-span-2"><span className="text-sm font-semibold">Nombre completo del contacto</span><input required maxLength={160} value={value.fullName} onChange={e => onChange({ ...value, fullName: e.target.value })} className={cls} /></label>
    <label><span className="text-sm font-semibold">Parentesco</span><select required value={value.relationship} onChange={e => onChange({ ...value, relationship: e.target.value as Relationship })} className={cls}>{Object.entries(relationshipLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label><span className="text-sm font-semibold">Teléfono del contacto</span><input required type="tel" maxLength={40} value={value.phone} onChange={e => onChange({ ...value, phone: e.target.value })} className={cls} /></label>
  </div>;
}

export function PatientSexField({ value, onChange, canBeUnregistered = true }: { value: string; onChange: (value: string) => void; canBeUnregistered?: boolean }) {
  return <label><span className="text-sm font-semibold">Sexo (opcional)</span><select value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5"><option value="" disabled={!canBeUnregistered}>Sin registrar</option><option value="FEMALE">Femenino</option><option value="MALE">Masculino</option><option value="NOT_RECORDED">No declara</option></select></label>;
}
