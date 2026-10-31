import { useState, useMemo } from "react";
import Card from "./Card";
import {
  GitMerge,
  Search,
  Pill,
  Stethoscope,
  X,
  Check,
  Layers,
  RotateCcw,
  Link as LinkIcon,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetMedicinesQuery,
  useGetDiseasesQuery,
  useGetLinksQuery,
  useMergeEntitiesMutation,
} from "../../api/tipsApi";
import { Medicine, Disease } from "../../types";

export default function MultiMergeTool(): JSX.Element {
  const [type, setType] = useState<"medicine" | "disease">("medicine");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntities, setSelectedEntities] = useState<
    (Medicine | Disease)[]
  >([]);
  const [survivorId, setSurvivorId] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");

  const { data: medicines = [], refetch: refetchMeds } = useGetMedicinesQuery();
  const { data: diseases = [], refetch: refetchIlls } = useGetDiseasesQuery();
  const { data: allLinks = [], refetch: refetchLinks } = useGetLinksQuery();
  const [mergeEntities, { isLoading: isMerging }] = useMergeEntitiesMutation();

  const isMed = type === "medicine";
  const currentList = isMed ? medicines : diseases;

  // Build maps of ID -> Set of linked opposite IDs
  const linkMaps = useMemo(() => {
    const medLinks = new Map<string, Set<string>>();
    const illLinks = new Map<string, Set<string>>();

    for (const l of allLinks) {
      if (!medLinks.has(l.medicineId)) medLinks.set(l.medicineId, new Set());
      medLinks.get(l.medicineId)!.add(l.diseaseId);

      if (!illLinks.has(l.diseaseId)) illLinks.set(l.diseaseId, new Set());
      illLinks.get(l.diseaseId)!.add(l.medicineId);
    }

    return { medLinks, illLinks };
  }, [allLinks]);

  const getEntityLinkCount = (id: string): number => {
    return isMed
      ? linkMaps.medLinks.get(id)?.size || 0
      : linkMaps.illLinks.get(id)?.size || 0;
  };

  // Reset staging when switching entity type
  const handleTypeChange = (newType: "medicine" | "disease") => {
    if (newType === type) return;
    if (selectedEntities.length > 0) {
      if (!window.confirm("Switching type will clear your current selections. Continue?")) {
        return;
      }
    }
    setType(newType);
    setSelectedEntities([]);
    setSurvivorId("");
    setCustomName("");
    setSearchQuery("");
  };

  // Search results capped to top 50 for speed
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentList.slice(0, 50);
    return currentList
      .filter((item) => item.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [searchQuery, currentList]);

  const selectedIdSet = useMemo(
    () => new Set(selectedEntities.map((e) => e.id)),
    [selectedEntities]
  );

  const handleSelectEntity = (item: Medicine | Disease) => {
    if (selectedIdSet.has(item.id)) return;
    const nextList = [...selectedEntities, item];
    setSelectedEntities(nextList);

    // If this is the first selection, or if it has more links, set it as default survivor
    if (!survivorId || getEntityLinkCount(item.id) > getEntityLinkCount(survivorId)) {
      setSurvivorId(item.id);
      setCustomName(item.name);
    }
  };

  const handleRemoveEntity = (id: string) => {
    const nextList = selectedEntities.filter((e) => e.id !== id);
    setSelectedEntities(nextList);

    if (survivorId === id) {
      if (nextList.length > 0) {
        // Pick node with highest link count as new survivor
        const sorted = [...nextList].sort(
          (a, b) => getEntityLinkCount(b.id) - getEntityLinkCount(a.id)
        );
        setSurvivorId(sorted[0].id);
        setCustomName(sorted[0].name);
      } else {
        setSurvivorId("");
        setCustomName("");
      }
    }
  };

  const handleSetSurvivor = (id: string, name: string) => {
    setSurvivorId(id);
    setCustomName(name);
  };

  // Merge analysis & link calculation
  const mergeAnalysis = useMemo(() => {
    if (selectedEntities.length < 2) {
      return {
        survivor: null,
        victims: [],
        totalFinalLinks: 0,
        transferredLinksCount: 0,
        overlappingLinksCount: 0,
        nodesBreakdown: [],
      };
    }

    const survivor =
      selectedEntities.find((e) => e.id === survivorId) || selectedEntities[0];
    const victims = selectedEntities.filter((e) => e.id !== survivor.id);

    const countsMap = isMed ? linkMaps.medLinks : linkMaps.illLinks;
    const survivorSet = countsMap.get(survivor.id) || new Set<string>();
    const finalSet = new Set<string>(survivorSet);

    let transferred = 0;
    let overlapping = 0;

    victims.forEach((v) => {
      const vSet = countsMap.get(v.id) || new Set<string>();
      vSet.forEach((oppId) => {
        if (finalSet.has(oppId)) {
          overlapping++;
        } else {
          finalSet.add(oppId);
          transferred++;
        }
      });
    });

    const nodesBreakdown = selectedEntities.map((e) => ({
      id: e.id,
      name: e.name,
      isSurvivor: e.id === survivor.id,
      linkCount: countsMap.get(e.id)?.size || 0,
    }));

    return {
      survivor,
      victims,
      totalFinalLinks: finalSet.size,
      transferredLinksCount: transferred,
      overlappingLinksCount: overlapping,
      nodesBreakdown,
    };
  }, [selectedEntities, survivorId, isMed, linkMaps]);

  const handleExecuteMerge = async () => {
    const finalTrimmedName = customName.trim();
    if (!finalTrimmedName) {
      toast.error("Please provide a valid final name for the merged node.");
      return;
    }

    if (selectedEntities.length < 2 || !mergeAnalysis.survivor) {
      toast.error("Select at least 2 entities to merge.");
      return;
    }

    const confirmMsg =
      `⚠️ ARE YOU SURE YOU WANT TO MERGE?\n\n` +
      `This will merge ${selectedEntities.length} ${type}s into a single node:\n` +
      `• Final Node Name: "${finalTrimmedName}"\n` +
      `• Total Final Links: ${mergeAnalysis.totalFinalLinks} unique connections\n` +
      `• Nodes to be deleted: ${mergeAnalysis.victims.map((v) => `"${v.name}"`).join(", ")}\n\n` +
      `This action updates all relationship links and cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await mergeEntities({
        type,
        survivorId: mergeAnalysis.survivor.id,
        victimIds: mergeAnalysis.victims.map((v) => v.id),
        finalName: finalTrimmedName,
      }).unwrap();

      toast.success(
        `Merged ${selectedEntities.length} ${type}s into "${finalTrimmedName}" (${res.finalLinkCount} total links)!`
      );

      // Reset staging
      setSelectedEntities([]);
      setSurvivorId("");
      setCustomName("");
      setSearchQuery("");

      refetchLinks();
      if (isMed) refetchMeds();
      else refetchIlls();
    } catch (err: any) {
      console.error("Merge error:", err);
      toast.error(err?.data?.error || err?.message || "Failed to execute merge");
    }
  };

  return (
    <Card className="w-full min-w-0 max-w-full">
      {/* Section Header */}
      <div className="mb-6 pb-4 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl border border-purple-200 shadow-xs">
              <GitMerge className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Multi-Entity Merge Tool</span>
                <span className="text-xs uppercase px-2.5 py-0.5 rounded-full font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                  Consolidator
                </span>
              </h3>
              <p className="text-sm font-semibold text-slate-500 mt-0.5">
                Search and select multiple duplicate or related entities, compare their link counts, and merge them into one canonical node.
              </p>
            </div>
          </div>

          {/* Primary Type Toggle */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-300 shadow-inner">
            <button
              type="button"
              onClick={() => handleTypeChange("medicine")}
              className={`px-5 py-2.5 rounded-lg text-base font-extrabold transition flex items-center gap-2 ${
                isMed
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Pill className="w-5 h-5" />
              <span>Medicines ({medicines.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("disease")}
              className={`px-5 py-2.5 rounded-lg text-base font-extrabold transition flex items-center gap-2 ${
                !isMed
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Stethoscope className="w-5 h-5" />
              <span>Diseases ({diseases.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Staging Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Search & Pick Entities (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Search className="w-5 h-5 text-slate-500" />
              <span>Search {isMed ? "Medicines" : "Diseases"}</span>
            </label>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Showing top {searchResults.length}
            </span>
          </div>

          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Type to search ${type}...`}
            style={{ backgroundColor: "rgb(118 213 133 / 40%)" }}
            className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-slate-900 text-lg font-bold placeholder-slate-600 shadow-sm transition"
          />

          {/* Search Dropdown / List */}
          <ul className="mt-3 max-h-[380px] overflow-y-auto border-2 border-slate-200 rounded-xl bg-white divide-y shadow-sm">
            {searchResults.map((item) => {
              const isSelected = selectedIdSet.has(item.id);
              const count = getEntityLinkCount(item.id);
              return (
                <li
                  key={item.id}
                  onClick={() => !isSelected && handleSelectEntity(item)}
                  className={`px-4 py-3.5 text-lg font-bold transition flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-75"
                      : "cursor-pointer hover:bg-purple-50 text-slate-900 hover:text-purple-950"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {isMed ? (
                      <Pill
                        className={`w-5 h-5 shrink-0 ${
                          isSelected ? "text-slate-400" : "text-blue-600"
                        }`}
                      />
                    ) : (
                      <Stethoscope
                        className={`w-5 h-5 shrink-0 ${
                          isSelected ? "text-slate-400" : "text-emerald-600"
                        }`}
                      />
                    )}
                    <span className="truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-sm font-extrabold px-2.5 py-1 rounded-lg border ${
                        count > 0
                          ? "bg-purple-50 text-purple-800 border-purple-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {count} {count === 1 ? "link" : "links"}
                    </span>
                    {isSelected ? (
                      <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Added
                      </span>
                    ) : (
                      <span className="text-xs font-black uppercase text-purple-700 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded-md hover:bg-purple-200 transition">
                        + Select
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
            {searchResults.length === 0 && (
              <li className="px-4 py-8 text-center text-base font-bold text-slate-400 italic">
                No matching {type}s found.
              </li>
            )}
          </ul>
        </div>

        {/* Column 2: Selected Entities & Merge Impact Preview (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col min-w-0 bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              <h4 className="text-lg font-black text-slate-900">
                Selected for Merge ({selectedEntities.length})
              </h4>
            </div>

            {selectedEntities.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEntities([]);
                  setSurvivorId("");
                  setCustomName("");
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
          </div>

          {/* Staged Nodes List */}
          {selectedEntities.length === 0 ? (
            <div className="py-12 px-6 text-center rounded-xl border-2 border-dashed border-slate-300 bg-white/70 flex flex-col items-center justify-center text-slate-500">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-3 border border-purple-200">
                <GitMerge className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-slate-700">
                No entities selected yet
              </p>
              <p className="text-sm font-semibold text-slate-500 mt-1 max-w-sm">
                Search from the left panel and click &quot;+ Select&quot; on 2 or more {isMed ? "medicines" : "diseases"} to configure the merge.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedEntities.map((item) => {
                  const isSurvivor = item.id === survivorId;
                  const linkCount = getEntityLinkCount(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border-2 transition flex items-center justify-between gap-3 ${
                        isSurvivor
                          ? "bg-purple-100 border-purple-500 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                        <input
                          type="radio"
                          name="survivor-node-pick"
                          checked={isSurvivor}
                          onChange={() => handleSetSurvivor(item.id, item.name)}
                          className="w-5 h-5 text-purple-600 border-slate-300 focus:ring-purple-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-slate-900 truncate">
                              {item.name}
                            </span>
                            {isSurvivor && (
                              <span className="text-xs font-black uppercase tracking-wide bg-purple-700 text-white px-2 py-0.5 rounded-md">
                                Primary Survivor
                              </span>
                            )}
                          </div>
                        </div>
                      </label>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-black px-3 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-800">
                          {linkCount} {linkCount === 1 ? "link" : "links"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEntity(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Remove from merge list"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* If fewer than 2 selected */}
              {selectedEntities.length < 2 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Select at least 1 more {type} to unlock the merge configuration.
                  </span>
                </div>
              )}

              {/* Merge Configuration & Impact Preview (Enabled when >= 2) */}
              {selectedEntities.length >= 2 && (
                <div className="mt-3 pt-4 border-t border-slate-200 flex flex-col gap-4">
                  {/* Detailed Link Count Analytics */}
                  <div className="p-4 bg-white border-2 border-purple-200 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-black text-slate-800 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-purple-600" />
                        Merge Link Calculation
                      </span>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-500 uppercase">
                          Resulting Node Links:
                        </span>
                        <span className="ml-2 text-xl font-black text-purple-700 bg-purple-50 border border-purple-300 px-3 py-0.5 rounded-lg">
                          {mergeAnalysis.totalFinalLinks} Unique Links
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-xs font-extrabold text-slate-500 uppercase">
                          Survivor Has
                        </div>
                        <div className="text-lg font-black text-slate-800">
                          {getEntityLinkCount(survivorId)} links
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                        <div className="text-xs font-extrabold text-emerald-700 uppercase">
                          + New Links Gained
                        </div>
                        <div className="text-lg font-black text-emerald-800">
                          +{mergeAnalysis.transferredLinksCount} links
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-xs font-extrabold text-blue-700 uppercase">
                          Duplicate Unified
                        </div>
                        <div className="text-lg font-black text-blue-800">
                          {mergeAnalysis.overlappingLinksCount} overlaps
                        </div>
                      </div>
                    </div>

                    {/* Breakdown of each node */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                        Individual Node Breakdown:
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {mergeAnalysis.nodesBreakdown.map((nb) => (
                          <span
                            key={nb.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold border ${
                              nb.isSurvivor
                                ? "bg-purple-100 text-purple-950 border-purple-300"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            <span className="truncate max-w-[150px]">{nb.name}</span>
                            <strong className="text-purple-700 font-black">
                              ({nb.linkCount} links)
                            </strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Renaming Field */}
                  <div>
                    <label className="block text-base font-black text-slate-900 mb-1.5">
                      Final Node Name <span className="text-slate-500 font-bold text-sm">(optional renaming)</span>
                    </label>
                    <input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Enter final canonical name..."
                      className="w-full px-4 py-3 text-lg font-bold border-2 border-purple-400 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-inner"
                    />

                    {/* Quick chips to copy name */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-500">Pick Name:</span>
                      {selectedEntities.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setCustomName(e.name)}
                          className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-slate-200 hover:bg-slate-300 text-slate-800 transition"
                        >
                          {e.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Execute Merge CTA */}
                  <button
                    type="button"
                    onClick={handleExecuteMerge}
                    disabled={isMerging || !customName.trim()}
                    className="w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-black rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <GitMerge className="w-6 h-6" />
                    <span>
                      {isMerging
                        ? "Merging Entities..."
                        : `Merge ${selectedEntities.length} ${type}s into "${customName.trim()}" (${mergeAnalysis.totalFinalLinks} Links)`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
