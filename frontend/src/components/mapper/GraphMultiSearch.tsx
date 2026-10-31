import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Sparkles } from "lucide-react";
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
  totalIntersectingCount?: number;
  intersectionLabel?: string;
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
  totalIntersectingCount = 0,
  intersectionLabel,
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
    <div className="flex flex-col gap-2.5 w-full" ref={containerRef}>
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Search input with wildcard support */}
        <div className="relative flex-1 min-w-[320px]">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
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
            className="w-full pl-11 pr-10 py-3 text-lg font-bold bg-slate-900 border-2 border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner transition"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Autocomplete dropdown */}
          {isOpen && query.trim() && (
            <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 divide-y divide-slate-700/60">
              {searchResults.meds.length > 0 && (
                <div className="p-2.5">
                  <div className="text-sm font-black text-blue-400 uppercase tracking-wider px-3.5 py-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    Medicines ({searchResults.meds.length})
                  </div>
                  {searchResults.meds.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelect(m.id, m.name, "medicine")}
                      className="w-full text-left px-4 py-3 text-base text-slate-100 hover:bg-blue-600/30 hover:text-white rounded-lg flex items-center justify-between transition"
                    >
                      <span className="font-bold text-base">{m.name}</span>
                      <span className="text-xs text-blue-300 bg-blue-900/50 border border-blue-700/60 px-2.5 py-1 rounded-md font-black uppercase">
                        Medicine
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.ills.length > 0 && (
                <div className="p-2.5">
                  <div className="text-sm font-black text-emerald-400 uppercase tracking-wider px-3.5 py-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Diseases / Symptoms ({searchResults.ills.length})
                  </div>
                  {searchResults.ills.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => handleSelect(i.id, i.name, "disease")}
                      className="w-full text-left px-4 py-3 text-base text-slate-100 hover:bg-emerald-600/30 hover:text-white rounded-lg flex items-center justify-between transition"
                    >
                      <span className="font-bold text-base">{i.name}</span>
                      <span className="text-xs text-emerald-300 bg-emerald-900/50 border border-emerald-700/60 px-2.5 py-1 rounded-md font-black uppercase">
                        Disease
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!hasResults && (
                <div className="p-5 text-center text-sm text-slate-400 italic">
                  No matching medicines or diseases found for "{query}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workflow Tip: Double-click nodes to expand */}
        <div className="hidden sm:flex items-center text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 gap-2 shadow-xs">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Double-click any node on canvas to recursively expand</span>
        </div>

        {/* Intersecting Remedies Quick Filter */}
        {totalIntersectingCount > 0 && onFilterIntersectionsOnly && (
          <button
            type="button"
            onClick={onFilterIntersectionsOnly}
            className={`px-3.5 py-2 text-sm font-bold rounded-xl flex items-center gap-2 border transition shadow-sm ${
              isIntersectingOnly
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md"
                : "bg-amber-950/40 text-amber-300 border-amber-700/70 hover:bg-amber-900/40"
            }`}
            title="Click to isolate only the intersecting items"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{intersectionLabel || `${totalIntersectingCount} Intersections`}</span>
          </button>
        )}

        {/* Clear All Button */}
        {selectedEntities.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm text-rose-400 hover:text-rose-200 px-3 py-2 hover:bg-rose-950/40 rounded-xl border border-rose-800/50 transition font-semibold"
          >
            Clear Filters ({selectedEntities.length})
          </button>
        )}
      </div>

      {/* Selected Entity Tags */}
      {selectedEntities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mr-1">
            Focus Nodes:
          </span>
          {selectedEntities.map((entity) => (
            <span
              key={entity.id}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold border shadow-sm ${
                entity.type === "medicine"
                  ? "bg-blue-900/50 border-blue-500/70 text-blue-100"
                  : "bg-emerald-900/50 border-emerald-500/70 text-emerald-100"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  entity.type === "medicine" ? "bg-blue-400" : "bg-emerald-400"
                }`}
              />
              <span>{entity.name}</span>
              <button
                type="button"
                onClick={() => onRemoveEntity(entity.id)}
                className="hover:text-white rounded-full p-0.5 transition"
                title="Remove filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
