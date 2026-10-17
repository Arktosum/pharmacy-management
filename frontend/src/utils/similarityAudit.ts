import { Medicine, Disease, Link } from "../types";

export type IssueCategory =
  | "Invisible Characters"
  | "Spacing & Punctuation"
  | "Word Order Inversion"
  | "Singular / Plural"
  | "Typo (1 char diff)"
  | "Abbreviation"
  | "Spelling Variation";

export interface DuplicateMember {
  id: string;
  name: string;
  linkCount: number;
  hasInvisibleChars: boolean;
  hasWeirdSpacing: boolean;
}

export interface SimilarGroup {
  id: string;
  signature: string;
  entityType: "medicine" | "disease";
  primaryName: string;
  issues: IssueCategory[];
  members: DuplicateMember[];
  isDismissed?: boolean;
}

export interface AuditSummary {
  totalGroups: number;
  medicineGroups: number;
  diseaseGroups: number;
  totalConflictingEntities: number;
  dismissedCount: number;
  groups: SimilarGroup[];
}

const DISMISSED_STORAGE_KEY = "remedygraph_dismissed_clusters";

export function getDismissedGroupSignatures(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function dismissGroupSignature(signature: string): void {
  try {
    const set = getDismissedGroupSignatures();
    set.add(signature);
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error("Failed to dismiss group:", e);
  }
}

export function restoreGroupSignature(signature: string): void {
  try {
    const set = getDismissedGroupSignatures();
    set.delete(signature);
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error("Failed to restore group:", e);
  }
}

// Clean invisible unicode characters, zero-width spaces, and soft hyphens
export function cleanString(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "").trim();
}

export function hasInvisibleChars(s: string): boolean {
  return /[\u200B-\u200D\uFEFF\u00AD]/.test(s);
}

export function hasWeirdSpacing(s: string): boolean {
  return /\s{2,}/.test(s) || /^\s|\s$/.test(s);
}

