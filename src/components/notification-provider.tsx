"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiEnvelope } from "@/lib/api/client";
import type { NotificationPage } from "@/lib/notifications";

type NotificationContextValue = {
  unreadCount: number | null;
  unavailable: boolean;
  acceptCount: (count: number) => void;
  refreshCount: () => Promise<void>;
};
const NotificationContext = createContext<NotificationContextValue | null>(null);

/** Estado privado de la sesión actual; nunca se persiste en el navegador. */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const pending = useRef<AbortController | null>(null);

  const acceptCount = useCallback((count: number) => {
    pending.current?.abort();
    pending.current = null;
    setUnreadCount(count);
    setUnavailable(false);
  }, []);

  const refreshCount = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    try {
      const page = await apiEnvelope<NotificationPage>("/api/notifications?limit=1", { signal: controller.signal });
      if (!controller.signal.aborted) {
        setUnreadCount(page.unreadCount);
        setUnavailable(false);
      }
    } catch {
      if (!controller.signal.aborted) setUnavailable(true);
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshCount(), 0);
    const refreshVisible = () => { if (document.visibilityState === "visible") void refreshCount(); };
    const interval = window.setInterval(refreshVisible, 60_000);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("online", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("online", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      pending.current?.abort();
    };
  }, [refreshCount]);

  return <NotificationContext.Provider value={{ unreadCount, unavailable, acceptCount, refreshCount }}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("La bandeja requiere una sesión de notificaciones.");
  return value;
}

export function NotificationBell({ href }: { href: string }) {
  const { unreadCount, unavailable } = useNotifications();
  const label = unavailable ? "Abrir avisos. No se pudo actualizar el contador" : unreadCount === null
    ? "Abrir avisos. Cargando contador" : `Abrir avisos. ${unreadCount} sin leer`;
  return <Link href={href} aria-label={label} title={label} className="relative grid size-11 shrink-0 place-items-center rounded-xl text-primary hover:bg-primary-container">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg>
    <span aria-hidden="true" className="absolute -right-1 -top-0.5 min-w-5 rounded-full bg-secondary px-1 text-center text-xs font-bold leading-5 text-white">{unavailable ? "!" : unreadCount === null ? "…" : unreadCount > 99 ? "99+" : unreadCount}</span>
  </Link>;
}
