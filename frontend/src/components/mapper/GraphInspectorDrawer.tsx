import { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  Edit2,
  Trash2,
  Check,
  Link as LinkIcon,
  Unlink,
  ArrowLeft,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useUpdateMedicineMutation,
  useUpdateDiseaseMutation,
  useDeleteMedicineMutation,
  useDeleteDiseaseMutation,
  useLinkMutation,
  useUnlinkMutation,
} from "../../api/api";
import { Medicine, Disease, Link } from "../../types";

export interface InspectedNode {
  id: string;
  name: string;
  type: "medicine" | "disease";
}

interface GraphInspectorDrawerProps {
  node: InspectedNode | null;
  onClose: () => void;
  onInspectNode: (node: InspectedNode) => void;
  medicines: Medicine[];
  diseases: Disease[];
  links: Link[];
  history: InspectedNode[];
  onBackHistory: () => void;
  intersectingMedicineIds?: Set<string>;
}

export default function GraphInspectorDrawer({
  node,
  onClose,
  onInspectNode,
  medicines,
  diseases,
  links,
  history,
  onBackHistory,
  intersectingMedicineIds = new Set(),
}: GraphInspectorDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [searchLink, setSearchLink] = useState("");
  const [isLinkDropdownOpen, setIsLinkDropdownOpen] = useState(false);
  const linkContainerRef = useRef<HTMLDivElement>(null);

  const [updateMedicine, { isLoading: updatingMed }] = useUpdateMedicineMutation();
  const [updateDisease, { isLoading: updatingIll }] = useUpdateDiseaseMutation();
  const [deleteMedicine, { isLoading: deletingMed }] = useDeleteMedicineMutation();
  const [deleteDisease, { isLoading: deletingIll }] = useDeleteDiseaseMutation();
  const [linkEntities, { isLoading: linking }] = useLinkMutation();
  const [unlinkEntities, { isLoading: unlinking }] = useUnlinkMutation();

  // Reset local edit state when active node changes
  useEffect(() => {
    if (node) {
      setEditName(node.name);
      setIsEditing(false);
      setSearchLink("");
      setIsLinkDropdownOpen(false);
    }
  }, [node]);

  // Click outside to close link dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        linkContainerRef.current &&
        !linkContainerRef.current.contains(event.target as Node)
      ) {
        setIsLinkDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute connected neighbor entities
  const connectedItems = useMemo(() => {
    if (!node) return [];
    if (node.type === "medicine") {
      const relatedLinks = links.filter((l) => l.medicineId === node.id);
      return relatedLinks
        .map((l) => diseases.find((d) => d.id === l.diseaseId))
        .filter(Boolean) as Disease[];
    } else {
      const relatedLinks = links.filter((l) => l.diseaseId === node.id);
      return relatedLinks
        .map((l) => medicines.find((m) => m.id === l.medicineId))
        .filter(Boolean) as Medicine[];
    }
  }, [node, links, medicines, diseases]);

  // Compute available items to link with (excluding already connected)
  const connectedIdSet = useMemo(
    () => new Set(connectedItems.map((c) => c.id)),
    [connectedItems]
  );

  const availableToLink = useMemo(() => {
    if (!node) return [];
    const pool = node.type === "medicine" ? diseases : medicines;
    const filtered = pool.filter((item) => !connectedIdSet.has(item.id));
    if (!searchLink.trim()) return filtered.slice(0, 10);
    const lower = searchLink.toLowerCase();
    return filtered
      .filter((item) => item.name.toLowerCase().includes(lower))
      .slice(0, 10);
  }, [node, diseases, medicines, connectedIdSet, searchLink]);

  if (!node) return null;

  const isIntersecting = node.type === "medicine" && intersectingMedicineIds.has(node.id);

  // Handle Save Rename with "Are you sure?" confirmation prompt
  const handleSaveRename = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === node.name) {
      setIsEditing(false);
      return;
    }

    const confirmRename = window.confirm(
      `Are you sure you want to rename ${node.type} "${node.name}" to "${trimmed}"?`
    );
    if (!confirmRename) return;

    try {
      if (node.type === "medicine") {
        await updateMedicine({ id: node.id, name: trimmed }).unwrap();
      } else {
        await updateDisease({ id: node.id, name: trimmed }).unwrap();
      }
      toast.success("Name updated successfully!");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update name");
    }
  };

  // Handle Delete Node with "Are you sure?" confirmation prompt
  const handleDeleteNode = async () => {
    const confirmMsg = `⚠️ ARE YOU SURE?\n\nDo you want to permanently delete ${node.type} "${node.name}"?\n\nAll ${connectedItems.length} associated link(s) will also be permanently removed.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      if (node.type === "medicine") {
        await deleteMedicine(node.id).unwrap();
      } else {
        await deleteDisease(node.id).unwrap();
      }
      toast.success(`${node.type} "${node.name}" deleted with associated links`);
      onClose();
    } catch {
      toast.error(`Failed to delete ${node.type}`);
    }
  };

  // Handle Create Link
  const handleCreateLink = async (targetId: string, targetName: string) => {
    if (!node) return;
    const medicineId = node.type === "medicine" ? node.id : targetId;
    const diseaseId = node.type === "disease" ? node.id : targetId;

    try {
      await linkEntities({ medicineId, diseaseId }).unwrap();
      toast.success(`Linked "${node.name}" with "${targetName}"`);
      setSearchLink("");
      setIsLinkDropdownOpen(false);
    } catch {
      toast.error("Failed to create link");
    }
  };

  // Handle Unlink with "Are you sure?" confirmation prompt
  const handleUnlink = async (targetId: string, targetName: string) => {
    if (!node) return;
    const confirmUnlink = window.confirm(
      `Are you sure you want to unlink "${node.name}" from "${targetName}"?`
    );
    if (!confirmUnlink) return;

    const medicineId = node.type === "medicine" ? node.id : targetId;
    const diseaseId = node.type === "disease" ? node.id : targetId;

    try {
      await unlinkEntities({ medicineId, diseaseId }).unwrap();
      toast.success(`Unlinked "${node.name}" from "${targetName}"`);
    } catch {
      toast.error("Failed to remove link");
    }
  };

  return (
    <aside className="w-84 bg-slate-900 border-l border-slate-700 p-5 flex flex-col shrink-0 overflow-y-auto z-20 shadow-2xl h-full animate-in slide-in-from-right duration-200">
      {/* Top Bar with History & Close */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={onBackHistory}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
              title="Go back to previous node"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span
            className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${
              node.type === "medicine"
                ? "bg-blue-900/50 text-blue-300 border-blue-700/60"
                : "bg-emerald-900/50 text-emerald-300 border-emerald-700/60"
            }`}
          >
            {node.type}
          </span>
          {isIntersecting && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Common Remedy
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Node Name & Inline Rename / Delete */}
      <div className="py-4 border-b border-slate-800">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-blue-500 rounded text-slate-100 text-sm focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveRename}
                disabled={updatingMed || updatingIll}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-100 leading-snug">
                {node.name}
              </h3>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                ID: {node.id}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  setEditName(node.name);
                  setIsEditing(true);
                }}
                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition"
                title="Edit name"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDeleteNode}
                disabled={deletingMed || deletingIll}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                title="Delete entity and its links"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Link Tool */}
      <div className="py-4 border-b border-slate-800">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
          Link with {node.type === "medicine" ? "Disease" : "Medicine"}
        </label>
        <div className="relative" ref={linkContainerRef}>
          <input
            type="text"
            value={searchLink}
            onChange={(e) => {
              setSearchLink(e.target.value);
              setIsLinkDropdownOpen(true);
            }}
            onFocus={() => setIsLinkDropdownOpen(true)}
            placeholder={`Search ${node.type === "medicine" ? "disease" : "medicine"} to link...`}
            className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          {isLinkDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-md shadow-xl z-30 divide-y divide-slate-700">
              {availableToLink.map((target) => (
                <button
                  key={target.id}
                  onClick={() => handleCreateLink(target.id, target.name)}
                  disabled={linking}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-blue-600/20 hover:text-blue-200 flex items-center justify-between transition"
                >
                  <span className="font-medium truncate">{target.name}</span>
                  <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              ))}
              {availableToLink.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-500 italic">
                  No matching items available to link.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Connected Entities List */}
      <div className="py-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {node.type === "medicine" ? "Treated Diseases" : "Matching Remedies"} (
            {connectedItems.length})
          </h4>
        </div>

        {connectedItems.length === 0 ? (
          <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 text-center">
            <p className="text-xs text-slate-500 italic mb-1">
              No active links found.
            </p>
            <p className="text-[11px] text-amber-500/80 font-medium">
              This is currently an orphan node.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
            {connectedItems.map((item) => (
              <li
                key={item.id}
                className="group px-3 py-2 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 rounded-lg flex items-center justify-between transition text-xs"
              >
                <button
                  onClick={() =>
                    onInspectNode({
                      id: item.id,
                      name: item.name,
                      type: node.type === "medicine" ? "disease" : "medicine",
                    })
                  }
                  className="font-medium text-slate-200 hover:text-blue-400 truncate text-left flex-1 mr-2"
                  title="Click to inspect"
                >
                  {item.name}
                </button>
                <button
                  onClick={() => handleUnlink(item.id, item.name)}
                  disabled={unlinking}
                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition opacity-70 group-hover:opacity-100"
                  title="Unlink"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
