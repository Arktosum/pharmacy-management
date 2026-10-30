// SearchLinker.tsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Pill,
  Stethoscope,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import Card from "./Card";
import {
  useGetMedicinesQuery,
  useGetDiseasesQuery,
  useGetLinksQuery,
  useUpdateMedicineMutation,
  useUpdateDiseaseMutation,
  useUnlinkMutation,
  useDeleteMedicineMutation,
  useDeleteDiseaseMutation,
} from "../../api/api";
import { Disease, Medicine } from "../../types";

interface SearchLinkerProps {
  initialSelection?: { type: "medicine" | "disease"; id: string; key?: number } | null;
}

export default function SearchLinker({
  initialSelection,
}: SearchLinkerProps = {}): JSX.Element {
  const [type, setType] = useState<"medicine" | "disease">("medicine");
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // 1st Hop, 2nd Hop & 3rd Hop selection states in the chain
  const [firstHopSelectedId, setFirstHopSelectedId] = useState<string | null>(null);
  const [secondHopSelectedId, setSecondHopSelectedId] = useState<string | null>(null);
  const [thirdHopSelectedId, setThirdHopSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelection) {
      setType(initialSelection.type);
      setSelectedId(initialSelection.id);
      setEditing(false);
      setEditingName(null);
    }
  }, [initialSelection]);

  const { data: meds = [] } = useGetMedicinesQuery();
  const { data: ills = [] } = useGetDiseasesQuery();
  const { data: links = [], refetch: refetchLinks } = useGetLinksQuery();

  const [updateMed] = useUpdateMedicineMutation();
  const [updateIll] = useUpdateDiseaseMutation();
  const [unlinkM] = useUnlinkMutation();
  const [deleteMed] = useDeleteMedicineMutation();
  const [deleteIll] = useDeleteDiseaseMutation();

  // debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Instant client-side matches for the active query in Column 1
  const matches = useMemo(() => {
    const list = type === "medicine" ? meds : ills;
    if (!debouncedQ) return list;
    const lower = debouncedQ.toLowerCase();
    return list.filter((item) => item.name.toLowerCase().includes(lower));
  }, [type, meds, ills, debouncedQ]);

  const medMap = useMemo(() => new Map(meds.map((m) => [m.id, m])), [meds]);
  const illMap = useMemo(() => new Map(ills.map((i) => [i.id, i])), [ills]);

  const DISPLAY_LIMIT = 100;
  const visibleMatches = useMemo(() => matches.slice(0, DISPLAY_LIMIT), [matches]);

  // Root entity (M1 if medicine, D1 if disease)
  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return (type === "medicine" ? medMap.get(selectedId) : illMap.get(selectedId)) || null;
  }, [selectedId, medMap, illMap, type]);

  // Column 2 (1st Hop: D1 if medicine, M1 if disease)
  const firstHopLinks = useMemo(() => {
    if (!selectedId) return [];
    if (type === "medicine") {
      return links
        .filter((l) => l.medicineId === selectedId)
        .map((l) => illMap.get(l.diseaseId))
        .filter(Boolean) as Disease[];
    } else {
      return links
        .filter((l) => l.diseaseId === selectedId)
        .map((l) => medMap.get(l.medicineId))
        .filter(Boolean) as Medicine[];
    }
  }, [selectedId, links, medMap, illMap, type]);

  // Auto-sync firstHopSelectedId when firstHopLinks changes
  useEffect(() => {
    if (firstHopLinks.length > 0) {
      setFirstHopSelectedId((prev) => {
        if (prev && firstHopLinks.some((item) => item.id === prev)) {
          return prev;
        }
        return firstHopLinks[0].id;
      });
    } else {
      setFirstHopSelectedId(null);
    }
  }, [firstHopLinks]);

  // First hop selected item object
  const firstHopItem = useMemo(() => {
    if (!firstHopSelectedId) return null;
    return (type === "medicine" ? illMap.get(firstHopSelectedId) : medMap.get(firstHopSelectedId)) || null;
  }, [firstHopSelectedId, type, medMap, illMap]);

  // Column 3 (2nd Hop: M2 if medicine, D2 if disease)
  const secondHopLinks = useMemo(() => {
    if (!firstHopSelectedId) return [];
    if (type === "medicine") {
      // Root M1 -> D1 -> M2 (medicines linked to D1)
      return links
        .filter((l) => l.diseaseId === firstHopSelectedId)
        .map((l) => medMap.get(l.medicineId))
        .filter(Boolean) as Medicine[];
    } else {
      // Root D1 -> M1 -> D2 (diseases linked to M1)
      return links
        .filter((l) => l.medicineId === firstHopSelectedId)
        .map((l) => illMap.get(l.diseaseId))
        .filter(Boolean) as Disease[];
    }
  }, [firstHopSelectedId, links, medMap, illMap, type]);

  // Auto-sync secondHopSelectedId when secondHopLinks changes
  useEffect(() => {
    if (secondHopLinks.length > 0) {
      setSecondHopSelectedId((prev) => {
        if (prev && secondHopLinks.some((item) => item.id === prev)) {
          return prev;
        }
        return secondHopLinks[0].id;
      });
    } else {
      setSecondHopSelectedId(null);
    }
  }, [secondHopLinks]);

  // Second hop selected item object
  const secondHopItem = useMemo(() => {
    if (!secondHopSelectedId) return null;
    return (type === "medicine" ? medMap.get(secondHopSelectedId) : illMap.get(secondHopSelectedId)) || null;
  }, [secondHopSelectedId, type, medMap, illMap]);

  // Column 4 (3rd Hop: D2 if medicine, M2 if disease)
  const thirdHopLinks = useMemo(() => {
    if (!secondHopSelectedId) return [];
    if (type === "medicine") {
      // Root M1 -> D1 -> M2 -> D2 (diseases linked to M2)
      return links
        .filter((l) => l.medicineId === secondHopSelectedId)
        .map((l) => illMap.get(l.diseaseId))
        .filter(Boolean) as Disease[];
    } else {
      // Root D1 -> M1 -> D2 -> M2 (medicines linked to D2)
      return links
        .filter((l) => l.diseaseId === secondHopSelectedId)
        .map((l) => medMap.get(l.medicineId))
        .filter(Boolean) as Medicine[];
    }
  }, [secondHopSelectedId, links, medMap, illMap, type]);

  // Auto-sync thirdHopSelectedId when thirdHopLinks changes
  useEffect(() => {
    if (thirdHopLinks.length > 0) {
      setThirdHopSelectedId((prev) => {
        if (prev && thirdHopLinks.some((item) => item.id === prev)) {
          return prev;
        }
        return thirdHopLinks[0].id;
      });
    } else {
      setThirdHopSelectedId(null);
    }
  }, [thirdHopLinks]);

  // Third hop selected item object
  const thirdHopItem = useMemo(() => {
    if (!thirdHopSelectedId) return null;
    return (type === "medicine" ? illMap.get(thirdHopSelectedId) : medMap.get(thirdHopSelectedId)) || null;
  }, [thirdHopSelectedId, type, medMap, illMap]);

  // Column 5 (4th Hop / End: M3 if medicine, D3 if disease)
  const fourthHopLinks = useMemo(() => {
    if (!thirdHopSelectedId) return [];
    if (type === "medicine") {
      // Root M1 -> D1 -> M2 -> D2 -> M3 (medicines linked to D2)
      return links
        .filter((l) => l.diseaseId === thirdHopSelectedId)
        .map((l) => medMap.get(l.medicineId))
        .filter(Boolean) as Medicine[];
    } else {
      // Root D1 -> M1 -> D2 -> M2 -> D3 (diseases linked to M2)
      return links
        .filter((l) => l.medicineId === thirdHopSelectedId)
        .map((l) => illMap.get(l.diseaseId))
        .filter(Boolean) as Disease[];
    }
  }, [thirdHopSelectedId, links, medMap, illMap, type]);

  const handleSelectRoot = (id: string) => {
    setSelectedId(id);
    setEditing(false);
    setEditingName(null);
  };

  const startEdit = () => {
    if (!selectedItem) return;
    setEditing(true);
    setEditingName(selectedItem.name);
  };

  const saveName = async () => {
    if (!selectedItem || !editingName) return;
    const newName = editingName.trim();
    if (!newName) {
      toast.error("Name cannot be empty");
      return;
    }
    const confirmMsg = `Are you sure you want to rename ${type} "${selectedItem.name}" to "${newName}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      if (type === "medicine") {
        await updateMed({ id: selectedItem.id, name: newName }).unwrap();
      } else {
        await updateIll({ id: selectedItem.id, name: newName }).unwrap();
      }
      toast.success("Name updated");
      setEditing(false);
      setEditingName(null);
      refetchLinks();
    } catch {
      toast.error("Update failed");
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditingName(null);
  };

  const handleUnlink = async (targetId: string, targetName?: string) => {
    if (!selectedId) return;
    const confirmMsg = `Are you sure you want to unlink "${selectedItem?.name}" from "${targetName || "target"}"?`;
    if (!window.confirm(confirmMsg)) return;

    const medicineId = type === "medicine" ? selectedId : targetId;
    const diseaseId = type === "disease" ? selectedId : targetId;
    try {
      await unlinkM({ medicineId, diseaseId }).unwrap();
      toast.success("Unlinked successfully");
      refetchLinks();
    } catch {
      toast.error("Unlink failed");
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const confirmMsg = `⚠️ ARE YOU SURE?\n\nDelete ${type} "${selectedItem.name}"?\nAll associated links will also be permanently deleted.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      if (type === "medicine") {
        await deleteMed(selectedItem.id).unwrap();
      } else {
        await deleteIll(selectedItem.id).unwrap();
      }
      toast.success(`${type} deleted with links`);
      setSelectedId(null);
      setEditing(false);
      setEditingName(null);
      refetchLinks();
    } catch {
      toast.error("Delete failed");
    }
  };

  const isMedMode = type === "medicine";

  return (
    <div id="search-manage-section" className="scroll-mt-6 w-full min-w-0 max-w-full">
      <Card className="w-full min-w-0 max-w-full">
        {/* Header */}
        <div className="mb-4 pb-3 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Search & Manage Links
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {isMedMode
                  ? "Explore 5-hop chain: M1 (Root Medicine) → D1 (Diseases) → M2 (Medicines) → D2 (Diseases) → M3 (Medicines)"
                  : "Explore 5-hop chain: D1 (Root Disease) → M1 (Medicines) → D2 (Diseases) → M2 (Medicines) → D3 (Diseases)"}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200">
                ⇄ Horizontal Scroll Columns
              </span>

              {selectedItem && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border shadow-xs ${
                    isMedMode
                      ? "bg-blue-50 text-blue-800 border-blue-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {isMedMode ? (
                    <Pill className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>Mode: {type === "medicine" ? "M1 → D1 → M2 → D2 → M3" : "D1 → M1 → D2 → M2 → D3"}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Visual Linked List Chain at the Top */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
              Linked Chain:
            </span>

            {/* Node 1 (Root: M1 or D1) */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border shadow-xs ${
                isMedMode
                  ? "bg-blue-600 text-white border-blue-700"
                  : "bg-emerald-600 text-white border-emerald-700"
              }`}
            >
              {isMedMode ? <Pill className="w-3.5 h-3.5" /> : <Stethoscope className="w-3.5 h-3.5" />}
              <span className="text-xs uppercase opacity-80">{isMedMode ? "M1" : "D1"}:</span>
              <span>{selectedItem ? selectedItem.name : "None"}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

            {/* Node 2 (1st Hop: D1 or M1) */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border shadow-xs ${
                isMedMode
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : "bg-blue-100 text-blue-900 border-blue-300"
              }`}
            >
              {isMedMode ? (
                <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Pill className="w-3.5 h-3.5 text-blue-700" />
              )}
              <span className="text-xs uppercase opacity-80">{isMedMode ? "D1" : "M1"}:</span>
              <span>{firstHopItem ? firstHopItem.name : "None"}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

            {/* Node 3 (2nd Hop: M2 or D2) */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border shadow-xs ${
                isMedMode
                  ? "bg-blue-100 text-blue-900 border-blue-300"
                  : "bg-emerald-100 text-emerald-900 border-emerald-300"
              }`}
            >
              {isMedMode ? (
                <Pill className="w-3.5 h-3.5 text-blue-700" />
              ) : (
                <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
              )}
              <span className="text-xs uppercase opacity-80">{isMedMode ? "M2" : "D2"}:</span>
              <span>{secondHopItem ? secondHopItem.name : "None"}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

            {/* Node 4 (3rd Hop: D2 or M2) */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border shadow-xs ${
                isMedMode
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : "bg-blue-100 text-blue-900 border-blue-300"
              }`}
            >
              {isMedMode ? (
                <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Pill className="w-3.5 h-3.5 text-blue-700" />
              )}
              <span className="text-xs uppercase opacity-80">{isMedMode ? "D2" : "M2"}:</span>
              <span>{thirdHopItem ? thirdHopItem.name : "None"}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

            {/* Node 5 (4th Hop / End: M3 or D3 count) */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border shadow-xs ${
                isMedMode
                  ? "bg-blue-50 text-blue-800 border-blue-200"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}
            >
              {isMedMode ? (
                <Pill className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="text-xs uppercase opacity-80">{isMedMode ? "M3" : "D3"}:</span>
              <span>
                {fourthHopLinks.length}{" "}
                {isMedMode
                  ? fourthHopLinks.length === 1 ? "Medicine" : "Medicines"
                  : fourthHopLinks.length === 1 ? "Disease" : "Diseases"}
              </span>
            </div>
          </div>

          {/* Root Node Controls (Rename & Delete) */}
          {selectedItem && (
            <div className="flex items-center gap-2">
              {!editing ? (
                <>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white hover:bg-slate-100 text-slate-700 transition shadow-xs"
                    title={`Rename root ${type} "${selectedItem.name}"`}
                  >
                    Rename Root
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-xs font-bold border border-rose-200 rounded-lg bg-white hover:bg-rose-50 text-rose-600 transition shadow-xs"
                    title={`Delete root ${type} "${selectedItem.name}"`}
                  >
                    Delete Root
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editingName ?? ""}
                    onChange={(e) => setEditingName(e.target.value)}
                    style={{ backgroundColor: "rgb(118 213 133 / 54%)" }}
                    className="px-3 py-1.5 text-xs font-bold border-2 border-emerald-500 rounded-lg text-slate-900 focus:outline-none shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={saveName}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5-Column Horizontal Scrollable Layout: M1 -> D1 -> M2 -> D2 -> M3 (or D1 -> M1 -> D2 -> M2 -> D3) */}
        <div className="horizontal-scroll-container pb-4 pt-1 w-full min-w-0 max-w-full">
          <div className="flex gap-5 min-w-[1850px] w-max">
            {/* Column 1: Selector & Matches (M1 or D1) */}
            <div className="w-[360px] min-w-[360px] shrink-0 flex flex-col">
            {/* Primary Selector Toggle [ Medicines | Diseases ] */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300 mb-3.5 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setType("medicine");
                  setSelectedId(null);
                  setQuery("");
                }}
                className={`flex-1 py-2 rounded-lg font-bold text-base transition flex items-center justify-center gap-1.5 ${
                  isMedMode
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Pill className="w-4 h-4" />
                <span>Medicines</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("disease");
                  setSelectedId(null);
                  setQuery("");
                }}
                className={`flex-1 py-2 rounded-lg font-bold text-base transition flex items-center justify-center gap-1.5 ${
                  !isMedMode
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Diseases</span>
              </button>
            </div>

            <label className="text-base font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>{isMedMode ? "M1: Filter Medicines" : "D1: Filter Diseases"}</span>
              <span className="text-sm font-semibold text-slate-500">
                {matches.length} found
              </span>
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Type to search ${type}...`}
              style={{ backgroundColor: "rgb(118 213 133 / 54%)" }}
              className="w-full px-4 py-3 border border-slate-400 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 text-base font-semibold placeholder-slate-600 shadow-sm"
            />
            <ul className="mt-2.5 max-h-80 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y shadow-sm flex-1">
              {visibleMatches.map((m) => {
                const isSelected = selectedId === m.id;
                return (
                  <li
                    key={m.id}
                    onClick={() => handleSelectRoot(m.id)}
                    className={`px-4 py-2.5 cursor-pointer text-base transition flex items-center justify-between ${
                      isSelected
                        ? isMedMode
                          ? "bg-blue-100 font-bold text-blue-950 border-l-4 border-blue-600"
                          : "bg-emerald-100 font-bold text-emerald-950 border-l-4 border-emerald-600"
                        : "hover:bg-slate-50 text-slate-800 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isMedMode ? (
                        <Pill className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        <Stethoscope className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      <span className="break-words font-medium">{m.name}</span>
                    </div>
                    {isSelected && (
                      <span
                        className={`text-xs text-white font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 ${
                          isMedMode ? "bg-blue-600" : "bg-emerald-600"
                        }`}
                      >
                        Root {isMedMode ? "M1" : "D1"}
                      </span>
                    )}
                  </li>
                );
              })}
              {matches.length > DISPLAY_LIMIT && (
                <li className="px-4 py-2.5 text-center text-xs text-slate-500 bg-slate-50 font-medium">
                  Showing top {DISPLAY_LIMIT} of {matches.length.toLocaleString()} {type}s. Type to filter...
                </li>
              )}
              {matches.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  No matching {type}s found.
                </li>
              )}
            </ul>
          </div>

          {/* Column 2: 1st Hop (D1 if Medicine, M1 if Disease) */}
          <div className="w-[360px] min-w-[360px] shrink-0 flex flex-col">
            {/* Desktop alignment spacer */}
            <div className="hidden lg:block h-[54px]" />

            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    isMedMode ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                />
                <span>{isMedMode ? "D1: Linked Diseases" : "M1: Linked Medicines"}</span>
              </label>
              {selectedItem && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                    isMedMode
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-blue-100 text-blue-800 border-blue-300"
                  }`}
                >
                  {isMedMode ? <Stethoscope className="w-3 h-3" /> : <Pill className="w-3 h-3" />}
                  <span>{firstHopLinks.length}</span>
                </span>
              )}
            </div>

            <ul className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y shadow-sm flex-1">
              {selectedItem ? (
                firstHopLinks.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                    No 1st-hop links found (orphan node).
                  </li>
                ) : (
                  firstHopLinks.map((item) => {
                    const isSelectedD1 = item.id === firstHopSelectedId;

                    return (
                      <li
                        key={item.id}
                        onClick={() => setFirstHopSelectedId(item.id)}
                        className={`px-4 py-3 cursor-pointer flex items-center justify-between transition text-base group ${
                          isSelectedD1
                            ? isMedMode
                              ? "bg-emerald-100/90 border-l-4 border-emerald-600 text-emerald-950 font-bold shadow-xs"
                              : "bg-blue-100/90 border-l-4 border-blue-600 text-blue-950 font-bold shadow-xs"
                            : isMedMode
                            ? "hover:bg-emerald-50/70 text-slate-800"
                            : "hover:bg-blue-50/70 text-slate-800"
                        }`}
                        title={`Click to select "${item.name}" and view ${isMedMode ? "M2" : "D2"}`}
                      >
                        <div className="flex items-center gap-2 mr-2">
                          {isMedMode ? (
                            <Stethoscope
                              className={`w-4 h-4 shrink-0 ${
                                isSelectedD1 ? "text-emerald-700" : "text-emerald-500"
                              }`}
                            />
                          ) : (
                            <Pill
                              className={`w-4 h-4 shrink-0 ${
                                isSelectedD1 ? "text-blue-700" : "text-blue-500"
                              }`}
                            />
                          )}
                          <span className="break-words font-medium">{item.name}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isSelectedD1 ? (
                            <span
                              className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                isMedMode ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
                              }`}
                            >
                              <span>{isMedMode ? "D1" : "M1"}</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          ) : (
                            <span
                              className={`hidden group-hover:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-md border items-center gap-1 ${
                                isMedMode
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                  : "text-blue-700 bg-blue-50 border-blue-200"
                              }`}
                            >
                              <span>Select</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlink(item.id, item.name);
                            }}
                            className="px-2.5 py-1 text-xs border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition shrink-0 font-bold shadow-xs"
                            title={`Unlink "${item.name}"`}
                          >
                            Unlink
                          </button>
                        </div>
                      </li>
                    );
                  })
                )
              ) : (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  Select a root entity in Column 1.
                </li>
              )}
            </ul>
          </div>

          {/* Column 3: 2nd Hop (M2 if Medicine, D2 if Disease) */}
          <div className="w-[360px] min-w-[360px] shrink-0 flex flex-col">
            {/* Desktop alignment spacer */}
            <div className="hidden lg:block h-[54px]" />

            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    isMedMode ? "bg-blue-500" : "bg-emerald-500"
                  }`}
                />
                <span>
                  {isMedMode ? "M2: Linked Medicines" : "D2: Linked Diseases"}
                </span>
              </label>
              {firstHopItem && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                    isMedMode
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {isMedMode ? <Pill className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
                  <span>{secondHopLinks.length}</span>
                </span>
              )}
            </div>

            <ul className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y shadow-sm flex-1">
              {!selectedItem ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  Select a root in Column 1 to view {isMedMode ? "M2" : "D2"}.
                </li>
              ) : !firstHopItem ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  Select an item in Column 2 to view its connections.
                </li>
              ) : secondHopLinks.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  No connections found for "{firstHopItem.name}".
                </li>
              ) : (
                secondHopLinks.map((item) => {
                  const isSelectedM2 = item.id === secondHopSelectedId;
                  const isRootMatch = item.id === selectedId;

                  return (
                    <li
                      key={item.id}
                      onClick={() => setSecondHopSelectedId(item.id)}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between transition text-base group ${
                        isSelectedM2
                          ? isMedMode
                            ? "bg-blue-100/90 border-l-4 border-blue-600 text-blue-950 font-bold shadow-xs"
                            : "bg-emerald-100/90 border-l-4 border-emerald-600 text-emerald-950 font-bold shadow-xs"
                          : isMedMode
                          ? "hover:bg-blue-50/80 text-slate-800"
                          : "hover:bg-emerald-50/80 text-slate-800"
                      }`}
                      title={`Click to view ${isMedMode ? "D2" : "M2"} for "${item.name}"`}
                    >
                      <div className="flex items-center gap-2 mr-2">
                        {isMedMode ? (
                          <Pill
                            className={`w-4 h-4 shrink-0 ${
                              isSelectedM2 ? "text-blue-700" : "text-blue-500"
                            }`}
                          />
                        ) : (
                          <Stethoscope
                            className={`w-4 h-4 shrink-0 ${
                              isSelectedM2 ? "text-emerald-700" : "text-emerald-500"
                            }`}
                          />
                        )}
                        <span className="break-words font-medium">{item.name}</span>
                        {isRootMatch && (
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-normal shrink-0">
                            Root {isMedMode ? "M1" : "D1"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelectedM2 ? (
                          <span
                            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isMedMode ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
                            }`}
                          >
                            <span>{isMedMode ? "M2" : "D2"}</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        ) : (
                          <span
                            className={`hidden group-hover:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-md border items-center gap-1 transition ${
                              isMedMode
                                ? "text-blue-700 bg-blue-50 border-blue-200"
                                : "text-emerald-700 bg-emerald-50 border-emerald-200"
                            }`}
                          >
                            <span>View {isMedMode ? "D2" : "M2"}</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Column 4: 3rd Hop (D2 if Medicine, M2 if Disease) - Interactive */}
          <div className="w-[360px] min-w-[360px] shrink-0 flex flex-col">
            {/* Desktop alignment spacer */}
            <div className="hidden lg:block h-[54px]" />

            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    isMedMode ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                />
                <span>
                  {isMedMode ? "D2: Linked Diseases" : "M2: Linked Medicines"}
                </span>
              </label>
              {secondHopItem && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                    isMedMode
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-blue-100 text-blue-800 border-blue-200"
                  }`}
                >
                  {isMedMode ? <Stethoscope className="w-3 h-3" /> : <Pill className="w-3 h-3" />}
                  <span>{thirdHopLinks.length}</span>
                </span>
              )}
            </div>

            <ul className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y shadow-sm flex-1">
              {!selectedItem ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  Select a root in Column 1 to view {isMedMode ? "D2" : "M2"}.
                </li>
              ) : !secondHopItem ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  Select an item in Column 3 to view its {isMedMode ? "D2" : "M2"} connections.
                </li>
              ) : thirdHopLinks.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  No connections found for "{secondHopItem.name}".
                </li>
              ) : (
                thirdHopLinks.map((item) => {
                  const isSelectedD2 = item.id === thirdHopSelectedId;
                  const isD1Match = item.id === firstHopSelectedId;

                  return (
                    <li
                      key={item.id}
                      onClick={() => setThirdHopSelectedId(item.id)}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between transition text-base group ${
                        isSelectedD2
                          ? isMedMode
                            ? "bg-emerald-100/90 border-l-4 border-emerald-600 text-emerald-950 font-bold shadow-xs"
                            : "bg-blue-100/90 border-l-4 border-blue-600 text-blue-950 font-bold shadow-xs"
                          : isMedMode
                          ? "hover:bg-emerald-50/80 text-slate-800"
                          : "hover:bg-blue-50/80 text-slate-800"
                      }`}
                      title={`Click to view ${isMedMode ? "M3" : "D3"} for "${item.name}"`}
                    >
                      <div className="flex items-center gap-2 mr-2">
                        {isMedMode ? (
                          <Stethoscope
                            className={`w-4 h-4 shrink-0 ${
                              isSelectedD2 ? "text-emerald-700" : "text-emerald-500"
                            }`}
                          />
                        ) : (
                          <Pill
                            className={`w-4 h-4 shrink-0 ${
                              isSelectedD2 ? "text-blue-700" : "text-blue-500"
                            }`}
                          />
                        )}
                        <span className="break-words font-medium">{item.name}</span>
                        {isD1Match && (
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-normal shrink-0">
                            Matches {isMedMode ? "D1" : "M1"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelectedD2 ? (
                          <span
                            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isMedMode ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
                            }`}
                          >
                            <span>{isMedMode ? "D2" : "M2"}</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        ) : (
                          <span
                            className={`hidden group-hover:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-md border items-center gap-1 transition ${
                              isMedMode
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : "text-blue-700 bg-blue-50 border-blue-200"
                            }`}
                          >
                            <span>View {isMedMode ? "M3" : "D3"}</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Column 5: 4th Hop (M3 if Medicine, D3 if Disease) - Display Only */}
          <div className="w-[360px] min-w-[360px] shrink-0 flex flex-col">
            {/* Desktop alignment spacer */}
            <div className="hidden lg:block h-[54px]" />

            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    isMedMode ? "bg-blue-500" : "bg-emerald-500"
                  }`}
                />
                <span>
                  {isMedMode ? "M3: Linked Medicines" : "D3: Linked Diseases"}
                </span>
              </label>
              {thirdHopItem && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                    isMedMode
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {isMedMode ? <Pill className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
                  <span>{fourthHopLinks.length}</span>
                </span>
              )}
            </div>

            <ul className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y shadow-sm flex-1">
              {!selectedItem ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  Select a root in Column 1 to view {isMedMode ? "M3" : "D3"}.
                </li>
              ) : !thirdHopItem ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  Select an item in Column 4 to view its {isMedMode ? "M3" : "D3"} connections.
                </li>
              ) : fourthHopLinks.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  No connections found for "{thirdHopItem.name}".
                </li>
              ) : (
                fourthHopLinks.map((item) => {
                  const isRootMatch = item.id === selectedId;
                  const isM2Match = item.id === secondHopSelectedId;

                  return (
                    <li
                      key={item.id}
                      className={`px-4 py-3 flex items-center justify-between text-base select-none ${
                        isMedMode
                          ? "bg-blue-50/50 hover:bg-blue-50 text-slate-800"
                          : "bg-emerald-50/50 hover:bg-emerald-50 text-slate-800"
                      }`}
                      title={
                        isRootMatch
                          ? `Matches Root ${isMedMode ? "M1" : "D1"}: "${item.name}"`
                          : isM2Match
                          ? `Matches ${isMedMode ? "M2" : "D2"}: "${item.name}"`
                          : `Connection for "${thirdHopItem.name}"`
                      }
                    >
                      <div className="flex items-center gap-2 mr-2">
                        {isMedMode ? (
                          <Pill className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span className="break-words font-medium">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isRootMatch ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isMedMode
                                ? "bg-blue-200 text-blue-900"
                                : "bg-emerald-200 text-emerald-900"
                            }`}
                          >
                            Matches {isMedMode ? "M1" : "D1"}
                          </span>
                        ) : isM2Match ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isMedMode
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            Matches {isMedMode ? "M2" : "D2"}
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              isMedMode
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {isMedMode ? "M3" : "D3"}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </div>
      </Card>
    </div>
  );
}
