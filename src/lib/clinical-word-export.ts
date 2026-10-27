import { apiFile, ApiRequestError } from "@/lib/api/client";

/** Spring recalculates authorization and renders the historical record and its adendas. */
export async function downloadClinicalRecordWord(encounterId: string, purpose: string, signal?: AbortSignal) {
  const response = await apiFile(`/api/medical/encounters/${encodeURIComponent(encounterId)}/export.docx?${new URLSearchParams({ purpose })}`, signal);
  const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (response.headers.get("content-type")?.split(";")[0] !== mime) throw new ApiRequestError("El servidor no devolvió un archivo Word válido. Reintenta la descarga.", 502);
  const blob = await response.blob();
  const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  const ending = new Uint8Array(await blob.slice(-22, -18).arrayBuffer());
  if (signal?.aborted) throw new DOMException("Descarga cancelada", "AbortError");
  if (signature.join(",") !== "80,75,3,4" || ending.join(",") !== "80,75,5,6") throw new ApiRequestError("La descarga Word está incompleta. Reintenta la descarga.", 502);
  const url = URL.createObjectURL(blob), anchor = document.createElement("a");
  anchor.href = url; anchor.download = `ficha-clinica-${encounterId}.docx`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  // Keep the object URL alive until the browser has acquired the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
