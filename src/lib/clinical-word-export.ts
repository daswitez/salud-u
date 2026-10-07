import { AlignmentType, BorderStyle, Document, Footer, Header, ImageRun, Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

import { backgroundEntryText, type ClinicalBackgroundVersion } from "@/lib/clinical-background";
import { loadReportBranding, reportBrand } from "@/lib/report-branding";

type Encounter = { id: string; occurred_at: string; encounter_type: "INITIAL" | "SPECIALTY"; chief_complaint: string; assessment: string | null; instructions?: string | null; follow_up_text?: string | null; specialty: string | null; reviewHistory?: Record<string, unknown> | null; specialtyHistory?: Record<string, unknown> | null; clinicalBackground?: ClinicalBackgroundVersion | null };
type Patient = { carnet: string; registrationCode: string; fullName: string; birthDate: string | null; phone: string | null; email: string | null };

const navy = reportBrand.navy;
const red = reportBrand.red;
const light = "F4F7FC";
const border = { style: BorderStyle.SINGLE, size: 4, color: "D8E0ED" };

const labels: Record<string, string> = {
  specialtyCode: "Especialidad", personalHistory: "Antecedentes personales", habits: "Hábitos y estilo de vida", vitals: "Signos vitales y antropometría", physicalExam: "Examen físico", laboratory: "Laboratorio", conduct: "Conducta",
  pathological: "Patológicos", surgical: "Quirúrgicos", allergic: "Alérgicos", regularMedications: "Medicamentos habituales", familyRelevant: "Familiares relevantes", family: "Familiares",
  diet: "Alimentación", physicalActivity: "Actividad física", tobacco: "Tabaco", alcohol: "Alcohol", bloodPressureSystolic: "Presión arterial sistólica", bloodPressureDiastolic: "Presión arterial diastólica", heartRate: "Frecuencia cardíaca", respiratoryRate: "Frecuencia respiratoria", temperature: "Temperatura", oxygenSaturation: "Saturación de oxígeno", weight: "Peso", height: "Talla",
  generalState: "Estado general", cardiopulmonary: "Cardiopulmonar", abdomen: "Abdomen", otherFindings: "Otros hallazgos", hemogram: "Hemograma", bloodGroup: "Grupo sanguíneo", vdrl: "VDRL", chagas: "Chagas", coproparasitological: "Coproparasitológico", other: "Otros",
  healthEducation: "Orientación en salud", treatment: "Tratamiento", complementaryStudies: "Estudios complementarios", referral: "Derivación", medicalFollowUp: "Control médico", noObservations: "Sin observaciones", observations: "Observaciones",
  ophthalmology: "Examen oftalmológico", currentIllness: "Enfermedad actual", visualAcuityRight: "Agudeza visual ojo derecho", visualAcuityLeft: "Agudeza visual ojo izquierdo",
  gynecology: "Historia y examen ginecológico", onset: "Inicio", symptoms: "Síntomas principales", previousTreatments: "Tratamientos previos", menarcheAge: "Menarca", menstrualPattern: "Ritmo menstrual", cycleDays: "Duración del ciclo", lastMenstrualPeriod: "FUM", dysmenorrhea: "Dismenorrea", leucorrhea: "Leucorrea", previousSti: "ITS previas", stiDetails: "Detalle ITS", contraceptiveMethods: "Métodos anticonceptivos", contraceptiveOther: "Otro método", lastPap: "Último PAP", papResult: "Resultado PAP", papDetails: "Detalle PAP", familyGynecologicalCancer: "CA ginecológico familiar", familyBreastCancer: "CA de mama familiar", familyDiabetes: "Diabetes familiar", familyOther: "Otros antecedentes familiares", breastExam: "Mamas", externalGenitalExam: "Genitales externos", speculumExam: "Especuloscopía", vaginalExam: "Tacto vaginal", cervixExam: "Cuello uterino",
};
const values: Record<string, string> = { YES: "Sí", NO: "No", ADEQUATE: "Adecuada", REGULAR: "Regular", INADEQUATE: "Inadecuada", ACUTE: "Agudo", SUBACUTE: "Subagudo", CHRONIC: "Crónico", NORMAL: "Normal", ALTERED: "Alterado", NONE: "Ninguno", ORAL: "Oral", INJECTABLE: "Inyectable", IUD: "DIU", IMPLANT: "Implante", CONDOM: "Preservativo" };

function title(key: string) { return labels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase()); }
function render(value: unknown): string {
  if (value === null || value === undefined || value === "") return "No registrado";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string") return values[value] ?? value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.length ? value.map(render).join(", ") : "No registrado";
  return "No registrado";
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function date(value: string) { return new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeZone: "America/La_Paz" }).format(new Date(value)); }

