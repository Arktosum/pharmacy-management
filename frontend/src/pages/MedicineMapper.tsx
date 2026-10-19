import { useState, useMemo } from "react";
import {
  Network,
  LayoutGrid,
  Pill,
  Stethoscope,
  Link as LinkIcon,
  AlertTriangle,
} from "lucide-react";
import {
  useGetMedicinesQuery,
  useGetDiseasesQuery,
  useGetLinksQuery,
} from "../api/api";
import GraphExplorer from "../components/mapper/GraphExplorer";
import { Adddisease, AddMedicine } from "../components/mapper/AddEntity";
import IntersectionFinder from "../components/mapper/IntersectionFinder";
import Linker from "../components/mapper/Linker";
import Search from "../components/mapper/Search";
import SimilarGroupsAudit from "../components/mapper/SimilarGroupsAudit";
import { auditSimilarGroups } from "../utils/similarityAudit";

export default function MedicineMapper() {
  const [activeTab, setActiveTab] = useState<"graph" | "classic">("classic");
  const [classicSubTab, setClassicSubTab] = useState<"manage" | "duplicates">(
    "manage"
  );
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
    // Smoothly scroll up to the Search & Manage Links section
    const searchEl = document.getElementById("search-manage-section");
    if (searchEl) {
      searchEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  const auditSummary = useMemo(
    () => auditSimilarGroups(filteredMeds, filteredIlls, filteredLinks),
    [filteredMeds, filteredIlls, filteredLinks]
  );

  return (
    <div className="h-[90vh] flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Mapper Navigation & Stats Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-100 leading-tight">
                RemedyGraph Knowledge Mapper
              </h1>
              <p className="text-xs text-slate-400">
                Explore, match, and discover remedies & condition intersections
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="hidden lg:flex items-center gap-3 text-sm text-slate-300">
            <span className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 shadow-sm">
              <Pill className="w-4 h-4 text-blue-400" />
              <span>Medicines: <strong className="text-blue-400 font-bold">{medicines.length}</strong></span>
            </span>
            <span className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 shadow-sm">
              <Stethoscope className="w-4 h-4 text-emerald-400" />
              <span>Diseases: <strong className="text-emerald-400 font-bold">{diseases.length}</strong></span>
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
                ? "bg-blue-600 text-white shadow-md"
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
                ? "bg-blue-600 text-white shadow-md"
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
          <main className="h-full overflow-y-auto overflow-x-hidden px-4 py-6 flex flex-col gap-4 max-w-7xl xl:max-w-[1600px] mx-auto w-full min-w-0">
            {/* Sub-tab Navigation */}
            <div className="flex items-center justify-between border-b border-slate-300 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClassicSubTab("manage")}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-base flex items-center gap-2.5 transition shadow-sm ${
                    classicSubTab === "manage"
                      ? "bg-slate-900 text-white shadow"
                      : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  <LayoutGrid className="w-5 h-5" />
                  <span>Entity & Link Tools</span>
                </button>

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

              <div className="text-sm text-slate-500 font-bold hidden md:block">
                {classicSubTab === "manage"
                  ? "Manage, search, link & find intersections"
                  : `Auditing ${medicines.length} medicines & ${diseases.length} diseases`}
              </div>
            </div>

            {/* Sub-tab Body (Reordered: Search -> IntersectionFinder -> AddEntity -> Linker) */}
            {classicSubTab === "manage" ? (
              <div className="grid gap-6 w-full min-w-0">
                <Search initialSelection={searchSelection} />
                <IntersectionFinder
                  onSelectMedicine={handleSelectMedicineFromIntersection}
                />
                <section className="grid md:grid-cols-2 gap-6">
                  <AddMedicine />
                  <Adddisease />
                </section>
                <Linker />
              </div>
            ) : (
              <SimilarGroupsAudit
                onInspectEntity={(type, id) => {
                  setSearchSelection({ type, id, key: Date.now() });
                  setClassicSubTab("manage");
                  setTimeout(() => {
                    document
                      .getElementById("search-manage-section")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
