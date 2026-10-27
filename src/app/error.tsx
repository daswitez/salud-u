"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/** RNF-07: si Spring o PostgreSQL no responden al cargar una pantalla, se ofrece reintentar sin mandar a iniciar sesión. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { console.error(error); heading.current?.focus(); }, [error]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <section role="alert" className="w-full max-w-lg rounded-2xl border border-divider bg-surface p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-primary">SERVICIO NO DISPONIBLE</p>
        <h1 ref={heading} tabIndex={-1} className="mt-2 text-2xl font-bold text-text-primary">No pudimos cargar esta pantalla</h1>
        <p className="mt-3 text-text-secondary">El servicio puede estar reiniciándose. Tu sesión y la información ya guardada se conservan; vuelve a intentar en unos segundos.</p>
        {error.digest && <p className="mt-3 text-xs text-text-secondary">Referencia: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => retry()} className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary hover:bg-primary-hover focus:outline-none focus:ring-4 focus:ring-primary-container">Reintentar</button>
          <Link href="/" className="rounded-lg border border-divider px-5 py-3 font-semibold text-text-primary hover:bg-surface-secondary">Ir al inicio</Link>
        </div>
      </section>
    </main>
  );
}
