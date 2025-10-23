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
      <h3 className="text-lg font-semibold mb-4">Find Common Intersection</h3>
      <div className="grid md:grid-cols-3 gap-6">
        {/* Column 1: Disease Search & Selection */}
        <div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for diseases to add..."
            className="w-full px-3 py-2 border rounded focus:ring focus:ring-blue-200 bg-[#fbffd3]"
          />
          {searchResults.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-auto border rounded bg-white divide-y">
              {searchResults.map((d) => (
                <li
                  key={d.id}
                  onClick={() => handleSelectDisease(d)}
                  className="px-3 py-2 cursor-pointer hover:bg-blue-50"
                >
                  {d.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="font-medium mb-2">Selected Diseases</h4>
          {selectedDiseases.length === 0 ? (
            <p className="text-sm text-gray-500">No diseases selected yet.</p>
          ) : (
            <ul className="space-y-2">
              {selectedDiseases.map((d) => (
                <li
                  key={d.id}
                  className="px-3 py-2 bg-gray-100 rounded flex items-center justify-between"
                >
                  <span>{d.name}</span>
                  <button
                    onClick={() => handleRemoveDisease(d.id)}
                    className="font-bold text-red-500 hover:text-red-700"
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
          <h4 className="font-medium mb-2">Common Medicines</h4>
          {selectedDiseases.length > 0 ? (
            intersectingMedicines.length > 0 ? (
              <ul className="max-h-80 overflow-auto border rounded bg-white divide-y">
                {intersectingMedicines.map((med) => (
                  <li key={med.id} className="px-3 py-2 bg-green-50">
                    {med.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                No common medicines found for the selected diseases.
              </p>
            )
          ) : (
            <p className="text-sm text-gray-500">
              Select diseases to see results.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
