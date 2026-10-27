"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiEnvelope, apiJson, ApiRequestError } from "@/lib/api/client";
import { downloadClinicalReport, type ExportFormat, type ExportReceipt, type ExportRecord } from "@/lib/clinical-report-export";
import type { Filters, Specialty } from "@/lib/clinical-reports";
import { defaultOptions, groupDimensions, optionsFromQuery, optionsQuery, reportCell, reportColumns, todayInBolivia, type ReportOptions, type ReportResult } from "@/lib/clinical-reports";
import { replaceUrl } from "@/lib/url-state";

const periods={TODAY:"Hoy",SEVEN_DAYS:"Últimos 7 días",THIRTY_DAYS:"Últimos 30 días",MONTH:"Este mes",SEMESTER:"Semestre actual",YEAR:"Año actual"};
function dateRange(preset:keyof typeof periods){const today=todayInBolivia(),[year,month,day]=today.split("-").map(Number);const offset=(n:number)=>new Date(Date.UTC(year,month-1,day+n)).toISOString().slice(0,10);return {from:preset==="TODAY"?today:preset==="SEVEN_DAYS"?offset(-6):preset==="THIRTY_DAYS"?offset(-29):preset==="MONTH"?today.slice(0,8)+"01":preset==="SEMESTER"?year+"-"+(month<=6?"01":"07")+"-01":year+"-01-01",to:today};}

