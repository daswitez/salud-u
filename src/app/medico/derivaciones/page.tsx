import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { requireClinicalRole } from "@/lib/demo-session";
import { getClinicalDemoState } from "@/lib/demo-clinical-store";
import type { ReferralStatus, Specialty } from "@/lib/ui-contracts";

const specialtyLabels: Record<Specialty, string> = { 
  DERMATOLOGY: "Dermatología", 
  OPHTHALMOLOGY: "Oftalmología", 
  INTERNAL_MEDICINE: "Medicina interna", 
  UROLOGY: "Urología",
  GYNECOLOGY: "Ginecología"
};

const referralLabels: Record<ReferralStatus, string> = { 
  PENDING_ASSIGNMENT: "Pendiente de asignación administrativa", 
  ASSIGNED: "Asignada - Esperando atención", 
  IN_PROGRESS: "En atención", 
  RETURNED: "Devuelta", 
  CLOSED: "Atendida y Cerrada", 
  CANCELLED: "Cancelada" 
};

export default async function MedicalReferralsPage() {
  const session = await requireClinicalRole("REVIEW_DOCTOR", "SPECIALIST");
  const state = getClinicalDemoState();
  const professional = state.professionals.find((item) => item.fullName === session.name);
  
  if (!professional) return null;

  // Si es especialista, ve las que le asignaron o son de su especialidad.
  // Si es médico de revisión, ve las que él emitió.
  const myReferrals = state.referrals.filter(ref => 
    (professional.role === "REVIEW_DOCTOR" && ref.requestedBy === professional.id) ||
    (professional.role === "SPECIALIST" && ref.specialty === professional.specialty)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar role="medico" active="referrals" clinicalRole={session.clinicalRole} />
      <main className="min-w-0 flex-1 pb-22 md:pb-0">
        <AppHeader role="medico" name={session.name} clinicalRole={session.clinicalRole} />
        
        <div className="mx-auto max-w-6xl p-5 sm:p-8">
          <header>
            <p className="text-sm font-semibold tracking-wide text-primary">ESPECIALIDADES</p>
            <h1 className="mt-1 text-3xl font-bold text-text-primary">Bandeja de Derivaciones</h1>
            <p className="mt-2 text-text-secondary">
              {professional.role === "REVIEW_DOCTOR" 
                ? "Historial de derivaciones emitidas a especialistas." 
                : "Pacientes derivados a tu especialidad esperando atención."}
            </p>
          </header>

          <div className="mt-8 grid gap-4">
            {myReferrals.length > 0 ? (
              myReferrals.map(ref => {
                const patient = state.patients.find(p => p.id === ref.patientId);
                const requestingDoc = state.professionals.find(d => d.id === ref.requestedBy);

                return (
                  <article key={ref.id} className="flex flex-col sm:flex-row gap-5 rounded-2xl border border-divider bg-surface p-5 sm:p-6 transition-shadow hover:shadow-sm">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="rounded-full bg-surface-secondary px-3 py-1 text-xs font-semibold text-text-secondary border border-divider">
                          {ref.id}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          ref.status === "PENDING_ASSIGNMENT" ? "bg-warning-container text-warning-700" :
                          ref.status === "ASSIGNED" ? "bg-info-container text-info-700" :
                          ref.status === "CLOSED" ? "bg-success-container text-success-700" :
                          "bg-surface-secondary text-text-secondary"
                        }`}>
                          {referralLabels[ref.status]}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-text-primary">{patient?.fullName || "Paciente desconocido"}</h2>
                      <p className="mt-1 text-sm text-text-secondary">
                        Derivado a <span className="font-semibold text-text-primary">{specialtyLabels[ref.specialty]}</span> por {requestingDoc?.fullName || "Médico de revisión"}
                      </p>
                      
                      <div className="mt-4 rounded-xl bg-surface-secondary p-4">
                        <p className="text-sm font-semibold text-text-primary">Motivo: {ref.reason}</p>
                        <p className="mt-1 text-sm text-text-secondary italic">"{ref.commentForSpecialist}"</p>
                      </div>
                    </div>
                    
                    <div className="sm:w-48 flex flex-col justify-center gap-3 border-t border-divider pt-4 sm:border-t-0 sm:border-l sm:pl-5 sm:pt-0">
                      <p className="text-xs text-center text-text-secondary">Emitida el {new Date(ref.createdAt).toLocaleDateString("es-BO")}</p>
                      <Link 
                        href={`/medico/derivaciones/${ref.id}`}
                        className="w-full rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-on-primary hover:bg-primary-hover shadow-sm"
                      >
                        Abrir Sala
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-divider p-12 text-center">
                <p className="text-text-secondary">No tienes derivaciones registradas en tu bandeja.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
