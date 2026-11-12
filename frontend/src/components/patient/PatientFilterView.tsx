import { useEffect, useMemo, useState } from "react";
import {
  Pill,
  Stethoscope,
  Filter,
  Layers,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Check,
  Search as SearchIcon,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  Disease,
  KnowledgeSource,
  Link,
  Medicine,
  PatientVisit,
  VisitPrescription,
} from "../../types";
import { RemedyFilterMode } from "../shared/RemedyFilterFinder";
import {
  normalizeSymptomName,
  resolveSymptomInDatabase,
} from "../../utils/patientHelpers";

interface PatientFilterViewProps {
  visitDate: string;
  visit: PatientVisit | undefined;
  knowledgeSource: KnowledgeSource;
  onChangeKnowledgeSource: (src: KnowledgeSource) => void;
  allMeds: Medicine[];
  allDiseases: Disease[];
  allLinks: Link[];
  onBackToSymptoms: () => void;
  onUpdatePrescriptions: (prescriptions: VisitPrescription[]) => Promise<void>;
  isSavingPrescription: boolean;
}

interface PatientRemedyMatch {
  medicine: Medicine;
  matchedNames: string[];
  missingNames: string[];
  matchedCount: number;
  totalIncluded: number;
  entryMatchedCount: number;
  totalEntry: number;
}