function dataTable(rows: [string, unknown][]) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border }, rows: rows.map(([label, value], index) => new TableRow({ children: [
    new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: index % 2 ? "FFFFFF" : light }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 19, color: "26334A" })] })] }),
    new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: index % 2 ? "FFFFFF" : light }, children: [new Paragraph({ children: [new TextRun({ text: render(value), size: 19 })] })] }),
  ] })) });
}
function sectionHeading(text: string) { return new Paragraph({ spacing: { before: 260, after: 110 }, children: [new TextRun({ text, bold: true, size: 24, color: "000000" })] }); }
function formSections(data: Record<string, unknown>, hideGeneral: boolean) {
  return Object.entries(data).flatMap(([key, item]) => {
    if (hideGeneral && (key === "personalHistory" || key === "habits")) return [];
    if (key === "specialtyCode" || item === null || item === undefined) return [];
    if (item && typeof item === "object" && !Array.isArray(item)) return [sectionHeading(title(key)), dataTable(Object.entries(object(item)).map(([field, value]) => [title(field), value]))];
    return [dataTable([[title(key), item]])];
  });
}

export async function downloadClinicalRecordWord({ patient, encounter, diagnoses }: { patient: Patient; encounter: Encounter; diagnoses: string[] }) {
  const logos = await loadReportBranding();
  const background = encounter.clinicalBackground;
  const generalRows: [string, unknown][] = background ? [
    ["Alergias", backgroundEntryText(background.data.allergies)], ["Antecedentes personales", backgroundEntryText(background.data.personalConditions)], ["Cirugías", backgroundEntryText(background.data.surgeries)], ["Medicamentos actuales", backgroundEntryText(background.data.medications)], ["Antecedentes familiares", backgroundEntryText(background.data.familyHistory)],
    ["Alimentación", render(background.data.habits.diet)], ["Actividad física", render(background.data.habits.physicalActivity)], ["Tabaco", render(background.data.habits.tobacco)], ["Alcohol", render(background.data.habits.alcohol)],
  ] : [];
  const specific = encounter.encounter_type === "INITIAL" ? encounter.reviewHistory : encounter.specialtyHistory;
  const document = new Document({
    sections: [{
      properties: { page: { margin: { top: 900, right: 850, bottom: 850, left: 850 } } },
      headers: { default: new Header({ children: [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } }, rows: [new TableRow({ children: [
        new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new ImageRun({ data: logos.facultyBytes, transformation: { width: 44, height: 44 }, type: "png" })] })] }),
        new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: navy }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CENTRO DE ESPECIALIDADES MÉDICAS", bold: true, color: "FFFFFF", size: 22 })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Facultad de Ciencias de la Salud Humana · UAGRM", color: "FFFFFF", size: 16 })] })] }),
        new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ data: logos.centerBytes, transformation: { width: 44, height: 44 }, type: "png" })] })] }),
      ] })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ficha clínica generada desde el sistema · Página ", size: 16, color: "526174" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "526174" })] })] }) },
      children: [
        new Paragraph({ spacing: { before: 260, after: 80 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: encounter.encounter_type === "INITIAL" ? "Historia clínica de revisión médica" : "Historia clínica de " + (encounter.specialty ?? "especialidad"), bold: true, size: 29, color: "000000" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 }, children: [new TextRun({ text: "Atención registrada el " + date(encounter.occurred_at), size: 18, color: "526174" })] }),
        sectionHeading("Identificación del paciente"),
        dataTable([["Paciente", patient.fullName], ["Carnet", patient.carnet], ["Código de registro", patient.registrationCode], ["Fecha de nacimiento", patient.birthDate ? date(patient.birthDate) : null], ["Teléfono", patient.phone], ["Correo", patient.email]]),
        sectionHeading("Datos de la atención"),
        dataTable([["Tipo de atención", encounter.encounter_type === "INITIAL" ? "Revisión médica" : "Especialidad"], ["Especialidad", encounter.specialty], ["Motivo de consulta", encounter.chief_complaint], ["Evaluación clínica", encounter.assessment], ["Diagnósticos", diagnoses.length ? diagnoses.join(" · ") : null], ["Indicaciones", encounter.instructions], ["Control médico", encounter.follow_up_text]]),
        ...(generalRows.length ? [sectionHeading("Antecedentes y hábitos generales"), dataTable(generalRows)] : []),
        ...(specific ? [sectionHeading("Formulario clínico de la atención"), ...formSections(specific, Boolean(background))] : []),
        new Paragraph({ spacing: { before: 420 }, children: [new TextRun({ text: "Documento clínico confidencial", bold: true, color: red, size: 17 })] }),
      ],
    }],
  });
  const blob = await Packer.toBlob(document);
  const url = URL.createObjectURL(blob); const anchor = window.document.createElement("a");
  anchor.href = url; anchor.download = "ficha-clinica-" + patient.carnet.replace(/[^a-z0-9]+/gi, "-") + ".docx"; anchor.click(); URL.revokeObjectURL(url);
}
