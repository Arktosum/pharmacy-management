// src/components/IntersectionFinder.tsx
import { useMemo, useState, useRef } from "react";
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
} from "lucide-react";
import {
  useGetDiseasesQuery,
  useGetLinksQuery,
  useGetMedicinesQuery,
} from "../../api/tipsApi";

import Card from "./Card";
import { Disease } from "../../types";

interface IntersectionFinderProps {
  onSelectMedicine?: (medicineId: string) => void;
}

export default function IntersectionFinder({
  onSelectMedicine,
}: IntersectionFinderProps = {}): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDiseases, setSelectedDiseases] = useState<Disease[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch all required data from the API
  const { data: allMeds = [] } = useGetMedicinesQuery();
  const { data: allDiseases = [] } = useGetDiseasesQuery();
  const { data: allLinks = [] } = useGetLinksQuery();

  // Map of diseaseId -> Set of linked medicine IDs
  const diseaseRemedyCounts = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const link of allLinks) {
      if (!map.has(link.diseaseId)) map.set(link.diseaseId, new Set());
      map.get(link.diseaseId)!.add(link.medicineId);
    }
    return map;
  }, [allLinks]);

  // Set of selected disease IDs for fast lookup
  const selectedIdSet = useMemo(
    () => new Set(selectedDiseases.map((d) => d.id)),
    [selectedDiseases]
  );

  // Search results capped to top 50 for speed (showing top 50 by default when no query, matching MultiMergeTool)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allDiseases.slice(0, 50);
    return allDiseases
      .filter((disease) => disease.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [searchQuery, allDiseases]);

  // The core logic to find the intersection of medicines
  const intersectingMedicines = useMemo(() => {
    if (selectedDiseases.length === 0) return [];

    // Get a map of DiseaseID -> Set<MedicineID>
    const diseaseToMedsMap = new Map<string, Set<string>>();
    for (const link of allLinks) {
      if (!diseaseToMedsMap.has(link.diseaseId)) {
        diseaseToMedsMap.set(link.diseaseId, new Set());
      }
      diseaseToMedsMap.get(link.diseaseId)!.add(link.medicineId);
    }

    // Get the set of medicine IDs for the first selected disease
    let commonMedIds = new Set(
      diseaseToMedsMap.get(selectedDiseases[0].id) || []
    );

    // Filter this set against the medicines for all other selected diseases
    for (let i = 1; i < selectedDiseases.length; i++) {
      const nextDiseaseMeds =
        diseaseToMedsMap.get(selectedDiseases[i].id) || new Set();
      commonMedIds = new Set(
        [...commonMedIds].filter((medId) => nextDiseaseMeds.has(medId))
      );
    }

    // Map the final set of IDs back to the full medicine objects
    return allMeds.filter((med) => commonMedIds.has(med.id));
  }, [selectedDiseases, allLinks, allMeds]);

  const handleSelectDisease = (disease: Disease) => {
    if (selectedIdSet.has(disease.id)) return;
    setSelectedDiseases((prev) => [...prev, disease]);
    // NOTE: do NOT clear searchQuery so the dropdown/results list stays open,
    // allowing the user to continuously add diseases just like in MultiMergeTool!
  };

  const handleRemoveDisease = (diseaseId: string) => {
    setSelectedDiseases((prev) => prev.filter((d) => d.id !== diseaseId));
  };

  const handleClearAll = () => {
    setSelectedDiseases([]);
    searchInputRef.current?.focus();
  };

  return (
    <Card>
      <div className="min-h-[480px] flex flex-col justify-between">
        {/* Header */}
        <div className="mb-5 pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                Find Common Remedies
              </h3>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Select multiple diseases to discover medicines that treat all of them simultaneously (intersection).
            </p>
          </div>

          {selectedDiseases.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1.5 shadow-xs">
                <Pill className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {intersectingMedicines.length} common{" "}
                  {intersectingMedicines.length === 1 ? "remedy" : "remedies"}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* 3-Column Grid with Default Height */}
        <div className="grid md:grid-cols-3 gap-6 flex-1">
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
                placeholder="Type to search diseases..."
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
                const count = diseaseRemedyCounts.get(d.id)?.size || 0;
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

            {selectedDiseases.length === 0 ? (
              <div className="mt-3 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 min-h-[260px]">
                <Stethoscope className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-base font-semibold text-slate-600">
                  No diseases selected yet
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Search and click diseases on the left to add them to your intersection set.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2 max-h-80 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex-1">
                {selectedDiseases.map((d) => {
                  const count = diseaseRemedyCounts.get(d.id)?.size || 0;
                  return (
                    <li
                      key={d.id}
                      className="px-4 py-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-base font-bold text-slate-900 shadow-xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        <Stethoscope className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="truncate">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
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

          {/* Column 3: Intersection Results (Common Remedies - Medicine Blue Theme) */}
          <div className="flex flex-col min-h-[340px]">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-blue-600" />
                <span>Common Remedies ({intersectingMedicines.length})</span>
              </h4>
              {intersectingMedicines.length > 0 && (
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
                  Add 2 or more diseases to discover remedies that overlap across all of them.
                </p>
              </div>
            ) : intersectingMedicines.length === 0 ? (
              <div className="mt-3 flex-1 flex flex-col items-center justify-center border border-amber-200 rounded-xl p-6 text-center bg-amber-50/40 min-h-[260px]">
                <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                <p className="text-base font-bold text-amber-900">
                  No Common Remedies Found
                </p>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">
                  No single remedy currently links to all {selectedDiseases.length} selected conditions simultaneously.
                </p>
              </div>
            ) : (
              <ul className="mt-3 max-h-80 overflow-y-auto border border-blue-200 rounded-xl bg-white divide-y divide-blue-100 shadow-sm flex-1">
                {intersectingMedicines.map((med) => (
                  <li
                    key={med.id}
                    onClick={() => onSelectMedicine?.(med.id)}
                    className="px-4 py-3.5 bg-blue-50/70 hover:bg-blue-100/90 border-l-4 border-blue-600 flex items-center justify-between cursor-pointer transition shadow-xs group"
                    title={`Click to focus and view links for "${med.name}" in Search & Manage Links above`}
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2">
                      <Pill className="w-5 h-5 text-blue-600 shrink-0" />
                      <span className="font-bold text-lg text-blue-950 group-hover:text-blue-900 truncate">
                        {med.name}
                      </span>
                    </div>
                    <span className="text-xs font-black uppercase bg-white text-blue-800 border border-blue-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 px-2.5 py-1 rounded-lg transition shrink-0 flex items-center gap-1 shadow-xs">
                      <span>Inspect Links</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
