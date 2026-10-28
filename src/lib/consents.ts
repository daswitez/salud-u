export type ConsentText = { currentVersion: string; text: string; accepted: boolean | null; lastAnswer: { version: string; accepted: boolean; channel: string; recordedAt: string } | null };
export type ConsentState = { pending: boolean; terms: ConsentText; research: ConsentText };
export type ConsentAnswer = { termsVersion: string; termsAccepted: true; researchVersion: string; researchAccepted: boolean };
