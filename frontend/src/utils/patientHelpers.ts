import { Disease, KnowledgeSource, VisitSymptomRef } from "../types";

export function getLocalDateISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function normalizeSymptomName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Resolves a stored VisitSymptomRef against the currently selected knowledge base's diseases.
 * Prefers exact ID match when from the same source, falling back to case-insensitive name match.
 */
export function resolveSymptomInDatabase(
  symptom: VisitSymptomRef,
  diseases: Disease[],
  activeSource: KnowledgeSource
): Disease | null {
  if (symptom.source === activeSource && symptom.id) {
    const byId = diseases.find((d) => d.id === symptom.id);
    if (byId) return byId;
  }
  const targetName = normalizeSymptomName(symptom.name);
  return (
    diseases.find((d) => normalizeSymptomName(d.name) === targetName) ?? null
  );
}
