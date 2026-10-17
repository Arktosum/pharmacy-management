// SearchLinker.tsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
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

export default function SearchLinker(): JSX.Element {
  const [type, setType] = useState<"medicine" | "disease">("medicine");
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

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

  // 1st Hop: Direct opposite-type connections of the selected item
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

  // 2nd Hop: Related items of the SAME type connected through the 1st-hop links
  // If Medicine selected: other medicines that treat ANY of the same diseases (ranked by shared count)
  // If Disease selected: other diseases that are treated by ANY of the same medicines (ranked by shared count)
  const secondHopRelated = useMemo(() => {
    if (!selectedId || selectedLinks.length === 0) return [];

    const firstHopIdSet = new Set(selectedLinks.map((item) => item.id));

    if (type === "medicine") {
      const sharedCountMap = new Map<string, number>();
      for (const l of links) {
        if (firstHopIdSet.has(l.diseaseId) && l.medicineId !== selectedId) {
          sharedCountMap.set(
            l.medicineId,
            (sharedCountMap.get(l.medicineId) || 0) + 1
          );
        }
      }

      return Array.from(sharedCountMap.entries())
        .map(([medId, sharedCount]) => {
          const med = meds.find((m) => m.id === medId);
          return med ? { ...med, sharedCount } : null;
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            b!.sharedCount - a!.sharedCount || a!.name.localeCompare(b!.name)
        ) as (Medicine & { sharedCount: number })[];
    } else {
      const sharedCountMap = new Map<string, number>();
      for (const l of links) {
        if (firstHopIdSet.has(l.medicineId) && l.diseaseId !== selectedId) {
          sharedCountMap.set(
            l.diseaseId,
            (sharedCountMap.get(l.diseaseId) || 0) + 1
          );
        }
      }

      return Array.from(sharedCountMap.entries())
        .map(([illId, sharedCount]) => {
          const ill = ills.find((i) => i.id === illId);
          return ill ? { ...ill, sharedCount } : null;
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            b!.sharedCount - a!.sharedCount || a!.name.localeCompare(b!.name)
        ) as (Disease & { sharedCount: number })[];
    }
  }, [selectedId, selectedLinks, links, meds, ills, type]);

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
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-5 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Search & Manage Links</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a mode to filter, manage 1° direct links, and explore 2° sibling hops.
          </p>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setType("medicine");
              setSelectedId(null);
              setQuery("");
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
              type === "medicine"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Medicines
          </button>
          <button
            type="button"
            onClick={() => {
              setType("disease");
              setSelectedId(null);
              setQuery("");
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
              type === "disease"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Diseases
          </button>
        </div>
      </div>

      {/* 4-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Column 1: Search & Matches */}
        <div className="flex flex-col">
          <label className="text-sm font-bold text-slate-800 mb-1.5 flex items-center justify-between">
            <span>Filter {type === "medicine" ? "Medicines" : "Diseases"}</span>
            <span className="text-xs font-semibold text-slate-500">
              {matches.length} found
            </span>
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Type to search ${type}...`}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 bg-cyan-50/40 text-slate-900 text-sm placeholder-slate-400"
          />
          <ul className="mt-2 max-h-80 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y shadow-sm flex-1">
            {matches.map((m) => (
              <li
                key={m.id}
                onClick={() => handleSelect(m.id)}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm transition flex items-center justify-between ${
                  selectedId === m.id
                    ? "bg-blue-100 font-bold text-blue-900"
                    : "text-slate-800"
                }`}
              >
                <span className="truncate">{m.name}</span>
                {selectedId === m.id && (
                  <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">
                    Selected
                  </span>
                )}
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-slate-400 italic">
                No matching {type}s found.
              </li>
            )}
          </ul>
        </div>

        {/* Column 2: Selected Item & Edit/Delete */}
        <div className="flex flex-col">
          <label className="text-sm font-bold text-slate-800 mb-1.5">
            Selected {type === "medicine" ? "Medicine" : "Disease"}
          </label>
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/90 shadow-sm flex-1 flex flex-col justify-between min-h-[220px]">
            {selectedItem ? (
              <div>
                {!editing ? (
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-900 leading-snug break-words">
                      {selectedItem.name}
                    </h4>
                    <p className="text-xs font-mono text-slate-500 mt-1">
                      ID: {selectedItem.id}
                    </p>

                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={startEdit}
                        className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white hover:bg-slate-100 text-slate-700 transition shadow-sm"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-3 py-1.5 text-xs font-bold border border-rose-200 rounded-lg bg-white hover:bg-rose-50 text-rose-600 transition shadow-sm"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-200 text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">1° Direct Links:</span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                          {selectedLinks.length} {type === "medicine" ? "diseases" : "medicines"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">2° Related {type === "medicine" ? "Meds" : "Diseases"}:</span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                          {secondHopRelated.length}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Rename {type}:
                    </label>
                    <input
                      autoFocus
                      value={editingName ?? ""}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-blue-500 rounded-lg bg-white text-sm font-semibold text-slate-900 focus:outline-none shadow-inner"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={saveName}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic flex items-center justify-center flex-1 text-center p-4">
                Select an item from the list to inspect, edit, or manage its connections.
              </div>
            )}
          </div>
        </div>

        {/* Column 3: 1st Hop (Direct Links) */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>1st Hop: Linked {type === "medicine" ? "Diseases" : "Medicines"}</span>
            </label>
            {selectedItem && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {selectedLinks.length}
              </span>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y shadow-sm flex-1">
            {selectedItem ? (
              selectedLinks.length === 0 ? (
                <li className="px-3 py-8 text-center text-xs text-slate-400 italic">
                  No 1st-degree links found (orphan node).
                </li>
              ) : (
                selectedLinks.map((item) => (
                  <li
                    key={item.id}
                    className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition text-sm"
                  >
                    <div className="font-semibold text-slate-800 truncate mr-2">
                      {item.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlink(item.id, item.name)}
                      className="px-2 py-1 text-xs border border-rose-200 text-rose-600 rounded hover:bg-rose-50 transition shrink-0 font-medium"
                      title="Unlink"
                    >
                      Unlink
                    </button>
                  </li>
                ))
              )
            ) : (
              <li className="px-3 py-8 text-center text-xs text-slate-400 italic">
                Select an item to view its 1st-degree links.
              </li>
            )}
          </ul>
        </div>

        {/* Column 4: 2nd Hop (Related Sibling Hops) */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>2nd Hop: Related {type === "medicine" ? "Medicines" : "Diseases"}</span>
            </label>
            {selectedItem && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {secondHopRelated.length}
              </span>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y shadow-sm flex-1">
            {selectedItem ? (
              secondHopRelated.length === 0 ? (
                <li className="px-3 py-8 text-center text-xs text-slate-400 italic">
                  No 2nd-hop related {type === "medicine" ? "medicines" : "diseases"} found.
                </li>
              ) : (
                secondHopRelated.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className="px-3 py-2.5 cursor-pointer hover:bg-amber-50/80 flex items-center justify-between transition text-sm group"
                    title={`Click to inspect ${item.name}`}
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-amber-950 truncate mr-2">
                      {item.name}
                    </span>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-md shrink-0">
                      {item.sharedCount} shared
                    </span>
                  </li>
                ))
              )
            ) : (
              <li className="px-3 py-8 text-center text-xs text-slate-400 italic">
                Select an item to view its 2nd-hop related {type}s.
              </li>
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
}
