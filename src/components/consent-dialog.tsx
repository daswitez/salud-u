"use client";
import { useEffect, useRef } from "react";
import { ConsentPanel } from "@/components/consent-panel";
import type { ConsentAnswer } from "@/lib/consents";

export function ConsentDialog({ patientId, onSubmit, onCancel }: { patientId: string; onSubmit: (answer: ConsentAnswer) => Promise<void>; onCancel: () => void }) {
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=dialog.current;node?.showModal();return()=>{node?.close();};},[]);
 return <dialog ref={dialog} onCancel={event=>{event.preventDefault();onCancel();}} aria-label="Consentimiento pendiente" className="fixed inset-0 m-auto max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto rounded-2xl bg-surface p-5 backdrop:bg-black/50"><ConsentPanel url={`/api/patients/${patientId}/consents`} title="Consentimiento pendiente" buttonLabel="Guardar y crear solicitud" onSubmit={onSubmit} /><button type="button" onClick={onCancel} className="mt-3 rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Cancelar</button></dialog>;
}