export function normalize(s: string): string {
  return cleanString(s)
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function getTokens(s: string): string[] {
  return cleanString(s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function sortedTokenString(s: string): string {
  return getTokens(s).sort().join(" ");
}

export function stem(w: string): string {
  const s = w.toLowerCase().trim();
  if (s.endsWith("polypi") && s.length > 5) return s.slice(0, -1);
  if (s.endsWith("ies") && s.length > 5) return s.slice(0, -3) + "y";
  if (s.endsWith("es") && s.length > 4) return s.slice(0, -2);
  if (s.endsWith("s") && !s.endsWith("ss") && s.length > 3) return s.slice(0, -1);
  return s;
}

export function stemSortedTokens(s: string): string {
  return getTokens(s).map(stem).sort().join(" ");
}

// Damerau-Levenshtein distance (insertions, deletions, substitutions, adjacent transpositions)
export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return d[m][n];
}

export function isOppositePair(a: string, b: string): boolean {
  const lowA = a.toLowerCase();
  const lowB = b.toLowerCase();
  if (
    (lowA.includes("hypo") && lowB.includes("hyper")) ||
    (lowA.includes("hyper") && lowB.includes("hypo"))
  ) {
    return true;
  }
  if (
    (lowA.includes("male") && lowB.includes("female")) ||
    (lowA.includes("female") && lowB.includes("male"))
  ) {
    return true;
  }
  if (
    (lowA.includes("acute") && lowB.includes("chronic")) ||
    (lowA.includes("chronic") && lowB.includes("acute"))
  ) {
    return true;
  }
  return false;
}

export function isDistinctMedicalSuffixPair(a: string, b: string): boolean {
  const lowA = a.toLowerCase();
  const lowB = b.toLowerCase();
  // -itis vs -osis (inflammation vs pathology, e.g. nephritis vs nephrosis, arthritis vs arthrosis)
  if (
    (lowA.endsWith("itis") && lowB.endsWith("osis")) ||
    (lowA.endsWith("osis") && lowB.endsWith("itis"))
  ) {
    return true;
  }
  // -emia vs -uria (blood vs urine)
  if (
    (lowA.endsWith("emia") && lowB.endsWith("uria")) ||
    (lowA.endsWith("uria") && lowB.endsWith("emia")) ||
    (lowA.endsWith("aemia") && lowB.endsWith("uria")) ||
    (lowA.endsWith("uria") && lowB.endsWith("aemia"))
  ) {
    return true;
  }
  // -ectomy vs -otomy vs -ostomy
  if (
    (lowA.endsWith("ectomy") || lowA.endsWith("otomy") || lowA.endsWith("ostomy")) &&
    (lowB.endsWith("ectomy") || lowB.endsWith("otomy") || lowB.endsWith("ostomy")) &&
    lowA !== lowB
  ) {
    return true;
  }
  return false;
}

export function compareItems(
  nameA: string,
  nameB: string
): IssueCategory | null {
  const cleanA = cleanString(nameA);
  const cleanB = cleanString(nameB);

  if (isOppositePair(cleanA, cleanB)) return null;
  if (isDistinctMedicalSuffixPair(cleanA, cleanB)) return null;

  // 1. Normalized match (casing, quotes, punctuation, spacing, invisible chars)
  const normA = normalize(cleanA);
  const normB = normalize(cleanB);
  if (normA === normB) {
    if (cleanA.toLowerCase() === cleanB.toLowerCase()) {
      return "Invisible Characters";
    }
    return "Spacing & Punctuation";
  }

  // 2. Word order permutation (e.g. "head injury" vs "injury head")
  const sortTokA = sortedTokenString(cleanA);
  const sortTokB = sortedTokenString(cleanB);
  if (sortTokA === sortTokB) {
    return "Word Order Inversion";
  }

  // 3. Singular vs Plural
  const stemTokA = stemSortedTokens(cleanA);
  const stemTokB = stemSortedTokens(cleanB);
  if (stemTokA === stemTokB) {
    return "Singular / Plural";
  }

  // 4. Token-by-token comparison
  const toksA = getTokens(cleanA);
  const toksB = getTokens(cleanB);

  if (toksA.length === toksB.length) {
    const diffs: { tA: string; tB: string }[] = [];
    for (let i = 0; i < toksA.length; i++) {
      if (toksA[i] !== toksB[i]) {
        diffs.push({ tA: toksA[i], tB: toksB[i] });
      }
    }
    if (diffs.length === 1) {
      const { tA, tB } = diffs[0];
      if (isOppositePair(tA, tB)) return null;
      if (isDistinctMedicalSuffixPair(tA, tB)) return null;
      if (stem(tA) === stem(tB)) return "Singular / Plural";
      if (
        (tA === "ac" && tB === "acid") ||
        (tB === "ac" && tA === "acid")
      ) {
        return "Abbreviation";
      }
      const dDist = damerauLevenshtein(tA, tB);
      if (dDist === 1 && Math.min(tA.length, tB.length) >= 4) {
        return "Typo (1 char diff)";
      }
      if (dDist === 2 && Math.min(tA.length, tB.length) >= 7) {
        return "Spelling Variation";
      }
      return null;
    }
  }

  // 5. Full string single token comparison
  if (toksA.length === 1 && toksB.length === 1) {
    if (isDistinctMedicalSuffixPair(toksA[0], toksB[0])) return null;
    const dDist = damerauLevenshtein(toksA[0], toksB[0]);
    if (dDist === 1 && Math.min(toksA[0].length, toksB[0].length) >= 4) {
      return "Typo (1 char diff)";
    }
    if (dDist === 2 && Math.min(toksA[0].length, toksB[0].length) >= 7) {
      return "Spelling Variation";
    }
  }

  // 6. Normalized damerau distance 1
  if (Math.abs(normA.length - normB.length) <= 1) {
    const dNorm = damerauLevenshtein(normA, normB);
    if (dNorm === 1 && Math.min(normA.length, normB.length) >= 6) {
      return "Typo (1 char diff)";
    }
  }

  return null;
}

// Disjoint Set / Union-Find Clustering
export function clusterEntities<T extends { id: string; name: string }>(
  items: T[],
  entityType: "medicine" | "disease",
  linkCounts: Map<string, number>,
  dismissedSet: Set<string> = getDismissedGroupSignatures()
): SimilarGroup[] {
  const n = items.length;
  if (n < 2) return [];

  const parent = Array.from({ length: n }, (_, i) => i);
  function find(i: number): number {
    if (parent[i] === i) return i;
    return (parent[i] = find(parent[i]));
  }
  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent[rootI] = rootJ;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (compareItems(items[i].name, items[j].name)) {
        union(i, j);
      }
    }
  }

  const groupMap = new Map<number, T[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groupMap.has(root)) groupMap.set(root, []);
    groupMap.get(root)!.push(items[i]);
  }

  const clusters: SimilarGroup[] = [];
  for (const [, members] of groupMap.entries()) {
    if (members.length >= 2) {
      const issuesSet = new Set<IssueCategory>();
      for (let a = 0; a < members.length; a++) {
        for (let b = a + 1; b < members.length; b++) {
          const reason = compareItems(members[a].name, members[b].name);
          if (reason) issuesSet.add(reason);
        }
      }

      const formattedMembers: DuplicateMember[] = members.map((m) => ({
        id: m.id,
        name: m.name,
        linkCount: linkCounts.get(m.id) || 0,
        hasInvisibleChars: hasInvisibleChars(m.name),
        hasWeirdSpacing: hasWeirdSpacing(m.name),
      }));

      // Sort members by link count descending so canonical node is often first
      formattedMembers.sort(
        (a, b) => b.linkCount - a.linkCount || a.name.localeCompare(b.name)
      );

      const signature = formattedMembers
        .map((m) => m.id)
        .sort()
        .join("::");
      const isDismissed = dismissedSet.has(signature);

      clusters.push({
        id: `${entityType}-${formattedMembers[0].id}`,
        signature,
        entityType,
        primaryName: formattedMembers[0].name,
        issues: Array.from(issuesSet),
        members: formattedMembers,
        isDismissed,
      });
    }
  }

  // Sort clusters by number of members descending, then by total links descending
  clusters.sort((a, b) => {
    if (b.members.length !== a.members.length) {
      return b.members.length - a.members.length;
    }
    const linksA = a.members.reduce((acc, m) => acc + m.linkCount, 0);
    const linksB = b.members.reduce((acc, m) => acc + m.linkCount, 0);
    return linksB - linksA;
  });

  return clusters;
}

