import { useState, useMemo, FormEvent } from "react";
import { X, Plus, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import {
  useAddMedicineMutation,
  useAddDiseaseMutation,
} from "../../api/api";
import { Medicine, Disease } from "../../types";

interface AddEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicines: Medicine[];
  diseases: Disease[];
  initialType?: "medicine" | "disease";
  onCreated?: (entity: { id: string; name: string; type: "medicine" | "disease" }) => void;
}

export default function AddEntityModal({
  isOpen,
  onClose,
  medicines,
  diseases,
  initialType = "medicine",
  onCreated,
}: AddEntityModalProps) {
  const [type, setType] = useState<"medicine" | "disease">(initialType);
  const [name, setName] = useState("");
  const [addMedicine, { isLoading: addingMed }] = useAddMedicineMutation();
  const [addDisease, { isLoading: addingIll }] = useAddDiseaseMutation();

  const trimmed = name.trim();
  const trimmedLower = trimmed.toLowerCase();

  const exactMatch = useMemo(() => {
    if (!trimmedLower) return false;
    if (type === "medicine") {
      return medicines.some((m) => m.name.toLowerCase() === trimmedLower);
    } else {
      return diseases.some((d) => d.name.toLowerCase() === trimmedLower);
    }
  }, [type, trimmedLower, medicines, diseases]);

  const topFuzzyMatch = useMemo(() => {
    if (!trimmedLower || exactMatch) return null;
    if (type === "medicine") {
      return (
        medicines.find((m) => m.name.toLowerCase().includes(trimmedLower))?.name ?? null
      );
    } else {
      return (
        diseases.find((d) => d.name.toLowerCase().includes(trimmedLower))?.name ?? null
      );
    }
  }, [type, trimmedLower, exactMatch, medicines, diseases]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || exactMatch) return;

    try {
      if (type === "medicine") {
        const result = await addMedicine({ name: trimmed }).unwrap();
        toast.success(`Medicine "${result.name}" created!`);
        if (onCreated) onCreated({ id: result.id, name: result.name, type: "medicine" });
      } else {
        const result = await addDisease({ name: trimmed }).unwrap();
        toast.success(`Disease "${result.name}" created!`);
        if (onCreated) onCreated({ id: result.id, name: result.name, type: "disease" });
      }
      setName("");
      onClose();
    } catch {
      toast.error(`Failed to create ${type}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-100 text-base">
              Add New Node to Graph
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Entity Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("medicine")}
                className={`py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition ${
                  type === "medicine"
                    ? "bg-blue-600/20 border-blue-500 text-blue-300 font-semibold shadow-sm"
                    : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Medicine / Remedy
              </button>
              <button
                type="button"
                onClick={() => setType("disease")}
                className={`py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition ${
                  type === "disease"
                    ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 font-semibold shadow-sm"
                    : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Disease / Symptom
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {type === "medicine" ? "Medicine Name" : "Disease / Symptom Name"}
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === "medicine" ? "e.g. Belladonna, Arnica 200..." : "e.g. Migraine, Fever..."
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />

            {/* Exact Duplicate Warning */}
            {exactMatch && (
              <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  "{trimmed}" already exists as a {type}!
                </span>
              </p>
            )}

            {/* Fuzzy match suggestion */}
            {!exactMatch && topFuzzyMatch && (
              <p className="mt-2 text-xs text-amber-400/90 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Similar entity exists: "<strong>{topFuzzyMatch}</strong>"
                </span>
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!trimmed || exactMatch || addingMed || addingIll}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
            >
              {addingMed || addingIll ? "Adding..." : `Create ${type === "medicine" ? "Medicine" : "Disease"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
