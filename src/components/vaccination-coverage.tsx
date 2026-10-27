"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {apiJson,ApiRequestError,type CareerOption} from "@/lib/api/client";
import { replaceUrl } from "@/lib/url-state";
type Row={vaccineId:string;vaccineCode:string;vaccineName:string;careerId:string;careerName:string;academicPeriod:string;totalStudents:number;completedSchedules:number;coveragePercentage:number|null};
type Filters={careerId:string;academicPeriod:string};
const empty:Filters={careerId:"",academicPeriod:""};
const field="mt-2 block w-full rounded-lg border border-divider p-3";
const percent=(value:number|null)=>value===null?"—":new Intl.NumberFormat("es-BO",{maximumFractionDigits:2}).format(value)+" %";
/** UC-27: cobertura institucional agregada; reglas y conteos en Spring/PostgreSQL. */
export function VaccinationCoverage(){
 const [draft,setDraft]=useState<Filters>(empty),[applied,setApplied]=useState<Filters|null>(null),[rows,setRows]=useState<Row[]|null>(null),[careers,setCareers]=useState<CareerOption[]>([]),[catalogError,setCatalogError]=useState("");
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[expired,setExpired]=useState(false);const request=useRef<AbortController|null>(null),feedback=useRef<HTMLParagraphElement>(null),last=useRef<Filters>(empty);
 const load=useCallback(async(f:Filters)=>{request.current?.abort();const c=new AbortController();request.current=c;last.current=f;setLoading(true);setRows(null);setError("");setExpired(false);
  try{const q=new URLSearchParams();if(f.careerId)q.set("careerId",f.careerId);if(f.academicPeriod.trim())q.set("academicPeriod",f.academicPeriod.trim());const data=await apiJson<Row[]>("/api/reports/vaccination-coverage?"+q,{signal:c.signal});if(c.signal.aborted)return;if(!Array.isArray(data))throw new Error("La respuesta de cobertura no es válida.");setRows(data);setApplied(f);replaceUrl(window.location.pathname+(q.size?"?"+q:""));}
  catch(cause){if(c.signal.aborted)return;setError(cause instanceof ApiRequestError&&cause.status===401?"Tu sesión expiró. Inicia sesión en otra pestaña y reintenta; los filtros se conservan.":cause instanceof ApiRequestError&&cause.status===403?"No tienes permiso para consultar la cobertura de vacunación.":cause instanceof Error&&!(cause instanceof TypeError)?cause.message:"No se pudo consultar la cobertura por un problema de conexión. Puedes reintentar.");setExpired(cause instanceof ApiRequestError&&cause.status===401);}
  finally{if(!c.signal.aborted)setLoading(false);}},[]);
 const catalog=useCallback(async()=>{try{setCareers(await apiJson<CareerOption[]>("/api/careers"));setCatalogError("");}catch{setCatalogError("No se pudieron cargar las carreras.");}},[]);
 useEffect(()=>{const t=window.setTimeout(()=>{const q=new URLSearchParams(window.location.search),f={careerId:q.get("careerId")??"",academicPeriod:q.get("academicPeriod")??""};setDraft(f);void load(f);void catalog();},0);return()=>{window.clearTimeout(t);request.current?.abort();};},[load,catalog]);
 useEffect(()=>{if(error)feedback.current?.focus();},[error]);
 return <section aria-label="Cobertura de vacunación" aria-busy={loading} className="space-y-5"><header><h1 className="text-3xl font-bold">Cobertura de vacunación</h1><p className="mt-2">Estudiantes con el esquema vigente completo, por vacuna activa, carrera y período. Sin período se consideran las matrículas vigentes hoy (hora de Bolivia).</p></header>
 <form aria-label="Filtros de cobertura" onSubmit={e=>{e.preventDefault();void load(draft);}} className="rounded-xl border border-divider bg-surface p-5"><fieldset disabled={loading} className="grid gap-4 md:grid-cols-2"><legend>Filtros institucionales</legend>
  <label>Carrera<select value={draft.careerId} onChange={e=>setDraft({...draft,careerId:e.target.value})} className={field}><option value="">Todas</option>{draft.careerId&&!careers.some(c=>c.id===draft.careerId)&&<option value={draft.careerId}>Carrera seleccionada</option>}{careers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  <label>Período académico<input value={draft.academicPeriod} onChange={e=>setDraft({...draft,academicPeriod:e.target.value})} placeholder="Vacío: matrículas vigentes" className={field}/></label>
  <button type="submit" className="rounded-lg bg-primary p-3 font-semibold text-on-primary">Aplicar filtros</button><button type="button" onClick={()=>{setDraft(empty);void load(empty);}} className="rounded-lg border border-primary p-3">Limpiar filtros</button></fieldset>
  {catalogError&&<p role="alert">{catalogError} <button type="button" onClick={()=>void catalog()} className="underline">Reintentar carreras</button></p>}</form>
 {loading&&<p role="status">Consultando cobertura…</p>}
 {error&&<p ref={feedback} tabIndex={-1} role="alert" className="rounded-lg bg-error-container p-4 text-error">{error}</p>}
 {expired&&<Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener" className="font-semibold text-primary">Iniciar sesión en otra pestaña y conservar los filtros</Link>}
 {error&&!loading&&<button type="button" onClick={()=>void load(last.current)} className="rounded-lg border border-primary p-3">Reintentar cobertura</button>}
 {rows&&!loading&&<section aria-label="Resultado de cobertura" className="space-y-3"><p role="status">{rows.length} grupo(s) · Período: {applied?.academicPeriod.trim()||"matrículas vigentes"}. Orden: carrera, período y vacuna.</p>
  <div className="relative overflow-x-auto rounded-xl border border-divider focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-container" tabIndex={0} role="region" aria-label="Tabla de cobertura, desplazable horizontalmente"><table aria-label="Cobertura por vacuna, carrera y período" className="w-full text-left text-sm"><thead><tr>{["Carrera","Período","Vacuna","Estudiantes","Esquema completo","Cobertura"].map(h=><th key={h} scope="col" className="border-b p-3">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={[r.vaccineId,r.careerId,r.academicPeriod].join(":")} data-coverage-key={[r.vaccineId,r.careerId,r.academicPeriod].join(":")}><td className="border-b p-3">{r.careerName}</td><td className="border-b p-3">{r.academicPeriod}</td><td className="border-b p-3">{r.vaccineName}<p className="text-text-secondary">{r.vaccineCode}</p></td><td className="border-b p-3">{r.totalStudents}</td><td className="border-b p-3">{r.completedSchedules}</td><td className="border-b p-3 font-semibold">{percent(r.coveragePercentage)}</td></tr>)}</tbody></table></div>
  {!rows.length&&<p>No hay matrículas ni vacunas activas para estos filtros.</p>}</section>}
 </section>;
}
