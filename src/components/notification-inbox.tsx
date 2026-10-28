"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, apiEnvelope, apiJson } from "@/lib/api/client";
import { notificationDate, notificationError, notificationEventLabel, type InboxNotification, type NotificationPage } from "@/lib/notifications";
import { useNotifications } from "@/components/notification-provider";

const actionClass = "min-h-11 rounded-xl border border-primary-200 bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-container disabled:cursor-wait disabled:opacity-60";

export function NotificationInbox() {
  const { unreadCount, unavailable, acceptCount, refreshCount } = useNotifications();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [status, setStatus] = useState("");
  const request = useRef<AbortController | null>(null);
  const operation = useRef(false);
  const retryBefore = useRef<string | null>(null);

  const load = useCallback(async (before: string | null = null) => {
    retryBefore.current = before;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError(null); setStatus("");
    try {
      const page = await apiEnvelope<NotificationPage>("/api/notifications?limit=20" + (before ? "&before=" + encodeURIComponent(before) : ""), { signal: controller.signal });
      if (controller.signal.aborted) return;
      setItems(previous => before ? [...new Map([...previous, ...page.data].map(item => [item.id, item])).values()] : page.data);
      setCursor(page.pagination.hasMore ? page.pagination.nextCursor : null);
      acceptCount(page.unreadCount);
      setLoaded(true); setSessionEnded(false);
      setStatus(before ? "Se cargaron más avisos." : "Bandeja actualizada.");
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(notificationError(cause));
        setSessionEnded(cause instanceof ApiRequestError && cause.status === 401);
      }
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, [acceptCount]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); request.current?.abort(); };
  }, [load]);

  async function markRead(item: InboxNotification) {
    if (operation.current) return;
    operation.current = true;
    retryBefore.current = null;
    setMarking(item.id); setError(null); setStatus("");
    try {
      const updated = await apiJson<InboxNotification>(`/api/notifications/${item.id}/read`, { method: "PATCH" });
      setItems(previous => previous.map(value => value.id === updated.id ? updated : value));
      setStatus("Aviso marcado como leído.");
      await refreshCount();
    } catch (cause) {
      setError(notificationError(cause));
      setSessionEnded(cause instanceof ApiRequestError && cause.status === 401);
    } finally { setMarking(null); operation.current = false; }
  }

  return <section aria-label="Bandeja de avisos" className="mt-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-text-secondary">{unavailable ? "Contador sin actualizar" : unreadCount === null ? "Consultando avisos…" : <><strong className="text-text-primary">{unreadCount}</strong> {unreadCount === 1 ? "aviso sin leer" : "avisos sin leer"}</>}</p>
      <button onClick={() => void load()} disabled={loading || marking !== null} className={actionClass}>{loading && loaded ? "Actualizando…" : "Actualizar bandeja"}</button>
    </div>
    <p role="status" className="mt-3 text-sm text-text-secondary">{loading && !loaded ? "Cargando avisos…" : status}</p>
    {error && <div role="alert" className="mt-4 rounded-xl border border-error/30 bg-error-container p-4 text-sm text-error"><p>{error}</p>{sessionEnded ? <Link href="/iniciar-sesion?error=session" className="mt-3 inline-block font-semibold underline">Iniciar sesión</Link> : <button disabled={loading || marking !== null} onClick={() => void load(retryBefore.current)} className="mt-3 min-h-11 font-semibold underline">Reintentar consulta</button>}</div>}
    {loaded && items.length === 0 && <div className="mt-5 rounded-2xl border border-divider bg-surface p-8 text-center"><h2 className="text-lg font-bold text-text-primary">Todavía no tienes avisos</h2><p className="mt-2 text-sm text-text-secondary">Aquí aparecerán las novedades y los recordatorios de tus citas.</p></div>}
    {items.length > 0 && <ul className="mt-5 space-y-3" aria-busy={loading}>
      {items.map(item => <li key={item.id}><article aria-label={item.subject} className={`rounded-2xl border p-5 sm:p-6 ${item.status === "READ" ? "border-divider bg-surface" : "border-primary-200 bg-primary-container/60"}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold"><span className="text-primary">{notificationEventLabel(item.eventType)}</span><span className={`rounded-full px-2.5 py-1 ${item.status === "READ" ? "bg-surface-secondary text-text-secondary" : "bg-primary text-on-primary"}`}>{item.status === "READ" ? "Leído" : "Sin leer"}</span></div>
        <h2 className="mt-3 text-lg font-bold text-text-primary">{item.subject}</h2>
        <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-text-secondary">{item.message}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-text-secondary">Recibido: <time dateTime={item.deliveredAt}>{notificationDate(item.deliveredAt)}</time> · Bolivia{item.readAt && <><br />Leído: <time dateTime={item.readAt}>{notificationDate(item.readAt)}</time></>}</p>{item.status !== "READ" && <button onClick={() => void markRead(item)} disabled={marking !== null || loading} aria-label={`Marcar como leído: ${item.subject}`} className={actionClass}>{marking === item.id ? "Marcando…" : "Marcar como leído"}</button>}</div>
      </article></li>)}
    </ul>}
    {cursor && <div className="mt-6 text-center"><button disabled={loading || marking !== null} onClick={() => void load(cursor)} className={actionClass}>{loading ? "Cargando…" : "Cargar más avisos"}</button></div>}
  </section>;
}
