/** Canonical values stored on CV items; labels come from LanguageContext. */
export const LANGUAGE_LEVEL_OPTIONS = [
  { value: "Native", key: "langLevel.native" },
  { value: "Fluent", key: "langLevel.fluent" },
  { value: "Professional", key: "langLevel.professional" },
  { value: "Intermediate", key: "langLevel.intermediate" },
  { value: "Basic", key: "langLevel.basic" },
];

const CANONICAL_VALUES = new Set(LANGUAGE_LEVEL_OPTIONS.map((o) => o.value));

/** Legacy CEFR codes → canonical level (old data / SectionModal default). */
const CEFR_TO_VALUE = {
  A1: "Basic",
  A2: "Basic",
  B1: "Intermediate",
  B2: "Intermediate",
  C1: "Professional",
  C2: "Fluent",
};

/** Map Georgian labels (if saved) back to canonical English. */
const KA_TO_VALUE = {
  "მშობლიური": "Native",
  "გამართულად": "Fluent",
  "პროფესიულ დონეზე": "Professional",
  "საშუალო დონეზე": "Intermediate",
  "საწყისი დონე": "Basic",
};

function toCanonical(level) {
  if (!level) return null;
  const trimmed = String(level).trim();
  if (CANONICAL_VALUES.has(trimmed)) return trimmed;
  const ka = KA_TO_VALUE[trimmed];
  if (ka) return ka;
  const cefr = CEFR_TO_VALUE[trimmed.toUpperCase()];
  if (cefr) return cefr;
  return null;
}

/** Pick level for selects; defaults to Native. */
export function canonicalLanguageLevel(level) {
  return toCanonical(level) || "Native";
}

/** Resolve stored item fields → one canonical level (level wins over legacy proficiency). */
export function resolveLanguageLevel(item) {
  if (!item) return null;
  return toCanonical(item.level) || toCanonical(item.proficiency) || null;
}

export function translateLanguageLevel(level, t) {
  const canonical = toCanonical(level);
  if (!canonical) return "";
  const opt = LANGUAGE_LEVEL_OPTIONS.find((o) => o.value === canonical);
  if (!opt) return canonical;
  const label = t(opt.key);
  return label === opt.key ? canonical : label;
}
