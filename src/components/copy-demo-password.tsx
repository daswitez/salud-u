"use client";

import { useState } from "react";

/** La contraseña llega del servidor sólo si el entorno local la configura; no queda fija en el bundle. */
export function CopyDemoPassword({ password }: { password: string }) {
  const [copied, setCopied] = useState(false);

  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary-200 bg-surface px-3 py-2.5">
      <code className="text-sm font-bold tracking-wide text-text-primary">{password}</code>
      <button type="button" onClick={copyPassword} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary-container px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary-100" aria-live="polite">
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4"><rect x="6.5" y="6.5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5" stroke="currentColor" strokeWidth="1.5" /></svg>
        {copied ? "Copiada" : "Copiar"}
      </button>
    </div>
  );
}
