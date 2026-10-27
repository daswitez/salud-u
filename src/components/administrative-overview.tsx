"use client";
import Link from "next/link";
import { useCallback,useEffect,useRef,useState } from "react";
import { apiJson,ApiRequestError } from "@/lib/api/client";
import { GuidanceCard,MetricCard,PageIntro,SectionHeading } from "@/components/ux-primitives";
type Summary={day:string;registeredPatients:number;scheduledAppointments:number;closedToday:number;pendingReferrals:number;availableSlots:number};
export function AdministrativeOverview(){
 const [data,setData]=useState<Summary|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[expired,setExpired]=useState(false);const feedback=useRef<HTMLParagraphElement>(null),request=useRef<AbortController|null>(null);
 const load=useCallback(async()=>{request.current?.abort();const c=new AbortController();request.current=c;setLoading(true);setData(null);setError("");setExpired(false);try{const result=await apiJson<Summary>("/api/reports/administrative-summary",{signal:c.signal});if(!c.signal.aborted)setData(result);}catch(cause){if(c.signal.aborted)return;setError(cause instanceof Error&&!(cause instanceof TypeError)?cause.message:"No se pudo cargar el panorama por un problema de conexión.");setExpired(cause instanceof ApiRequestError&&cause.status===401);}finally{if(!c.signal.aborted)setLoading(false);}},[]);
 useEffect(()=>{const t=window.setTimeout(()=>void load(),0);return()=>{window.clearTimeout(t);request.current?.abort();};},[load]);useEffect(()=>{if(error)feedback.current?.focus();},[error]);
 return <section className="space-y-7" aria-label="Panorama administrativo" aria-busy={loading}><button type="button" disabled={loading} onClick={()=>void load()} className="rounded-lg border border-primary px-4 py-2">Actualizar panorama</button>{loading&&<p role="status">Cargando panorama…</p>}{error&&<p ref={feedback} tabIndex={-1} role="alert" className="text-error">{error}</p>}{expired&&<Link href="/iniciar-sesion?error=session" target="_blank" rel="noopener">Iniciar sesión en otra pestaña</Link>}{data&&<>
          <PageIntro
            eyebrow="Centro de coordinación"
            title="Ordena la jornada antes de que se acumule la demanda"
            description="Revisa primero las tareas que bloquean una atención: ingreso, asistencia y derivaciones pendientes. Los indicadores de abajo te llevan directamente a la acción correspondiente."
            primaryAction={{ href: "/administrativo/estudiantes", label: "Buscar estudiante" }}
            secondaryAction={{ href: "/administrativo/estudiantes/nuevo", label: "Registrar nuevo" }}
            context={{ label: "Jornada actual", value: new Intl.DateTimeFormat("es-BO", {dateStyle:"full",timeZone:"America/La_Paz"}).format(new Date(data.day+"T12:00:00Z")) }}
          />

          <GuidanceCard
            eyebrow={data.pendingReferrals ? "Prioridad recomendada" : "Ruta de trabajo"}
            title={data.pendingReferrals ? `${data.pendingReferrals} derivación${data.pendingReferrals === 1 ? " requiere" : " requieren"} programación` : "La bandeja de derivaciones está al día"}
            description={data.pendingReferrals ? "Asignar estas solicitudes evita que el paciente quede detenido entre revisión y especialidad." : "Puedes continuar con la llegada de estudiantes y la programación de citas del día."}
            action={{ href: data.pendingReferrals ? "/administrativo/derivaciones" : "/administrativo/check-in", label: data.pendingReferrals ? "Resolver derivaciones" : "Gestionar llegadas" }}
            steps={["Identificar solicitud", "Confirmar disponibilidad", "Asignar y registrar"]}
            activeStep={data.pendingReferrals ? 0 : 2}
            tone={data.pendingReferrals ? "warning" : "success"}
          />

          <section>
            <SectionHeading title="Panorama operativo" description="Cada dato responde una pregunta concreta de la jornada." />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Estudiantes registrados" value={data.registeredPatients} detail="Personas registradas" tone="primary" />
              <MetricCard label="Citas por atender" value={data.scheduledAppointments} detail="Programadas o en espera" tone={data.scheduledAppointments ? "warning" : "success"} />
              <MetricCard label="Atenciones cerradas" value={data.closedToday} detail="Completadas hoy" tone="success" />
              <MetricCard label="Derivaciones pendientes" value={data.pendingReferrals} detail={data.pendingReferrals ? "Necesitan asignación" : "Bandeja al día"} tone={data.pendingReferrals ? "warning" : "success"} />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="rounded-2xl border border-divider bg-surface p-5 shadow-[0_16px_45px_-38px_rgba(18,49,111,0.75)] sm:p-6">
              <SectionHeading title="Operación de hoy" description="Acciones frecuentes, ordenadas según el flujo de atención." />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link href="/administrativo/check-in" className="group rounded-2xl border border-primary-200 bg-primary-container/55 p-5 transition hover:border-primary hover:bg-primary-container">
                  <span className="inline-flex rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-on-primary">{data.availableSlots} cupos disponibles</span>
                  <h3 className="mt-4 text-lg font-bold text-text-primary">Gestionar citas y asistencia</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">Programa una cita, registra la llegada y mantén visible el estado del estudiante.</p>
                  <span className="mt-4 inline-flex text-sm font-bold text-primary group-hover:underline">Abrir módulo →</span>
                </Link>
                <Link href="/administrativo/derivaciones" className="group rounded-2xl border border-divider bg-surface-secondary/65 p-5 transition hover:border-secondary/40 hover:bg-secondary-container/45">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${data.pendingReferrals ? "bg-warning-container text-warning" : "bg-success-container text-success"}`}>{data.pendingReferrals ? `${data.pendingReferrals} por programar` : "Sin pendientes"}</span>
                  <h3 className="mt-4 text-lg font-bold text-text-primary">Coordinar derivaciones</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">Conecta la solicitud clínica con un profesional y horario disponibles.</p>
                  <span className="mt-4 inline-flex text-sm font-bold text-primary group-hover:underline">Abrir bandeja →</span>
                </Link>
              </div>
            </article>

            <aside className="rounded-2xl border border-divider bg-surface p-5 sm:p-6">
              <SectionHeading title="Continuar con" description="Herramientas de consulta y control." />
              <nav className="mt-5 space-y-2" aria-label="Herramientas administrativas">
                <Link href="/administrativo/estudiantes" className="flex items-center justify-between rounded-xl border border-transparent bg-surface-secondary px-4 py-3.5 transition hover:border-primary-200 hover:bg-primary-container"><span><span className="block text-sm font-bold text-text-primary">Directorio de estudiantes</span><span className="mt-0.5 block text-xs text-text-secondary">Identificación y datos administrativos</span></span><span className="text-primary">→</span></Link>
                <Link href="/administrativo/reportes" className="flex items-center justify-between rounded-xl border border-transparent bg-surface-secondary px-4 py-3.5 transition hover:border-primary-200 hover:bg-primary-container"><span><span className="block text-sm font-bold text-text-primary">Reportes de control</span><span className="mt-0.5 block text-xs text-text-secondary">Actividad y cumplimiento</span></span><span className="text-primary">→</span></Link>
              </nav>
              <p className="mt-5 border-t border-divider pt-4 text-xs leading-5 text-text-tertiary">Las decisiones clínicas permanecen en el área médica. Aquí solo coordinas el acceso y la continuidad operativa.</p>
            </aside>
          </section>
<Link href="/administrativo/reportes/cumplimiento" className="block font-semibold text-primary">Consultar cumplimiento institucional →</Link></>}</section>;
}
