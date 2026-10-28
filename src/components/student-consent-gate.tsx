"use client";
import { useCallback, useEffect, useState } from "react";
import { apiJson } from "@/lib/api/client";
import type { ConsentState } from "@/lib/consents";
import { ConsentPanel } from "@/components/consent-panel";

export function StudentConsentGate({ children }: { children: React.ReactNode }) {
 const [status,setStatus]=useState<ConsentState | null>(null);const [error,setError]=useState("");
 const load=useCallback(async (signal?:AbortSignal)=>{try{const data=await apiJson<ConsentState>("/api/me/consents",{signal});if(!signal?.aborted){setStatus(data);setError("");}}catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"No se pudieron consultar los términos.");}},[]);
 useEffect(()=>{const c=new AbortController();const t=window.setTimeout(()=>void load(c.signal),0);return()=>{window.clearTimeout(t);c.abort();};},[load]);
 if(error)return <main className="mx-auto max-w-3xl p-8"><p role="alert">{error}</p><button type="button" onClick={()=>void load()} className="mt-4 font-semibold text-primary underline">Reintentar</button></main>;
 if(!status)return <main className="mx-auto max-w-3xl p-8" role="status">Consultando términos…</main>;
 if(status.pending)return <main className="mx-auto max-w-3xl p-8"><h1 className="mb-5 text-3xl font-bold">Antes de continuar</h1><ConsentPanel url="/api/me/consents" buttonLabel="Continuar" onSaved={()=>void load()} /></main>;
 return <>{children}</>;
}
