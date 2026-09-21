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
