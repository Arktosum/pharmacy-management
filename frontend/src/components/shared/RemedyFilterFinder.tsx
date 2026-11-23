import { useMemo, useState, useRef, useEffect } from "react";
import {
  Pill,
  Stethoscope,
  ArrowUpRight,
  AlertTriangle,
  Layers,
  X,
  Search as SearchIcon,
  Check,
  Link as LinkIcon,
  Target,
  Filter,
  Leaf,
  Gem,
  PawPrint,
  Sparkles,
} from "lucide-react";
import Card from "../mapper/Card";
import { matchesSearch, getSearchMatcher } from "../Utils";
import { Disease, Kingdom, Link, Medicine } from "../../types";
import KingdomBadge, {
  KingdomIcon,
  normalizeKingdom,
} from "./KingdomBadge";

export type RemedyFilterMode = "and" | "or" | "entry";

export interface FilteredRemedyResult {
  medicine: Medicine;
  matchedCount: number;
  totalSelected: number;
  matchedDiseaseNames: string[];
  entryMatchedCount: number;
  totalEntry: number;
}

interface RemedyFilterFinderProps {
  allMeds: Medicine[];
  allDiseases: Disease[];
  allLinks: Link[];
  onSelectMedicine?: (medicineId: string) => void;
  initialSelectedDiseases?: Disease[];
  storageKey?: string;
}

