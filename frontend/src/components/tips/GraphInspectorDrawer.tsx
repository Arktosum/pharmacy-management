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
} from "../../api/tipsApi";
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
    const confirmMsg = `⚠�E�EARE YOU SURE?\n\nDo you want to permanently delete ${node.type} "${node.name}"?\n\nAll ${connectedItems.length} associated link(s) will also be permanently removed.`;
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
    <aside className="w-[420px] lg:w-[480px] xl:w-[520px] bg-slate-900 border-l border-slate-700/80 p-6 flex flex-col shrink-0 overflow-y-auto z-20 shadow-2xl h-full animate-in slide-in-from-right duration-200">
      {/* Top Bar with History & Close */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          {history.length > 0 && (
            <button
              onClick={onBackHistory}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
              title="Go back to previous node"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span
            className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border shadow-sm ${
              node.type === "medicine"
                ? "bg-blue-900/60 text-blue-300 border-blue-600/70"
                : "bg-emerald-900/60 text-emerald-300 border-emerald-600/70"
            }`}
          >
            {node.type}
          </span>
          {isIntersecting && (
            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/60 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Common Remedy
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800 transition"
          title="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Node Name & Inline Rename / Delete */}
      <div className="py-5 border-b border-slate-800">
        {isEditing ? (
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-400">
              Edit {node.type} Name
            </label>
            <input
              type="text"
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border-2 border-blue-500 rounded-xl text-slate-100 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />
            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={handleSaveRename}
                disabled={updatingMed || updatingIll}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Check className="w-4 h-4" /> Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-black text-slate-100 leading-snug tracking-tight break-words">
                {node.name}
              </h3>
              <p className="text-xs font-mono text-slate-400 mt-1.5 flex items-center gap-2">
                <span className="text-slate-500">ID:</span> {node.id}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              <button
                onClick={() => {
                  setEditName(node.name);
                  setIsEditing(true);
                }}
                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                title="Edit name"
              >
                <Edit2 className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={handleDeleteNode}
                disabled={deletingMed || deletingIll}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                title="Delete entity and its links"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Link Tool */}
      <div className="py-5 border-b border-slate-800">
        <label className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2.5 flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-blue-400" />
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
            className="w-full px-4 py-3 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition shadow-inner"
          />
          {isLinkDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 divide-y divide-slate-700/70">
              {availableToLink.map((target) => (
                <button
                  key={target.id}
                  onClick={() => handleCreateLink(target.id, target.name)}
                  disabled={linking}
                  className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-blue-600/25 hover:text-white flex items-center justify-between transition"
                >
                  <span className="font-semibold truncate">{target.name}</span>
                  <Plus className="w-4 h-4 text-blue-400 shrink-0" />
                </button>
              ))}
              {availableToLink.length === 0 && (
                <div className="px-4 py-3.5 text-sm text-slate-400 italic">
                  No matching items available to link.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Connected Entities List */}
      <div className="py-5 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3.5 shrink-0">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>{node.type === "medicine" ? "Treated Diseases" : "Matching Remedies"}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {connectedItems.length}
            </span>
          </h4>
        </div>

        {connectedItems.length === 0 ? (
          <div className="p-6 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
            <p className="text-sm text-slate-400 italic mb-1.5">
              No active links found.
            </p>
            <p className="text-xs text-amber-400/90 font-semibold">
              This is currently an orphan node.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5 overflow-y-auto pr-1.5 flex-1">
            {connectedItems.map((item) => (
              <li
                key={item.id}
                className="group px-4 py-3 bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between transition-all duration-150 text-sm shadow-sm"
              >
                <button
                  onClick={() =>
                    onInspectNode({
                      id: item.id,
                      name: item.name,
                      type: node.type === "medicine" ? "disease" : "medicine",
                    })
                  }
                  className="font-semibold text-slate-200 group-hover:text-blue-300 truncate text-left flex-1 mr-3 text-sm leading-snug"
                  title="Click to inspect this connected node"
                >
                  {item.name}
                </button>
                <button
                  onClick={() => handleUnlink(item.id, item.name)}
                  disabled={unlinking}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition opacity-70 group-hover:opacity-100"
                  title="Unlink"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
