import { apiBinary, ApiRequestError } from "@/lib/api/client";
export type ResearchFormat = "CSV" | "XLSX";
export type ResearchFilters = { from: string; to: string; careerId: string; specialtyId: string; vaccineId: string };
export type ResearchReceipt = { id: string; rowCount: number; format: ResearchFormat; sha256: string; policy: string };
export type ResearchProvenance = { id: string; purpose: string; filters: Partial<ResearchFilters>; format: ResearchFormat; rowCount: number; policyVersion: string; policyMonth: string | null; sha256: string | null; createdAt: string };
const mime: Record<ResearchFormat, string> = { CSV: "application/zip", XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
const extension: Record<ResearchFormat, string> = { CSV: "zip", XLSX: "xlsx" };
const ascii = (view: Uint8Array) => new TextDecoder("latin1").decode(view);
/** Spring arma y registra el conjunto; aquí sólo se comprueba que el archivo llegó completo antes de ofrecerlo. */
export async function downloadResearchExport(purpose: string, filters: ResearchFilters, format: ResearchFormat, signal: AbortSignal): Promise<ResearchReceipt> {
  const sent = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  const response = await apiBinary("/api/research/exports", { method: "POST", signal, body: JSON.stringify({ purpose: purpose.trim(), filters: sent, format }) });
  const id = response.headers.get("X-Export-Id"), count = response.headers.get("X-Export-Row-Count"), digest = response.headers.get("X-Content-SHA256"), policy = response.headers.get("X-Pseudonym-Policy");
  const invalid = () => new ApiRequestError("El archivo recibido está incompleto o no es válido; no se descargó. Reintenta la exportación.", 502);
  if (response.headers.get("Content-Type")?.split(";")[0] !== mime[format] || !id || !/^[0-9a-f-]{36}$/i.test(id) || !count || !/^\d+$/.test(count) || Number(count) > 10000 || !digest || !/^[0-9a-f]{64}$/.test(digest) || !policy) throw invalid();
  const bytes = await response.arrayBuffer(); if (signal.aborted) throw new DOMException("Descarga cancelada", "AbortError");
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), v => v.toString(16).padStart(2, "0")).join(""); if (hash !== digest) throw invalid();
  // Ambos formatos son ZIP: firma inicial, fin de directorio central y entradas esperadas (datos + diccionario).
  const view = new Uint8Array(bytes), names = ascii(view);
  if (view.slice(0, 4).join(",") !== "80,75,3,4" || view.slice(-22, -18).join(",") !== "80,75,5,6") throw invalid();
  if (format === "CSV" ? !(names.includes("research-data.csv") && names.includes("dictionary.csv")) : !(names.includes("xl/workbook.xml") && names.includes("xl/worksheets/sheet2.xml"))) throw invalid();
  if (signal.aborted) throw new DOMException("Descarga cancelada", "AbortError");
  const url = URL.createObjectURL(new Blob([bytes], { type: mime[format] })), link = document.createElement("a");
  link.href = url; link.download = `investigacion-${id}.${extension[format]}`; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { id, rowCount: Number(count), format, sha256: digest, policy };
}
