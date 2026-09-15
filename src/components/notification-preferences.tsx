"use client";

import { useEffect, useState } from "react";
import type { AppRole } from "@/components/app-sidebar";
import { getNotificationPreferences, saveNotificationPreferences, type NotificationEvent, type NotificationPreference } from "@/lib/demo-notifications-store";

const events: { id: NotificationEvent; label: string; detail: string }[] = [
  { id: "APPOINTMENT", label: "Recordatorios de citas", detail: "Confirmaciones y recordatorios de atención." },
  { id: "CHANGE", label: "Cambios de agenda", detail: "Reprogramaciones y cambios aprobados." },
  { id: "CANCELLATION", label: "Cancelaciones", detail: "Avisos críticos dentro de la aplicación." },
  { id: "WAITLIST_OFFER", label: "Ofertas de lista de espera", detail: "Cupos temporales compatibles." },
  { id: "CAMPAIGN", label: "Campañas", detail: "Estado y disponibilidad de chequeos Tipo A." },
];

export function NotificationPreferences({ role }: { role: AppRole }) {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setPreferences(getNotificationPreferences(role)), 0); return () => window.clearTimeout(timer); }, [role]);
  function toggle(event: NotificationEvent, channel: "inApp" | "email") { if (!preferences) return; if (event === "CANCELLATION" && channel === "inApp") { setNotice("Los avisos críticos de cancelación dentro de la aplicación son obligatorios."); return; } setPreferences({ ...preferences, [event]: { ...preferences[event], [channel]: !preferences[event][channel] } }); }
  function save() { if (!preferences) return; const result = saveNotificationPreferences(role, preferences); setNotice("error" in result ? result.error ?? "No se pudieron guardar las preferencias." : "Preferencias de notificación guardadas correctamente."); }
  if (!preferences) return <section className="mt-5 rounded-2xl border border-divider bg-surface p-5 text-sm text-text-secondary">Cargando preferencias de notificación…</section>;
  return <section className="mt-5 rounded-2xl border border-divider bg-surface p-5 sm:p-6"><h2 className="text-lg font-bold text-text-primary">Canales de notificación</h2><p className="mt-1 text-sm text-text-secondary">Elige el canal permitido para cada evento. Los avisos críticos dentro de la aplicación no se pueden desactivar.</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><thead><tr className="border-b border-divider text-text-secondary"><th className="pb-3 font-semibold">Evento</th><th className="pb-3 text-center font-semibold">En la aplicación</th><th className="pb-3 text-center font-semibold">Correo</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-b border-divider last:border-0"><td className="py-4"><p className="font-semibold text-text-primary">{event.label}</p><p className="mt-1 text-xs text-text-secondary">{event.detail}</p></td><td className="py-4 text-center"><input aria-label={`${event.label} en la aplicación`} type="checkbox" checked={preferences[event.id].inApp} disabled={event.id === "CANCELLATION"} onChange={() => toggle(event.id, "inApp")} className="size-4 accent-primary disabled:opacity-60" /></td><td className="py-4 text-center"><input aria-label={`${event.label} por correo`} type="checkbox" checked={preferences[event.id].email} onChange={() => toggle(event.id, "email")} className="size-4 accent-primary" /></td></tr>)}</tbody></table></div>{notice && <p role={notice.includes("guardadas") ? "status" : "alert"} className={`mt-5 rounded-lg p-3 text-sm ${notice.includes("guardadas") ? "bg-success-container text-success" : "bg-error-container text-error"}`}>{notice}</p>}<button onClick={save} className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Guardar preferencias</button></section>;
}
