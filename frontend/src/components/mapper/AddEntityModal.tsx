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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-100 text-lg">
              Add New Node to Graph
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Entity Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("medicine")}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2.5 transition ${
                  type === "medicine"
                    ? "bg-blue-600/20 border-blue-500 text-blue-200 font-bold shadow-sm"
                    : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></span>
                Medicine / Remedy
              </button>
              <button
                type="button"
                onClick={() => setType("disease")}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2.5 transition ${
                  type === "disease"
                    ? "bg-emerald-600/20 border-emerald-500 text-emerald-200 font-bold shadow-sm"
                    : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span>
                Disease / Symptom
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
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
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium shadow-inner transition"
            />

            {/* Exact Duplicate Warning */}
            {exactMatch && (
              <p className="mt-2.5 text-sm text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  "{trimmed}" already exists as a {type}!
                </span>
              </p>
            )}

            {/* Fuzzy match suggestion */}
            {!exactMatch && topFuzzyMatch && (
              <p className="mt-2.5 text-sm text-amber-400/90 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Similar entity exists: "<strong>{topFuzzyMatch}</strong>"
                </span>
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-base text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!trimmed || exactMatch || addingMed || addingIll}
              className="px-6 py-2.5 text-base bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
            >
              {addingMed || addingIll ? "Adding..." : `Create ${type === "medicine" ? "Medicine" : "Disease"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
