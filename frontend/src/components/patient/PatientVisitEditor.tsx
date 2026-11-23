import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stethoscope,
  Search as SearchIcon,
  X,
  Check,
  Plus,
  Minus,
  RotateCcw,
  Link as LinkIcon,
  Save,
  Filter,
  Trash2,
  Pill,
  PlusCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  Disease,
  KnowledgeSource,
  Link,
  PatientVisit,
  VisitPrescription,
  VisitSymptomRef,
} from "../../types";
import { normalizeSymptomName } from "../../utils/patientHelpers";
import { matchesSearch } from "../Utils";

interface PatientVisitEditorProps {
  patientId: string;
  visitDate: string;
  visit: PatientVisit | undefined;
  previousActiveSymptoms: VisitSymptomRef[];
  visitNumber: number;
  totalVisits: number;
  knowledgeSource: KnowledgeSource;
  onChangeKnowledgeSource: (src: KnowledgeSource) => void;
  diseases: Disease[];
  links: Link[];
  onCreateDisease: (name: string) => Promise<Disease>;
  onSaveVisit: (params: {
    date: string;
    activeSymptoms: VisitSymptomRef[];
    notes: string;
  }) => Promise<void>;
  onSaveAndGoToFilter: (params: {
    date: string;
    activeSymptoms: VisitSymptomRef[];
    notes: string;
  }) => Promise<void>;
  onUpdatePrescriptions: (prescriptions: VisitPrescription[]) => Promise<void>;
  onDeleteVisit: (date: string) => Promise<void>;
  isSaving: boolean;
}

