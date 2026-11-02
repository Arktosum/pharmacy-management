import { useState, useMemo, useEffect, useCallback } from "react";
import Card from "./Card";
import { toast } from "react-toastify";
import {
  Link as LinkIcon,
  Stethoscope,
  Pill,
  Search,
  Check,
  AlertTriangle,
} from "lucide-react";
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
  const [link, { isLoading: isLinking }] = useLinkMutation();

  const [illSearch, setIllSearch] = useState("");
  const [medSearch, setMedSearch] = useState("");
  const [selectedIll, setSelectedIll] = useState<Disease | null>(null);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);

  const filteredIlls = useMemo(
    () =>
      illSearch.trim()
        ? ills
            .filter((i) =>
              i.name.toLowerCase().includes(illSearch.toLowerCase())
            )
            .slice(0, 50)
        : [],
    [ills, illSearch]
  );

  const filteredMeds = useMemo(
    () =>
      medSearch.trim()
        ? meds
            .filter((m) =>
              m.name.toLowerCase().includes(medSearch.toLowerCase())
            )
            .slice(0, 50)
        : [],
    [meds, medSearch]
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
    if (!selectedMed || !selectedIll || duplicateExists || isLinking) return;
    try {
      await link({
        medicineId: selectedMed.id,
        diseaseId: selectedIll.id,
      }).unwrap();
      toast.success(`Linked "${selectedIll.name}" with "${selectedMed.name}"`);
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to create link");
    }
  }, [duplicateExists, isLinking, link, selectedIll, selectedMed]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent | React.KeyboardEvent) => {
      if (e.key === "Enter") {
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
  }, [handleKeyDown]);

  return (
    <Card className="w-full">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl border border-purple-200 shadow-xs">
            <LinkIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Create a Link</span>
              <span className="text-xs uppercase px-2.5 py-0.5 rounded-full font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                Relationship
              </span>
            </h3>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">
              Select a disease and a medicine to link them together in the knowledge graph.
            </p>
          </div>
        </div>

        {/* Selected Pair Summary Badge */}
        {selectedIll && selectedMed && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700">
            <span className="text-emerald-700 font-extrabold">{selectedIll.name}</span>
            <span className="text-slate-400">↔</span>
            <span className="text-blue-700 font-extrabold">{selectedMed.name}</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Column 1: Disease Search & Select */}
        <div>
          <label className="text-lg font-black text-slate-800 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-emerald-800">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              <span>Select Disease</span>
            </span>
            {selectedIll && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Selected
              </span>
            )}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              className="w-full pl-10 pr-4 py-3.5 border-2 border-emerald-600 rounded-xl text-lg font-black text-slate-950 placeholder-slate-800 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ backgroundColor: "rgb(85 185 105 / 65%)" }}
              placeholder="Search disease..."
              onKeyDown={handleKeyDown}
              value={illSearch}
              onChange={(e) => setIllSearch(e.target.value)}
            />
          </div>
          {illSearch.trim() && (
            <ul className="mt-2 max-h-60 overflow-auto border-2 border-slate-200 rounded-xl bg-white shadow-lg divide-y">
              {filteredIlls.map((i) => (
                <li
                  key={i.id}
                  onClick={() => setSelectedIll(i)}
                  className={`px-4 py-3.5 cursor-pointer hover:bg-emerald-50 text-base transition flex items-center justify-between ${
                    selectedIll?.id === i.id
                      ? "bg-emerald-100 font-black text-emerald-950"
                      : "text-slate-900 font-bold"
                  }`}
                >
                  <span>{i.name}</span>
                  {selectedIll?.id === i.id && (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-black">
                      Active
                    </span>
                  )}
                </li>
              ))}
              {filteredIlls.length === 0 && (
                <li className="px-4 py-3.5 text-sm text-gray-500 italic font-semibold">
                  No diseases found matching &ldquo;{illSearch}&rdquo;
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Column 2: Medicine Search & Select */}
        <div>
          <label className="text-lg font-black text-slate-800 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-blue-800">
              <Pill className="w-5 h-5 text-blue-600" />
              <span>Select Medicine</span>
            </span>
            {selectedMed && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Selected
              </span>
            )}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              className="w-full pl-10 pr-4 py-3.5 border-2 border-emerald-600 rounded-xl text-lg font-black text-slate-950 placeholder-slate-800 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: "rgb(85 185 105 / 65%)" }}
              placeholder="Search medicine..."
              onKeyDown={handleKeyDown}
              value={medSearch}
              onChange={(e) => setMedSearch(e.target.value)}
            />
          </div>
          {medSearch.trim() && (
            <ul className="mt-2 max-h-60 overflow-auto border-2 border-slate-200 rounded-xl bg-white shadow-lg divide-y">
              {filteredMeds.map((m) => (
                <li
                  key={m.id}
                  onClick={() => setSelectedMed(m)}
                  className={`px-4 py-3.5 cursor-pointer hover:bg-blue-50 text-base transition flex items-center justify-between ${
                    selectedMed?.id === m.id
                      ? "bg-blue-100 font-black text-blue-950"
                      : "text-slate-900 font-bold"
                  }`}
                >
                  <span>{m.name}</span>
                  {selectedMed?.id === m.id && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-200 text-blue-900 font-black">
                      Active
                    </span>
                  )}
                </li>
              ))}
              {filteredMeds.length === 0 && (
                <li className="px-4 py-3.5 text-sm text-gray-500 italic font-semibold">
                  No medicines found matching &ldquo;{medSearch}&rdquo;
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Action Button & Status */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          className="px-8 py-3.5 bg-purple-700 hover:bg-purple-800 text-white text-lg font-black rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!selectedMed || !selectedIll || duplicateExists || isLinking}
          onClick={handleLink}
        >
          <LinkIcon className="w-5 h-5" />
          <span>{isLinking ? "Creating Link..." : "Create Link"}</span>
        </button>

        {duplicateExists && (
          <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl font-bold text-sm shadow-xs animate-in fade-in duration-150">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>This relationship link already exists between &ldquo;{selectedIll?.name}&rdquo; and &ldquo;{selectedMed?.name}&rdquo;.</span>
          </div>
        )}
      </div>
    </Card>
  );
}
