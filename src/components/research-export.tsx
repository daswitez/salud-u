"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {apiJson,ApiRequestError,type CareerOption} from "@/lib/api/client";
import {downloadResearchExport,type ResearchFilters,type ResearchFormat,type ResearchProvenance,type ResearchReceipt} from "@/lib/research-export";
import { replaceUrl } from "@/lib/url-state";
type Option={id:string;code:string;name:string};
type Vaccine={id:string;code:string;name:string;active:boolean};
const empty:ResearchFilters={from:"",to:"",careerId:"",specialtyId:"",vaccineId:""};
const keys=Object.keys(empty) as (keyof ResearchFilters)[];
const field="mt-2 block w-full rounded-lg border border-divider p-3";
const formats:{value:ResearchFormat;label:string;detail:string}[]=[{value:"CSV",label:"CSV en ZIP",detail:"research-data.csv y dictionary.csv"},{value:"XLSX",label:"Excel (XLSX)",detail:"hojas Research data y Dictionary"}];
const message=(cause:unknown,fallback:string)=>cause instanceof ApiRequestError&&cause.status===401?"Tu sesión expiró. Inicia sesión en otra pestaña y reintenta; la finalidad y los filtros se conservan.":cause instanceof ApiRequestError&&cause.status===403?"No tienes permiso para exportar datos de investigación.":cause instanceof Error&&!(cause instanceof TypeError)?cause.message:fallback;
/** H-INV / RF-34: el conjunto, el seudónimo y la procedencia se resuelven en Spring/PostgreSQL. */
export function ResearchExport(){
 const [purpose,setPurpose]=useState(""),[filters,setFilters]=useState<ResearchFilters>(empty),[format,setFormat]=useState<ResearchFormat>("CSV");
 const [careers,setCareers]=useState<CareerOption[]>([]),[specialties,setSpecialties]=useState<Option[]>([]),[vaccines,setVaccines]=useState<Vaccine[]>([]),[catalogError,setCatalogError]=useState("");
 const [exporting,setExporting]=useState(false),[error,setError]=useState(""),[purposeError,setPurposeError]=useState(false),[expired,setExpired]=useState(false);
 const [receipt,setReceipt]=useState<ResearchReceipt|null>(null),[provenance,setProvenance]=useState<ResearchProvenance|null>(null),[confirming,setConfirming]=useState(false),[confirmError,setConfirmError]=useState("");
 const request=useRef<AbortController|null>(null),feedback=useRef<HTMLParagraphElement>(null),purposeInput=useRef<HTMLTextAreaElement>(null),done=useRef<HTMLDivElement>(null);
 // Filtros y formato viven en la URL al cambiar (sin esperar respuestas) para sobrevivir a recargas.
 const persist=useCallback((f:ResearchFilters,fmt:ResearchFormat,exportId?:string)=>{const q=new URLSearchParams();keys.forEach(k=>{if(f[k])q.set(k,f[k]);});if(fmt!=="CSV")q.set("format",fmt);if(exportId)q.set("exportId",exportId);replaceUrl(window.location.pathname+(q.size?"?"+q:""));},[]);
 const confirm=useCallback(async(id:string,sentPurpose?:string)=>{setConfirming(true);setConfirmError("");
  try{const record=await apiJson<ResearchProvenance>("/api/research/exports/"+encodeURIComponent(id));if(record?.id!==id||!Number.isInteger(record.rowCount))throw new Error("La constancia de exportación no es válida.");if(sentPurpose!==undefined&&record.purpose!==sentPurpose)throw new Error("La finalidad registrada no coincide con la enviada. Revisa la constancia antes de usar el archivo.");setProvenance(record);}
  catch(cause){setProvenance(null);setConfirmError(message(cause,"No se pudo consultar la constancia por un problema de conexión."));}
  finally{setConfirming(false);}},[]);
 const catalogs=useCallback(async()=>{setCatalogError("");const [c,s,v]=await Promise.allSettled([apiJson<CareerOption[]>("/api/careers"),apiJson<Option[]>("/api/specialties"),apiJson<Vaccine[]>("/api/vaccines?includeInactive=true")]);
  if(c.status==="fulfilled")setCareers(c.value);if(s.status==="fulfilled")setSpecialties(s.value);if(v.status==="fulfilled")setVaccines(v.value);
  if([c,s,v].some(r=>r.status==="rejected"))setCatalogError("No se pudieron cargar todos los catálogos de filtros.");},[]);
 useEffect(()=>{const t=window.setTimeout(()=>{const q=new URLSearchParams(window.location.search),f={...empty};keys.forEach(k=>{f[k]=q.get(k)??"";});const fmt=q.get("format")==="XLSX"?"XLSX":"CSV";setFilters(f);setFormat(fmt);void catalogs();const id=q.get("exportId");if(id)void confirm(id);},0);return()=>{window.clearTimeout(t);request.current?.abort();};},[catalogs,confirm]);
 useEffect(()=>{if(error)(purposeError?purposeInput.current:feedback.current)?.focus();},[error,purposeError]);
 const change=(k:keyof ResearchFilters,v:string)=>{const next={...filters,[k]:v};setFilters(next);setReceipt(null);setProvenance(null);persist(next,format);};
 const submit=async()=>{const text=purpose.trim();setError("");setPurposeError(false);setExpired(false);setConfirmError("");
  if(text.length<3||text.length>300){setPurposeError(true);setError("Indica la finalidad de la exportación (entre 3 y 300 caracteres).");return;}
  request.current?.abort();const c=new AbortController();request.current=c;setExporting(true);setReceipt(null);setProvenance(null);
  try{const info=await downloadResearchExport(text,filters,format,c.signal);if(c.signal.aborted)return;setReceipt(info);persist(filters,format,info.id);await confirm(info.id,text);done.current?.focus();}
  catch(cause){if(c.signal.aborted||(cause instanceof DOMException&&cause.name==="AbortError"))return;setError(message(cause,"No se pudo exportar por un problema de conexión; no se descargó ningún archivo. Puedes reintentar."));setPurposeError(cause instanceof ApiRequestError&&cause.status===400&&/finalidad/i.test(cause.message));setExpired(cause instanceof ApiRequestError&&cause.status===401);}
  finally{if(!c.signal.aborted)setExporting(false);}};
 const label=(k:string,v:string)=>k==="careerId"?careers.find(c=>c.id===v)?.name??"Carrera seleccionada":k==="specialtyId"?specialties.find(s=>s.id===v)?.name??"Especialidad seleccionada":k==="vaccineId"?vaccines.find(x=>x.id===v)?.name??"Vacuna seleccionada":v;
 const titles:Record<string,string>={from:"Desde",to:"Hasta",careerId:"Carrera",specialtyId:"Especialidad",vaccineId:"Vacuna"};
 const select=(k:"careerId"|"specialtyId"|"vaccineId",title:string,options:{id:string;name:string;code:string;active?:boolean}[],all:string)=><label>{title}<select value={filters[k]} onChange={e=>change(k,e.target.value)} className={field}><option value="">{all}</option>{filters[k]&&!options.some(o=>o.id===filters[k])&&<option value={filters[k]}>{title} seleccionada</option>}{options.map(o=><option key={o.id} value={o.id}>{o.name} ({o.code}){o.active===false?" · desactivada":""}</option>)}</select></label>;
 return <section aria-label="Exportación para investigación" aria-busy={exporting} className="space-y-5"><header><h1 className="text-3xl font-bold">Exportación para investigación</h1><p className="mt-2">Descarga atenciones cerradas como conjunto seudonimizado con su diccionario de datos.</p></header>
 <section aria-label="Modo de exportación" className="rounded-xl border border-divider bg-surface p-5"><h2 className="text-lg font-bold">Modo: conjunto seudonimizado (política MONTHLY-V1)</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
  <li>Incluye: seudónimo, mes de atención, rango de edad, carrera, período, tipo de atención, especialidad, cantidad de diagnósticos y de dosis de vacuna.</li>
  <li>Excluye: carnet, código de registro, nombres, contacto, identificadores internos, fechas exactas y texto clínico.</li>
  <li>El seudónimo se mantiene dentro del mismo mes (hora de Bolivia) y cambia al mes siguiente; no se entrega clave de reidentificación.</li>
  <li>No requiere aprobación previa. Queda registrado quién exporta, la finalidad, los filtros, el formato y la cantidad de filas (máximo 10.000).</li></ul></section>
 <form aria-label="Solicitud de exportación" noValidate onSubmit={e=>{e.preventDefault();void submit();}} className="space-y-4 rounded-xl border border-divider bg-surface p-5"><fieldset disabled={exporting} className="space-y-4">
  <label className="block">Finalidad de la exportación<textarea ref={purposeInput} required minLength={3} maxLength={300} rows={3} value={purpose} aria-invalid={purposeError||undefined} aria-describedby="research-purpose-help" onChange={e=>{setPurpose(e.target.value);setPurposeError(false);setReceipt(null);setProvenance(null);}} className={field}/></label>
  <p id="research-purpose-help" className="text-sm text-text-secondary">Describe el estudio o análisis; queda registrada con la exportación. {purpose.trim().length}/300</p>
  <fieldset className="grid gap-4 md:grid-cols-3"><legend className="font-semibold">Filtros</legend>
   <label>Atenciones desde<input type="date" value={filters.from} onChange={e=>change("from",e.target.value)} className={field}/></label>
   <label>Atenciones hasta<input type="date" value={filters.to} onChange={e=>change("to",e.target.value)} className={field}/></label>
   {select("careerId","Carrera",careers,"Todas las carreras")}{select("specialtyId","Especialidad",specialties,"Todas las especialidades")}{select("vaccineId","Vacuna recibida",vaccines,"Sin filtro de vacuna")}
  </fieldset>
  <fieldset><legend className="font-semibold">Formato del archivo</legend><div className="mt-2 flex flex-wrap gap-4">{formats.map(f=><label key={f.value} className="flex items-center gap-2"><input type="radio" name="research-format" value={f.value} checked={format===f.value} onChange={()=>{setFormat(f.value);setReceipt(null);setProvenance(null);persist(filters,f.value);}}/>{f.label}<span className="text-sm text-text-secondary">({f.detail})</span></label>)}</div></fieldset>
  <div className="flex flex-wrap gap-3"><button type="submit" className="rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary">{exporting?"Generando archivo…":"Exportar y descargar"}</button><button type="button" onClick={()=>{setFilters(empty);setReceipt(null);setProvenance(null);persist(empty,format);}} className="rounded-lg border border-primary px-4 py-3">Limpiar filtros</button></div>
 </fieldset>
 {catalogError&&<p role="alert">{catalogError} Los filtros cargados siguen disponibles. <button type="button" onClick={()=>void catalogs()} className="underline">Reintentar catálogos</button></p>}</form>
 {exporting&&<p role="status">Generando y verificando el archivo…</p>}
 {error&&<p ref={feedback} tabIndex={-1} role="alert" className="rounded-lg bg-error-container p-4 text-error">{error}</p>}
 {expired&&<Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="font-semibold text-primary">Iniciar sesión en otra pestaña y conservar la solicitud</Link>}
 {(receipt||provenance||confirming||confirmError)&&<div ref={done} tabIndex={-1} aria-label="Resultado de la exportación" role="region" className="space-y-2 rounded-xl border border-divider bg-surface p-5">
  {receipt&&<p role="status">Archivo descargado y verificado: {receipt.rowCount} atención(es) · {receipt.format==="CSV"?"CSV en ZIP":"Excel (XLSX)"} · política {receipt.policy.replace(";"," · mes ")}.</p>}
  {confirming&&<p role="status">Confirmando el registro de la exportación…</p>}
  {confirmError&&<p role="alert">{confirmError} <button type="button" onClick={()=>{const id=receipt?.id??new URLSearchParams(window.location.search).get("exportId");if(id)void confirm(id,receipt?purpose.trim():undefined);}} className="underline">Reintentar confirmación</button></p>}
  {provenance&&<dl aria-label="Constancia de exportación" className="grid gap-2 sm:grid-cols-2">{([["Finalidad registrada",provenance.purpose],["Filtros",keys.filter(k=>provenance.filters[k]).map(k=>`${titles[k]}: ${label(k,String(provenance.filters[k]))}`).join(" · ")||"Sin filtros"],["Formato y filas",`${provenance.format} · ${provenance.rowCount} atención(es)`],["Política de seudónimo",`${provenance.policyVersion}${provenance.policyMonth?` · mes ${provenance.policyMonth}`:""}`],["Registrada",new Intl.DateTimeFormat("es-BO",{dateStyle:"medium",timeStyle:"short",timeZone:"America/La_Paz"}).format(new Date(provenance.createdAt))],["Identificador",provenance.id]] as const).map(([k,v])=><div key={k}><dt className="text-sm text-text-secondary">{k}</dt><dd className="break-words font-semibold">{v}</dd></div>)}</dl>}
  {provenance&&receipt&&<p role="status">Finalidad confirmada por el servidor.{!receipt.rowCount&&" El archivo no tiene filas para estos filtros, pero incluye encabezados y diccionario."}</p>}
 </div>}
 </section>;
}
