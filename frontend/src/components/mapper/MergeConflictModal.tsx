import { useState, useMemo } from "react";
import {
  GitMerge,
  ArrowRight,
  Trash2,
  Pill,
  Stethoscope,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetLinksQuery,
  useUpdateMedicineMutation,
  useUpdateDiseaseMutation,
  useLinkMutation,
  useDeleteMedicineMutation,
  useDeleteDiseaseMutation,
} from "../../api/api";
import { SimilarGroup } from "../../utils/similarityAudit";

interface MergeConflictModalProps {
  group: SimilarGroup | null;
  onClose: () => void;
  onSuccess: (survivorName: string) => void;
}

export default function MergeConflictModal({
  group,
  onClose,
  onSuccess,
}: MergeConflictModalProps): JSX.Element | null {
  if (!group) return null;

  const isMed = group.entityType === "medicine";
  const { data: allLinks = [] } = useGetLinksQuery();

  const [updateMed] = useUpdateMedicineMutation();
  const [updateIll] = useUpdateDiseaseMutation();
  const [createLink] = useLinkMutation();
  const [deleteMed] = useDeleteMedicineMutation();
  const [deleteIll] = useDeleteDiseaseMutation();

  const [selectedSurvivorId, setSelectedSurvivorId] = useState<string>(
    group.members[0].id
  );
  const [customName, setCustomName] = useState<string>(group.members[0].name);
  const [isMerging, setIsMerging] = useState(false);

  // When user picks a different canonical survivor, update the default name
  const handleSelectSurvivor = (id: string, name: string) => {
    setSelectedSurvivorId(id);
    setCustomName(name);
  };

  const survivorMember = useMemo(
    () => group.members.find((m) => m.id === selectedSurvivorId) || group.members[0],
    [group.members, selectedSurvivorId]
  );

  const victimMembers = useMemo(
    () => group.members.filter((m) => m.id !== selectedSurvivorId),
    [group.members, selectedSurvivorId]
  );

  // Calculate links transfer
  const { newOppositeIdsToLink, duplicateLinksSkippedCount } = useMemo(() => {
    // Collect opposite entity IDs already connected to the survivor
    const survivorOppositeIds = new Set<string>();
    for (const l of allLinks) {
      if (isMed && l.medicineId === selectedSurvivorId) {
        survivorOppositeIds.add(l.diseaseId);
      } else if (!isMed && l.diseaseId === selectedSurvivorId) {
        survivorOppositeIds.add(l.medicineId);
      }
    }

    const newOpposites = new Set<string>();
    let duplicateCount = 0;

    for (const victim of victimMembers) {
      for (const l of allLinks) {
        const victimOppositeId = isMed
          ? l.medicineId === victim.id
            ? l.diseaseId
            : null
          : l.diseaseId === victim.id
          ? l.medicineId
          : null;

        if (victimOppositeId) {
          if (
            survivorOppositeIds.has(victimOppositeId) ||
            newOpposites.has(victimOppositeId)
          ) {
            duplicateCount++;
          } else {
            newOpposites.add(victimOppositeId);
          }
        }
      }
    }

    return {
      newOppositeIdsToLink: Array.from(newOpposites),
      duplicateLinksSkippedCount: duplicateCount,
    };
  }, [allLinks, isMed, selectedSurvivorId, victimMembers]);

  const handleExecuteMerge = async () => {
    const finalName = customName.trim();
    if (!finalName) {
      toast.error("Please enter a valid entity name.");
      return;
    }

    const confirmed = window.confirm(
      `⚠️ ARE YOU SURE?\n\n` +
        `This will permanently merge ${victimMembers.length} entities into "${finalName}":\n` +
        `• ${newOppositeIdsToLink.length} new links will be transferred to "${finalName}".\n` +
        `• ${duplicateLinksSkippedCount} duplicate links will be safely bypassed.\n` +
        `• ${victimMembers.length} duplicate entities (${victimMembers.map((m) => m.name).join(", ")}) will be PERMANENTLY DELETED.\n\n` +
        `This action cannot be undone. Proceed?`
    );

    if (!confirmed) return;

    setIsMerging(true);
    try {
      // 1. If name was modified, update survivor
      if (finalName !== survivorMember.name) {
        if (isMed) {
          await updateMed({ id: selectedSurvivorId, name: finalName }).unwrap();
        } else {
          await updateIll({ id: selectedSurvivorId, name: finalName }).unwrap();
        }
      }

      // 2. Transfer new links to survivor
      for (const oppId of newOppositeIdsToLink) {
        if (isMed) {
          await createLink({
            medicineId: selectedSurvivorId,
            diseaseId: oppId,
          }).unwrap();
        } else {
          await createLink({
            medicineId: oppId,
            diseaseId: selectedSurvivorId,
          }).unwrap();
        }
      }

      // 3. Delete victim nodes (backend automatically deletes associated links)
      for (const victim of victimMembers) {
        if (isMed) {
          await deleteMed(victim.id).unwrap();
        } else {
          await deleteIll(victim.id).unwrap();
        }
      }

      toast.success(
        `Successfully merged ${group.members.length} items into "${finalName}"! Conflict resolved.`
      );
      onSuccess(finalName);
      onClose();
    } catch (err: any) {
      console.error("Merge failed:", err);
      toast.error(
        err?.data?.error || err?.message || "Failed to complete merge operation."
      );
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Merge & Resolve Duplicate Group</span>
                <span
                  className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isMed
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {isMed ? <Pill className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
                  <span>{isMed ? "Medicine" : "Disease"}</span>
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Consolidate {group.members.length} variants into a single canonical entity.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Section 1: Choose Canonical Entity */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              1. Select Entity to Keep as Primary
            </label>
            <div className="space-y-2">
              {group.members.map((member, idx) => {
                const isSelected = member.id === selectedSurvivorId;
                return (
                  <div
                    key={member.id}
                    onClick={() => handleSelectSurvivor(member.id, member.name)}
                    className={`cursor-pointer p-3.5 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-600/15 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "border-blue-400 bg-blue-600"
                            : "border-slate-600 bg-transparent"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate flex items-center gap-2">
                          <span>{member.name}</span>
                          {idx === 0 && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700 font-normal">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ID: {member.id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {member.linkCount} {member.linkCount === 1 ? "link" : "links"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Final Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              2. Final Name for Merged Entity
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Oxalic Acid 3x"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              You can edit or format the final name before merging (e.g., proper capitalization or fixing typos).
            </p>
          </div>

          {/* Section 3: Merge Preview Details */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>3. Resolution Impact Preview</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-lg">
                <span className="text-slate-400 block">Connections Transferred:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  +{newOppositeIdsToLink.length} new
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-lg">
                <span className="text-slate-400 block">Duplicates Skipped:</span>
                <span className="font-bold text-slate-300 text-sm">
                  {duplicateLinksSkippedCount} bypassed
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-lg">
                <span className="text-slate-400 block">Obsolete Nodes Deleted:</span>
                <span className="font-bold text-rose-400 text-sm">
                  {victimMembers.length} nodes
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-800/60 pt-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-rose-300 font-medium">
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Will permanently delete:{" "}
                  <strong>{victimMembers.map((m) => `"${m.name}"`).join(", ")}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Will preserve and consolidate under:{" "}
                  <strong>"{customName.trim() || survivorMember.name}"</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteMerge}
            disabled={isMerging || !customName.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMerging ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Merging & Cleaning Up...</span>
              </>
            ) : (
              <>
                <GitMerge className="w-4 h-4" />
                <span>Proceed with Merge</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
