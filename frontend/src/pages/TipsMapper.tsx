import { useState, useMemo } from "react";
import {
  Network,
  LayoutGrid,
  Pill,
  Stethoscope,
  Link as LinkIcon,
  AlertTriangle,
  GitMerge,
  Layers,
  Search as SearchIcon,
  PlusCircle,
} from "lucide-react";
import {
  useGetMedicinesQuery,
  useGetDiseasesQuery,
  useGetLinksQuery,
} from "../api/tipsApi";
import GraphExplorer from "../components/tips/GraphExplorer";
import AddEntity from "../components/tips/AddEntity";
import IntersectionFinder from "../components/tips/IntersectionFinder";
import Linker from "../components/tips/Linker";
import Search from "../components/tips/Search";
import MultiMergeTool from "../components/tips/MultiMergeTool";
import SimilarGroupsAudit from "../components/tips/SimilarGroupsAudit";
import { auditSimilarGroups } from "../utils/similarityAudit";

export default function TipsMapper() {
  const [activeTab, setActiveTab] = useState<"graph" | "classic">("classic");
  const [classicSubTab, setClassicSubTab] = useState<
    "common" | "search" | "create" | "merge" | "duplicates"
  >("common");
  const [searchSelection, setSearchSelection] = useState<{
    type: "medicine" | "disease";
    id: string;
    key?: number;
  } | null>(null);

  const handleSelectMedicineFromIntersection = (medicineId: string) => {
    setSearchSelection({
      type: "medicine",
      id: medicineId,
      key: Date.now(),
    });
    setClassicSubTab("search");
    // Smoothly scroll up to the Search & Manage Links section
    setTimeout(() => {
      const searchEl =
        document.getElementById("search-manage-section") ||
        document.getElementById("tips-search-manage-section");
      if (searchEl) {
        searchEl.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);
  };

  const [resolvedDeletedIds, setResolvedDeletedIds] = useState<Set<string>>(
    new Set()
  );

  const { data: medicines = [], refetch: refetchMeds } = useGetMedicinesQuery();
  const { data: diseases = [], refetch: refetchIlls } = useGetDiseasesQuery();
  const { data: links = [], refetch: refetchLinks } = useGetLinksQuery();

  const filteredMeds = useMemo(
    () => medicines.filter((m) => !resolvedDeletedIds.has(m.id)),
    [medicines, resolvedDeletedIds]
  );
  const filteredIlls = useMemo(
    () => diseases.filter((i) => !resolvedDeletedIds.has(i.id)),
    [diseases, resolvedDeletedIds]
  );
  const filteredLinks = useMemo(
    () =>
      links.filter(
        (l) =>
          !resolvedDeletedIds.has(l.medicineId) &&
          !resolvedDeletedIds.has(l.diseaseId)
      ),
    [links, resolvedDeletedIds]
  );

  const auditSummary = useMemo(() => {
    if (classicSubTab !== "duplicates") {
      return {
        totalGroups: 0,
        medicineGroups: 0,
        diseaseGroups: 0,
        totalConflictingEntities: 0,
        dismissedCount: 0,
        groups: [],
      };
    }
    return auditSimilarGroups(filteredMeds, filteredIlls, filteredLinks);
  }, [classicSubTab, filteredMeds, filteredIlls, filteredLinks]);

  return (
    <div className="h-[90vh] flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Mapper Navigation & Stats Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-100 leading-tight">
                RemedyGraph Tips Mapper
              </h1>
              <p className="text-xs text-slate-400">
                Explore, match, and discover remedies & condition intersections
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="hidden lg:flex items-center gap-3 text-sm text-slate-300">
            <span className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 shadow-sm">
              <Stethoscope className="w-4 h-4 text-emerald-400" />
              <span>Diseases: <strong className="text-emerald-400 font-bold">{diseases.length}</strong></span>
            </span>
            <span className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 shadow-sm">
              <Pill className="w-4 h-4 text-blue-400" />
              <span>Medicines: <strong className="text-blue-400 font-bold">{medicines.length}</strong></span>
            </span>
            <span className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 shadow-sm">
              <LinkIcon className="w-4 h-4 text-purple-400" />
              <span>Links: <strong className="text-purple-400 font-bold">{links.length}</strong></span>
            </span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-sm shadow-sm">
          <button
            onClick={() => setActiveTab("graph")}
            className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition ${
              activeTab === "graph"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Interactive Graph</span>
          </button>
          <button
            onClick={() => setActiveTab("classic")}
            className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition ${
              activeTab === "classic"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Classic Form View</span>
            {auditSummary.totalGroups > 0 && (
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-full">
                {auditSummary.totalGroups}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Content Body */}
      <div
        className={`flex-1 overflow-hidden ${
          activeTab === "graph" ? "p-3 bg-slate-950" : "bg-slate-100 text-slate-900"
        }`}
      >
        {activeTab === "graph" ? (
          <GraphExplorer />
        ) : (
          <main className="h-full overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-6 flex flex-col gap-4 max-w-[98vw] 2xl:max-w-[98vw] mx-auto w-full min-w-0">
            {/* Sub-tab Navigation */}
            <div className="flex items-center justify-between border-b border-slate-300 pb-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1st Tab: Common Remedies */}
                <button
                  type="button"
                  onClick={() => setClassicSubTab("common")}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-base flex items-center gap-2.5 transition shadow-sm ${
                    classicSubTab === "common"
                      ? "bg-emerald-600 text-white shadow"
                      : "bg-white text-slate-700 hover:bg-emerald-50 border border-slate-300"
                  }`}
                >
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <span>Common Remedies</span>
                </button>

                {/* 2nd Tab: Search M&D */}
                <button
                  type="button"
                  onClick={() => setClassicSubTab("search")}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-base flex items-center gap-2.5 transition shadow-sm ${
                    classicSubTab === "search"
                      ? "bg-slate-900 text-white shadow"
                      : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  <SearchIcon className="w-5 h-5" />
                  <span>Search M&D</span>
                </button>

                {/* 3rd Tab: Create & Add M&D */}
                <button
                  type="button"
                  onClick={() => setClassicSubTab("create")}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-base flex items-center gap-2.5 transition shadow-sm ${
                    classicSubTab === "create"
                      ? "bg-blue-600 text-white shadow"
                      : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-300"
                  }`}
                >
                  <PlusCircle className="w-5 h-5 text-blue-400" />
                  <span>Create & Add M&D</span>
                </button>

                {/* 4th Tab: Multi-Entity Merge */}
                <button
                  type="button"
                  onClick={() => setClassicSubTab("merge")}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-base flex items-center gap-2.5 transition shadow-sm ${
                    classicSubTab === "merge"
                      ? "bg-purple-700 text-white shadow"
                      : "bg-white text-slate-700 hover:bg-purple-50 border border-slate-300"
                  }`}
                >
                  <GitMerge className="w-5 h-5 text-purple-400" />
                  <span>Multi-Entity Merge</span>
                </button>

                {/* 5th Tab: Similar Names & Duplicates */}
                <button
                  type="button"
                  onClick={() => setClassicSubTab("duplicates")}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-base flex items-center gap-2.5 transition shadow-sm ${
                    classicSubTab === "duplicates"
                      ? "bg-amber-600 text-white shadow"
                      : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 ${
                      classicSubTab === "duplicates"
                        ? "text-white"
                        : "text-amber-600"
                    }`}
                  />
                  <span>Similar Names & Duplicates</span>
                  {auditSummary.totalGroups > 0 && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-sm font-black ${
                        classicSubTab === "duplicates"
                          ? "bg-white/20 text-white"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}
                    >
                      {auditSummary.totalGroups}
                    </span>
                  )}
                </button>
              </div>

              <div className="text-sm text-slate-500 font-bold hidden xl:block">
                {classicSubTab === "common"
                  ? "Find common remedies that treat multiple diseases simultaneously"
                  : classicSubTab === "search"
                  ? "Search, explore multi-hop chains & filter remedies"
                  : classicSubTab === "create"
                  ? "Create new diseases/medicines and link them together"
                  : classicSubTab === "merge"
                  ? "Consolidate multiple duplicate medicines or diseases"
                  : `Auditing ${medicines.length} medicines & ${diseases.length} diseases`}
              </div>
            </div>

            {/* Sub-tab Body */}
            {classicSubTab === "common" ? (
              <div className="w-full min-w-0">
                <IntersectionFinder
                  onSelectMedicine={handleSelectMedicineFromIntersection}
                />
              </div>
            ) : classicSubTab === "search" ? (
              <div className="w-full min-w-0">
                <Search initialSelection={searchSelection} />
              </div>
            ) : classicSubTab === "create" ? (
              <div className="grid gap-6 w-full min-w-0">
                <AddEntity />
                <Linker />
              </div>
            ) : classicSubTab === "merge" ? (
              <div className="w-full min-w-0">
                <MultiMergeTool />
              </div>
            ) : (
              <SimilarGroupsAudit
                onInspectEntity={(type, id) => {
                  setSearchSelection({ type, id, key: Date.now() });
                  setClassicSubTab("search");
                  setTimeout(() => {
                    const searchEl =
                      document.getElementById("search-manage-section") ||
                      document.getElementById("tips-search-manage-section");
                    if (searchEl) {
                      searchEl.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }, 50);
                }}
                onEntityMerged={(deletedIds) => {
                  setResolvedDeletedIds(
                    (prev) => new Set([...prev, ...deletedIds])
                  );
                  refetchMeds();
                  refetchIlls();
                  refetchLinks();
                }}
              />
            )}
          </main>
        )}
      </div>
    </div>
  );
}
