import { apiBinary, ApiRequestError } from "@/lib/api/client";
import type { ReportResult } from "@/lib/clinical-reports";
export type ExportFormat = "CSV" | "XLSX" | "PDF";
export type ExportRecord = { id: string; format: ExportFormat; rowCount: number; state: "COMPLETED"|"FAILED"; purpose: string; createdAt: string };
export type ExportReceipt = { id: string; rowCount: number; format: ExportFormat };
const mime: Record<ExportFormat,string> = { CSV: "text/csv", XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", PDF: "application/pdf" };
export async function downloadClinicalReport(result: ReportResult, format: ExportFormat, purpose: string, signal: AbortSignal): Promise<ExportReceipt> {
  const response = await apiBinary("/api/reports/clinical/export", { method: "POST", signal, body: JSON.stringify({ format, purpose, filters: result.filters, columns: result.presentation.columns, groupBy: result.presentation.groupBy }) });
  const id=response.headers.get("X-Export-Id"),count=response.headers.get("X-Export-Row-Count"),digest=response.headers.get("X-Content-SHA256");
  const invalid=()=>new ApiRequestError("El archivo recibido está incompleto o no es válido. Reintenta la descarga.",502);
  if(response.headers.get("Content-Type")?.split(";")[0]!==mime[format]||!id||!/^[0-9a-f-]{36}$/i.test(id)||!count||!/^\d+$/.test(count)||Number(count)>10000||!digest||!/^[0-9a-f]{64}$/.test(digest))throw invalid();
  const bytes=await response.arrayBuffer();if(signal.aborted)throw new DOMException("Descarga cancelada","AbortError");
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),v=>v.toString(16).padStart(2,"0")).join("");if(hash!==digest)throw invalid();
  const view=new Uint8Array(bytes),text=new TextDecoder();
  if(format==="XLSX"&&(view.slice(0,4).join(",")!=="80,75,3,4"||view.slice(-22,-18).join(",")!=="80,75,5,6"))throw invalid();
  if(format==="PDF"&&(!text.decode(view.slice(0,5)).startsWith("%PDF-")||!text.decode(view.slice(-40)).trimEnd().endsWith("%%EOF")))throw invalid();
  if(format==="CSV"&&view.slice(0,3).join(",")!=="239,187,191")throw invalid();
  if(signal.aborted)throw new DOMException("Descarga cancelada","AbortError");
  const url=URL.createObjectURL(new Blob([bytes],{type:mime[format]})),link=document.createElement("a");link.href=url;link.download=`reporte-clinico-${id}.${format.toLowerCase()}`;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
  return {id,rowCount:Number(count),format};
}
