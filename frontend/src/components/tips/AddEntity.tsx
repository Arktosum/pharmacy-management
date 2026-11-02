import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
  Stethoscope,
  Pill,
  Search,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import Card from "./Card";
import {
  useGetMedicinesQuery,
  useAddMedicineMutation,
  useGetDiseasesQuery,
  useAddDiseaseMutation,
} from "../../api/tipsApi";

export default function AddEntity() {
  const [type, setType] = useState<"disease" | "medicine">("disease");
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const trimmedLower = trimmed.toLowerCase();

  const { data: meds = [] } = useGetMedicinesQuery();
  const { data: ills = [] } = useGetDiseasesQuery();
  const [addMedicine, { isLoading: isAddingMed }] = useAddMedicineMutation();
  const [addDisease, { isLoading: isAddingIll }] = useAddDiseaseMutation();

  const isMed = type === "medicine";
  const currentList = isMed ? meds : ills;
  const isLoading = isMed ? isAddingMed : isAddingIll;

  // Filter matching entities
  const matchingEntities = useMemo(() => {
    if (!trimmedLower) return [];
    return currentList.filter((item) =>
      item.name.toLowerCase().includes(trimmedLower)
    );
  }, [currentList, trimmedLower]);

  const exactMatch = useMemo(() => {
    if (!trimmedLower) return null;
    return (
      currentList.find((item) => item.name.toLowerCase() === trimmedLower) ||
      null
    );
  }, [currentList, trimmedLower]);

  const hasExact = Boolean(exactMatch);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || hasExact || isLoading) return;

    try {
      if (isMed) {
        const res = await addMedicine({ name: trimmed }).unwrap();
        toast.success(`Medicine "${res.name}" added successfully!`);
      } else {
        const res = await addDisease({ name: trimmed }).unwrap();
        toast.success(`Disease "${res.name}" added successfully!`);
      }
      setName("");
    } catch (err: any) {
      toast.error(err?.data?.error || `Failed to add ${type}`);
    }
  };

  return (
    <Card className="w-full">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border shadow-xs ${
              !isMed
                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                : "bg-blue-100 text-blue-800 border-blue-200"
            }`}
          >
            {!isMed ? (
              <Stethoscope className="w-6 h-6" />
            ) : (
              <Pill className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Add New {!isMed ? "Disease" : "Medicine"}</span>
              <span className="text-xs uppercase px-2.5 py-0.5 rounded-full font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                Quick Creator
              </span>
            </h3>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">
              Search existing entries in real-time, avoid duplicates, and register new entities.
            </p>
          </div>
        </div>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Primary Type Toggle - right above the search bar */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-300 shadow-inner w-full sm:w-fit">
          <button
            type="button"
            onClick={() => {
              setType("disease");
              setName("");
            }}
            className={`px-5 py-2 rounded-lg text-sm font-extrabold transition flex items-center gap-2 ${
              !isMed
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Diseases ({ills.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType("medicine");
              setName("");
            }}
            className={`px-5 py-2 rounded-lg text-sm font-extrabold transition flex items-center gap-2 ${
              isMed
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Medicines ({meds.length})</span>
          </button>
        </div>

        {/* Input Bar & Add Button with Darker Input Background */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-700">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                !isMed
                  ? "Type disease name (e.g. Migraine, Hypertension, Gastritis)..."
                  : "Type medicine name (e.g. Belladonna, Arnica 200, Nux Vomica)..."
              }
              style={{
                backgroundColor: hasExact
                  ? "rgb(254 226 226)"
                  : "rgb(85 185 105 / 65%)",
              }}
              className={`w-full pl-11 pr-10 py-3.5 border-2 rounded-xl text-lg font-black text-slate-950 placeholder-slate-800 shadow-sm transition focus:outline-none focus:ring-2 ${
                hasExact
                  ? "border-rose-500 focus:ring-rose-400"
                  : "border-emerald-600 focus:ring-emerald-500 focus:border-emerald-700"
              }`}
            />
            {name && (
              <button
                type="button"
                onClick={() => setName("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-700 hover:text-slate-950 transition"
                title="Clear input"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || hasExact || !trimmed}
            className={`px-8 py-3.5 rounded-xl text-lg font-black text-white shadow transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
              !isMed
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span>
              {isLoading
                ? "Adding..."
                : `Add ${!isMed ? "Disease" : "Medicine"}`}
            </span>
          </button>
        </div>

        {/* Warning: Exact Duplicate */}
        {hasExact && (
          <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-800 flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-black text-base">
                Duplicate Warning: &ldquo;{exactMatch?.name}&rdquo; already exists in {!isMed ? "Diseases" : "Medicines"}!
              </p>
              <p className="font-semibold text-rose-700 mt-0.5">
                Cannot add duplicate {type}. Please choose a unique name or use the existing entry.
              </p>
            </div>
          </div>
        )}

        {/* Success / Unique indicator */}
        {!hasExact && trimmed && matchingEntities.length === 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2.5 text-sm font-bold shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              &ldquo;{trimmed}&rdquo; is unique! No conflicting {type}s found. Ready to add.
            </span>
          </div>
        )}

        {/* Live Matching / Searching Dropdown List */}
        {matchingEntities.length > 0 && (
          <div className="border-2 border-slate-200 rounded-xl bg-white overflow-hidden shadow-md">
            <div className="px-4 py-2.5 bg-slate-100 border-b text-sm text-slate-700 flex justify-between items-center font-bold">
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-500" />
                <span>Existing matching {type}s ({matchingEntities.length}):</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Click any item to autofill
              </span>
            </div>
            <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {matchingEntities.map((item) => {
                const isItemExact = item.name.toLowerCase() === trimmedLower;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setName(item.name)}
                      className={`w-full text-left px-4 py-3 text-base flex items-center justify-between transition ${
                        isItemExact
                          ? "bg-rose-50 text-rose-900 font-black hover:bg-rose-100/70"
                          : "hover:bg-slate-50 text-slate-800 font-bold"
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      {isItemExact ? (
                        <span className="text-xs px-2.5 py-1 rounded-md bg-rose-200 text-rose-900 font-black uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Exact Match
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                          Matching
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </form>
    </Card>
  );
}

// Backwards-compatible aliases if referenced
export function Adddisease() {
  return <AddEntity />;
}

export function AddMedicine() {
  return <AddEntity />;
}
