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
} from "lucide-react";
import {
  useGetDiseasesQuery,
  useGetLinksQuery,
  useGetMedicinesQuery,
} from "../../api/api";

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

  // Filter diseases based on search query, excluding already selected ones
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const selectedIds = new Set(selectedDiseases.map((d) => d.id));
    return allDiseases
      .filter(
        (disease) =>
          !selectedIds.has(disease.id) &&
          disease.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 50);
  }, [searchQuery, allDiseases, selectedDiseases]);

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
    setSelectedDiseases((prev) => [...prev, disease]);
    setSearchQuery(""); // Clear search after selection
    // Ease of life: immediately refocus search input so user can type next disease without clicking
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  };

  const handleRemoveDisease = (diseaseId: string) => {
    setSelectedDiseases((prev) => prev.filter((d) => d.id !== diseaseId));
  };

  const handleClearAll = () => {
    setSelectedDiseases([]);
    setSearchQuery("");
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
            <h4 className="text-base font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <SearchIcon className="w-4 h-4 text-slate-500" />
                <span>Search Diseases</span>
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Auto-refocuses on select
              </span>
            </h4>

            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to search and add a disease..."
              style={{ backgroundColor: "rgb(118 213 133 / 54%)" }}
              className="w-full px-4 py-3 border border-emerald-300 rounded-xl text-base font-semibold text-slate-900 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />

            {searchResults.length > 0 ? (
              <ul className="mt-2.5 max-h-72 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y shadow-md flex-1">
                {searchResults.map((d) => (
                  <li
                    key={d.id}
                    onClick={() => handleSelectDisease(d)}
                    className="px-4 py-2.5 cursor-pointer hover:bg-emerald-50 text-base font-medium text-slate-800 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Stethoscope className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{d.name}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition">
                      + Add
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 flex-1 flex flex-col justify-center text-slate-500 text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  <span>Quick Tip</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Type any disease name above and click to add it to the intersection list. Focus returns automatically to the input box so you can quickly chain multiple conditions!
                </p>
              </div>
            )}
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
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 min-h-[260px]">
                <Stethoscope className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-base font-semibold text-slate-600">
                  No diseases selected yet
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Search and click diseases on the left to add them to your intersection set.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex-1">
                {selectedDiseases.map((d) => (
                  <li
                    key={d.id}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-base font-semibold text-slate-800 shadow-xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{d.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDisease(d.id)}
                      className="text-slate-400 hover:text-rose-600 font-bold text-lg px-1.5 py-0.5 rounded hover:bg-rose-50 transition leading-none shrink-0"
                      title={`Remove "${d.name}"`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
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
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-blue-200/60 rounded-xl p-6 text-center bg-blue-50/20 min-h-[260px]">
                <Pill className="w-10 h-10 text-blue-300 mb-2" />
                <p className="text-base font-semibold text-blue-950">
                  Awaiting Disease Selection
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Add 2 or more diseases to discover remedies that overlap across all of them.
                </p>
              </div>
            ) : intersectingMedicines.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border border-amber-200 rounded-xl p-6 text-center bg-amber-50/40 min-h-[260px]">
                <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                <p className="text-base font-bold text-amber-900">
                  No Common Remedies Found
                </p>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">
                  No single remedy currently links to all {selectedDiseases.length} selected conditions simultaneously.
                </p>
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto border border-blue-200 rounded-xl bg-white divide-y divide-blue-100 shadow-sm flex-1">
                {intersectingMedicines.map((med) => (
                  <li
                    key={med.id}
                    onClick={() => onSelectMedicine?.(med.id)}
                    className="px-4 py-3 bg-blue-50/70 hover:bg-blue-100/90 border-l-4 border-blue-600 flex items-center justify-between cursor-pointer transition shadow-xs group"
                    title={`Click to focus and view links for "${med.name}" in Search & Manage Links above`}
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2">
                      <Pill className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-bold text-base text-blue-950 group-hover:text-blue-900 truncate">
                        {med.name}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold bg-white text-blue-800 border border-blue-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 px-2.5 py-1 rounded-lg transition shrink-0 flex items-center gap-1 shadow-xs">
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
