// SearchLinker.tsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Card from "./Card";
import {
  useGetMedicinesQuery,
  useGetDiseasesQuery,
  useGetLinksQuery,
  useLazySearchQuery,
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

  const [triggerSearch, { data: searchRes, isFetching: searching }] =
    useLazySearchQuery();

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

  useEffect(() => {
    if (debouncedQ) triggerSearch({ type, q: debouncedQ });
  }, [debouncedQ, type, triggerSearch]);

  const matches = searchRes?.matches ?? [];
  const related = searchRes?.related ?? [];

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return (
      (type === "medicine"
        ? meds.find((m) => m.id === selectedId)
        : ills.find((i) => i.id === selectedId)) || null
    );
  }, [selectedId, meds, ills, type]);

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
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditingName(null);
  };

  const handleUnlink = async (targetId: string) => {
    if (!selectedId) return;
    const medicineId = type === "medicine" ? selectedId : targetId;
    const diseaseId = type === "disease" ? selectedId : targetId;
    try {
      await unlinkM({ medicineId, diseaseId }).unwrap();
      toast.success("Unlinked");
      refetchLinks();
    } catch (e) {
      toast.error("Unlink failed");
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const confirmMsg = `Delete ${type} "${selectedItem.name}"?\nAll its links will also be deleted.`;
    if (!confirm(confirmMsg)) return;
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
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-5  mb-4">
        <h3 className="text-lg font-semibold">Search & Manage Links</h3>
        <div className="flex items-center gap-2">
          <div
            onClick={() => {
              setType("medicine");
              setSelectedId(null);
              setQuery("");
            }}
            className={`text-xl ${
              type == "medicine" ? "bg-green-300" : "bg-gray-300"
            } px-5 py-2 rounded-xl cursor-pointer`}
          >
            Medicine
          </div>
          <div
            onClick={() => {
              setType("disease");
              setSelectedId(null);
              setQuery("");
            }}
            className={`text-xl ${
              type == "disease" ? "bg-green-300" : "bg-gray-300"
            } px-5 py-2 rounded-xl cursor-pointer`}
          >
            Disease
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Left: search */}
        <div className="md:col-span-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${type}...`}
            className="w-full px-3 py-2 border rounded focus:ring focus:ring-blue-200 bg-[#fbffd3]"
          />
          <ul className="mt-2 max-h-48 overflow-auto border rounded bg-white divide-y">
            {matches.map((m) => (
              <li
                key={m.id}
                onClick={() => handleSelect(m.id)}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                  selectedId === m.id ? "bg-blue-100 font-semibold" : ""
                }`}
              >
                {m.name}
              </li>
            ))}
            {matches.length === 0 && debouncedQ && !searching && (
              <li className="px-3 py-2 text-gray-500">No matches</li>
            )}
          </ul>

          {/* Related list (preserved) */}
          {related.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium">Related</div>
              <ul className="mt-1 border rounded bg-white divide-y max-h-40 overflow-auto">
                {related.map((r) => (
                  <li
                    key={r.id}
                    onClick={() => handleSelect(r.id)}
                    className="px-3 py-2 cursor-pointer hover:bg-green-50"
                  >
                    {r.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Middle: selected + edit/delete */}
        <div className="md:col-span-1">
          {selectedItem ? (
            <>
              <div className="flex items-center justify-between">
                <div className="font-semibold">{selectedItem.name}</div>
                {!editing && (
                  <div className="flex gap-2">
                    <button
                      onClick={startEdit}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-3 py-1 text-sm border rounded text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              {editing && (
                <div className="mt-3">
                  <input
                    value={editingName ?? ""}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-[#faf1da]"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveName}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500">
              Select an item from search
            </div>
          )}
        </div>

        {/* Right: linked items */}
        <div className="md:col-span-1">
          <div className="text-sm font-medium mb-2">Linked</div>
          <ul className="max-h-80 overflow-auto border rounded bg-white divide-y">
            {selectedLinks.length === 0 && (
              <li className="px-3 py-3 text-gray-500">No links</li>
            )}
            {selectedLinks.map((item) => (
              <li
                key={item.id}
                className="px-3 py-2 flex items-center justify-between"
              >
                <div>{item.name}</div>
                <button
                  onClick={() => handleUnlink(item.id)}
                  className="px-2 py-1 text-sm border rounded hover:bg-red-50"
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
