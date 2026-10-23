import { useState, useMemo, useEffect, useCallback } from "react";
import Card from "./Card";
import { toast } from "react-toastify";
import {
  useGetMedicinesQuery,
  useGetDiseasesQuery,
  useGetLinksQuery,
  useLinkMutation,
} from "../../api/tipsApi";
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
    (e: KeyboardEvent | React.KeyboardEvent) => {
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
      <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">
        Match Medicine ↁEDisease
      </h3>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Medicine Search & Select */}
        <div>
          <label className="block text-base font-bold text-slate-700 mb-2">Medicine</label>
          <input
            className="w-full px-4 py-3 border border-emerald-300 rounded-lg text-base font-semibold text-slate-900 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            placeholder="Search medicine..."
            style={{ backgroundColor: "rgb(118 213 133 / 54%)" }}
            onKeyDown={handleKeyDown}
            value={medSearch}
            onChange={(e) => setMedSearch(e.target.value)}
          />
          {medSearch.trim() && (
            <ul className="mt-2 max-h-48 overflow-auto border border-slate-200 rounded-lg bg-white shadow-md divide-y">
              {filteredMeds.map((m) => (
                <li
                  key={m.id}
                  onClick={() => setSelectedMed(m)}
                  className={`px-4 py-2.5 cursor-pointer hover:bg-emerald-50 text-base transition ${
                    selectedMed?.id === m.id
                      ? "bg-emerald-100 font-bold text-emerald-950"
                      : "text-slate-800 font-medium"
                  }`}
                >
                  {m.name}
                </li>
              ))}
              {filteredMeds.length === 0 && (
                <li className="px-4 py-2.5 text-base text-gray-500 italic">No medicines found</li>
              )}
            </ul>
          )}
        </div>

        {/* Disease Search & Select */}
        <div>
          <label className="block text-base font-bold text-slate-700 mb-2">Disease</label>
          <input
            className="w-full px-4 py-3 border border-emerald-300 rounded-lg text-base font-semibold text-slate-900 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            placeholder="Search disease..."
            style={{ backgroundColor: "rgb(118 213 133 / 54%)" }}
            onKeyDown={handleKeyDown}
            value={illSearch}
            onChange={(e) => setIllSearch(e.target.value)}
          />
          {illSearch.trim() && (
            <ul className="mt-2 max-h-48 overflow-auto border border-slate-200 rounded-lg bg-white shadow-md divide-y">
              {filteredIlls.map((i) => (
                <li
                  key={i.id}
                  onClick={() => setSelectedIll(i)}
                  className={`px-4 py-2.5 cursor-pointer hover:bg-emerald-50 text-base transition ${
                    selectedIll?.id === i.id
                      ? "bg-emerald-100 font-bold text-emerald-950"
                      : "text-slate-800 font-medium"
                  }`}
                >
                  {i.name}
                </li>
              ))}
              {filteredIlls.length === 0 && (
                <li className="px-4 py-2.5 text-base text-gray-500 italic">No diseases found</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <button
        className="mt-6 px-7 py-3 bg-green-600 hover:bg-green-700 text-white text-base font-extrabold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
        disabled={!selectedMed || !selectedIll || duplicateExists}
        onClick={handleLink}
      >
        Link
      </button>

      {duplicateExists && (
        <p className="mt-3 text-red-600 text-base font-bold">Link already exists.</p>
      )}
    </Card>
  );
}
