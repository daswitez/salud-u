import dictionary from "./clinical-json-dictionary.json";

const keys: Record<string, string> = dictionary.keys;
const values: Record<string, Record<string, string>> = dictionary.values;
const inverseKeys = Object.fromEntries(Object.entries(keys).map(([key, value]) => [value, key]));

/** Wire/storage uses Spanish; the existing presentation models remain compatible with legacy records. */
export function clinicalJson(value: unknown, spanish: boolean, field = ""): unknown {
  if (Array.isArray(value)) return value.map(item => clinicalJson(item, spanish, field));
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const legacyKey = inverseKeys[key] ?? key;
      const target = spanish ? keys[legacyKey] ?? legacyKey : legacyKey;
      if (Object.hasOwn(result, target)) throw new Error("No mezcles claves clínicas equivalentes en ambos idiomas.");
      result[target] = clinicalJson(item, spanish, legacyKey);
    }
    return result;
  }
  if (typeof value === "string") {
    const options = values[field] ?? {};
    const legacy = Object.entries(options).find(([, translated]) => translated === value)?.[0] ?? value;
    return spanish ? options[legacy] ?? value : legacy;
  }
  return value;
}

/** Translate clinical payloads only, preserving HTTP envelopes and nonclinical contracts. */
export function clinicalPayload(value: unknown, spanish: boolean, background = false): unknown {
  if (Array.isArray(value)) return value.map(item => clinicalPayload(item, spanish, background));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const structured = item && typeof item === "object" && "versionEsquema" in item;
    const isClinical = key === "reviewHistory" || key === "specialtyHistory" || key === "habits" ||
      (key === "data" && (background || structured));
    return [key, isClinical && item ? clinicalJson(item, spanish) : clinicalPayload(item, spanish, background)];
  }));
}
