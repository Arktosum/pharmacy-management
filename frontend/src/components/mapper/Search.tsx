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
  const [inspectedFirstHopId, setInspectedFirstHopId] = useState<string | null>(
    null
  );

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

  // Instant client-side matches for the active query
  const matches = useMemo(() => {
    const list = type === "medicine" ? meds : ills;
    if (!debouncedQ) return list;
    const lower = debouncedQ.toLowerCase();
    return list.filter((item) => item.name.toLowerCase().includes(lower));
  }, [type, meds, ills, debouncedQ]);

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return (
      (type === "medicine"
        ? meds.find((m) => m.id === selectedId)
        : ills.find((i) => i.id === selectedId)) || null
    );
  }, [selectedId, meds, ills, type]);

  // 1st Hop: Direct opposite-type connections of the selected root item
  const selectedLinks = useMemo(() => {
    if (!selectedId) return [];
    if (type === "medicine") {
      return links
        .filter((l) => l.medicineId === selectedId)
        .map((l) => ills.find((i) => i.id === l.diseaseId))
        .filter(Boolean) as Disease[];
    } else {
      return links
        .filter((l) => l.diseaseId === selectedId)
        .map((l) => meds.find((m) => m.id === l.medicineId))
        .filter(Boolean) as Medicine[];
    }
  }, [selectedId, links, meds, ills, type]);

  // Whenever selectedLinks changes, keep the inspected item if valid, else default to first item
  useEffect(() => {
    if (selectedLinks.length > 0) {
      setInspectedFirstHopId((prev) => {
        if (prev && selectedLinks.some((item) => item.id === prev)) {
          return prev;
        }
        return selectedLinks[0].id;
      });
    } else {
      setInspectedFirstHopId(null);
    }
  }, [selectedLinks]);

  // The inspected first-hop item object (opposite entity type)
  const inspectedFirstHopItem = useMemo(() => {
    if (!inspectedFirstHopId) return null;
    return (
      (type === "medicine"
        ? ills.find((i) => i.id === inspectedFirstHopId)
        : meds.find((m) => m.id === inspectedFirstHopId)) || null
    );
  }, [inspectedFirstHopId, type, meds, ills]);

  // Corresponding 1st Hop of the clicked entity in Column 3 (displayed in Column 4)
  const inspectedFirstHopLinks = useMemo(() => {
    if (!inspectedFirstHopId) return [];
    if (type === "medicine") {
      // Root is medicine -> clicked 1st hop item is disease -> its 1st hop is medicines!
      return links
        .filter((l) => l.diseaseId === inspectedFirstHopId)
        .map((l) => meds.find((m) => m.id === l.medicineId))
        .filter(Boolean) as Medicine[];
    } else {
      // Root is disease -> clicked 1st hop item is medicine -> its 1st hop is diseases!
      return links
        .filter((l) => l.medicineId === inspectedFirstHopId)
        .map((l) => ills.find((i) => i.id === l.diseaseId))
        .filter(Boolean) as Disease[];
    }
  }, [inspectedFirstHopId, links, meds, ills, type]);

  const handleSelect = (id: string) => {
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

  return (
    <div id="search-manage-section" className="scroll-mt-6">
      <Card>
        {/* Header */}
        <div className="mb-5 pb-3 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Search & Manage Links
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Filter entities, manage 1° direct links, and click any connected item to view its corresponding 1° links.
              </p>
            </div>
            {selectedItem && (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border shadow-sm ${
                    type === "medicine"
                      ? "bg-blue-50 text-blue-800 border-blue-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {type === "medicine" ? (
                    <Pill className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>Inspecting {type}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 4-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Column 1: Search & Matches */}
          <div className="flex flex-col">
            {/* Selector for Medicines / Diseases: above filter text & below hr */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300 mb-3.5 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setType("medicine");
                  setSelectedId(null);
                  setQuery("");
                }}
                className={`flex-1 py-2 rounded-lg font-bold text-base transition flex items-center justify-center gap-1.5 ${
                  type === "medicine"
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
                  type === "disease"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Diseases</span>
              </button>
            </div>

            <label className="text-base font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>Filter {type === "medicine" ? "Medicines" : "Diseases"}</span>
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
              {matches.map((m) => {
                const isSelected = selectedId === m.id;
                return (
                  <li
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    className={`px-4 py-2.5 cursor-pointer text-base transition flex items-center justify-between ${
                      isSelected
                        ? type === "medicine"
                          ? "bg-blue-100 font-bold text-blue-950 border-l-4 border-blue-600"
                          : "bg-emerald-100 font-bold text-emerald-950 border-l-4 border-emerald-600"
                        : "hover:bg-slate-50 text-slate-800 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {type === "medicine" ? (
                        <Pill className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        <Stethoscope className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      <span className="truncate">{m.name}</span>
                    </div>
                    {isSelected && (
                      <span
                        className={`text-xs text-white font-bold px-2 py-0.5 rounded-md ${
                          type === "medicine" ? "bg-blue-600" : "bg-emerald-600"
                        }`}
                      >
                        Selected
                      </span>
                    )}
                  </li>
                );
              })}
              {matches.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  No matching {type}s found.
                </li>
              )}
            </ul>
          </div>

          {/* Column 2: Selected Item & Edit/Delete */}
          <div className="flex flex-col">
            {/* Alignment spacer to line up labels horizontally on desktop */}
            <div className="hidden lg:block h-[54px]" />

            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <span>Selected {type === "medicine" ? "Medicine" : "Disease"}</span>
              </label>
              {selectedItem && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${
                    type === "medicine"
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {type}
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/90 shadow-sm flex-1 flex flex-col justify-between min-h-[240px]">
              {selectedItem ? (
                <div>
                  {!editing ? (
                    <div>
                      <div className="flex items-start gap-2">
                        {type === "medicine" ? (
                          <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                            <Pill className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-2xl font-black text-slate-900 leading-snug break-words">
                            {selectedItem.name}
                          </h4>
                          <p className="text-sm font-mono text-slate-500 mt-1">
                            ID: {selectedItem.id}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2.5 mt-4">
                        <button
                          type="button"
                          onClick={startEdit}
                          className="px-4 py-2 text-sm font-bold border border-slate-300 rounded-xl bg-white hover:bg-slate-100 text-slate-700 transition shadow-sm"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="px-4 py-2 text-sm font-bold border border-rose-200 rounded-xl bg-white hover:bg-rose-50 text-rose-600 transition shadow-sm"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-200 text-sm text-slate-600 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">1° Direct Links:</span>
                          <span
                            className={`px-2.5 py-1 rounded-lg font-bold text-sm ${
                              type === "medicine"
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                : "bg-blue-100 text-blue-900 border border-blue-200"
                            }`}
                          >
                            {selectedLinks.length} {type === "medicine" ? "diseases" : "medicines"}
                          </span>
                        </div>
                        {inspectedFirstHopItem && (
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700">Inspecting:</span>
                            <span
                              className={`px-2.5 py-1 rounded-lg font-bold text-sm truncate max-w-[150px] border ${
                                type === "medicine"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-blue-50 text-blue-800 border-blue-300"
                              }`}
                              title={inspectedFirstHopItem.name}
                            >
                              {inspectedFirstHopItem.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Rename {type}:
                      </label>
                      <input
                        autoFocus
                        value={editingName ?? ""}
                        onChange={(e) => setEditingName(e.target.value)}
                        style={{ backgroundColor: "rgb(118 213 133 / 54%)" }}
                        className="w-full px-4 py-2.5 border-2 border-emerald-500 rounded-xl text-base font-bold text-slate-900 focus:outline-none shadow-inner"
                      />
                      <div className="mt-3.5 flex gap-2.5">
                        <button
                          type="button"
                          onClick={saveName}
                          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition shadow-sm"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-base text-slate-400 italic flex items-center justify-center flex-1 text-center p-6">
                  Select an item from the list to inspect, edit, or manage its connections.
                </div>
              )}
            </div>
          </div>

          {/* Column 3: 1st Hop (Direct Links) - Clicking an item inspects its links in Column 4 */}
          <div className="flex flex-col">
            {/* Alignment spacer */}
            <div className="hidden lg:block h-[54px]" />

            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    type === "medicine" ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                />
                <span>1° Linked {type === "medicine" ? "Diseases" : "Medicines"}</span>
              </label>
              {selectedItem && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                    type === "medicine"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-blue-100 text-blue-800 border-blue-300"
                  }`}
                >
                  {type === "medicine" ? (
                    <Stethoscope className="w-3 h-3" />
                  ) : (
                    <Pill className="w-3 h-3" />
                  )}
                  <span>{selectedLinks.length}</span>
                </span>
              )}
            </div>

            <ul className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y shadow-sm flex-1">
              {selectedItem ? (
                selectedLinks.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                    No 1st-degree links found (orphan node).
                  </li>
                ) : (
                  selectedLinks.map((item) => {
                    const isInspected = item.id === inspectedFirstHopId;
                    const isMedCol = type === "disease"; // if root is disease, Column 3 contains medicines

                    return (
                      <li
                        key={item.id}
                        onClick={() => setInspectedFirstHopId(item.id)}
                        className={`px-4 py-3 cursor-pointer flex items-center justify-between transition text-base group ${
                          isInspected
                            ? isMedCol
                              ? "bg-blue-100/90 border-l-4 border-blue-600 text-blue-950 font-bold shadow-sm"
                              : "bg-emerald-100/90 border-l-4 border-emerald-600 text-emerald-950 font-bold shadow-sm"
                            : isMedCol
                            ? "hover:bg-blue-50/70 text-slate-800"
                            : "hover:bg-emerald-50/70 text-slate-800"
                        }`}
                        title={`Click to inspect 1° links for "${item.name}"`}
                      >
                        <div className="flex items-center gap-2 truncate mr-2 min-w-0">
                          {isMedCol ? (
                            <Pill
                              className={`w-4 h-4 shrink-0 ${
                                isInspected ? "text-blue-700" : "text-blue-500"
                              }`}
                            />
                          ) : (
                            <Stethoscope
                              className={`w-4 h-4 shrink-0 ${
                                isInspected ? "text-emerald-700" : "text-emerald-500"
                              }`}
                            />
                          )}
                          <span className="truncate">{item.name}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isInspected ? (
                            <span
                              className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                isMedCol
                                  ? "bg-blue-600 text-white"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              <span>Viewing</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          ) : (
                            <span
                              className={`hidden group-hover:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-md border items-center gap-1 ${
                                isMedCol
                                  ? "text-blue-700 bg-blue-50 border-blue-200"
                                  : "text-emerald-700 bg-emerald-50 border-emerald-200"
                              }`}
                            >
                              <span>Inspect</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlink(item.id, item.name);
                            }}
                            className="px-2.5 py-1 text-xs border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition shrink-0 font-bold shadow-sm"
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
                  Select an item to view its 1st-degree links.
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Corresponding 1st Hop of Clicked Item */}
          <div className="flex flex-col">
            {/* Alignment spacer */}
            <div className="hidden lg:block h-[54px]" />

            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-bold text-slate-800 flex items-center gap-2 truncate">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    type === "medicine" ? "bg-blue-500" : "bg-emerald-500"
                  }`}
                />
                <span className="truncate">
                  {inspectedFirstHopItem
                    ? `1° Links for "${inspectedFirstHopItem.name}"`
                    : `1° Links for Selected ${type === "medicine" ? "Disease" : "Medicine"}`}
                </span>
              </label>
              {inspectedFirstHopItem && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                    type === "medicine"
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {type === "medicine" ? (
                    <Pill className="w-3 h-3" />
                  ) : (
                    <Stethoscope className="w-3 h-3" />
                  )}
                  <span>{inspectedFirstHopLinks.length}</span>
                </span>
              )}
            </div>

            <ul className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y shadow-sm flex-1">
              {!selectedItem ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  Select an item in Column 1 to begin inspecting links.
                </li>
              ) : !inspectedFirstHopItem ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  No 1st-hop items available to inspect.
                </li>
              ) : inspectedFirstHopLinks.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  No links found for "{inspectedFirstHopItem.name}".
                </li>
              ) : (
                inspectedFirstHopLinks.map((item) => {
                  const isCurrentRoot = item.id === selectedId;
                  const isMedCol = type === "medicine"; // Column 4 contains medicines when root is medicine

                  return (
                    <li
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between transition text-base group ${
                        isCurrentRoot
                          ? isMedCol
                            ? "bg-blue-100/90 border-l-4 border-blue-600 text-blue-950 font-bold"
                            : "bg-emerald-100/90 border-l-4 border-emerald-600 text-emerald-950 font-bold"
                          : isMedCol
                          ? "hover:bg-blue-50/80 text-slate-800"
                          : "hover:bg-emerald-50/80 text-slate-800"
                      }`}
                      title={
                        isCurrentRoot
                          ? "Currently selected root"
                          : `Click to select "${item.name}" as the primary ${isMedCol ? "medicine" : "disease"}`
                      }
                    >
                      <div className="flex items-center gap-2 truncate mr-2 min-w-0">
                        {isMedCol ? (
                          <Pill
                            className={`w-4 h-4 shrink-0 ${
                              isCurrentRoot ? "text-blue-700" : "text-blue-500"
                            }`}
                          />
                        ) : (
                          <Stethoscope
                            className={`w-4 h-4 shrink-0 ${
                              isCurrentRoot ? "text-emerald-700" : "text-emerald-500"
                            }`}
                          />
                        )}
                        <span className="truncate">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrentRoot ? (
                          <span
                            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                              isMedCol
                                ? "bg-blue-600 text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            Current Root
                          </span>
                        ) : (
                          <span
                            className={`hidden group-hover:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-md border items-center gap-1 transition ${
                              isMedCol
                                ? "text-blue-700 bg-blue-50 border-blue-200"
                                : "text-emerald-700 bg-emerald-50 border-emerald-200"
                            }`}
                          >
                            <span>Set Root</span>
                            <ArrowRight className="w-3 h-3" />
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
      </Card>
    </div>
  );
}
