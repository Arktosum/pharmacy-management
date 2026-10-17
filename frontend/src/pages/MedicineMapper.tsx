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
