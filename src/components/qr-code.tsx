"use client";

import { useMemo } from "react";

import { qrMatrix } from "@/lib/qr";

/** SEG-2FA: QR dibujado en el navegador; el contenido (URI otpauth con el secreto) no se envía a ningún servicio. */
export function QrCode({ value, label, size = 208 }: { value: string; label: string; size?: number }) {
  const path = useMemo(() => {
    const matrix = qrMatrix(value);
    let d = "";
    for (let y = 0; y < matrix.size; y++) for (let x = 0; x < matrix.size; x++) if (matrix.dark(x, y)) d += `M${x + 4} ${y + 4}h1v1h-1z`;
    return { d, modules: matrix.size + 8 };
  }, [value]);
  return <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${path.modules} ${path.modules}`} shapeRendering="crispEdges" className="rounded-lg bg-white">
    <rect width={path.modules} height={path.modules} fill="#fff" /><path d={path.d} fill="#000" />
  </svg>;
}
