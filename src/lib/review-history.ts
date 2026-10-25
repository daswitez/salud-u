export type ReviewHistoryDraft = {
  sex: string;
  personalHistory: {
    pathological: string;
    surgical: string;
    allergic: string;
    regularMedications: string;
    familyRelevant: string;
  };
  habits: {
    diet: "ADEQUATE" | "REGULAR" | "INADEQUATE" | "";
    physicalActivity: "YES" | "NO" | "";
    tobacco: "YES" | "NO" | "";
    alcohol: "YES" | "NO" | "";
  };
  vitals: {
    bloodPressureSystolic: string;
    bloodPressureDiastolic: string;
    heartRate: string;
    respiratoryRate: string;
    temperature: string;
    oxygenSaturation: string;
    weight: string;
    height: string;
  };
  physicalExam: { generalState: string; cardiopulmonary: string; abdomen: string; otherFindings: string };
  laboratory: { hemogram: string; bloodGroup: string; vdrl: string; chagas: string; coproparasitological: string; other: string };
  conduct: {
    healthEducation: boolean;
    treatment: boolean;
    complementaryStudies: boolean;
    referral: boolean;
    medicalFollowUp: boolean;
    noObservations: boolean;
  };
  observations: string;
};

export const emptyReviewHistory: ReviewHistoryDraft = {
  sex: "",
  personalHistory: { pathological: "", surgical: "", allergic: "", regularMedications: "", familyRelevant: "" },
  habits: { diet: "", physicalActivity: "", tobacco: "", alcohol: "" },
  vitals: { bloodPressureSystolic: "", bloodPressureDiastolic: "", heartRate: "", respiratoryRate: "", temperature: "", oxygenSaturation: "", weight: "", height: "" },
  physicalExam: { generalState: "", cardiopulmonary: "", abdomen: "", otherFindings: "" },
  laboratory: { hemogram: "", bloodGroup: "", vdrl: "", chagas: "", coproparasitological: "", other: "" },
  conduct: { healthEducation: false, treatment: false, complementaryStudies: false, referral: false, medicalFollowUp: false, noObservations: false },
  observations: "",
};

/** Presentation mapping: server numbers/nulls become controlled form strings. */
export function reviewHistoryToDraft(value: Record<string, unknown> | null): ReviewHistoryDraft {
  const result = structuredClone(emptyReviewHistory);
  if (!value) return result;
  result.sex = typeof value.sex === "string" ? value.sex : "";
  result.observations = typeof value.observations === "string" ? value.observations : "";
  for (const section of ["personalHistory", "habits", "vitals", "physicalExam", "laboratory"] as const) {
    const source = value[section] && typeof value[section] === "object" ? value[section] as Record<string, unknown> : {};
    const target = result[section] as Record<string, string>;
    for (const key of Object.keys(target)) target[key] = typeof source[key] === "string" || typeof source[key] === "number" ? String(source[key]) : "";
  }
  const conduct = value.conduct && typeof value.conduct === "object" ? value.conduct as Record<string, unknown> : {};
  for (const key of Object.keys(result.conduct) as (keyof ReviewHistoryDraft["conduct"])[]) result.conduct[key] = conduct[key] === true;
  return result;
}
