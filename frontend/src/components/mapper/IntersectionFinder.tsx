// src/components/IntersectionFinder.tsx
import { useMemo, useState } from "react";
import {
  useGetDiseasesQuery,
  useGetLinksQuery,
  useGetMedicinesQuery,
} from "../../api/api";

import Card from "./Card";
import { Disease } from "../../types";

export default function IntersectionFinder(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDiseases, setSelectedDiseases] = useState<Disease[]>([]);

  // Fetch all required data from the API
  const { data: allMeds = [] } = useGetMedicinesQuery();
  const { data: allDiseases = [] } = useGetDiseasesQuery();
  const { data: allLinks = [] } = useGetLinksQuery();

  // Filter diseases based on search query, excluding already selected ones
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const selectedIds = new Set(selectedDiseases.map((d) => d.id));
    return allDiseases.filter(
      (disease) =>
        !selectedIds.has(disease.id) &&
        disease.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
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
  };

  const handleRemoveDisease = (diseaseId: string) => {
    setSelectedDiseases((prev) => prev.filter((d) => d.id !== diseaseId));
  };

  return (
    <Card>
      <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">
        Find Common Intersection
      </h3>
      <div className="grid md:grid-cols-3 gap-6">
        {/* Column 1: Disease Search & Selection */}
        <div>
          <h4 className="text-base font-bold text-slate-700 mb-3">Search Diseases</h4>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for diseases to add..."
            style={{ backgroundColor: "rgb(118 213 133 / 54%)" }}
            className="w-full px-4 py-3 border border-emerald-300 rounded-lg text-base font-semibold text-slate-900 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
          {searchResults.length > 0 && (
            <ul className="mt-2 max-h-56 overflow-auto border border-slate-200 rounded-lg bg-white divide-y shadow-md">
              {searchResults.map((d) => (
                <li
                  key={d.id}
                  onClick={() => handleSelectDisease(d)}
                  className="px-4 py-2.5 cursor-pointer hover:bg-emerald-50 text-base font-medium text-slate-800 transition"
                >
                  {d.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-base font-bold text-slate-700 mb-3">Selected Diseases</h4>
          {selectedDiseases.length === 0 ? (
            <p className="text-base text-gray-500 italic">No diseases selected yet.</p>
          ) : (
            <ul className="space-y-2">
              {selectedDiseases.map((d) => (
                <li
                  key={d.id}
                  className="px-4 py-2.5 bg-slate-100 rounded-lg flex items-center justify-between text-base font-semibold text-slate-800 shadow-sm"
                >
                  <span>{d.name}</span>
                  <button
                    onClick={() => handleRemoveDisease(d.id)}
                    className="font-bold text-red-500 hover:text-red-700 text-xl px-1 leading-none"
                    title="Remove"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Column 3: Intersection Results */}
        <div>
          <h4 className="text-base font-bold text-slate-700 mb-3">Common Medicines</h4>
          {selectedDiseases.length > 0 ? (
            intersectingMedicines.length > 0 ? (
              <ul className="max-h-80 overflow-auto border border-emerald-200 rounded-lg bg-white divide-y divide-emerald-100 shadow-sm">
                {intersectingMedicines.map((med) => (
                  <li key={med.id} className="px-4 py-2.5 bg-emerald-50 text-base font-bold text-emerald-900">
                    {med.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-gray-500 italic">
                No common medicines found for the selected diseases.
              </p>
            )
          ) : (
            <p className="text-base text-gray-500 italic">
              Select diseases to see results.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
