import { useState, useMemo, useEffect, useCallback } from "react";
import Card from "./Card";
import { toast } from "react-toastify";
import {
  useGetMedicinesQuery,
  useGetDiseasesQuery,
  useGetLinksQuery,
  useLinkMutation,
} from "../../api/api";
import { Medicine, Disease, Link } from "../../types";

export default function Linker() {
  const { data: meds = [] } = useGetMedicinesQuery();
  const { data: ills = [] } = useGetDiseasesQuery();
  const { data: links = [] } = useGetLinksQuery(); // Existing links
  const [link] = useLinkMutation();

  const [medSearch, setMedSearch] = useState("");
  const [illSearch, setIllSearch] = useState("");
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [selectedIll, setSelectedIll] = useState<Disease | null>(null);

  const filteredMeds = useMemo(
    () =>
      medSearch.trim()
        ? meds.filter((m) =>
            m.name.toLowerCase().includes(medSearch.toLowerCase())
          )
        : [],
    [meds, medSearch]
  );

  const filteredIlls = useMemo(
    () =>
      illSearch.trim()
        ? ills.filter((i) =>
            i.name.toLowerCase().includes(illSearch.toLowerCase())
          )
        : [],
    [ills, illSearch]
  );

  // Detect if a selected pairing already exists
  const duplicateExists = useMemo(() => {
    return Boolean(
      selectedMed &&
        selectedIll &&
        links.some(
          (l: Link) =>
            l.medicineId === selectedMed.id && l.diseaseId === selectedIll.id
        )
    );
  }, [links, selectedMed, selectedIll]);

  const handleLink = useCallback(async () => {
    if (!selectedMed || !selectedIll || duplicateExists) return;
    await link({
      medicineId: selectedMed.id,
      diseaseId: selectedIll.id,
    }).unwrap();
    toast.success(`Linked "${selectedMed.name}" with "${selectedIll.name}"`);
    // setSelectedMed(null);
    // setSelectedIll(null);
    // setMedSearch("");
    // setIllSearch("");
  }, [duplicateExists, link, selectedIll, selectedMed]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        console.log("enter");
        handleLink();
      }
    },
    [handleLink]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]); // empty deps => run once on mount, cleanup on unmount

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Match Medicine ↔ disease</h3>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Medicine Search & Select */}
        <div>
          <label className="block text-sm font-medium mb-1">Medicine</label>
          <input
            className="w-full px-3 py-2 border rounded focus:ring focus:ring-blue-300 bg-[#e7f8eb]"
            placeholder="Search medicine..."
            onKeyDown={handleKeyDown}
            value={medSearch}
            onChange={(e) => setMedSearch(e.target.value)}
          />
          {medSearch.trim() && (
            <ul className="mt-2 max-h-40 overflow-auto border rounded bg-white">
              {filteredMeds.map((m) => (
                <li
                  key={m.id}
                  onClick={() => setSelectedMed(m)}
                  className={`px-3 py-1 cursor-pointer hover:bg-blue-100 ${
                    selectedMed?.id === m.id ? "bg-blue-200 font-semibold" : ""
                  }`}
                >
                  {m.name}
                </li>
              ))}
              {filteredMeds.length === 0 && (
                <li className="px-3 py-1 text-gray-500">No medicines found</li>
              )}
            </ul>
          )}
        </div>

        {/* disease Search & Select */}
        <div>
          <label className="block text-sm font-medium mb-1">Disease</label>
          <input
            className="w-full px-3 py-2 border rounded focus:ring focus:ring-blue-300 bg-[#e7f8eb]"
            placeholder="Search disease..."
            onKeyDown={handleKeyDown}
            value={illSearch}
            onChange={(e) => setIllSearch(e.target.value)}
          />
          {illSearch.trim() && (
            <ul className="mt-2 max-h-40 overflow-auto border rounded bg-white">
              {filteredIlls.map((i) => (
                <li
                  key={i.id}
                  onClick={() => setSelectedIll(i)}
                  className={`px-3 py-1 cursor-pointer hover:bg-blue-100 ${
                    selectedIll?.id === i.id ? "bg-blue-200 font-semibold" : ""
                  }`}
                >
                  {i.name}
                </li>
              ))}
              {filteredIlls.length === 0 && (
                <li className="px-3 py-1 text-gray-500">No diseasees found</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <button
        className="mt-4 px-5 py-2 bg-green-600 text-white font-semibold rounded disabled:opacity-50"
        disabled={!selectedMed || !selectedIll || duplicateExists}
        onClick={handleLink}
      >
        Link
      </button>

      {duplicateExists && (
        <p className="mt-2 text-red-600">Link already exists.</p>
      )}
    </Card>
  );
}
