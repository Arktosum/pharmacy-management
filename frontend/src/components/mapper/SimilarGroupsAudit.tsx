import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Search,
  Copy,
  ExternalLink,
  Pill,
  Stethoscope,
  Filter,
  Check,
  CheckCircle2,
  GitMerge,
  EyeOff,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetMedicinesQuery,
  useGetDiseasesQuery,
  useGetLinksQuery,
} from "../../api/api";
import {
  auditSimilarGroups,
  dismissGroupSignature,
  restoreGroupSignature,
  IssueCategory,
  SimilarGroup,
} from "../../utils/similarityAudit";
import MergeConflictModal from "./MergeConflictModal";

interface SimilarGroupsAuditProps {
  onInspectEntity: (type: "medicine" | "disease", id: string) => void;
  onEntityMerged?: (deletedIds: string[]) => void;
}

export default function SimilarGroupsAudit({
  onInspectEntity,
  onEntityMerged,
}: SimilarGroupsAuditProps): JSX.Element {
  const { data: medicines = [], refetch: refetchMeds } = useGetMedicinesQuery();
  const { data: diseases = [], refetch: refetchIlls } = useGetDiseasesQuery();
  const { data: links = [], refetch: refetchLinks } = useGetLinksQuery();

  const [typeFilter, setTypeFilter] = useState<
    "all" | "medicine" | "disease"
  >("all");
  const [issueFilter, setIssueFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedForMerge, setSelectedForMerge] = useState<SimilarGroup | null>(
    null
  );
  const [viewDismissed, setViewDismissed] = useState(false);
  const [dismissTick, setDismissTick] = useState(0);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<Set<string>>(
    new Set()
  );

  const filteredMeds = useMemo(
    () => medicines.filter((m) => !optimisticDeletedIds.has(m.id)),
    [medicines, optimisticDeletedIds]
  );
  const filteredIlls = useMemo(
    () => diseases.filter((i) => !optimisticDeletedIds.has(i.id)),
    [diseases, optimisticDeletedIds]
  );
  const filteredLinksData = useMemo(
    () =>
      links.filter(
        (l) =>
          !optimisticDeletedIds.has(l.medicineId) &&
          !optimisticDeletedIds.has(l.diseaseId)
      ),
    [links, optimisticDeletedIds]
  );

  const audit = useMemo(
    () => auditSimilarGroups(filteredMeds, filteredIlls, filteredLinksData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredMeds, filteredIlls, filteredLinksData, dismissTick]
  );

  // Available issue categories
  const allIssues = useMemo(() => {
    const set = new Set<string>();
    audit.groups.forEach((g) => g.issues.forEach((issue) => set.add(issue)));
    return Array.from(set).sort();
  }, [audit.groups]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return audit.groups.filter((g) => {
      // Dismissed toggle
      if (viewDismissed) {
        if (!g.isDismissed) return false;
      } else {
        if (g.isDismissed) return false;
      }

      // Type filter
      if (typeFilter !== "all" && g.entityType !== typeFilter) {
        return false;
      }
      // Issue filter
      if (
        issueFilter !== "all" &&
        !g.issues.includes(issueFilter as IssueCategory)
      ) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = g.members.some((m) =>
          m.name.toLowerCase().includes(q)
        );
        const matchesId = g.members.some((m) =>
          m.id.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  }, [audit.groups, viewDismissed, typeFilter, issueFilter, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDismiss = (group: SimilarGroup) => {
    dismissGroupSignature(group.signature);
    setDismissTick((t) => t + 1);
    toast.info(
      `Group "${group.primaryName}" marked as distinct entities and dismissed.`
    );
  };

  const handleRestore = (group: SimilarGroup) => {
    restoreGroupSignature(group.signature);
    setDismissTick((t) => t + 1);
    toast.success(
      `Group "${group.primaryName}" restored to active duplicate conflicts.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-6 bg-slate-900/60 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2.5 flex-wrap">
                <span>Potential Duplicates & Merge Resolution</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {audit.totalGroups} Active Conflicts
                </span>
                {audit.dismissedCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    {audit.dismissedCount} Dismissed False Alarms
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Scan and resolve nearly identical names caused by spacing variations (e.g.{" "}
                <code className="text-amber-300 font-mono text-xs">
                  "oxalic  acid 3x"
                </code>{" "}
                vs{" "}
                <code className="text-amber-300 font-mono text-xs">
                  "Oxalic Acid 3x"
                </code>
                ), inverted word orders (e.g.{" "}
                <code className="text-amber-300 font-mono text-xs">
                  "dry cough"
                </code>{" "}
                vs{" "}
                <code className="text-amber-300 font-mono text-xs">
                  "cough dry"
                </code>
                ), singular/plural suffixes, or single-character typos. Click{" "}
                <strong className="text-amber-300 font-bold">Merge & Resolve</strong> to
                transfer connections and consolidate duplicates into a single canonical entry.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Active Conflict Groups
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {audit.totalGroups}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Require merge or review
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-blue-400" />
              <span>Medicine Groups</span>
            </div>
            <div className="text-2xl font-black text-blue-400 mt-1">
              {audit.medicineGroups}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Duplicate remedy entries
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
              <span>Disease Groups</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {audit.diseaseGroups}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Duplicate illness entries
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Conflicting Entities
            </div>
            <div className="text-2xl font-black text-purple-400 mt-1">
              {audit.totalConflictingEntities}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Total nodes involved
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher: Active Conflicts vs Dismissed False Alarms */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewDismissed(false)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm ${
              !viewDismissed
                ? "bg-amber-600 text-white shadow"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Active Conflicts ({audit.totalGroups})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewDismissed(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm ${
              viewDismissed
                ? "bg-slate-800 text-white shadow"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Dismissed False Alarms ({audit.dismissedCount})</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          {viewDismissed
            ? "Showing groups marked as legitimately distinct terms (e.g. nephritis vs nephrosis)."
            : "Reviewing groups detected as likely accidental duplicates."}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              typeFilter === "all"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Types
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("medicine")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
              typeFilter === "medicine"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Medicines</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("disease")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
              typeFilter === "disease"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Diseases</span>
          </button>
        </div>

        {/* Issue Dropdown Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={issueFilter}
            onChange={(e) => setIssueFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="all">All Issue Categories</option>
            {allIssues.map((issue) => (
              <option key={issue} value={issue}>
                {issue}
              </option>
            ))}
          </select>
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within groups or IDs..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Group Cards List */}
      {filteredGroups.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-90" />
          <h3 className="text-lg font-bold text-slate-200">
            {viewDismissed
              ? "No Dismissed Groups"
              : "No Problematic Groups Found"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery || issueFilter !== "all" || typeFilter !== "all"
              ? "No groups match your current filter criteria. Try clearing filters or search query."
              : viewDismissed
              ? "No false alarms have been dismissed yet. If you see two terms that are legitimately distinct, click 'Not a Duplicate' to dismiss them here."
              : "All active medicines and diseases have distinct names. Great job keeping the knowledge graph clean!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGroups.map((group, idx) => (
            <GroupCard
              key={group.id}
              group={group}
              index={idx + 1}
              copiedId={copiedId}
              onCopy={handleCopy}
              onInspect={onInspectEntity}
              onMerge={(g) => setSelectedForMerge(g)}
              onDismiss={handleDismiss}
              onRestore={handleRestore}
            />
          ))}
        </div>
      )}

      {/* Merge Conflict Resolution Modal */}
      {selectedForMerge && (
        <MergeConflictModal
          group={selectedForMerge}
          onClose={() => setSelectedForMerge(null)}
          onSuccess={(_survivorName, deletedIds) => {
            setOptimisticDeletedIds((prev) => new Set([...prev, ...deletedIds]));
            onEntityMerged?.(deletedIds);
            refetchMeds();
            refetchIlls();
            refetchLinks();
            setSelectedForMerge(null);
            setDismissTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}

interface GroupCardProps {
  group: SimilarGroup;
  index: number;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onInspect: (type: "medicine" | "disease", id: string) => void;
  onMerge: (group: SimilarGroup) => void;
  onDismiss: (group: SimilarGroup) => void;
  onRestore: (group: SimilarGroup) => void;
}

function GroupCard({
  group,
  index,
  copiedId,
  onCopy,
  onInspect,
  onMerge,
  onDismiss,
  onRestore,
}: GroupCardProps): JSX.Element {
  const isMed = group.entityType === "medicine";

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition rounded-xl p-4.5 flex flex-col justify-between shadow-sm">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
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

            <span className="text-xs font-bold text-slate-400">
              Group #{index}
            </span>

            {group.isDismissed && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Dismissed
              </span>
            )}
          </div>

          <span className="text-xs font-bold text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800">
            {group.members.length} variants
          </span>
        </div>

        {/* Reasons Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
          {group.issues.map((issue) => (
            <span
              key={issue}
              className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
            >
              {issue}
            </span>
          ))}
        </div>

        {/* Member Variants List */}
        <div className="space-y-2">
          {group.members.map((member) => (
            <div
              key={member.id}
              className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between gap-3 group hover:border-slate-700 transition"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100 truncate">
                    {member.name}
                  </span>

                  {member.hasInvisibleChars && (
                    <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded shrink-0">
                      Invisible Chars
                    </span>
                  )}
                  {member.hasWeirdSpacing && (
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                      Multi-space
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                  <span>ID: {member.id}</span>
                  <span>•</span>
                  <span className="text-slate-400 font-semibold font-sans">
                    {member.linkCount} {member.linkCount === 1 ? "link" : "links"}
                  </span>
                </div>
              </div>

              {/* Individual Item Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onCopy(member.name, member.id)}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                  title="Copy Name"
                >
                  {copiedId === member.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onInspect(group.entityType, member.id)}
                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition"
                  title="Inspect, rename or unlink in Search view"
                >
                  <span>Inspect</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card Footer: Conflict Resolution Actions */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        {group.isDismissed ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Marked as distinct medical terms</span>
            </span>

            <button
              type="button"
              onClick={() => onRestore(group)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition shadow-sm"
              title="Restore to active conflict list"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Conflict</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => onDismiss(group)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-700 flex items-center gap-1.5 transition"
              title="Dismiss this group if they are genuinely different diseases or medicines"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Not a Duplicate</span>
            </button>

            <button
              type="button"
              onClick={() => onMerge(group)}
              className="px-4 py-1.5 text-xs font-extrabold rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 flex items-center gap-1.5 shadow-sm transition"
              title="Consolidate all variants into one canonical entity and transfer links"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Merge & Resolve</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
