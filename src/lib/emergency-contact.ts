export type Relationship = "PARENT" | "SIBLING" | "PARTNER" | "GUARDIAN" | "OTHER_RELATIVE" | "OTHER";
export type EmergencyContact = { fullName: string; relationship: Relationship; phone: string };
export type PatientSex = "FEMALE" | "MALE" | "NOT_RECORDED";
export const relationshipLabels: Record<Relationship, string> = {
  PARENT: "Padre o madre", SIBLING: "Hermano o hermana", PARTNER: "Pareja", GUARDIAN: "Tutor o tutora", OTHER_RELATIVE: "Otro familiar", OTHER: "Otra persona",
};
export const emptyContact = (): EmergencyContact => ({ fullName: "", relationship: "PARENT", phone: "" });