export function auditSimilarGroups(
  medicines: Medicine[],
  diseases: Disease[],
  links: Link[]
): AuditSummary {
  // Precompute link counts
  const medLinks = new Map<string, number>();
  const illLinks = new Map<string, number>();

  for (const l of links) {
    medLinks.set(l.medicineId, (medLinks.get(l.medicineId) || 0) + 1);
    illLinks.set(l.diseaseId, (illLinks.get(l.diseaseId) || 0) + 1);
  }

  const dismissedSet = getDismissedGroupSignatures();
  const medClusters = clusterEntities(medicines, "medicine", medLinks, dismissedSet);
  const illClusters = clusterEntities(diseases, "disease", illLinks, dismissedSet);
  const allGroups = [...medClusters, ...illClusters];

  const activeGroups = allGroups.filter((g) => !g.isDismissed);
  const dismissedGroups = allGroups.filter((g) => g.isDismissed);

  const totalConflictingEntities = activeGroups.reduce(
    (acc, g) => acc + g.members.length,
    0
  );

  return {
    totalGroups: activeGroups.length,
    medicineGroups: activeGroups.filter((g) => g.entityType === "medicine").length,
    diseaseGroups: activeGroups.filter((g) => g.entityType === "disease").length,
    totalConflictingEntities,
    dismissedCount: dismissedGroups.length,
    groups: allGroups,
  };
}