export default function PatientFilterView({
  visitDate,
  visit,
  knowledgeSource,
  onChangeKnowledgeSource,
  allMeds,
  allDiseases,
  allLinks,
  onBackToSymptoms,
  onUpdatePrescriptions,
  isSavingPrescription,
}: PatientFilterViewProps): JSX.Element {
  const activeSymptoms = useMemo(
    () => visit?.activeSymptoms || [],
    [visit]
  );
  const currentPrescriptions = useMemo(
    () => visit?.prescriptions || [],
    [visit]
  );

  const [filterMode, setFilterMode] = useState<RemedyFilterMode>("and");
  const [excludedNames, setExcludedNames] = useState<Set<string>>(
    () => new Set()
  );
  const [entryNames, setEntryNames] = useState<Set<string>>(() => new Set());
  const [remedySearch, setRemedySearch] = useState("");
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);
  const [potency, setPotency] = useState("");
  const [rxNotes, setRxNotes] = useState("");

  useEffect(() => {
    setPotency("");
    setRxNotes("");
  }, [visitDate, selectedMedId]);

  // Reset exclusion/entry sets if visit changes
  useEffect(() => {
    setExcludedNames(new Set());
    setEntryNames(new Set());
    setSelectedMedId(null);
  }, [visitDate]);

  // Maps for active knowledge base
  const { diseaseToMedsMap, medToDiseasesMap, diseaseById } = useMemo(() => {
    const d2m = new Map<string, Set<string>>();
    const m2d = new Map<string, Set<string>>();
    for (const l of allLinks) {
      if (!d2m.has(l.diseaseId)) d2m.set(l.diseaseId, new Set());
      d2m.get(l.diseaseId)!.add(l.medicineId);
      if (!m2d.has(l.medicineId)) m2d.set(l.medicineId, new Set());
      m2d.get(l.medicineId)!.add(l.diseaseId);
    }
    return {
      diseaseToMedsMap: d2m,
      medToDiseasesMap: m2d,
      diseaseById: new Map(allDiseases.map((d) => [d.id, d])),
    };
  }, [allLinks, allDiseases]);

  // Resolve each patient symptom in the toggled DB
  const resolvedSymptoms = useMemo(() => {
    return activeSymptoms.map((sym) => {
      const key = normalizeSymptomName(sym.name);
      const matchedDisease = resolveSymptomInDatabase(
        sym,
        allDiseases,
        knowledgeSource
      );
      const linkCount = matchedDisease
        ? diseaseToMedsMap.get(matchedDisease.id)?.size || 0
        : 0;
      return {
        symptom: sym,
        key,
        matchedDisease,
        linkCount,
        included: !excludedNames.has(key),
        isEntry: entryNames.has(key),
      };
    });
  }, [activeSymptoms, allDiseases, knowledgeSource, diseaseToMedsMap, excludedNames, entryNames]);

  const includedSymptoms = useMemo(
    () => resolvedSymptoms.filter((r) => r.included),
    [resolvedSymptoms]
  );

  const activeEntryCount = useMemo(
    () => includedSymptoms.filter((r) => r.isEntry).length,
    [includedSymptoms]
  );

  // Filter remedies using AND / OR / Entry Point
  const matchingRemedies = useMemo<PatientRemedyMatch[]>(() => {
    if (includedSymptoms.length === 0) return [];
    const entryItems = includedSymptoms.filter((r) => r.isEntry);
    if (filterMode === "entry" && entryItems.length === 0) return [];

    const totalIncluded = includedSymptoms.length;
    const totalEntry = entryItems.length;
    const results: PatientRemedyMatch[] = [];

    for (const med of allMeds) {
      const matchedNames: string[] = [];
      const missingNames: string[] = [];
      let entryMatchedCount = 0;

      for (const item of includedSymptoms) {
        const medsForDisease = item.matchedDisease
          ? diseaseToMedsMap.get(item.matchedDisease.id)
          : undefined;
        if (medsForDisease?.has(med.id)) {
          matchedNames.push(item.symptom.name);
          if (item.isEntry) entryMatchedCount++;
        } else {
          missingNames.push(item.symptom.name);
        }
      }

      const matchedCount = matchedNames.length;
      let passes = false;
      if (filterMode === "and") {
        passes = matchedCount === totalIncluded;
      } else if (filterMode === "or") {
        passes = matchedCount > 0;
      } else {
        passes = entryMatchedCount === totalEntry;
      }

      if (passes) {
        results.push({
          medicine: med,
          matchedNames,
          missingNames,
          matchedCount,
          totalIncluded,
          entryMatchedCount,
          totalEntry,
        });
      }
    }

    if (filterMode === "or" || filterMode === "entry") {
      results.sort((a, b) => {
        if (b.matchedCount !== a.matchedCount) {
          return b.matchedCount - a.matchedCount;
        }
        return a.medicine.name.localeCompare(b.medicine.name);
      });
    } else {
      results.sort((a, b) => a.medicine.name.localeCompare(b.medicine.name));
    }

    const q = remedySearch.trim().toLowerCase();
    if (!q) return results;
    return results.filter((r) =>
      r.medicine.name.toLowerCase().includes(q)
    );
  }, [
    includedSymptoms,
    filterMode,
    allMeds,
    diseaseToMedsMap,
    remedySearch,
  ]);

  const selectedMed = useMemo(
    () => allMeds.find((m) => m.id === selectedMedId) || null,
    [allMeds, selectedMedId]
  );

  const selectedMedAllDiseases = useMemo(() => {
    if (!selectedMed) return [];
    const dIds = medToDiseasesMap.get(selectedMed.id) || new Set<string>();
    const includedDiseaseIdSet = new Set(
      includedSymptoms
        .map((s) => s.matchedDisease?.id)
        .filter((id): id is string => Boolean(id))
    );
    return Array.from(dIds)
      .map((id) => diseaseById.get(id))
      .filter((d): d is Disease => Boolean(d))
      .sort((a, b) => {
        const aMatch = includedDiseaseIdSet.has(a.id) ? 0 : 1;
        const bMatch = includedDiseaseIdSet.has(b.id) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return a.name.localeCompare(b.name);
      })
      .map((d) => ({
        disease: d,
        matchesPatient: includedDiseaseIdSet.has(d.id),
      }));
  }, [selectedMed, medToDiseasesMap, diseaseById, includedSymptoms]);

  const toggleInclude = (key: string) => {
    setExcludedNames((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleEntry = (key: string) => {
    setEntryNames((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddPrescription = async () => {
    if (!selectedMed) return;
    const newRx: VisitPrescription = {
      medicineId: selectedMed.id,
      medicineName: selectedMed.name,
      source: knowledgeSource,
      potency: potency.trim() || undefined,
      notes: rxNotes.trim() || undefined,
    };
    const nextList = [...currentPrescriptions, newRx];
    try {
      await onUpdatePrescriptions(nextList);
      toast.success(`Added ${selectedMed.name} to ${visitDate} prescriptions`);
      setPotency("");
      setRxNotes("");
    } catch {
      toast.error("Failed to save prescription");
    }
  };

  const handleRemovePrescription = async (idx: number) => {
    const removed = currentPrescriptions[idx];
    const nextList = currentPrescriptions.filter((_, i) => i !== idx);
    try {
      await onUpdatePrescriptions(nextList);
      if (removed) {
        toast.info(`Removed ${removed.medicineName} from prescriptions`);
      }
    } catch {
      toast.error("Failed to remove prescription");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToSymptoms}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-extrabold flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Edit Symptoms</span>
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Repertorize & Filter Remedies ({visitDate})
            </h3>
            <p className="text-xs text-slate-500">
              {filterMode === "and"
                ? "AND: Remedies must match ALL included symptoms."
                : filterMode === "or"
                ? "OR: Remedies matching ANY included symptom, ranked by most solved."
                : "Entry Point: Remedies must match ALL marked Entry symptoms; others are optional."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Knowledge Base Toggle */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                onChangeKnowledgeSource("mapper");
                setSelectedMedId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                knowledgeSource === "mapper"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mapper DB
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeKnowledgeSource("tips");
                setSelectedMedId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                knowledgeSource === "tips"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tips DB
            </button>
          </div>

          {/* 3-Way Filter Mode Selector */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterMode("and")}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition flex items-center gap-1.5 ${
                filterMode === "and"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>AND</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("or")}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition flex items-center gap-1.5 ${
                filterMode === "or"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>OR</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("entry")}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition flex items-center gap-1.5 ${
                filterMode === "entry"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Entry Point</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Filter Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Column 1: Patient Visit Symptoms (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black uppercase text-slate-700 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              <span>
                Visit Symptoms ({includedSymptoms.length}/{activeSymptoms.length})
              </span>
            </h4>
            {excludedNames.size > 0 && (
              <button
                type="button"
                onClick={() => setExcludedNames(new Set())}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                Include All
              </button>
            )}
          </div>

          {filterMode === "entry" && includedSymptoms.length > 0 && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                Mark required <strong>Entry</strong> symptoms ({activeEntryCount}{" "}
                marked).
              </span>
            </div>
          )}

          {activeSymptoms.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 text-center min-h-[240px]">
              <Stethoscope className="w-9 h-9 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-600">
                No symptoms on this visit yet
              </p>
              <button
                type="button"
                onClick={onBackToSymptoms}
                className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-extrabold"
              >
                Add Symptoms
              </button>
            </div>
          ) : (
            <ul className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {resolvedSymptoms.map((item) => (
                <li
                  key={item.key}
                  className={`p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                    !item.included
                      ? "bg-slate-50 border-slate-200 opacity-55"
                      : filterMode === "entry" && item.isEntry
                      ? "bg-amber-50/50 border-amber-400"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={() => toggleInclude(item.key)}
                      className="w-4 h-4 accent-indigo-600 rounded shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 truncate">
                        {item.symptom.name}
                      </div>
                      <div className="text-[11px] font-semibold">
                        {item.matchedDisease ? (
                          <span className="text-emerald-700">
                            {item.linkCount} linked{" "}
                            {item.linkCount === 1 ? "remedy" : "remedies"} in{" "}
                            {knowledgeSource === "mapper" ? "Mapper" : "Tips"}
                          </span>
                        ) : (
                          <span className="text-amber-600">
                            Not in{" "}
                            {knowledgeSource === "mapper" ? "Mapper" : "Tips"}{" "}
                            DB
                          </span>
                        )}
                      </div>
                    </div>
                  </label>

                  {filterMode === "entry" && item.included && (
                    <button
                      type="button"
                      onClick={() => toggleEntry(item.key)}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-black uppercase border flex items-center gap-1 shrink-0 transition ${
                        item.isEntry
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-amber-50 hover:text-amber-800"
                      }`}
                    >
                      <Target className="w-3 h-3" />
                      <span>{item.isEntry ? "Entry" : "Optional"}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Column 2: Matching Remedies (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black uppercase text-slate-700 flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-blue-600" />
              <span>Matching Remedies ({matchingRemedies.length})</span>
            </h4>
          </div>

          <div className="relative">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={remedySearch}
              onChange={(e) => setRemedySearch(e.target.value)}
              placeholder="Filter matched remedies by name..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
            />
            {remedySearch && (
              <button
                type="button"
                onClick={() => setRemedySearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {includedSymptoms.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-blue-200/70 rounded-xl p-6 text-center min-h-[260px]">
              <Pill className="w-9 h-9 text-blue-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                Include at least 1 symptom on the left
              </p>
            </div>
          ) : filterMode === "entry" && activeEntryCount === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-amber-300 rounded-xl p-6 text-center bg-amber-50/30 min-h-[260px]">
              <Target className="w-9 h-9 text-amber-500 mb-2" />
              <p className="text-sm font-bold text-amber-900">
                Mark Entry Symptom(s)
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Click Optional next to symptom(s) on the left to set required Entry points.
              </p>
            </div>
          ) : matchingRemedies.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-amber-200 rounded-xl p-6 text-center bg-amber-50/40 min-h-[260px]">
              <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
              <p className="text-sm font-bold text-amber-900">
                No Matching Remedies
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Try switching filter mode to OR / Entry Point, or toggling between Mapper & Tips DB.
              </p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {matchingRemedies.map((match) => {
                const isSelected = selectedMedId === match.medicine.id;
                const isPrescribed = currentPrescriptions.some(
                  (rx) =>
                    rx.medicineName.toLowerCase() ===
                    match.medicine.name.toLowerCase()
                );
                return (
                  <li
                    key={match.medicine.id}
                    onClick={() => setSelectedMedId(match.medicine.id)}
                    className={`p-3.5 rounded-xl border-l-4 cursor-pointer transition ${
                      isSelected
                        ? "bg-blue-100 border-blue-700 ring-1 ring-blue-300"
                        : "bg-blue-50/60 hover:bg-blue-100/80 border-blue-500"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Pill className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-extrabold text-base text-blue-950 truncate">
                          {match.medicine.name}
                        </span>
                        {isPrescribed && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white shrink-0">
                            Rx
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full shrink-0 ${
                          match.matchedCount === match.totalIncluded
                            ? "bg-emerald-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {match.matchedCount} / {match.totalIncluded}
                      </span>
                    </div>

                    {filterMode !== "and" && (
                      <div className="mt-1.5 text-[11px] space-y-0.5">
                        <div className="text-emerald-800 font-semibold truncate">
                          Solves: {match.matchedNames.join(", ")}
                        </div>
                        {match.missingNames.length > 0 && (
                          <div className="text-slate-500 truncate">
                            Misses: {match.missingNames.join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Column 3: Remedy Inspector & Multi-Prescribe (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
          <h4 className="text-sm font-black uppercase text-slate-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>Inspect & Prescribe</span>
          </h4>

          {/* Current Visit Prescriptions */}
          <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3">
            <div className="text-xs font-black uppercase text-blue-900 mb-1.5 flex items-center justify-between">
              <span>Visit Prescriptions ({currentPrescriptions.length})</span>
            </div>
            {currentPrescriptions.length === 0 ? (
              <p className="text-xs text-blue-800/70 italic">
                No remedies prescribed for {visitDate} yet.
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                {currentPrescriptions.map((rx, idx) => (
                  <li
                    key={`${rx.medicineName}-${idx}`}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-blue-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-extrabold text-blue-950">
                        {rx.medicineName}
                      </span>
                      {rx.potency && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                          {rx.potency}
                        </span>
                      )}
                      {rx.notes && (
                        <div className="text-[11px] text-slate-500 truncate">
                          {rx.notes}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isSavingPrescription}
                      onClick={() => handleRemovePrescription(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition shrink-0"
                      title="Remove prescription"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!selectedMed ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 text-center min-h-[220px]">
              <Pill className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-600">
                Select a matching remedy
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Click any remedy on the left to inspect all its linked conditions and add it to {visitDate}'s prescriptions.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 flex-1">
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200">
                <div className="text-lg font-black text-indigo-950">
                  {selectedMed.name}
                </div>
                <div className="text-xs font-semibold text-indigo-700 mt-0.5">
                  Linked to {selectedMedAllDiseases.length} condition(s) in{" "}
                  {knowledgeSource === "mapper" ? "Mapper" : "Tips"}
                </div>
              </div>

              {/* Linked Conditions */}
              <div className="flex flex-col min-h-0 flex-1">
                <div className="text-xs font-extrabold uppercase text-slate-500 mb-1.5">
                  Remedy Coverage
                </div>
                <ul className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50/60">
                  {selectedMedAllDiseases.map(({ disease, matchesPatient }) => (
                    <li
                      key={disease.id}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between gap-2 ${
                        matchesPatient
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-white text-slate-700 border border-slate-200"
                      }`}
                    >
                      <span className="truncate">{disease.name}</span>
                      {matchesPatient && (
                        <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                          <Check className="w-2.5 h-2.5" />
                          <span>Match</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prescribe Form */}
              <div className="border-t border-slate-200 pt-3 flex flex-col gap-2.5">
                <div className="text-xs font-black uppercase text-slate-700">
                  Add Prescription for {visitDate}
                </div>
                <input
                  type="text"
                  value={potency}
                  onChange={(e) => setPotency(e.target.value)}
                  placeholder="Potency (e.g. 30C, 200C, 1M, Q)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={rxNotes}
                  onChange={(e) => setRxNotes(e.target.value)}
                  placeholder="Dosage / prescription notes..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  disabled={isSavingPrescription}
                  onClick={handleAddPrescription}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-extrabold text-sm shadow-sm transition"
                >
                  {isSavingPrescription
                    ? "Saving Prescription..."
                    : `+ Add ${selectedMed.name} to Visit Rx`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
