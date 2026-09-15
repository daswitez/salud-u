"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/student-shell";
import { getNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from "@/lib/demo-notifications-store";

const eventLabels = { APPOINTMENT: "Cita", CHANGE: "Cambio", CANCELLATION: "Cancelación", WAITLIST_OFFER: "Oferta", CAMPAIGN: "Campaña" } as const;
const statusStyle = { INFO: "bg-secondary-container text-secondary", ACTION: "bg-primary-container text-primary", CHANGE: "bg-warning-container text-warning", CANCELLED: "bg-error-container text-error" } as const;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  useEffect(() => { const timer = window.setTimeout(() => setNotifications(getNotifications()), 0); return () => window.clearTimeout(timer); }, []);
  function markRead(id: string) { markNotificationRead(id); setNotifications(getNotifications()); }
  function markAll() { markAllNotificationsRead(); setNotifications(getNotifications()); }
  const unread = notifications.filter((item) => !item.readAt).length;
  return <StudentShell active="notifications"><main className="mx-auto max-w-4xl px-5 py-8 sm:px-8"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-primary">AVISOS</p><h1 className="mt-1 text-3xl font-bold text-text-primary">Notificaciones recientes</h1><p className="mt-2 text-text-secondary">Recordatorios, cambios, cancelaciones y ofertas relevantes para tu atención.</p></div>{unread > 0 && <button onClick={markAll} className="rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-container">Marcar todo como leído</button>}</header><p className="mt-5 text-sm text-text-secondary"><span className="font-semibold text-text-primary">{unread}</span> aviso(s) sin leer</p><section className="mt-5 divide-y divide-divider overflow-hidden rounded-2xl border border-divider bg-surface">{notifications.length ? notifications.map((item) => <article key={item.id} className={`p-5 ${item.readAt ? "" : "bg-primary-container/40"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-text-primary">{item.title}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[item.status]}`}>{eventLabels[item.event]}</span>{!item.readAt && <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-on-primary">Nuevo</span>}</div><p className="mt-2 text-sm leading-6 text-text-secondary">{item.message}</p><p className="mt-2 text-xs text-text-tertiary">{item.createdAt.slice(0, 16).replace("T", " · ")}</p></div><div className="flex shrink-0 flex-wrap gap-3"><Link onClick={() => !item.readAt && markRead(item.id)} href={item.resourceHref} className="text-sm font-semibold text-primary hover:underline">Ver detalle</Link>{!item.readAt && <button onClick={() => markRead(item.id)} className="text-sm font-semibold text-text-secondary hover:underline">Marcar leída</button>}</div></div></article>) : <div className="p-10 text-center"><p className="font-semibold text-text-primary">No tienes avisos recientes</p><p className="mt-2 text-sm text-text-secondary">Cuando haya cambios relevantes aparecerán aquí.</p></div>}</section></main></StudentShell>;
}
