import { useState } from "react";
import { Network, LayoutGrid, Pill, Stethoscope, Link as LinkIcon } from "lucide-react";
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

export default function MedicineMapper() {
  const [activeTab, setActiveTab] = useState<"graph" | "classic">("graph");

  const { data: medicines = [] } = useGetMedicinesQuery();
  const { data: diseases = [] } = useGetDiseasesQuery();
  const { data: links = [] } = useGetLinksQuery();

  return (
    <div className="h-[90vh] flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Mapper Navigation & Stats Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 leading-tight">
                RemedyGraph Knowledge Mapper
              </h1>
              <p className="text-[11px] text-slate-400">
                Explore, match, and discover remedies & condition intersections
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              <Pill className="w-3.5 h-3.5 text-blue-400" />
              <span>Medicines: <strong className="text-blue-400">{medicines.length}</strong></span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
              <span>Diseases: <strong className="text-emerald-400">{diseases.length}</strong></span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>Links: <strong className="text-purple-400">{links.length}</strong></span>
            </span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("graph")}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
              activeTab === "graph"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Interactive Graph</span>
          </button>
          <button
            onClick={() => setActiveTab("classic")}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
              activeTab === "classic"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Classic Form View</span>
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
          <main className="h-full overflow-y-auto px-4 py-6 grid gap-4 max-w-5xl mx-auto">
            <section className="grid md:grid-cols-2 gap-4">
              <AddMedicine />
              <Adddisease />
            </section>
            <Linker />
            <Search />
            <IntersectionFinder />
          </main>
        )}
      </div>
    </div>
  );
}
