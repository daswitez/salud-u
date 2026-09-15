"use client";
import { Suspense } from "react";
import { ClinicalForm } from "@/components/clinical-form";
export default function SpecialtyOneFormPage() { return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-background text-text-secondary">Cargando ficha…</main>}><ClinicalForm specialty="Especialidad 1" fields={[{ id: "motivo", label: "Motivo de consulta", helper: "Describe el motivo principal de la atención." }, { id: "sintomas", label: "Síntomas y evolución", helper: "Registra la evolución relevante para esta especialidad." }, { id: "hallazgos", label: "Hallazgos de la evaluación", helper: "Incluye los hallazgos definidos por la ficha." }, { id: "plan", label: "Plan de seguimiento", helper: "Registra indicaciones y próxima acción." }]} /></Suspense>; }
