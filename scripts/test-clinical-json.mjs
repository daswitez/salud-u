import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const dictionary = JSON.parse(readFileSync(new URL("../src/lib/clinical-json-dictionary.json", import.meta.url), "utf8"));
assert.deepEqual(dictionary, JSON.parse(readFileSync(new URL("../../salud-u-backend/src/main/resources/clinical-json-dictionary.json", import.meta.url), "utf8")));
const source = readFileSync(new URL("../src/lib/clinical-json.ts", import.meta.url), "utf8")
  .replace(/^import dictionary .*;$/m, "const dictionary = " + JSON.stringify(dictionary) + ";");
const { clinicalJson, clinicalPayload } = await import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64"));
const original = {
  schemaVersion: 1, personalHistory: { allergic: "YES · NONE · áéíóú" },
  habits: { diet: "ADEQUATE", physicalActivity: "YES" },
  vitals: { height: 1.7, weight: null },
  conduct: { treatment: true, referral: false },
  gynecology: { contraceptiveMethods: ["IUD", "CONDOM"], symptoms: "YES" },
};
const spanish = clinicalJson(original, true);
assert.deepEqual(spanish, {
  versionEsquema: 1, antecedentesPersonales: { alergicos: "YES · NONE · áéíóú" },
  habitos: { alimentacion: "ADECUADA", actividadFisica: "SI" },
  signosVitales: { talla: 1.7, peso: null },
  conducta: { tratamiento: true, derivacion: false },
  ginecologia: { metodosAnticonceptivos: ["DIU", "PRESERVATIVO"], sintomas: "YES" },
});
assert.deepEqual(clinicalJson(spanish, false), original);
assert.deepEqual(clinicalJson(spanish, true), spanish);
assert.throws(() => clinicalJson({ vitals: {}, signosVitales: {} }, true), /ambos idiomas/);
const request = { reviewHistory: original, specialtyHistory: null, diagnosisText: "NO", bloodChemistryStatus: "PENDING" };
assert.deepEqual(clinicalPayload(request, true), { ...request, reviewHistory: spanish });
const response = { encounter: { status: "CLOSED", reviewHistory: spanish }, clinicalBackground: { data: { versionEsquema: 1, alergias: { estado: "PRESENTE", elementos: ["YES"] } } } };
assert.deepEqual(clinicalPayload(response, false), {
  encounter: { status: "CLOSED", reviewHistory: original },
  clinicalBackground: { data: { schemaVersion: 1, allergies: { status: "PRESENT", items: ["YES"] } } },
});
const background = { data: { schemaVersion: 1, allergies: { status: "UNKNOWN", items: [] } }, expectedVersion: 0 };
assert.deepEqual(clinicalPayload(background, true, true), { data: { versionEsquema: 1, alergias: { estado: "DESCONOCIDO", elementos: [] } }, expectedVersion: 0 });
console.log("PASS: clinical payloads, dictionary parity, reversible translation, null/order/text, aliases and HTTP envelopes");