export function ClinicalReportBuilder({scope}:{scope:"administrative"|"medical"}){
  const [resetEpoch,setResetEpoch]=useState(0);
  const [draft,setDraft]=useState<ReportOptions>(defaultOptions),[result,setResult]=useState<ReportResult|null>(null),[loading,setLoading]=useState(true);
  const [specialties,setSpecialties]=useState<Specialty[]>([]),[catalogError,setCatalogError]=useState(""),[catalogLoading,setCatalogLoading]=useState(false);
  const [error,setError]=useState(""),[expired,setExpired]=useState(false),[purpose,setPurpose]=useState("Gestión clínica"),[exporting,setExporting]=useState(false);
  const [provenance,setProvenance]=useState<ExportRecord|null>(null);
  const [exportError,setExportError]=useState(""),[exportExpired,setExportExpired]=useState(false),[receipt,setReceipt]=useState<ExportReceipt|null>(null);
  const exportFeedback=useRef<HTMLParagraphElement>(null),exportRequest=useRef<AbortController|null>(null);
  useEffect(()=>()=>exportRequest.current?.abort(),[]);
  useEffect(()=>{if(exportError)exportFeedback.current?.focus();},[exportError]);
  const request=useRef<AbortController|null>(null),lastAttempt=useRef(""),feedback=useRef<HTMLParagraphElement>(null),saving=useRef(false);
  const fetchReport=useCallback(async(query:string,hydrate=false,receiptId:string|null=null)=>{
    request.current?.abort();const controller=new AbortController();request.current=controller;lastAttempt.current=query;setReceipt(null);setProvenance(null);setExportError("");setExportExpired(false);setLoading(true);setResult(null);setError("");setExpired(false);
    try{const response=await apiEnvelope<ReportResult>("/api/reports/clinical?"+query,{signal:controller.signal});if(controller.signal.aborted)return;
      if(!Array.isArray(response.data)||!response.filters||!response.presentation)throw new Error("El servidor no devolvió el contrato completo del reporte.");
      setResult(response);if(hydrate)setDraft(optionsFromQuery(query));
      const location=new URLSearchParams(query);
      if(receiptId){
        location.set("exportId",receiptId);
        try{const record=await apiJson<ExportRecord>(`/api/reports/clinical/exports/${encodeURIComponent(receiptId)}`,{signal:controller.signal});if(controller.signal.aborted)return;if(record.id!==receiptId||!Number.isInteger(record.rowCount)||record.rowCount<0||record.rowCount>10000)throw new Error("La constancia de exportación no es válida.");setProvenance(record);setPurpose(record.purpose);}
        catch(cause){if(controller.signal.aborted)return;setExportError(cause instanceof Error?cause.message:"No se pudo recuperar la constancia de exportación.");setExportExpired(cause instanceof ApiRequestError&&cause.status===401);}
      }
      replaceUrl(window.location.pathname+"?"+location);
    }catch(cause){if(controller.signal.aborted)return;setError(cause instanceof Error&&!(cause instanceof TypeError)?cause.message:"No se pudo consultar el reporte por un problema de conexión. Puedes reintentar.");setExpired(cause instanceof ApiRequestError&&cause.status===401);}
    finally{if(!controller.signal.aborted)setLoading(false);}
  },[]);
  const fetchCatalog=useCallback(async()=>{setCatalogLoading(true);setCatalogError("");try{setSpecialties(await apiJson<Specialty[]>("/api/specialties"));}catch(cause){setCatalogError(cause instanceof Error?cause.message:"No se pudieron cargar las especialidades.");}finally{setCatalogLoading(false);}},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>{const initialQuery=new URLSearchParams(window.location.search);const receiptId=initialQuery.get("exportId");initialQuery.delete("exportId");const query=initialQuery.toString();const options=query?optionsFromQuery(query):defaultOptions();setDraft(options);void fetchReport(query?(()=>{const q=new URLSearchParams(query);if(!q.has("columns"))q.set("columns",JSON.stringify(options.columns));if(!q.has("groupBy"))q.set("groupBy","[]");return q.toString();})():optionsQuery(options),false,receiptId);void fetchCatalog();},0);return()=>{window.clearTimeout(timer);request.current?.abort();};},[fetchReport,fetchCatalog]);
  useEffect(()=>{if(error)feedback.current?.focus();},[error]);
  function filter<K extends keyof Filters>(key:K,value:Filters[K]){setDraft(d=>({...d,filters:{...d.filters,[key]:value}}));}
  async function exportReport(format:ExportFormat){
    if(!result||loading||saving.current)return;const controller=new AbortController();exportRequest.current=controller;saving.current=true;setExporting(true);setExportError("");setExportExpired(false);setReceipt(null);setProvenance(null);
    try{const info=await downloadClinicalReport(result,format,purpose,controller.signal);if(!controller.signal.aborted){setReceipt(info);const location=new URL(window.location.href);location.searchParams.set("exportId",info.id);replaceUrl(location.pathname+location.search);}}
    catch(cause){if(controller.signal.aborted)return;setExportError(cause instanceof Error&&!(cause instanceof TypeError)?cause.message:"No se pudo descargar el archivo por un problema de conexión. Puedes reintentar.");setExportExpired(cause instanceof ApiRequestError&&cause.status===401);}
    finally{saving.current=false;exportRequest.current=null;if(!controller.signal.aborted)setExporting(false);}
  }
  const table=(rows:ReportResult["data"],key:string)=> <div key={key} className="relative overflow-x-auto focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-container" tabIndex={0} role="region" aria-label={`${key}, desplazable horizontalmente`}><table aria-label={key} className="w-full text-left text-sm"><thead><tr>{result?.presentation.columns.map(c=><th key={c} scope="col" className="whitespace-nowrap border-b border-divider px-3 py-3">{reportColumns[c]}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.encounter_id} data-report-encounter-id={row.encounter_id}>{result?.presentation.columns.map(c=><td key={c} className="min-w-32 max-w-96 whitespace-pre-wrap border-b border-divider px-3 py-3">{reportCell(row,c)}</td>)}</tr>)}</tbody></table></div>;
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold">{scope==="medical"?"Mis reportes de atención":"Reporte institucional"}</h1><p className="mt-2">Consulta atenciones cerradas con los datos históricos permitidos por tu rol. Los criterios de cada lista se combinan: se deben cumplir todos.</p></header>
    <form key={resetEpoch} aria-label="Construir reporte clínico" onSubmit={event=>{event.preventDefault();void fetchReport(optionsQuery(draft));}} className="rounded-2xl border border-divider bg-surface p-5">
      <fieldset disabled={loading||exporting} className="space-y-5"><legend className="font-semibold">Filtros y presentación</legend>
        <div className="flex flex-wrap gap-2">{Object.entries(periods).map(([key,label])=><button key={key} type="button" onClick={()=>{const next={...draft,filters:{...draft.filters,...dateRange(key as keyof typeof periods)}};setDraft(next);void fetchReport(optionsQuery(next));}} className="rounded-lg border border-divider px-3 py-2">{label}</button>)}</div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Desde" type="date" value={draft.filters.from} onChange={v=>filter("from",v)}/><Field label="Hasta" type="date" value={draft.filters.to} onChange={v=>filter("to",v)}/>
          <Select label="Tipo" value={draft.filters.encounterType} onChange={v=>filter("encounterType",v)} options={[["","Todos"],["INITIAL","Revisión"],["SPECIALTY","Especialidad"]]}/>
          <Select label="Especialidad" value={draft.filters.specialtyId} onChange={v=>filter("specialtyId",v)} options={[["","Todas"],...specialties.map(s=>[s.id,s.name])]}/>
          <Field label="Diagnóstico" value={draft.filters.diagnosis} onChange={v=>filter("diagnosis",v)}/>
          <CriteriaField label="Alergias" values={draft.filters.allergies} onChange={v=>filter("allergies",v)}/>
          <CriteriaField label="Antecedentes, cirugías o medicamentos" values={draft.filters.histories} onChange={v=>filter("histories",v)}/>
          <CriteriaField label="Hábitos, actividad o alimentación" values={draft.filters.habitTerms} onChange={v=>filter("habitTerms",v)}/>
          <fieldset className="space-y-2"><legend>Hábitos afirmativos</legend>{[["tobacco","Tabaco"],["alcohol","Alcohol"],["physicalActivity","Actividad física"]].map(([key,label])=><label key={key} className="mr-3 inline-flex gap-2"><input type="checkbox" checked={draft.filters.positiveHabits.includes(key)} onChange={e=>filter("positiveHabits",e.target.checked?[...draft.filters.positiveHabits,key]:draft.filters.positiveHabits.filter(h=>h!==key))}/>{label}</label>)}</fieldset>
          <Field label="Buscar en la atención" value={draft.filters.search} onChange={v=>filter("search",v)}/>
        </div>
        {catalogLoading&&<p role="status">Cargando especialidades…</p>}{catalogError&&<p role="alert" className="text-error">{catalogError} <button type="button" onClick={()=>void fetchCatalog()} className="underline">Reintentar especialidades</button></p>}
        <fieldset className="flex flex-wrap gap-4"><legend className="mb-2 font-semibold">Columnas del reporte</legend>{Object.entries(reportColumns).map(([key,label])=><label key={key} className="inline-flex gap-2"><input type="checkbox" checked={draft.columns.includes(key)} onChange={e=>setDraft(d=>({...d,columns:e.target.checked?[...d.columns,key]:d.columns.filter(c=>c!==key)}))}/>{label}</label>)}</fieldset>
        <div className="grid gap-4 md:grid-cols-2"><Select label="Agrupar por" value={draft.groupBy[0]??""} onChange={v=>setDraft(d=>({...d,groupBy:v?[v]:[]}))} options={[["","Sin agrupación"],...Object.entries(groupDimensions)]}/><Select disabled={!draft.groupBy.length} label="Segunda agrupación" value={draft.groupBy[1]??""} onChange={v=>setDraft(d=>({...d,groupBy:d.groupBy[0]?[d.groupBy[0],...(v?[v]:[])]:[]}))} options={[["","Ninguna"],...Object.entries(groupDimensions).filter(([key])=>key!==draft.groupBy[0])]}/></div>
        <div className="flex gap-3"><button type="submit" className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary">Aplicar filtros</button><button type="button" onClick={()=>{const next=defaultOptions();setResetEpoch(n=>n+1);setDraft(next);void fetchReport(optionsQuery(next));}} className="rounded-lg border border-primary px-4 py-3">Restablecer</button></div>
      </fieldset>
    </form>
    {error&&<p ref={feedback} tabIndex={-1} role="alert" className="rounded-lg bg-error-container p-4 text-error">{error}</p>}
    {expired&&<Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="block font-semibold text-primary">Iniciar sesión en otra pestaña y conservar los filtros</Link>}
    {!loading&&error&&<button type="button" onClick={()=>void fetchReport(lastAttempt.current)} className="rounded-lg border border-primary px-4 py-2">Reintentar reporte</button>}
    {loading&&<p role="status">Actualizando reporte…</p>}
    {result&&!loading&&<section aria-label="Resultado aplicado" className="space-y-4 rounded-2xl border border-divider bg-surface p-5">
      <h2 className="text-xl font-bold">{result.data.length} atención(es) encontradas</h2><p>Desde {result.filters.from||"Últimos 30 días"} hasta {result.filters.to||"Hoy"} · Columnas: {result.presentation.columns.map(c=>reportColumns[c]).join(", ")}</p>
      <p>Filtros aplicados: {[result.filters.diagnosis,...result.filters.allergies??[],...result.filters.histories??[],...result.filters.habitTerms??[],result.filters.search].filter(Boolean).join(" · ")||"Sin criterios de texto"}</p>
      {!result.data.length?<p>No hay atenciones para estos filtros.</p>:result.presentation.groupBy.length?result.presentation.groups.map((group,i)=><section key={i} aria-label={"Grupo "+(i+1)}><h3 className="my-3 font-semibold">{group.key.map((value,j)=>groupDimensions[result.presentation.groupBy[j]]+": "+(value===null?"Sin especialidad":value==="INITIAL"?"Revisión":value==="SPECIALTY"?"Especialidad":value)).join(" · ")} · {group.count} atención(es)</h3>{table(group.encounterIds.flatMap(id=>result.data.find(r=>r.encounter_id===id)??[]),"Detalle del grupo "+(i+1))}</section>):table(result.data,"Atenciones del reporte")}
      <form aria-label="Exportar reporte clínico" aria-busy={exporting} onSubmit={event=>{event.preventDefault();const format=(event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");if(format==="CSV"||format==="XLSX"||format==="PDF")void exportReport(format);}} className="space-y-3 border-t border-divider pt-4">
        <fieldset disabled={exporting} className="space-y-3"><Field label="Finalidad de exportación" value={purpose} onChange={value=>{setPurpose(value);setReceipt(null);}}/>
        <p className="text-sm">Se verifican los permisos y las atenciones al descargar. El archivo respeta las columnas y agrupaciones aplicadas; la cantidad puede variar si hubo cambios.</p>
        <div className="flex gap-3">{(["CSV","XLSX","PDF"] as const).map(format=><button key={format} type="submit" value={format} className="rounded-lg border border-primary px-3 py-2 disabled:opacity-50">{format==="XLSX"?"Excel":format}</button>)}</div></fieldset>
        {exporting&&<p role="status">Preparando archivo completo…</p>}
        {exportError&&<p ref={exportFeedback} tabIndex={-1} role="alert" className="rounded-lg bg-error-container p-4 text-error">{exportError}</p>}
        {exportExpired&&<Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="block font-semibold text-primary">Iniciar sesión en otra pestaña y conservar la finalidad</Link>}
        {provenance&&<p role="status">Última exportación registrada: {provenance.format} · {provenance.state==="COMPLETED"?"Archivo generado":"Generación fallida"} · {provenance.rowCount} atención(es). Finalidad: {provenance.purpose}.</p>}
        {receipt&&<p role="status">Archivo {receipt.format} preparado con {receipt.rowCount} atención(es). Revisa las descargas del navegador.</p>}
      </form>
    </section>}
  </div>;
}
function CriteriaField({label,values,onChange}:{label:string;values:string[];onChange:(v:string[])=>void}){
  const [draft,setDraft]=useState("");const add=()=>{const value=draft.trim();if(!value||values.includes(value))return;onChange([...values,value]);setDraft("");};
  return <div className="space-y-2"><label className="block">{label}<input maxLength={200} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}}} className="mt-2 block w-full rounded-lg border border-divider px-3 py-2"/></label><button type="button" aria-label={"Agregar "+label} onClick={add} disabled={values.length>=15} className="rounded-lg border border-divider px-3 py-1">Agregar</button><p className="text-xs text-text-secondary">Pulsa Agregar o Enter para incluir cada criterio.</p><ul>{values.map(v=><li key={v}>{v} <button type="button" aria-label={"Quitar "+v} onClick={()=>onChange(values.filter(x=>x!==v))}>×</button></li>)}</ul></div>;
}
function Field({label,type="text",value,onChange}:{label:string;type?:string;value:string;onChange:(v:string)=>void}){return <label className="block">{label}<input required={label==="Finalidad de exportación"} type={type} value={value} maxLength={type==="date"?undefined:label==="Finalidad de exportación"?300:200} onChange={e=>onChange(e.target.value)} className="mt-2 block w-full rounded-lg border border-divider px-3 py-2"/></label>;}
function Select({label,value,onChange,options,disabled=false}:{label:string;value:string;onChange:(v:string)=>void;options:string[][];disabled?:boolean}){return <label className="block">{label}<select disabled={disabled} value={value} onChange={e=>onChange(e.target.value)} className="mt-2 block w-full rounded-lg border border-divider px-3 py-2">{options.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>;}
