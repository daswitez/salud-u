"use client";

import { useRouter } from "next/navigation";
import { removeClinicalDocument } from "@/lib/demo-clinical-store";

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const router = useRouter();

  function handleDelete() {
    if (confirm("¿Estás seguro de quitar este documento? Esta acción no se puede deshacer.")) {
      removeClinicalDocument(documentId);
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-error hover:text-error/80 ml-3"
      title="Quitar documento"
      aria-label="Quitar documento"
    >
      ✕
    </button>
  );
}
