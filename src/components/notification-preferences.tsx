"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiRequestError, apiJson } from "@/lib/api/client";
import { notificationDate, notificationError, type NotificationPreferences } from "@/lib/notifications";

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [saved, setSaved] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [sessionEnded, setSessionEnded] = useState(false);
  const pending = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null);
    try {
      const data = await apiJson<NotificationPreferences>("/api/me/notification-preferences", { signal });
      if (!signal?.aborted) { setPreferences(data); setSaved(data); setSessionEnded(false); }
    } catch (cause) {
      if (!signal?.aborted) { setError(notificationError(cause)); setSessionEnded(cause instanceof ApiRequestError && cause.status === 401); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preferences || pending.current) return;
    pending.current = true; setSubmitting(true); setError(null); setSuccess("");
    try {
      const data = await apiJson<NotificationPreferences>("/api/me/notification-preferences", {
        method: "PUT", body: JSON.stringify({ receiveReminders: preferences.receiveReminders, reinforcedReminder: preferences.reinforcedReminder }),
      });
      setPreferences(data); setSaved(data); setSuccess("Preferencias de avisos guardadas.");
    } catch (cause) { setError(notificationError(cause)); setSessionEnded(cause instanceof ApiRequestError && cause.status === 401); }
    finally { pending.current = false; setSubmitting(false); }
  }

  const changed = preferences && saved && (preferences.receiveReminders !== saved.receiveReminders || preferences.reinforcedReminder !== saved.reinforcedReminder);
  return <section aria-labelledby="notification-preferences-title" className="mt-5 rounded-2xl border border-divider bg-surface p-5 sm:p-6">
    <h2 id="notification-preferences-title" className="text-lg font-bold text-text-primary">Preferencias de avisos</h2>
    <p className="mt-1 text-sm leading-6 text-text-secondary">Los avisos llegan a tu bandeja del sistema. Los cambios y cancelaciones de citas se informan siempre.</p>
    {loading && <p role="status" className="mt-4 text-sm text-text-secondary">Cargando preferencias…</p>}
    {error && <div role="alert" className="mt-4 text-sm text-error"><p>{error}</p>{sessionEnded ? <Link href="/iniciar-sesion?error=session" className="mt-2 inline-block font-semibold underline">Iniciar sesión</Link> : !preferences && <button type="button" disabled={loading} onClick={() => void load()} className="mt-2 min-h-11 font-semibold underline">Reintentar preferencias</button>}</div>}
    {preferences && <form onSubmit={submit} className="mt-5">
      <fieldset disabled={submitting || loading} className="space-y-4 disabled:opacity-60"><legend className="sr-only">Recordatorios de citas</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-divider p-4"><input type="checkbox" name="receiveReminders" checked={preferences.receiveReminders} onChange={event => { setPreferences({ ...preferences, receiveReminders: event.target.checked }); setSuccess(""); }} aria-labelledby="ordinary-reminder-title" aria-describedby="ordinary-reminder-help" className="mt-0.5 size-5 shrink-0 accent-primary" /><span><span id="ordinary-reminder-title" className="block text-sm font-semibold text-text-primary">Recibir recordatorios de citas</span><span id="ordinary-reminder-help" className="mt-1 block text-sm text-text-secondary">Un aviso el día anterior a tu cita.</span></span></label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-divider p-4"><input type="checkbox" name="reinforcedReminder" checked={preferences.reinforcedReminder} onChange={event => { setPreferences({ ...preferences, reinforcedReminder: event.target.checked }); setSuccess(""); }} aria-labelledby="reinforced-reminder-title" aria-describedby="reinforced-reminder-help" className="mt-0.5 size-5 shrink-0 accent-primary" /><span><span id="reinforced-reminder-title" className="block text-sm font-semibold text-text-primary">Permitir un recordatorio adicional</span><span id="reinforced-reminder-help" className="mt-1 block text-sm text-text-secondary">También el día de la cita, cuando corresponda. Requiere que los recordatorios estén activados.</span></span></label>
      </fieldset>
      <p role="status" className="mt-4 text-sm font-medium text-success">{success}</p>
      {saved?.updatedAt && <p className="mt-2 text-xs text-text-secondary">Último guardado: <time dateTime={saved.updatedAt}>{notificationDate(saved.updatedAt)}</time> · Bolivia</p>}
      <button disabled={submitting || loading || !changed} className="mt-4 min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-default disabled:opacity-60">{submitting ? "Guardando…" : "Guardar preferencias de avisos"}</button>
    </form>}
  </section>;
}
