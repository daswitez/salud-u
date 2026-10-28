"use client";
import type { ConsentState } from "@/lib/consents";

export function ConsentFields({ state, terms, research, onTerms, onResearch }: { state: ConsentState; terms: boolean; research: boolean | null; onTerms: (value: boolean) => void; onResearch: (value: boolean) => void }) {
 return <div className="space-y-5" aria-label="Términos y consentimiento">
  <section><h3 className="font-bold">Términos de uso · versión {state.terms.currentVersion}</h3><p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-secondary p-4 text-sm leading-6">{state.terms.text}</p><label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={terms} onChange={e => onTerms(e.target.checked)} /> <span>Acepto los términos de uso</span></label></section>
  <fieldset><legend className="font-bold">Uso de datos para investigación · versión {state.research.currentVersion}</legend><p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-secondary p-4 text-sm leading-6">{state.research.text}</p><p className="mt-3 text-sm font-semibold">¿Aceptas el uso de tus datos para investigación?</p><div className="mt-2 flex gap-6"><label className="flex items-center gap-2"><input type="radio" name="research-consent" checked={research === true} onChange={() => onResearch(true)} /> Sí</label><label className="flex items-center gap-2"><input type="radio" name="research-consent" checked={research === false} onChange={() => onResearch(false)} /> No</label></div></fieldset>
 </div>;
}
