import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Layers, Sparkles } from "lucide-react";
import { Medicine, Disease } from "../../types";

export interface SelectedEntity {
  id: string;
  name: string;
  type: "medicine" | "disease";
}

interface GraphMultiSearchProps {
  medicines: Medicine[];
  diseases: Disease[];
  selectedEntities: SelectedEntity[];
  onAddEntity: (entity: SelectedEntity) => void;
  onRemoveEntity: (id: string) => void;
  onClearAll: () => void;
  degree: 1 | 2 | 3;
  onDegreeChange: (degree: 1 | 2 | 3) => void;
  totalIntersectingCount?: number;
  onFilterIntersectionsOnly?: () => void;
  isIntersectingOnly?: boolean;
}

// Convert wildcard pattern with * and ? to RegExp
function buildWildcardRegex(pattern: string): RegExp {
  const trimmed = pattern.trim();
  if (!trimmed) return /.*/;
  
  // Escape regex special chars except * and ?
  const escaped = trimmed.replace(/[-[\]{}()+.,\\^$|#\s]/g, "\\$&");
  // Replace * with .* and ? with .
  const regexStr = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
  
  // If user didn't specify wildcard, do a substring match
  if (!trimmed.includes("*") && !trimmed.includes("?")) {
    return new RegExp(escaped, "i");
  }
  return new RegExp(`^${regexStr}$`, "i");
}

export default function GraphMultiSearch({
  medicines,
  diseases,
  selectedEntities,
  onAddEntity,
  onRemoveEntity,
  onClearAll,
  degree,
  onDegreeChange,
  totalIntersectingCount = 0,
  onFilterIntersectionsOnly,
  isIntersectingOnly = false,
}: GraphMultiSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIdSet = useMemo(
    () => new Set(selectedEntities.map((e) => e.id)),
    [selectedEntities]
  );

  // Filter candidates using wildcard pattern
  const searchResults = useMemo(() => {
    if (!query.trim()) return { meds: [], ills: [] };
    try {
      const regex = buildWildcardRegex(query);
      const meds = medicines
        .filter((m) => !selectedIdSet.has(m.id) && regex.test(m.name))
        .slice(0, 15);
      const ills = diseases
        .filter((i) => !selectedIdSet.has(i.id) && regex.test(i.name))
        .slice(0, 15);
      return { meds, ills };
    } catch {
      // Fallback to substring if regex syntax was invalid
      const lower = query.toLowerCase();
      const meds = medicines
        .filter((m) => !selectedIdSet.has(m.id) && m.name.toLowerCase().includes(lower))
        .slice(0, 15);
      const ills = diseases
        .filter((i) => !selectedIdSet.has(i.id) && i.name.toLowerCase().includes(lower))
        .slice(0, 15);
      return { meds, ills };
    }
  }, [query, medicines, diseases, selectedIdSet]);

  const hasResults = searchResults.meds.length > 0 || searchResults.ills.length > 0;

  const handleSelect = (id: string, name: string, type: "medicine" | "disease") => {
    onAddEntity({ id, name, type });
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2 w-full" ref={containerRef}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search input with wildcard support */}
        <div className="relative flex-1 min-w-[260px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search multiple items (supports * wildcard, e.g. *cillin, para*)..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete dropdown */}
          {isOpen && query.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1.5 max-h-72 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 divide-y divide-slate-700/60">
              {searchResults.meds.length > 0 && (
                <div className="p-2">
                  <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Medicines ({searchResults.meds.length})
                  </div>
                  {searchResults.meds.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelect(m.id, m.name, "medicine")}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-blue-600/20 hover:text-blue-200 rounded flex items-center justify-between transition"
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-[10px] text-blue-400/80 uppercase">Medicine</span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.ills.length > 0 && (
                <div className="p-2">
                  <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Diseases / Symptoms ({searchResults.ills.length})
                  </div>
                  {searchResults.ills.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => handleSelect(i.id, i.name, "disease")}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-emerald-600/20 hover:text-emerald-200 rounded flex items-center justify-between transition"
                    >
                      <span className="font-medium">{i.name}</span>
                      <span className="text-[10px] text-emerald-400/80 uppercase">Disease</span>
                    </button>
                  ))}
                </div>
              )}

              {!hasResults && (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  No matching medicines or diseases found for "{query}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Degree Selector Buttons */}
        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1 gap-1 text-xs text-slate-300">
          <span className="px-1.5 font-medium text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Scope:
          </span>
          <button
            type="button"
            onClick={() => onDegreeChange(1)}
            className={`px-2 py-1 rounded font-medium transition ${
              degree === 1
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title="1st Degree: Direct connections (e.g. Medicine ↔ Disease)"
          >
            1° Hop
          </button>
          <button
            type="button"
            onClick={() => onDegreeChange(2)}
            className={`px-2 py-1 rounded font-medium transition ${
              degree === 2
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title="2nd Degree: 2 Hops (e.g. Medicine ↔ Disease ↔ Medicine)"
          >
            2° Hops
          </button>
          <button
            type="button"
            onClick={() => onDegreeChange(3)}
            className={`px-2 py-1 rounded font-medium transition ${
              degree === 3
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title="3rd Degree: 3 Hops (e.g. Medicine ↔ Disease ↔ Medicine ↔ Disease)"
          >
            3° Hops
          </button>
        </div>

        {/* Intersecting Remedies Quick Filter */}
        {totalIntersectingCount > 0 && onFilterIntersectionsOnly && (
          <button
            type="button"
            onClick={onFilterIntersectionsOnly}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 border transition ${
              isIntersectingOnly
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold"
                : "bg-amber-950/40 text-amber-300 border-amber-700/60 hover:bg-amber-900/40"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{totalIntersectingCount} Common Remedy{totalIntersectingCount > 1 ? "ies" : ""}</span>
          </button>
        )}

        {/* Clear All Button */}
        {selectedEntities.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1.5 hover:bg-rose-950/30 rounded border border-rose-800/40 transition font-medium"
          >
            Clear Filters ({selectedEntities.length})
          </button>
        )}
      </div>

      {/* Selected Entity Tags */}
      {selectedEntities.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 uppercase font-semibold mr-1">
            Focus Nodes:
          </span>
          {selectedEntities.map((entity) => (
            <span
              key={entity.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm ${
                entity.type === "medicine"
                  ? "bg-blue-900/40 border-blue-500/60 text-blue-200"
                  : "bg-emerald-900/40 border-emerald-500/60 text-emerald-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  entity.type === "medicine" ? "bg-blue-400" : "bg-emerald-400"
                }`}
              />
              <span>{entity.name}</span>
              <button
                type="button"
                onClick={() => onRemoveEntity(entity.id)}
                className="hover:text-white rounded-full p-0.5"
                title="Remove filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