export default function PatientVisitEditor({
  visitDate,
  visit,
  previousActiveSymptoms,
  visitNumber,
  totalVisits,
  knowledgeSource,
  onChangeKnowledgeSource,
  diseases,
  links,
  onCreateDisease,
  onSaveVisit,
  onSaveAndGoToFilter,
  onUpdatePrescriptions,
  onDeleteVisit,
  isSaving,
}: PatientVisitEditorProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [draftSymptoms, setDraftSymptoms] = useState<VisitSymptomRef[]>([]);
  const [draftNotes, setDraftNotes] = useState("");
  const [isCreatingDisease, setIsCreatingDisease] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync draft when switching visit dates or patient updates
  useEffect(() => {
    if (visit) {
      setDraftSymptoms(visit.activeSymptoms || []);
      setDraftNotes(visit.notes || "");
    } else {
      setDraftSymptoms(previousActiveSymptoms);
      setDraftNotes("");
    }
  }, [visitDate, visit, previousActiveSymptoms]);

  // Disease -> count of linked remedies in the active knowledge base
  const diseaseRemedyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of links) {
      map.set(l.diseaseId, (map.get(l.diseaseId) || 0) + 1);
    }
    return map;
  }, [links]);

  const draftNameSet = useMemo(
    () => new Set(draftSymptoms.map((s) => normalizeSymptomName(s.name))),
    [draftSymptoms]
  );

  const prevNameSet = useMemo(
    () =>
      new Set(previousActiveSymptoms.map((s) => normalizeSymptomName(s.name))),
    [previousActiveSymptoms]
  );

  // Live diff relative to previous visit
  const newlyAdded = useMemo(
    () =>
      draftSymptoms.filter(
        (s) => !prevNameSet.has(normalizeSymptomName(s.name))
      ),
    [draftSymptoms, prevNameSet]
  );

  const removedFromPrev = useMemo(
    () =>
      previousActiveSymptoms.filter(
        (s) => !draftNameSet.has(normalizeSymptomName(s.name))
      ),
    [previousActiveSymptoms, draftNameSet]
  );

  const isDirty = useMemo(() => {
    if (!visit) return true;
    const savedNames = visit.activeSymptoms
      .map((s) => normalizeSymptomName(s.name))
      .sort()
      .join("|");
    const draftNames = draftSymptoms
      .map((s) => normalizeSymptomName(s.name))
      .sort()
      .join("|");
    return savedNames !== draftNames || (visit.notes || "") !== draftNotes;
  }, [visit, draftSymptoms, draftNotes]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return diseases.slice(0, 50);
    return diseases
      .filter((d) => matchesSearch(q, d.name))
      .slice(0, 50);
  }, [searchQuery, diseases]);

  const hasExactDiseaseMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return diseases.some((d) => d.name.trim().toLowerCase() === q);
  }, [searchQuery, diseases]);

  const handleAddDisease = (disease: Disease) => {
    const key = normalizeSymptomName(disease.name);
    if (draftNameSet.has(key)) return;
    setDraftSymptoms((prev) => [
      ...prev,
      { id: disease.id, name: disease.name, source: knowledgeSource },
    ]);
  };

  const handleRestoreSymptom = (symptom: VisitSymptomRef) => {
    const key = normalizeSymptomName(symptom.name);
    if (draftNameSet.has(key)) return;
    setDraftSymptoms((prev) => [...prev, symptom]);
  };

  const handleRemoveSymptom = (name: string) => {
    const target = normalizeSymptomName(name);
    setDraftSymptoms((prev) =>
      prev.filter((s) => normalizeSymptomName(s.name) !== target)
    );
  };

  const handleCreateAndAddDisease = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setIsCreatingDisease(true);
    try {
      const created = await onCreateDisease(trimmed);
      handleAddDisease(created);
      toast.success(
        `Created "${created.name}" in ${
          knowledgeSource === "mapper" ? "Mapper" : "Tips"
        } and added to visit`
      );
      setSearchQuery("");
      searchInputRef.current?.focus();
    } catch (err: unknown) {
      const apiErr = err as { data?: { error?: string } };
      toast.error(apiErr?.data?.error || "Failed to create disease");
    } finally {
      setIsCreatingDisease(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Visit Summary & Diff Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black uppercase">
                Visit #{visitNumber}
              </span>
              <h3 className="text-xl font-black text-slate-900">{visitDate}</h3>
              {!visit && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                  New Visit Draft (unsaved)
                </span>
              )}
              {visit && isDirty && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {previousActiveSymptoms.length > 0
                ? `Carried ${previousActiveSymptoms.length} symptom(s) from previous visit. Add new symptoms or remove resolved ones.`
                : "Initial visit — select the patient's presenting symptoms below."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mapper / Tips DB Toggle */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onChangeKnowledgeSource("mapper")}
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
                onClick={() => onChangeKnowledgeSource("tips")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  knowledgeSource === "tips"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tips DB
              </button>
            </div>

            {visit && totalVisits > 1 && (
              <button
                type="button"
                onClick={() => onDeleteVisit(visitDate)}
                className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 transition"
                title="Delete this visit"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Visit</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Diff Strip + Prescription Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3">
            <div className="text-xs font-black uppercase text-emerald-800 flex items-center gap-1 mb-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Added on {visitDate} ({newlyAdded.length})</span>
            </div>
            {newlyAdded.length === 0 ? (
              <p className="text-xs text-emerald-700/70 italic">
                No new symptoms added on this visit
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {newlyAdded.map((s) => (
                  <span
                    key={s.name}
                    className="text-xs font-bold px-2 py-0.5 rounded-md bg-white text-emerald-900 border border-emerald-300"
                  >
                    + {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-3">
            <div className="text-xs font-black uppercase text-rose-800 flex items-center gap-1 mb-1.5">
              <Minus className="w-3.5 h-3.5" />
              <span>Removed on {visitDate} ({removedFromPrev.length})</span>
            </div>
            {removedFromPrev.length === 0 ? (
              <p className="text-xs text-rose-700/70 italic">
                No previous symptoms removed
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {removedFromPrev.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => handleRestoreSymptom(s)}
                    className="text-xs font-bold px-2 py-0.5 rounded-md bg-white text-rose-800 border border-rose-300 hover:bg-rose-100 flex items-center gap-1 transition"
                    title="Click to restore this symptom"
                  >
                    <span className="line-through">{s.name}</span>
                    <RotateCcw className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3">
            <div className="text-xs font-black uppercase text-blue-800 flex items-center gap-1 mb-1.5">
              <Pill className="w-3.5 h-3.5" />
              <span>
                Prescribed Remedies ({visit?.prescriptions?.length || 0})
              </span>
            </div>
            {!visit?.prescriptions || visit.prescriptions.length === 0 ? (
              <p className="text-xs text-blue-700/70 italic">
                None recorded yet — prescribe from Filter View
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {visit.prescriptions.map((rx, idx) => (
                  <span
                    key={`${rx.medicineName}-${idx}`}
                    className="text-xs font-bold px-2 py-0.5 rounded-md bg-white text-blue-950 border border-blue-300 flex items-center gap-1.5"
                    title={rx.notes || undefined}
                  >
                    <span>
                      {rx.medicineName}
                      {rx.potency ? ` (${rx.potency})` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePrescriptions(
                          visit.prescriptions.filter((_, i) => i !== idx)
                        )
                      }
                      className="text-blue-400 hover:text-rose-600 transition"
                      title="Remove prescribed remedy"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Symptom Selector + Active Symptoms Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid md:grid-cols-2 gap-6">
        {/* Column 1: Symptom Selector (Same Search UX as Mapper/Tips + Inline Create) */}
        <div className="flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between mb-2">
            <label className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <SearchIcon className="w-4 h-4 text-slate-500" />
              <span>
                Select Symptoms (
                {knowledgeSource === "mapper" ? "Mapper" : "Tips"})
              </span>
            </label>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Showing top {searchResults.length}
            </span>
          </div>

          <div className="relative">
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to search diseases / symptoms..."
              style={{ backgroundColor: "rgb(118 213 133 / 54%)" }}
              className="w-full px-4 py-3 pr-10 border-2 border-emerald-400 rounded-xl text-base font-bold text-slate-900 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-emerald-200/50 transition"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchQuery.trim() && !hasExactDiseaseMatch && (
            <button
              type="button"
              disabled={isCreatingDisease}
              onClick={handleCreateAndAddDisease}
              className="mt-2.5 w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {isCreatingDisease
                  ? "Creating..."
                  : `Create "${searchQuery.trim()}" in ${
                      knowledgeSource === "mapper" ? "Mapper" : "Tips"
                    } & Add`}
              </span>
            </button>
          )}

          <ul className="mt-3 max-h-96 overflow-y-auto border-2 border-slate-200 rounded-xl bg-white divide-y shadow-sm flex-1">
            {searchResults.map((d) => {
              const isAdded = draftNameSet.has(normalizeSymptomName(d.name));
              const count = diseaseRemedyCounts.get(d.id) || 0;
              return (
                <li
                  key={d.id}
                  onClick={() => !isAdded && handleAddDisease(d)}
                  className={`px-4 py-3 text-base font-bold transition flex items-center justify-between group ${
                    isAdded
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-75"
                      : "cursor-pointer hover:bg-emerald-50 text-slate-900 hover:text-emerald-950"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    <Stethoscope
                      className={`w-4 h-4 shrink-0 ${
                        isAdded ? "text-slate-400" : "text-emerald-600"
                      }`}
                    />
                    <span className="truncate">{d.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border bg-slate-50 text-slate-600 border-slate-200">
                      <LinkIcon className="w-3 h-3" />
                      <span>{count}</span>
                    </span>

                    {isAdded ? (
                      <span className="text-xs font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Added</span>
                      </span>
                    ) : (
                      <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition">
                        + Add
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
            {searchResults.length === 0 && (
              <li className="px-4 py-8 text-center text-sm font-bold text-slate-400 italic">
                No matching diseases found in{" "}
                {knowledgeSource === "mapper" ? "Mapper" : "Tips"}.
              </li>
            )}
          </ul>
        </div>

        {/* Column 2: Active Symptoms on this Visit + Notes + Save/Filter */}
        <div className="flex flex-col min-h-[380px] justify-between gap-3">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <span>Active Symptoms on {visitDate} ({draftSymptoms.length})</span>
              </h4>
              {draftSymptoms.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraftSymptoms([])}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {draftSymptoms.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 min-h-[220px]">
                <Stethoscope className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-base font-semibold text-slate-600">
                  No active symptoms for this visit
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Add symptoms from the selector on the left, or restore any removed symptoms above.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex-1">
                {draftSymptoms.map((s) => {
                  const isNew = !prevNameSet.has(normalizeSymptomName(s.name));
                  return (
                    <li
                      key={s.name}
                      className={`px-3.5 py-2.5 bg-white border rounded-lg flex items-center justify-between text-sm font-bold text-slate-900 shadow-xs ${
                        isNew ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate mr-2">
                        <Stethoscope
                          className={`w-4 h-4 shrink-0 ${
                            isNew ? "text-emerald-600" : "text-slate-500"
                          }`}
                        />
                        <span className="truncate">{s.name}</span>
                        <span
                          className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isNew
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isNew ? "New" : "Carried"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSymptom(s.name)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition shrink-0"
                        title={`Remove "${s.name}"`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Visit Notes & Actions */}
          <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                Visit Notes / Observations
              </label>
              <textarea
                rows={2}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                placeholder="Clinical observations, modalities, aggravations/ameliorations..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  onSaveVisit({
                    date: visitDate,
                    activeSymptoms: draftSymptoms,
                    notes: draftNotes,
                  })
                }
                className="px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm flex items-center gap-2 transition disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Visit"}</span>
              </button>

              <button
                type="button"
                disabled={isSaving || draftSymptoms.length === 0}
                onClick={() =>
                  onSaveAndGoToFilter({
                    date: visitDate,
                    activeSymptoms: draftSymptoms,
                    notes: draftNotes,
                  })
                }
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm flex items-center gap-2 shadow-sm transition"
              >
                <Filter className="w-4 h-4" />
                <span>Save & Go to Filter View</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
