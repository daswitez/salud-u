"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {apiJson,ApiRequestError} from "@/lib/api/client";
type Status="PENDING"|"PARTIAL"|"COMPLETE"|"INACTIVE";
type Dose={doseNumber:number;appliedOn:string;schemaVersion:number;lot:string;applicatorName:string};
type Vaccine={vaccineId:string;code:string;name:string;active:boolean;currentSchemaVersion:number|null;requiredDoseCount:number;completedDoseCount:number;status:Status;appliedDoses:Dose[]};
type Card={patientId:string;carnet:string;fullName:string;careerId:string|null;careerName:string|null;academicPeriod:string|null;vaccines:Vaccine[]};
const labels:Record<Status,string>={PENDING:"Pendiente",PARTIAL:"En curso",COMPLETE:"Completo",INACTIVE:"Vacuna desactivada"};
const tones:Record<Status,string>={PENDING:"bg-warning-container text-warning",PARTIAL:"bg-primary-container text-primary",COMPLETE:"bg-success-container text-success",INACTIVE:"bg-surface-secondary text-text-secondary"};
const day=(value:string)=>new Intl.DateTimeFormat("es-BO",{timeZone:"UTC",dateStyle:"medium"}).format(new Date(value+"T00:00:00Z"));
/** UC-27: carnet propio (estudiante) o de un paciente (Administración); el estado lo calcula Spring/PostgreSQL. */
export function VaccinationCard({patientId}:{patientId?:string}){
 const [card,setCard]=useState<Card|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[expired,setExpired]=useState(false);
 const request=useRef<AbortController|null>(null),feedback=useRef<HTMLParagraphElement>(null);
 const load=useCallback(async()=>{request.current?.abort();const controller=new AbortController();request.current=controller;setLoading(true);setError("");setExpired(false);setCard(null);
  try{const data=await apiJson<Card>("/api/vaccination-card"+(patientId?"?patientId="+encodeURIComponent(patientId):""),{signal:controller.signal});if(controller.signal.aborted)return;if(!data||!Array.isArray(data.vaccines))throw new Error("La respuesta del carnet de vacunación no es válida.");setCard(data);}
  catch(cause){if(controller.signal.aborted)return;setError(cause instanceof ApiRequestError&&cause.status===401?"Tu sesión expiró. Inicia sesión en otra pestaña y vuelve a consultar el carnet.":cause instanceof Error&&!(cause instanceof TypeError)?cause.message:"No se pudo consultar el carnet por un problema de conexión. Puedes reintentar.");setExpired(cause instanceof ApiRequestError&&cause.status===401);}
  finally{if(!controller.signal.aborted)setLoading(false);}},[patientId]);
 useEffect(()=>{const t=window.setTimeout(()=>void load(),0);return()=>{window.clearTimeout(t);request.current?.abort();};},[load]);
 useEffect(()=>{if(error)feedback.current?.focus();},[error]);
 const count=(status:Status)=>card?.vaccines.filter(v=>v.status===status).length??0;
 return <section aria-label="Carnet de vacunación" aria-busy={loading} className="space-y-5">
 <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">Carnet de vacunación</h1><p className="mt-2 text-text-secondary">Estado de cada vacuna según la versión vigente de su esquema. Las dosis conservan el esquema con que se aplicaron.</p></div><div className="flex gap-2 print:hidden"><button type="button" disabled={loading} onClick={()=>void load()} className="rounded-lg border border-primary px-3 py-2">Actualizar carnet</button>{card&&<button type="button" onClick={()=>window.print()} className="rounded-lg bg-primary px-3 py-2 font-semibold text-on-primary">Imprimir</button>}</div></header>
 {loading&&<p role="status">Consultando carnet…</p>}
 {error&&<p ref={feedback} tabIndex={-1} role="alert" className="rounded-lg bg-error-container p-4 text-error">{error}</p>}
 {expired&&<Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="font-semibold text-primary">Iniciar sesión en otra pestaña</Link>}
 {error&&!loading&&<button type="button" onClick={()=>void load()} className="rounded-lg border border-primary p-3">Reintentar carnet</button>}
 {card&&!loading&&<>
  <dl aria-label="Datos del estudiante" className="grid gap-3 rounded-xl border border-divider bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">{([["Estudiante",card.fullName],["Carnet",card.carnet],["Carrera",card.careerName??"Sin carrera registrada"],["Período académico",card.academicPeriod??"Sin matrícula registrada"]] as const).map(([k,v])=><div key={k}><dt className="text-sm text-text-secondary">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl>
  <p role="status">{card.vaccines.length} vacuna(s): {count("COMPLETE")} completa(s), {count("PARTIAL")} en curso, {count("PENDING")} pendiente(s){count("INACTIVE")?`, ${count("INACTIVE")} desactivada(s) con dosis`:""}.</p>
  {!card.vaccines.length&&<p>No hay vacunas activas en el catálogo ni dosis registradas.</p>}
  <div className="space-y-4">{card.vaccines.map(v=><article key={v.vaccineId} aria-label={`${v.name} (${v.code})`} data-vaccine-id={v.vaccineId} className="rounded-xl border border-divider bg-surface p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{v.name} <span className="font-normal text-text-secondary">· {v.code}</span></h2><span className={`rounded-full px-3 py-1 text-sm font-semibold ${tones[v.status]}`}>{labels[v.status]}</span></div>
   <p className="mt-1 text-sm">{v.status==="INACTIVE"?"Ya no se registran dosis nuevas; se conservan las aplicadas.":`${v.completedDoseCount} de ${v.requiredDoseCount} dosis del esquema vigente${v.currentSchemaVersion?` (versión ${v.currentSchemaVersion})`:""}.`}</p>
   {v.appliedDoses.length?<div className="mt-3 relative overflow-x-auto focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-container" tabIndex={0} role="region" aria-label="Tabla de dosis registradas, desplazable horizontalmente"><table aria-label={`Dosis de ${v.name}`} className="w-full text-left text-sm"><thead><tr>{["Dosis","Fecha","Lote","Aplicó"].map(h=><th key={h} scope="col" className="border-b p-2">{h}</th>)}</tr></thead><tbody>{v.appliedDoses.map(d=><tr key={d.doseNumber}><td className="border-b p-2">{d.doseNumber} <span className="text-text-secondary">(esquema v{d.schemaVersion})</span></td><td className="border-b p-2">{day(d.appliedOn)}</td><td className="border-b p-2">{d.lot}</td><td className="border-b p-2">{d.applicatorName}</td></tr>)}</tbody></table></div>:<p className="mt-2 text-sm">Sin dosis registradas.</p>}</article>)}</div></>}
 </section>;
}