export default function RemedyFilterFinder({
  allMeds,
  allDiseases,
  allLinks,
  onSelectMedicine,
  initialSelectedDiseases = [],
  storageKey = "remedy_filter_finder",
}: RemedyFilterFinderProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDiseases, setSelectedDiseases] = useState<Disease[]>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`${storageKey}_diseases`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return initialSelectedDiseases;
  });
  const [filterMode, setFilterMode] = useState<RemedyFilterMode>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`${storageKey}_mode`);
        if (saved === "and" || saved === "or" || saved === "entry") return saved;
      } catch {}
    }
    return "and";
  });
  const [entryDiseaseIds, setEntryDiseaseIds] = useState<Set<string>>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`${storageKey}_entry_ids`);
        if (saved) return new Set(JSON.parse(saved));
      } catch {}
    }
    return new Set();
  });
  const [selectedKingdom, setSelectedKingdom] = useState<Kingdom | "all">(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`${storageKey}_kingdom`);
        if (saved) return saved as Kingdom | "all";
      } catch {}
    }
    return "all";
  });
  const [kingdomSearchQuery, setKingdomSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state to localStorage whenever selection changes
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(`${storageKey}_diseases`, JSON.stringify(selectedDiseases));
      localStorage.setItem(`${storageKey}_mode`, filterMode);
      localStorage.setItem(`${storageKey}_entry_ids`, JSON.stringify(Array.from(entryDiseaseIds)));
      localStorage.setItem(`${storageKey}_kingdom`, selectedKingdom);
    } catch {}
  }, [storageKey, selectedDiseases, filterMode, entryDiseaseIds, selectedKingdom]);

  // Map of diseaseId -> Set of linked medicine IDs
  const diseaseToMedsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const link of allLinks) {
      if (!map.has(link.diseaseId)) map.set(link.diseaseId, new Set());
      map.get(link.diseaseId)!.add(link.medicineId);
    }
    return map;
  }, [allLinks]);

  const selectedIdSet = useMemo(
    () => new Set(selectedDiseases.map((d) => d.id)),
    [selectedDiseases]
  );

  // Search results capped to top 50 for blazing-fast responsiveness
  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return allDiseases.slice(0, 50);
    const matcher = getSearchMatcher(q);
    const results: Disease[] = [];
    for (let i = 0; i < allDiseases.length; i++) {
      if (matcher(allDiseases[i].name)) {
        results.push(allDiseases[i]);
        if (results.length >= 50) break;
      }
    }
    return results;
  }, [searchQuery, allDiseases]);

  // Core filtering across AND / OR / Entry Point modes
  const filteredResults = useMemo<FilteredRemedyResult[]>(() => {
    if (selectedDiseases.length === 0) return [];

    const entryList = selectedDiseases.filter((d) => entryDiseaseIds.has(d.id));
    if (filterMode === "entry" && entryList.length === 0) {
      return [];
    }

    const totalSelected = selectedDiseases.length;
    const totalEntry = entryList.length;
    const results: FilteredRemedyResult[] = [];

    for (const med of allMeds) {
      const matchedDiseaseNames: string[] = [];
      let entryMatchedCount = 0;

      for (const disease of selectedDiseases) {
        const medsForDisease = diseaseToMedsMap.get(disease.id);
        if (medsForDisease?.has(med.id)) {
          matchedDiseaseNames.push(disease.name);
          if (entryDiseaseIds.has(disease.id)) {
            entryMatchedCount++;
          }
        }
      }

      const matchedCount = matchedDiseaseNames.length;

      if (filterMode === "and") {
        if (matchedCount === totalSelected) {
          results.push({
            medicine: med,
            matchedCount,
            totalSelected,
            matchedDiseaseNames,
            entryMatchedCount,
            totalEntry,
          });
        }
      } else if (filterMode === "or") {
        if (matchedCount > 0) {
          results.push({
            medicine: med,
            matchedCount,
            totalSelected,
            matchedDiseaseNames,
            entryMatchedCount,
            totalEntry,
          });
        }
      } else {
        // entry mode: must match ALL entry diseases; other selected diseases are optional
        if (entryMatchedCount === totalEntry) {
          results.push({
            medicine: med,
            matchedCount,
            totalSelected,
            matchedDiseaseNames,
            entryMatchedCount,
            totalEntry,
          });
        }
      }
    }

    if (filterMode === "or" || filterMode === "entry") {
      results.sort((a, b) => {
        if (b.matchedCount !== a.matchedCount) {
          return b.matchedCount - a.matchedCount;
        }
        return a.medicine.name.localeCompare(b.medicine.name);
      });
    } else {
      results.sort((a, b) => a.medicine.name.localeCompare(b.medicine.name));
    }

    return results;
  }, [selectedDiseases, filterMode, entryDiseaseIds, allMeds, diseaseToMedsMap]);

  // Breakdown of matching remedies by kingdom
  const kingdomCounts = useMemo(() => {
    let plant = 0;
    let mineral = 0;
    let animal = 0;
    for (const r of filteredResults) {
      const k = normalizeKingdom(r.medicine.kingdom);
      if (k === "Plant") plant++;
      else if (k === "Mineral") mineral++;
      else if (k === "Animal") animal++;
    }
    return {
      all: filteredResults.length,
      Plant: plant,
      Mineral: mineral,
      Animal: animal,
    };
  }, [filteredResults]);

  // Matching remedies filtered further by kingdom selection
  const kingdomFilteredResults = useMemo(() => {
    let list = filteredResults;
    if (selectedKingdom !== "all") {
      list = list.filter(
        (r) => normalizeKingdom(r.medicine.kingdom) === selectedKingdom
      );
    }
    if (kingdomSearchQuery.trim()) {
      const q = kingdomSearchQuery.trim();
      list = list.filter((r) => matchesSearch(q, r.medicine.name));
    }
    return list;
  }, [filteredResults, selectedKingdom, kingdomSearchQuery]);

  const handleSelectDisease = (disease: Disease) => {
    if (selectedIdSet.has(disease.id)) return;
    setSelectedDiseases((prev) => [...prev, disease]);
  };

  const handleRemoveDisease = (diseaseId: string) => {
    setSelectedDiseases((prev) => prev.filter((d) => d.id !== diseaseId));
    setEntryDiseaseIds((prev) => {
      if (!prev.has(diseaseId)) return prev;
      const next = new Set(prev);
      next.delete(diseaseId);
      return next;
    });
  };

  const handleToggleEntry = (diseaseId: string) => {
    setEntryDiseaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(diseaseId)) {
        next.delete(diseaseId);
      } else {
        next.add(diseaseId);
      }
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedDiseases([]);
    setEntryDiseaseIds(new Set());
    setSelectedKingdom("all");
    setKingdomSearchQuery("");
    searchInputRef.current?.focus();
  };

  const modeDescription =
    filterMode === "and"
      ? "Shows remedies that satisfy ALL selected symptoms simultaneously."
      : filterMode === "or"
      ? "Shows remedies that satisfy ANY selected symptom, sorted by most symptoms solved."
      : "Shows remedies that satisfy ALL marked Entry symptoms (other selected symptoms are optional, sorted by total match).";

  const activeEntryCount = selectedDiseases.filter((d) =>
    entryDiseaseIds.has(d.id)
  ).length;

  return (
    <Card>
      <div className="min-h-[480px] flex flex-col justify-between">
        {/* Header */}
        <div className="mb-5 pb-3 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                Remedy Filter
              </h3>
            </div>
            <p className="text-sm text-slate-500 mt-1">{modeDescription}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 3-Way Filter Mode Selector */}
            <div
              className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-xs"
              role="group"
              aria-label="Remedy filter mode"
            >
              <button
                type="button"
                onClick={() => setFilterMode("and")}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-extrabold transition flex items-center gap-1.5 ${
                  filterMode === "and"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>AND</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("or")}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-extrabold transition flex items-center gap-1.5 ${
                  filterMode === "or"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>OR</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("entry")}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-extrabold transition flex items-center gap-1.5 ${
                  filterMode === "entry"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Entry Point</span>
              </button>
            </div>

            {selectedDiseases.length > 0 && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1.5 shadow-xs">
                <Pill className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {filteredResults.length} matching{" "}
                  {filteredResults.length === 1 ? "remedy" : "remedies"}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* 4-Column Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 flex-1">
          {/* Column 1: Disease Search & Selection */}
          <div className="flex flex-col min-h-[340px]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <SearchIcon className="w-4 h-4 text-slate-500" />
                <span>Search Diseases</span>
              </label>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Showing top {searchResults.length}
              </span>
            </div>

            <div className="relative">
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search diseases (regex e.g. cough|fever)..."
                style={{ backgroundColor: "rgb(118 213 133 / 54%)" }}
                className="w-full px-4 py-3.5 pr-10 border-2 border-emerald-400 rounded-xl text-lg font-bold text-slate-900 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-emerald-200/50 transition"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <ul className="mt-3 max-h-80 overflow-y-auto border-2 border-slate-200 rounded-xl bg-white divide-y shadow-sm flex-1">
              {searchResults.map((d) => {
                const isSelected = selectedIdSet.has(d.id);
                const count = diseaseToMedsMap.get(d.id)?.size || 0;
                return (
                  <li
                    key={d.id}
                    onClick={() => !isSelected && handleSelectDisease(d)}
                    className={`px-4 py-3.5 text-lg font-bold transition flex items-center justify-between group ${
                      isSelected
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-75"
                        : "cursor-pointer hover:bg-emerald-50 text-slate-900 hover:text-emerald-950"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2">
                      <Stethoscope
                        className={`w-5 h-5 shrink-0 ${
                          isSelected ? "text-slate-400" : "text-emerald-600"
                        }`}
                      />
                      <span className="truncate">{d.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border ${
                          isSelected
                            ? "bg-slate-200 text-slate-500 border-slate-300"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>
                          {count} {count === 1 ? "remedy" : "remedies"}
                        </span>
                      </span>

                      {isSelected ? (
                        <span className="text-xs font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </span>
                      ) : (
                        <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition">
                          + Add
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
              {searchResults.length === 0 && (
                <li className="px-4 py-8 text-center text-base font-bold text-slate-400 italic">
                  No matching diseases found.
                </li>
              )}
            </ul>
          </div>

          {/* Column 2: Selected Diseases */}
          <div className="flex flex-col min-h-[340px]">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <span>Selected Diseases ({selectedDiseases.length})</span>
              </h4>
              {selectedDiseases.length > 1 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {filterMode === "entry" && selectedDiseases.length > 0 && (
              <div className="mt-1 mb-1 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Click <strong>Entry</strong> to mark mandatory symptoms (
                    {activeEntryCount} marked).
                  </span>
                </span>
              </div>
            )}

            {selectedDiseases.length === 0 ? (
              <div className="mt-3 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 min-h-[260px]">
                <Stethoscope className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-base font-semibold text-slate-600">
                  No diseases selected yet
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Search and click diseases on the left to add them to your
                  filter set.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2 max-h-80 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex-1">
                {selectedDiseases.map((d) => {
                  const count = diseaseToMedsMap.get(d.id)?.size || 0;
                  const isEntry = entryDiseaseIds.has(d.id);
                  return (
                    <li
                      key={d.id}
                      className={`px-4 py-3 bg-white border rounded-lg flex items-center justify-between text-base font-bold text-slate-900 shadow-xs transition ${
                        filterMode === "entry" && isEntry
                          ? "border-amber-400 ring-1 ring-amber-200 bg-amber-50/30"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        <Stethoscope
                          className={`w-5 h-5 shrink-0 ${
                            filterMode === "entry" && isEntry
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        />
                        <span className="truncate">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {filterMode === "entry" && (
                          <button
                            type="button"
                            onClick={() => handleToggleEntry(d.id)}
                            className={`text-xs px-2.5 py-1 rounded-md font-black uppercase border flex items-center gap-1 transition ${
                              isEntry
                                ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
                            }`}
                            title={
                              isEntry
                                ? "Marked as required Entry symptom (click to make optional)"
                                : "Optional symptom (click to mark as required Entry symptom)"
                            }
                          >
                            <Target className="w-3 h-3" />
                            <span>{isEntry ? "Entry" : "Optional"}</span>
                          </button>
                        )}
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          <span>{count}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDisease(d.id)}
                          className="text-slate-400 hover:text-rose-600 font-bold text-lg px-1.5 py-0.5 rounded hover:bg-rose-50 transition leading-none shrink-0"
                          title={`Remove "${d.name}"`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Column 3: Filtered Remedy Results */}
          <div className="flex flex-col min-h-[340px]">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-blue-600" />
                <span>
                  {filterMode === "and"
                    ? "Matching Remedies (AND)"
                    : filterMode === "or"
                    ? "Matching Remedies (OR)"
                    : "Matching Remedies (Entry)"}{" "}
                  ({filteredResults.length})
                </span>
              </h4>
              {filteredResults.length > 0 && (
                <span className="text-xs text-blue-700 font-bold">
                  Click to inspect ↑
                </span>
              )}
            </div>

            {selectedDiseases.length === 0 ? (
              <div className="mt-3 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-blue-200/60 rounded-xl p-6 text-center bg-blue-50/20 min-h-[260px]">
                <Pill className="w-10 h-10 text-blue-300 mb-2" />
                <p className="text-base font-semibold text-blue-950">
                  Awaiting Disease Selection
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Add diseases on the left and switch between AND, OR, or Entry
                  Point modes.
                </p>
              </div>
            ) : filterMode === "entry" && activeEntryCount === 0 ? (
              <div className="mt-3 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-amber-300 rounded-xl p-6 text-center bg-amber-50/30 min-h-[260px]">
                <Target className="w-9 h-9 text-amber-500 mb-2" />
                <p className="text-base font-bold text-amber-900">
                  Select Entry Point Symptom(s)
                </p>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">
                  Click the <strong>Optional</strong> button next to one or more
                  selected diseases to mark them as required Entry symptoms.
                </p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="mt-3 flex-1 flex flex-col items-center justify-center border border-amber-200 rounded-xl p-6 text-center bg-amber-50/40 min-h-[260px]">
                <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                <p className="text-base font-bold text-amber-900">
                  No Matching Remedies Found
                </p>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">
                  {filterMode === "and"
                    ? `No single remedy currently links to all ${selectedDiseases.length} selected conditions simultaneously.`
                    : filterMode === "or"
                    ? "None of the selected diseases have linked remedies yet."
                    : `No remedy currently satisfies all ${activeEntryCount} marked Entry symptom(s).`}
                </p>
              </div>
            ) : (
              <ul className="mt-3 max-h-80 overflow-y-auto border border-blue-200 rounded-xl bg-white divide-y divide-blue-100 shadow-sm flex-1">
                {filteredResults.map((result) => (
                  <li
                    key={result.medicine.id}
                    onClick={() => onSelectMedicine?.(result.medicine.id)}
                    className="px-4 py-3 bg-blue-50/70 hover:bg-blue-100/90 border-l-4 border-blue-600 flex items-center justify-between cursor-pointer transition shadow-xs group gap-2"
                    title={`Matches: ${result.matchedDiseaseNames.join(", ")}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate flex-wrap">
                        <Pill className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-base text-blue-950 group-hover:text-blue-900 truncate">
                          {result.medicine.name}
                        </span>
                        <KingdomBadge kingdom={result.medicine.kingdom} size="xs" />
                      </div>
                      {filterMode !== "and" && (
                        <div className="mt-1 pl-6 text-xs font-semibold text-slate-600 truncate">
                          Solves:{" "}
                          <span className="text-slate-800">
                            {result.matchedDiseaseNames.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {filterMode === "or" && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                          {result.matchedCount} / {result.totalSelected}
                        </span>
                      )}
                      {filterMode === "entry" && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                          {result.matchedCount} / {result.totalSelected}
                        </span>
                      )}
                      <span className="text-[11px] font-black uppercase bg-white text-blue-800 border border-blue-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 px-2 py-1 rounded-lg transition shrink-0 flex items-center gap-1 shadow-xs">
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Column 4: Kingdom Filter & Refined Remedies */}
          <div className="flex flex-col min-h-[340px]">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>
                  By Kingdom (
                  {selectedKingdom === "all"
                    ? kingdomCounts.all
                    : `${kingdomFilteredResults.length} ${selectedKingdom}`}
                  )
                </span>
              </h4>
              {selectedKingdom !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedKingdom("all");
                    setKingdomSearchQuery("");
                  }}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 hover:underline"
                >
                  Show All
                </button>
              )}
            </div>

            {/* Kingdom Filter Options */}
            <div
              className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-2 shadow-inner"
              role="group"
              aria-label="Filter remedies by kingdom"
            >
              <button
                type="button"
                onClick={() => setSelectedKingdom("all")}
                className={`py-1.5 px-1 rounded-lg text-xs font-black transition flex flex-col items-center justify-center gap-0.5 ${
                  selectedKingdom === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
                title="All matching remedies"
              >
                <span>All</span>
                <span className="text-[10px] font-extrabold opacity-80">
                  {kingdomCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedKingdom("Plant")}
                className={`py-1.5 px-1 rounded-lg text-xs font-black transition flex flex-col items-center justify-center gap-0.5 ${
                  selectedKingdom === "Plant"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-800 hover:bg-emerald-100/70"
                }`}
                title="Filter to Plant Kingdom remedies"
              >
                <span className="flex items-center gap-1">
                  <Leaf className="w-3 h-3" />
                  <span>Plant</span>
                </span>
                <span className="text-[10px] font-extrabold opacity-80">
                  {kingdomCounts.Plant}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedKingdom("Mineral")}
                className={`py-1.5 px-1 rounded-lg text-xs font-black transition flex flex-col items-center justify-center gap-0.5 ${
                  selectedKingdom === "Mineral"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-amber-900 hover:bg-amber-100/70"
                }`}
                title="Filter to Mineral Kingdom remedies"
              >
                <span className="flex items-center gap-1">
                  <Gem className="w-3 h-3" />
                  <span>Mineral</span>
                </span>
                <span className="text-[10px] font-extrabold opacity-80">
                  {kingdomCounts.Mineral}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedKingdom("Animal")}
                className={`py-1.5 px-1 rounded-lg text-xs font-black transition flex flex-col items-center justify-center gap-0.5 ${
                  selectedKingdom === "Animal"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-900 hover:bg-rose-100/70"
                }`}
                title="Filter to Animal Kingdom remedies"
              >
                <span className="flex items-center gap-1">
                  <PawPrint className="w-3 h-3" />
                  <span>Animal</span>
                </span>
                <span className="text-[10px] font-extrabold opacity-80">
                  {kingdomCounts.Animal}
                </span>
              </button>
            </div>

            {/* Quick search input if there are remedies */}
            {filteredResults.length > 4 && (
              <div className="relative mb-2">
                <input
                  value={kingdomSearchQuery}
                  onChange={(e) => setKingdomSearchQuery(e.target.value)}
                  placeholder={`Search ${
                    selectedKingdom === "all" ? "remedies" : `${selectedKingdom} remedies`
                  } (regex supported)...`}
                  className="w-full px-3 py-1.5 pr-8 border border-slate-300 rounded-lg text-xs font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-xs"
                />
                {kingdomSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setKingdomSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="Clear filter search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {selectedDiseases.length === 0 ? (
              <div className="mt-1 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-purple-200/60 rounded-xl p-6 text-center bg-purple-50/20 min-h-[260px]">
                <Sparkles className="w-10 h-10 text-purple-300 mb-2" />
                <p className="text-base font-semibold text-purple-950">
                  Kingdom Breakdown
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Select diseases to view matching remedies categorized into
                  Plant, Mineral, and Animal kingdoms.
                </p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="mt-1 flex-1 flex flex-col items-center justify-center border border-slate-200 rounded-xl p-6 text-center bg-slate-50 min-h-[260px]">
                <AlertTriangle className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  No Remedies to Classify
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Adjust disease selections in Column 2 to find remedies.
                </p>
              </div>
            ) : kingdomFilteredResults.length === 0 ? (
              <div className="mt-1 flex-1 flex flex-col items-center justify-center border border-amber-200 rounded-xl p-6 text-center bg-amber-50/50 min-h-[260px]">
                <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                <p className="text-sm font-bold text-amber-900">
                  No {selectedKingdom} Remedies Found
                </p>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">
                  None of the {filteredResults.length} matching remedies belong
                  to the {selectedKingdom} Kingdom for these symptoms.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedKingdom("all");
                    setKingdomSearchQuery("");
                  }}
                  className="mt-3 px-3 py-1.5 text-xs font-black bg-white border border-amber-300 text-amber-800 rounded-lg hover:bg-amber-100 shadow-xs transition"
                >
                  View All Kingdoms ({filteredResults.length})
                </button>
              </div>
            ) : (
              <ul className="mt-1 max-h-80 overflow-y-auto border border-purple-200 rounded-xl bg-white divide-y divide-purple-100 shadow-sm flex-1">
                {kingdomFilteredResults.map((result) => {
                  const kMeta = normalizeKingdom(result.medicine.kingdom);
                  const isPlant = kMeta === "Plant";
                  const isMineral = kMeta === "Mineral";
                  const isAnimal = kMeta === "Animal";

                  const borderAccent = isPlant
                    ? "border-emerald-500 bg-emerald-50/40 hover:bg-emerald-100/70"
                    : isMineral
                    ? "border-amber-500 bg-amber-50/40 hover:bg-amber-100/70"
                    : isAnimal
                    ? "border-rose-500 bg-rose-50/40 hover:bg-rose-100/70"
                    : "border-purple-500 bg-purple-50/40 hover:bg-purple-100/70";

                  return (
                    <li
                      key={`k-${result.medicine.id}`}
                      onClick={() => onSelectMedicine?.(result.medicine.id)}
                      className={`px-3.5 py-3 border-l-4 flex items-center justify-between cursor-pointer transition shadow-xs group gap-2 ${borderAccent}`}
                      title={`${result.medicine.name} (${result.medicine.kingdom || "Unknown"}) • Matches: ${result.matchedDiseaseNames.join(", ")}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate flex-wrap">
                          <KingdomIcon
                            kingdom={result.medicine.kingdom}
                            className="w-4 h-4 shrink-0"
                          />
                          <span className="font-bold text-sm text-slate-900 group-hover:text-purple-950 truncate">
                            {result.medicine.name}
                          </span>
                          <KingdomBadge
                            kingdom={result.medicine.kingdom}
                            size="xs"
                          />
                        </div>
                        {filterMode !== "and" && (
                          <div className="mt-0.5 pl-5 text-[11px] font-semibold text-slate-600 truncate">
                            Solves:{" "}
                            <span className="text-slate-800">
                              {result.matchedDiseaseNames.join(", ")}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {filterMode === "or" && (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-white shadow-xs">
                            {result.matchedCount}/{result.totalSelected}
                          </span>
                        )}
                        {filterMode === "entry" && (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                            {result.matchedCount}/{result.totalSelected}
                          </span>
                        )}
                        <span className="text-[10px] font-black uppercase bg-white text-purple-900 border border-purple-300 group-hover:bg-purple-700 group-hover:text-white group-hover:border-purple-700 px-2 py-1 rounded-lg transition shrink-0 flex items-center gap-1 shadow-xs">
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
