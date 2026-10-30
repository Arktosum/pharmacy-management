import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { toast } from "react-toastify";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  RefreshCw,
  Plus,
  Eye,
  Sparkles,
  PanelRight,
  Network,
} from "lucide-react";
import {
  useGetMedicinesQuery,
  useGetDiseasesQuery,
  useGetLinksQuery,
} from "../../api/api";
import GraphMultiSearch, { SelectedEntity } from "./GraphMultiSearch";
import GraphInspectorDrawer, { InspectedNode } from "./GraphInspectorDrawer";
import AddEntityModal from "./AddEntityModal";

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: "medicine" | "disease";
  radius: number;
  degreeCount: number;
  isOrphan: boolean;
  isIntersecting: boolean;
  isDirectSelection: boolean;
  isExpanded: boolean;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  id: string;
  isIntersectingLink?: boolean;
  isExpandedBackbone?: boolean;
  isExpansionBranch?: boolean;
}

export default function GraphExplorer() {
  const { data: medicines = [], isLoading: loadingMeds } = useGetMedicinesQuery();
  const { data: diseases = [], isLoading: loadingDiseases } = useGetDiseasesQuery();
  const { data: links = [], isLoading: loadingLinks } = useGetLinksQuery();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<SVGGElement | null>(null);
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const applyHighlightRef = useRef<((node: InspectedNode | null) => void) | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI & Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<SelectedEntity[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [orphanFilter, setOrphanFilter] = useState<"none" | "meds" | "diseases" | "all">("none");
  const [isIntersectingOnly, setIsIntersectingOnly] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // Inspector State
  const [inspectedNode, setInspectedNode] = useState<InspectedNode | null>(null);
  const inspectedNodeRef = useRef<InspectedNode | null>(null);
  inspectedNodeRef.current = inspectedNode;
  const [inspectorHistory, setInspectorHistory] = useState<InspectedNode[]>([]);

  // Add Entity Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Compute Degree Counts & Orphans
  const { medDegrees, illDegrees, orphanMedCount, orphanDiseaseCount } = useMemo(() => {
    const medDegMap = new Map<string, number>();
    const illDegMap = new Map<string, number>();

    medicines.forEach((m) => medDegMap.set(m.id, 0));
    diseases.forEach((d) => illDegMap.set(d.id, 0));

    links.forEach((l) => {
      medDegMap.set(l.medicineId, (medDegMap.get(l.medicineId) || 0) + 1);
      illDegMap.set(l.diseaseId, (illDegMap.get(l.diseaseId) || 0) + 1);
    });

    let orphanMeds = 0;
    medDegMap.forEach((cnt) => {
      if (cnt === 0) orphanMeds++;
    });

    let orphanIlls = 0;
    illDegMap.forEach((cnt) => {
      if (cnt === 0) orphanIlls++;
    });

    return {
      medDegrees: medDegMap,
      illDegrees: illDegMap,
      orphanMedCount: orphanMeds,
      orphanDiseaseCount: orphanIlls,
    };
  }, [medicines, diseases, links]);

  // Compute Selected Subsets
  const selectedMedicines = useMemo(
    () => selectedEntities.filter((e) => e.type === "medicine"),
    [selectedEntities]
  );
  const selectedDiseases = useMemo(
    () => selectedEntities.filter((e) => e.type === "disease"),
    [selectedEntities]
  );

  // Generalized Intersection Engine (handles M medicines & N diseases)
  const intersectionSummary = useMemo(() => {
    const numMeds = selectedMedicines.length;
    const numDiseases = selectedDiseases.length;

    if (selectedEntities.length < 2) {
      return {
        hasIntersection: false,
        title: "",
        description: "",
        commonRemedyIds: new Set<string>(),
        commonIndicationIds: new Set<string>(),
        directMatchCount: 0,
        intersectingNodeIds: new Set<string>(),
        intersectingLinkIds: new Set<string>(),
      };
    }

    // 1. Common Remedies: Medicines connected to ALL selected diseases (when >= 2 diseases)
    let commonRemedyIds = new Set<string>();
    if (numDiseases >= 2) {
      const diseaseToMeds = new Map<string, Set<string>>();
      links.forEach((l) => {
        if (!diseaseToMeds.has(l.diseaseId)) diseaseToMeds.set(l.diseaseId, new Set());
        diseaseToMeds.get(l.diseaseId)!.add(l.medicineId);
      });

      let common = new Set<string>(diseaseToMeds.get(selectedDiseases[0].id) || []);
      for (let i = 1; i < numDiseases; i++) {
        const nextMeds = diseaseToMeds.get(selectedDiseases[i].id) || new Set();
        common = new Set([...common].filter((mId) => nextMeds.has(mId)));
      }
      commonRemedyIds = common;
    }

    // 2. Common Indications: Diseases connected to ALL selected medicines (when >= 2 medicines)
    let commonIndicationIds = new Set<string>();
    if (numMeds >= 2) {
      const medToDiseases = new Map<string, Set<string>>();
      links.forEach((l) => {
        if (!medToDiseases.has(l.medicineId)) medToDiseases.set(l.medicineId, new Set());
        medToDiseases.get(l.medicineId)!.add(l.diseaseId);
      });

      let common = new Set<string>(medToDiseases.get(selectedMedicines[0].id) || []);
      for (let i = 1; i < numMeds; i++) {
        const nextDiseases = medToDiseases.get(selectedMedicines[i].id) || new Set();
        common = new Set([...common].filter((dId) => nextDiseases.has(dId)));
      }
      commonIndicationIds = common;
    }

    // 3. Direct Matches between selected medicines and selected diseases
    const selMedIdSet = new Set(selectedMedicines.map((m) => m.id));
    const selDiseaseIdSet = new Set(selectedDiseases.map((d) => d.id));
    const directMatchLinks = links.filter(
      (l) => selMedIdSet.has(l.medicineId) && selDiseaseIdSet.has(l.diseaseId)
    );

    const directMatchMedIds = new Set(directMatchLinks.map((l) => l.medicineId));
    const directMatchDiseaseIds = new Set(directMatchLinks.map((l) => l.diseaseId));

    // Combined intersecting node IDs
    const intersectingNodeIds = new Set<string>([
      ...commonRemedyIds,
      ...commonIndicationIds,
      ...directMatchMedIds,
      ...directMatchDiseaseIds,
    ]);

    // Intersecting link IDs
    const intersectingLinkIds = new Set<string>();
    directMatchLinks.forEach((l) => intersectingLinkIds.add(`${l.medicineId}-${l.diseaseId}`));

    links.forEach((l) => {
      if (commonRemedyIds.has(l.medicineId) && selDiseaseIdSet.has(l.diseaseId)) {
        intersectingLinkIds.add(`${l.medicineId}-${l.diseaseId}`);
      }
      if (commonIndicationIds.has(l.diseaseId) && selMedIdSet.has(l.medicineId)) {
        intersectingLinkIds.add(`${l.medicineId}-${l.diseaseId}`);
      }
    });

    let title = "";
    let description = "";

    if (numDiseases >= 2 && numMeds === 0) {
      title = `${commonRemedyIds.size} Common Remedy${commonRemedyIds.size === 1 ? "" : "ies"}`;
      description = commonRemedyIds.size > 0
        ? `Treats ALL ${numDiseases} selected diseases`
        : `No single medicine treats all ${numDiseases} selected diseases`;
    } else if (numMeds >= 2 && numDiseases === 0) {
      title = `${commonIndicationIds.size} Common Indication${commonIndicationIds.size === 1 ? "" : "s"}`;
      description = commonIndicationIds.size > 0
        ? `Treated by ALL ${numMeds} selected medicines`
        : `No single disease is treated by all ${numMeds} selected medicines`;
    } else if (numMeds >= 1 && numDiseases >= 1) {
      title = `${directMatchLinks.length} Direct Match${directMatchLinks.length === 1 ? "" : "es"}`;
      const extras: string[] = [];
      if (commonRemedyIds.size > 0) extras.push(`${commonRemedyIds.size} remedies treat all ${numDiseases} diseases`);
      if (commonIndicationIds.size > 0) extras.push(`${commonIndicationIds.size} conditions treated by all ${numMeds} meds`);
      description = extras.length > 0 ? extras.join(" • ") : `Connections between ${numMeds} medicines & ${numDiseases} diseases`;
    }

    const hasIntersection =
      commonRemedyIds.size > 0 || commonIndicationIds.size > 0 || directMatchLinks.length > 0;

    return {
      hasIntersection,
      title,
      description,
      commonRemedyIds,
      commonIndicationIds,
      directMatchCount: directMatchLinks.length,
      intersectingNodeIds,
      intersectingLinkIds,
    };
  }, [selectedMedicines, selectedDiseases, selectedEntities, links]);

  // Filter Pipeline: Build Active Nodes & Links
  const { activeNodes, activeLinks } = useMemo(() => {
    const allMedMap = new Map(medicines.map((m) => [m.id, m]));
    const allIllMap = new Map(diseases.map((d) => [d.id, d]));

    // Adjacency maps
    const medToIlls = new Map<string, Set<string>>();
    const illToMeds = new Map<string, Set<string>>();

    links.forEach((l) => {
      if (allMedMap.has(l.medicineId) && allIllMap.has(l.diseaseId)) {
        if (!medToIlls.has(l.medicineId)) medToIlls.set(l.medicineId, new Set());
        medToIlls.get(l.medicineId)!.add(l.diseaseId);

        if (!illToMeds.has(l.diseaseId)) illToMeds.set(l.diseaseId, new Set());
        illToMeds.get(l.diseaseId)!.add(l.medicineId);
      }
    });

    let visibleNodeIds = new Set<string>();
    const directSelectedSet = new Set(selectedEntities.map((e) => e.id));

    // 1. Orphan Filter mode
    if (orphanFilter !== "none") {
      if (orphanFilter === "meds" || orphanFilter === "all") {
        medicines.forEach((m) => {
          if ((medDegrees.get(m.id) || 0) === 0) visibleNodeIds.add(m.id);
        });
      }
      if (orphanFilter === "diseases" || orphanFilter === "all") {
        diseases.forEach((d) => {
          if ((illDegrees.get(d.id) || 0) === 0) visibleNodeIds.add(d.id);
        });
      }
    }
    // 2. Intersections-Only filter mode
    else if (isIntersectingOnly && intersectionSummary.hasIntersection) {
      selectedEntities.forEach((e) => visibleNodeIds.add(e.id));
      intersectionSummary.intersectingNodeIds.forEach((id) => visibleNodeIds.add(id));
    }
    // 3. Multi-Search / Focused Recursive Expansion mode
    else if (selectedEntities.length > 0) {
      // Direct root nodes from search
      selectedEntities.forEach((entity) => {
        visibleNodeIds.add(entity.id);
      });

      // Recursively add neighbors of all expanded nodes
      const queue = Array.from(expandedNodeIds);
      const processed = new Set<string>();

      while (queue.length > 0) {
        const currId = queue.shift()!;
        if (processed.has(currId)) continue;
        processed.add(currId);

        // Only expand if currId is in visibleNodeIds
        if (visibleNodeIds.has(currId)) {
          const neighbors = allMedMap.has(currId)
            ? (medToIlls.get(currId) || new Set<string>())
            : (illToMeds.get(currId) || new Set<string>());

          neighbors.forEach((nbrId) => {
            if (!visibleNodeIds.has(nbrId)) {
              visibleNodeIds.add(nbrId);
              // If this neighbor is also in expandedNodeIds, add to queue for recursive expansion!
              if (expandedNodeIds.has(nbrId) && !processed.has(nbrId)) {
                queue.push(nbrId);
              }
            }
          });
        }
      }
    }
    // 4. Default: Empty state (keep empty so we don't overwhelm the browser with 10k+ nodes)
    else {
      // visibleNodeIds remains empty until a search entity is added or orphan filter selected
    }

    // Build GraphNode array
    const nodes: GraphNode[] = [];
    visibleNodeIds.forEach((id) => {
      const med = allMedMap.get(id);
      if (med) {
        const deg = medDegrees.get(id) || 0;
        const isInter = intersectionSummary.intersectingNodeIds.has(id);
        nodes.push({
          id,
          name: med.name,
          type: "medicine",
          radius: isInter ? 20 : 15,
          degreeCount: deg,
          isOrphan: deg === 0,
          isIntersecting: isInter,
          isDirectSelection: directSelectedSet.has(id),
          isExpanded: expandedNodeIds.has(id),
        });
        return;
      }

      const ill = allIllMap.get(id);
      if (ill) {
        const deg = illDegrees.get(id) || 0;
        const isInter = intersectionSummary.intersectingNodeIds.has(id);
        nodes.push({
          id,
          name: ill.name,
          type: "disease",
          radius: isInter ? 18 : 13,
          degreeCount: deg,
          isOrphan: deg === 0,
          isIntersecting: isInter,
          isDirectSelection: directSelectedSet.has(id),
          isExpanded: expandedNodeIds.has(id),
        });
      }
    });

    const activeNodeIdSet = new Set(nodes.map((n) => n.id));

    // Filter valid links where BOTH source and target are in activeNodeIdSet
    const activeLinksList: GraphLink[] = links
      .filter((l) => activeNodeIdSet.has(l.medicineId) && activeNodeIdSet.has(l.diseaseId))
      .map((l) => {
        const linkId = `${l.medicineId}-${l.diseaseId}`;
        const isMedExpanded = expandedNodeIds.has(l.medicineId);
        const isIllExpanded = expandedNodeIds.has(l.diseaseId);
        // Backbone connects root/expanded node to another expanded node
        const isExpandedBackbone = isMedExpanded && isIllExpanded;
        // Branch connects an expanded node to an unexpanded frontier neighbor
        const isExpansionBranch = (isMedExpanded || isIllExpanded) && !isExpandedBackbone;

        return {
          id: linkId,
          source: l.medicineId,
          target: l.diseaseId,
          isIntersectingLink: intersectionSummary.intersectingLinkIds.has(linkId),
          isExpandedBackbone,
          isExpansionBranch,
        };
      });

    return { activeNodes: nodes, activeLinks: activeLinksList };
  }, [
    medicines,
    diseases,
    links,
    selectedEntities,
    expandedNodeIds,
    orphanFilter,
    isIntersectingOnly,
    intersectionSummary,
    medDegrees,
    illDegrees,
  ]);

  // Handle Multi-Search selections
  const handleAddSearchEntity = useCallback(
    (entity: SelectedEntity) => {
      setSelectedEntities((prev) => {
        if (prev.some((e) => e.id === entity.id)) return prev;
        return [...prev, entity];
      });
      // Expand the searched node initially to display direct connections
      setExpandedNodeIds((prev) => {
        const next = new Set(prev);
        next.add(entity.id);
        return next;
      });
      setOrphanFilter("none");

      const nbrCount =
        entity.type === "medicine"
          ? links.filter((l) => l.medicineId === entity.id).length
          : links.filter((l) => l.diseaseId === entity.id).length;
      toast.success(
        `Added & expanded ${nbrCount} connection${nbrCount === 1 ? "" : "s"} for "${entity.name}"`
      );

      if (simulationRef.current) {
        simulationRef.current.alpha(0.6).restart();
      }
    },
    [links]
  );

  const handleRemoveSearchEntity = useCallback((id: string) => {
    setSelectedEntities((prev) => prev.filter((e) => e.id !== id));
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleClearAllSearch = useCallback(() => {
    setSelectedEntities([]);
    setExpandedNodeIds(new Set());
    setIsIntersectingOnly(false);
  }, []);

  // Double-Click Node: Toggle Recursive Expansion
  const handleToggleExpandNode = useCallback(
    (node: { id: string; name: string; type: "medicine" | "disease" }) => {
      // Find count of direct neighbors
      const nbrCount =
        node.type === "medicine"
          ? links.filter((l) => l.medicineId === node.id).length
          : links.filter((l) => l.diseaseId === node.id).length;

      // Ensure that if user started with no search filters, the clicked node becomes the focus seed
      setSelectedEntities((prev) => {
        if (prev.length === 0) {
          return [{ id: node.id, name: node.name, type: node.type }];
        }
        return prev;
      });

      setExpandedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id);
          toast.info(`Collapsed connections for "${node.name}"`);
        } else {
          next.add(node.id);
          toast.success(
            `Expanded ${nbrCount} connection${nbrCount === 1 ? "" : "s"} for "${node.name}"`
          );
        }
        return next;
      });

      if (simulationRef.current) {
        simulationRef.current.alpha(0.6).restart();
      }
    },
    [links]
  );

  // Fullscreen Toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (graphContainerRef.current?.requestFullscreen) {
        graphContainerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen((prev) => !prev);
        });
      } else {
        setIsFullscreen((prev) => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  }, []);

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (simulationRef.current) {
        simulationRef.current.alpha(0.3).restart();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Escape key handler for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Single-Click Node: Focus & highlight on canvas WITHOUT popping open the sidebar
  const handleSelectNode = useCallback((node: InspectedNode) => {
    setInspectedNode((current) => {
      if (current && current.id !== node.id) {
        setInspectorHistory((prev) => [...prev, current]);
      }
      return node;
    });
    if (applyHighlightRef.current) {
      applyHighlightRef.current(node);
    }
  }, []);

  // Inspect Node: Open drawer with full details
  const handleInspectNode = useCallback((node: InspectedNode) => {
    setInspectedNode((current) => {
      if (current && current.id !== node.id) {
        setInspectorHistory((prev) => [...prev, current]);
      }
      return node;
    });
    setIsDrawerOpen(true);
    if (applyHighlightRef.current) {
      applyHighlightRef.current(node);
    }
  }, []);

  const handleBackHistory = useCallback(() => {
    setInspectorHistory((prev) => {
      if (prev.length === 0) return prev;
      const nextHistory = [...prev];
      const previousNode = nextHistory.pop()!;
      setInspectedNode(previousNode);
      return nextHistory;
    });
  }, []);

  const handleCloseInspector = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Initialize and Update D3 Simulation
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 650;

    // SVG Glow Filter Defs
    let defs = svg.select<SVGDefsElement>("defs");
    if (defs.empty()) {
      defs = svg.append("defs");
    }
    defs.selectAll("*").remove();

    // Cyan glow filter for expanded nodes and backbone links
    const cyanGlow = defs
      .append("filter")
      .attr("id", "cyan-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    cyanGlow
      .append("feGaussianBlur")
      .attr("stdDeviation", "2.5")
      .attr("result", "coloredBlur");
    const cyanMerge = cyanGlow.append("feMerge");
    cyanMerge.append("feMergeNode").attr("in", "coloredBlur");
    cyanMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Amber glow filter for intersecting nodes and links
    const amberGlow = defs
      .append("filter")
      .attr("id", "amber-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    amberGlow
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
    const amberMerge = amberGlow.append("feMerge");
    amberMerge.append("feMergeNode").attr("in", "coloredBlur");
    amberMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Clear previous elements inside container
    let g = svg.select<SVGGElement>("g.main-container");
    if (g.empty()) {
      g = svg.append("g").attr("class", "main-container");
      containerRef.current = g.node();
    }
    g.selectAll("*").remove();

    // Zoom behavior setup
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 6])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Click background to deselect inspector
    svg.on("click", (event) => {
      if (event.target === svgRef.current) {
        handleCloseInspector();
        if (applyHighlightRef.current) applyHighlightRef.current(null);
      }
    });

    // Links container
    const linkGroup = g.append("g").attr("class", "links-layer");
    // Nodes container
    const nodeGroup = g.append("g").attr("class", "nodes-layer");

    // Sort links so backbone expansion links render on top of secondary links
    const sortedLinks = [...activeLinks].sort((a, b) => {
      const scoreA = a.isExpandedBackbone ? 2 : a.isExpansionBranch ? 1 : 0;
      const scoreB = b.isExpandedBackbone ? 2 : b.isExpansionBranch ? 1 : 0;
      return scoreA - scoreB;
    });

    // Force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(activeNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(sortedLinks)
          .id((d) => d.id)
          .distance((d) => {
            const targetNode = typeof d.target === "object" ? d.target : null;
            if (targetNode && targetNode.isIntersecting) return 130;
            if (d.isExpandedBackbone) return 115;
            return 100;
          })
      )
      .force("charge", d3.forceManyBody().strength(-320))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3
          .forceCollide<GraphNode>()
          .radius((d) => d.radius + Math.max(20, d.name.length * 4.0))
      )
      .force("x", d3.forceX(width / 2).strength(0.06))
      .force("y", d3.forceY(height / 2).strength(0.06));

    simulationRef.current = simulation;

    // Draw Links
    const linkElements = linkGroup
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(sortedLinks, (d) => d.id)
      .enter()
      .append("line")
      .attr("stroke", (d) => {
        if (d.isIntersectingLink) return "#f59e0b";
        if (d.isExpandedBackbone) return "#38bdf8";
        if (d.isExpansionBranch) return "#0284c7";
        return "#475569";
      })
      .attr("stroke-opacity", (d) => {
        if (d.isExpandedBackbone) return 0.95;
        if (d.isIntersectingLink) return 0.9;
        if (d.isExpansionBranch) return 0.65;
        return 0.35;
      })
      .attr("stroke-width", (d) => {
        if (d.isExpandedBackbone) return 3.5;
        if (d.isIntersectingLink) return 2.5;
        if (d.isExpansionBranch) return 2.0;
        return 1.2;
      })
      .attr("stroke-dasharray", (d) => (d.isIntersectingLink ? "4 2" : "none"))
      .attr("filter", (d) => {
        if (d.isExpandedBackbone) return "url(#cyan-glow)";
        if (d.isIntersectingLink) return "url(#amber-glow)";
        return "none";
      });

    // Define applyHighlight function
    const applyHighlight = (focusedNode: InspectedNode | null) => {
      if (!focusedNode) {
        // Reset all nodes to normal
        nodeElements
          .style("opacity", 1)
          .selectAll<SVGCircleElement, GraphNode>("circle.node-core")
          .attr("stroke", (d) => {
            if (d.isDirectSelection) return "#ffffff";
            if (d.isExpanded) return "#38bdf8";
            if (d.isIntersecting) return "#fef08a";
            if (d.isOrphan) return "#94a3b8";
            return d.type === "medicine" ? "#1d4ed8" : "#047857";
          })
          .attr("stroke-width", (d) => {
            if (d.isDirectSelection || d.isExpanded) return 3.5;
            if (d.isIntersecting) return 3;
            return 2;
          })
          .attr("filter", (d) => {
            if (d.isIntersecting) return "url(#amber-glow)";
            if (d.isExpanded) return "url(#cyan-glow)";
            return "none";
          });

        // Reset all links to normal
        linkElements
          .attr("stroke", (d) => {
            if (d.isIntersectingLink) return "#f59e0b";
            if (d.isExpandedBackbone) return "#38bdf8";
            if (d.isExpansionBranch) return "#0284c7";
            return "#475569";
          })
          .attr("stroke-opacity", (d) => {
            if (d.isExpandedBackbone) return 0.95;
            if (d.isIntersectingLink) return 0.9;
            if (d.isExpansionBranch) return 0.65;
            return 0.35;
          })
          .attr("stroke-width", (d) => {
            if (d.isExpandedBackbone) return 3.5;
            if (d.isIntersectingLink) return 2.5;
            if (d.isExpansionBranch) return 2.0;
            return 1.2;
          })
          .attr("stroke-dasharray", (d) => (d.isIntersectingLink ? "4 2" : "none"))
          .attr("filter", (d) => {
            if (d.isExpandedBackbone) return "url(#cyan-glow)";
            if (d.isIntersectingLink) return "url(#amber-glow)";
            return "none";
          });
        return;
      }

      // Compute 1st degree neighbors of focusedNode
      const nbrIds = new Set<string>();
      nbrIds.add(focusedNode.id);

      activeLinks.forEach((l) => {
        const sId = typeof l.source === "object" ? l.source.id : l.source;
        const tId = typeof l.target === "object" ? l.target.id : l.target;
        if (sId === focusedNode.id) nbrIds.add(tId);
        if (tId === focusedNode.id) nbrIds.add(sId);
      });

      // Highlight nodes: focused node + 1st degree neighbors, dim others
      nodeElements
        .style("opacity", (d) => (nbrIds.has(d.id) ? 1 : 0.15))
        .selectAll<SVGCircleElement, GraphNode>("circle.node-core")
        .attr("stroke", (d) => {
          if (d.id === focusedNode.id) return "#38bdf8"; // Focus ring
          if (nbrIds.has(d.id)) return "#7dd3fc"; // 1st degree neighbor ring
          return d.type === "medicine" ? "#1d4ed8" : "#047857";
        })
        .attr("stroke-width", (d) => {
          if (d.id === focusedNode.id) return 4.5;
          if (nbrIds.has(d.id)) return 3;
          return 1.5;
        });

      // Highlight links connected to focusedNode
      linkElements
        .attr("stroke", (d) => {
          const sId = typeof d.source === "object" ? d.source.id : d.source;
          const tId = typeof d.target === "object" ? d.target.id : d.target;
          const isConnected = sId === focusedNode.id || tId === focusedNode.id;
          return isConnected ? "#38bdf8" : "#334155";
        })
        .attr("stroke-opacity", (d) => {
          const sId = typeof d.source === "object" ? d.source.id : d.source;
          const tId = typeof d.target === "object" ? d.target.id : d.target;
          const isConnected = sId === focusedNode.id || tId === focusedNode.id;
          return isConnected ? 1 : 0.08;
        })
        .attr("stroke-width", (d) => {
          const sId = typeof d.source === "object" ? d.source.id : d.source;
          const tId = typeof d.target === "object" ? d.target.id : d.target;
          const isConnected = sId === focusedNode.id || tId === focusedNode.id;
          return isConnected ? 3.5 : 1;
        })
        .attr("filter", (d) => {
          const sId = typeof d.source === "object" ? d.source.id : d.source;
          const tId = typeof d.target === "object" ? d.target.id : d.target;
          const isConnected = sId === focusedNode.id || tId === focusedNode.id;
          return isConnected ? "url(#cyan-glow)" : "none";
        });
    };

    applyHighlightRef.current = applyHighlight;

    // Draw Nodes
    const nodeElements = nodeGroup
      .selectAll<SVGGElement, GraphNode>("g")
      .data(activeNodes, (d) => d.id)
      .enter()
      .append("g")
      .attr("class", "graph-node cursor-pointer")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("mouseenter", (_event, d) => {
        applyHighlight({ id: d.id, name: d.name, type: d.type });
      })
      .on("mouseleave", () => {
        applyHighlight(inspectedNodeRef.current);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        // Alt or Shift click immediately opens details drawer
        if (event.altKey || event.shiftKey) {
          if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
          }
          handleInspectNode({ id: d.id, name: d.name, type: d.type });
          return;
        }

        // Debounce single-click to ensure double-click for expansion never triggers the drawer
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null;
          handleSelectNode({ id: d.id, name: d.name, type: d.type });
        }, 260);
      })
      .on("dblclick", (event, d) => {
        event.stopPropagation();
        event.preventDefault();
        // Cancel single-click timer immediately so drawer NEVER pops open on double click!
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        handleToggleExpandNode({ id: d.id, name: d.name, type: d.type });
      });

    // Tooltip with double-click expansion hint
    nodeElements
      .append("title")
      .text((d) => {
        const status = d.isDirectSelection
          ? "Root Node"
          : d.isExpanded
          ? "Expanded Node"
          : "Unexpanded Node";
        const action = d.isExpanded ? "Double-click to collapse" : "Double-click to expand";
        return `${d.name} (${status})\n• ${action}\n• ${d.degreeCount} connection${d.degreeCount === 1 ? "" : "s"}`;
      });

    // Concentric orbit halo for expanded nodes
    nodeElements
      .filter((d) => d.isExpanded)
      .append("circle")
      .attr("class", "node-expanded-halo")
      .attr("r", (d) => d.radius + 6.5)
      .attr("fill", "none")
      .attr("stroke", "#38bdf8")
      .attr("stroke-width", 2.2)
      .attr("stroke-opacity", 0.85)
      .attr("stroke-dasharray", "4 2.5")
      .attr("filter", "url(#cyan-glow)");

    // Pulsing outer halo for intersecting medicines
    nodeElements
      .filter((d) => d.isIntersecting)
      .append("circle")
      .attr("class", "node-halo")
      .attr("r", (d) => d.radius + 6)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.7)
      .attr("stroke-dasharray", "4 3")
      .attr("filter", "url(#amber-glow)");

    // Node Circles (Core)
    nodeElements
      .append("circle")
      .attr("class", "node-core")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => {
        if (d.isIntersecting) return "#f59e0b"; // Gold for intersecting medicine
        if (d.type === "medicine") return "#3b82f6"; // Blue for medicine
        return "#10b981"; // Emerald for disease
      })
      .attr("stroke", (d) => {
        if (d.isDirectSelection) return "#ffffff";
        if (d.isExpanded) return "#38bdf8";
        if (d.isIntersecting) return "#fef08a";
        if (d.isOrphan) return "#94a3b8";
        return d.type === "medicine" ? "#1d4ed8" : "#047857";
      })
      .attr("stroke-width", (d) => {
        if (d.isDirectSelection || d.isExpanded) return 3.5;
        if (d.isIntersecting) return 3;
        return 2;
      })
      .attr("stroke-dasharray", (d) => (d.isOrphan ? "3 3" : "none"))
      .attr("filter", (d) => {
        if (d.isIntersecting) return "url(#amber-glow)";
        if (d.isExpanded) return "url(#cyan-glow)";
        return "none";
      });

    // Center Core Dot for Expanded Nodes
    nodeElements
      .filter((d) => d.isExpanded)
      .append("circle")
      .attr("class", "node-expanded-core")
      .attr("r", 4)
      .attr("fill", "#ffffff")
      .attr("pointer-events", "none")
      .attr("filter", "url(#cyan-glow)");

    // Crisp Typography Node Labels with Halo
    const labelSelection = nodeElements
      .append("text")
      .attr("x", (d) => d.radius + 8)
      .attr("y", 5)
      .attr("font-size", (d) => (d.isIntersecting || d.isDirectSelection ? "14px" : "13px"))
      .attr("font-weight", (d) =>
        d.isIntersecting || d.isDirectSelection || d.isExpanded ? 700 : 600
      )
      .attr("fill", (d) => {
        if (d.isIntersecting) return "#fef08a";
        if (d.isDirectSelection) return "#ffffff";
        if (d.isExpanded) return "#7dd3fc";
        return "#f1f5f9";
      })
      .attr("stroke", "#020617")
      .attr("stroke-width", 4)
      .attr("paint-order", "stroke fill")
      .attr("stroke-linejoin", "round")
      .attr(
        "font-family",
        "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
      )
      .attr("letter-spacing", "0.015em")
      .style("pointer-events", "none")
      .style("display", showLabels ? "block" : "none");

    labelSelection
      .append("tspan")
      .text((d) => (d.isDirectSelection ? `★ ${d.name}` : d.name));

    labelSelection
      .filter((d) => d.isExpanded)
      .append("tspan")
      .text((d) => (d.isDirectSelection ? " [ROOT]" : " [EXP]"))
      .attr("fill", (d) => (d.isDirectSelection ? "#67e8f9" : "#38bdf8"))
      .attr("font-size", "10px")
      .attr("font-weight", "800")
      .attr("dx", "5");

    // Initialize highlight for current inspection state
    applyHighlight(inspectedNodeRef.current);

    // Simulation Tick Update
    simulation.on("tick", () => {
      linkElements
        .attr("x1", (d) => (typeof d.source === "object" ? d.source.x || 0 : 0))
        .attr("y1", (d) => (typeof d.source === "object" ? d.source.y || 0 : 0))
        .attr("x2", (d) => (typeof d.target === "object" ? d.target.x || 0 : 0))
        .attr("y2", (d) => (typeof d.target === "object" ? d.target.y || 0 : 0));

      nodeElements.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      simulation.stop();
    };
  }, [
    activeNodes,
    activeLinks,
    showLabels,
    isFullscreen,
    handleSelectNode,
    handleInspectNode,
    handleCloseInspector,
  ]);

  // Sync highlight whenever inspectedNode changes from outside D3 (e.g. drawer navigation or close)
  useEffect(() => {
    if (applyHighlightRef.current) {
      applyHighlightRef.current(inspectedNode);
    }
  }, [inspectedNode]);

  // Zoom / Viewport Toolbar Actions
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.75);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(350).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleReheatSim = () => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
    }
  };

  const isLoading = loadingMeds || loadingDiseases || loadingLinks;

  return (
    <div
      ref={graphContainerRef}
      className={`flex flex-col bg-slate-950 text-slate-100 shadow-2xl overflow-hidden relative font-sans transition-all duration-150 ${
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-screen rounded-none"
          : "h-full w-full rounded-xl border border-slate-800"
      }`}
    >
      {/* Top Controls Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 z-10 shrink-0 shadow-md">
        {/* Left: Multi-Search and Scope */}
        <div className="flex-1 max-w-3xl">
          <GraphMultiSearch
            medicines={medicines}
            diseases={diseases}
            selectedEntities={selectedEntities}
            onAddEntity={handleAddSearchEntity}
            onRemoveEntity={handleRemoveSearchEntity}
            onClearAll={handleClearAllSearch}
            totalIntersectingCount={intersectionSummary.intersectingNodeIds.size}
            intersectionLabel={intersectionSummary.title}
            isIntersectingOnly={isIntersectingOnly}
            onFilterIntersectionsOnly={() => setIsIntersectingOnly((prev) => !prev)}
          />
        </div>

        {/* Right: Quick Action Buttons & Stats */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Orphan Filters */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 text-sm shadow-sm">
            <button
              onClick={() => {
                setOrphanFilter((prev) => (prev === "meds" ? "none" : "meds"));
                setSelectedEntities([]);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-2 text-sm ${
                orphanFilter === "meds"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Show unlinked medicines"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Orphan Meds ({orphanMedCount})
            </button>
            <button
              onClick={() => {
                setOrphanFilter((prev) => (prev === "diseases" ? "none" : "diseases"));
                setSelectedEntities([]);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-2 text-sm ${
                orphanFilter === "diseases"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Show unlinked diseases"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Orphan Diseases ({orphanDiseaseCount})
            </button>
          </div>

          {/* Add Entity Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Add Node</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className={`px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border transition ${
              isFullscreen
                ? "bg-slate-800 text-sky-400 border-sky-500/50 shadow-inner"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4.5 h-4.5" />
            ) : (
              <Maximize2 className="w-4.5 h-4.5" />
            )}
            <span className="hidden sm:inline">
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </span>
          </button>
        </div>
      </header>

      {/* Main Canvas & Inspector Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* SVG Canvas Area */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden select-none">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-30">
              <div className="flex items-center gap-2.5 text-slate-300 text-base font-medium">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                Loading Remedy Network...
              </div>
            </div>
          )}

          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          ></svg>

          {!isLoading && activeNodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-none">
              <div className="p-8 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl max-w-lg pointer-events-auto">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Network className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-100 mb-2">
                  Explore Remedy Network
                </h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  Search for a medicine or disease using the search bar above to visualize its network and discover interconnected conditions.
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setOrphanFilter("meds");
                      setSelectedEntities([]);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 transition"
                  >
                    View Orphan Meds ({orphanMedCount})
                  </button>
                  <button
                    onClick={() => {
                      setOrphanFilter("diseases");
                      setSelectedEntities([]);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition"
                  >
                    View Orphan Diseases ({orphanDiseaseCount})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Canvas Controls (Bottom Left) */}
          <div className="absolute bottom-5 left-5 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl p-1.5 text-slate-300 shadow-2xl z-10">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition"
              title="Reset View / Recenter"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <div className="w-[1px] h-5 bg-slate-800 mx-1"></div>
            <button
              onClick={handleReheatSim}
              className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition"
              title="Re-balance Graph Physics"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowLabels((prev) => !prev)}
              className={`p-2 rounded-lg transition ${
                showLabels
                  ? "bg-slate-800 text-blue-400"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
              title="Toggle Text Labels"
            >
              <Eye className="w-5 h-5" />
            </button>
            <div className="w-[1px] h-5 bg-slate-800 mx-1"></div>
            <button
              onClick={() => {
                if (!isDrawerOpen && !inspectedNode && activeNodes.length > 0) {
                  const defaultNode =
                    activeNodes.find((n) => n.isDirectSelection) || activeNodes[0];
                  handleInspectNode({
                    id: defaultNode.id,
                    name: defaultNode.name,
                    type: defaultNode.type,
                  });
                } else {
                  setIsDrawerOpen((prev) => !prev);
                }
              }}
              className={`p-2 rounded-lg transition ${
                isDrawerOpen
                  ? "bg-blue-600 text-white shadow-sm"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
              title={isDrawerOpen ? "Close Node Details Drawer" : "Open Node Details Drawer"}
            >
              <PanelRight className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-lg transition ${
                isFullscreen
                  ? "bg-blue-600 text-white shadow-sm"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Visual Legend (Bottom Right) */}
          <div className="hidden sm:flex absolute bottom-5 right-5 items-center gap-5 bg-slate-900/90 backdrop-blur border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 shadow-xl pointer-events-none z-10">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></span>
              <span>Medicine</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span>
              <span>Disease</span>
            </div>
            <div className="flex items-center gap-2 text-sky-300 font-bold">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-sky-400 bg-slate-950 flex items-center justify-center shadow-[0_0_8px_rgba(56,189,248,0.7)]">
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              </span>
              <span>Expanded Node</span>
            </div>
            <div className="flex items-center gap-2 text-sky-400 font-bold">
              <span className="w-4 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]"></span>
              <span>Expansion Path</span>
            </div>
            {intersectionSummary.hasIntersection && (
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-300 shadow-sm"></span>
                <span>Common Intersection</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-3 h-3 rounded-full border border-dashed border-slate-400"></span>
              <span>Orphan</span>
            </div>
          </div>

          {/* Intersection Insights Floating Banner (Bottom Left, above zoom controls) */}
          {intersectionSummary.hasIntersection && (
            <div className="absolute bottom-20 left-5 bg-slate-900/95 backdrop-blur border border-amber-500/70 rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm text-amber-200 shadow-2xl z-10 max-w-xl">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <div className="truncate">
                <span className="font-bold text-amber-300 mr-2 text-sm">
                  {intersectionSummary.title}
                </span>
                <span className="text-slate-300 text-xs">
                  ({intersectionSummary.description})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsIntersectingOnly((prev) => !prev)}
                className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                  isIntersectingOnly
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border border-amber-600/60"
                }`}
                title="Isolate only the intersecting remedies / conditions"
              >
                {isIntersectingOnly ? "Show All Context" : "Isolate"}
              </button>
            </div>
          )}

          {/* Filter Status Badge (Placed at top-right to NEVER block or overlap the search dropdown on the left!) */}
          {(selectedEntities.length > 0 || orphanFilter !== "none" || isIntersectingOnly) && (
            <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur border border-slate-700 px-4 py-2 rounded-xl text-sm text-slate-200 flex items-center gap-2.5 shadow-2xl z-10 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span>
                Showing <strong>{activeNodes.length}</strong> nodes, <strong>{activeLinks.length}</strong> links
                {expandedNodeIds.size > 0 && (
                  <span className="text-blue-300 ml-1">
                    ({expandedNodeIds.size} expanded)
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedEntities([]);
                  setExpandedNodeIds(new Set());
                  setOrphanFilter("none");
                  setIsIntersectingOnly(false);
                }}
                className="ml-2 text-rose-400 hover:text-rose-300 underline font-semibold"
              >
                Reset Filters
              </button>
            </div>
          )}
          {/* Selected Node Floating Quick Actions */}
          {inspectedNode && !isDrawerOpen && (
            <div className="absolute top-16 right-4 z-20 flex items-center gap-2 bg-slate-900/95 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-2xl text-xs text-slate-200">
              <span
                className={`w-2 h-2 rounded-full ${
                  inspectedNode.type === "medicine" ? "bg-blue-400" : "bg-emerald-400"
                }`}
              ></span>
              <span className="font-bold text-slate-100 text-xs max-w-[140px] truncate">
                {inspectedNode.name}
              </span>
              <button
                type="button"
                onClick={() => handleInspectNode(inspectedNode)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow transition flex items-center gap-1"
                title="Open node details, rename, delete or manage links"
              >
                <PanelRight className="w-3.5 h-3.5" />
                <span>Details & Links</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleExpandNode(inspectedNode);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition border ${
                  expandedNodeIds.has(inspectedNode.id)
                    ? "bg-slate-800 hover:bg-slate-700 text-sky-300 border-sky-500/40"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
                title="Toggle expansion of connections"
              >
                {expandedNodeIds.has(inspectedNode.id) ? "Collapse" : "Expand"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectedNode(null);
                  if (applyHighlightRef.current) applyHighlightRef.current(null);
                }}
                className="text-slate-400 hover:text-slate-200 px-1 py-0.5 ml-0.5 text-xs font-bold"
                title="Deselect Node"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Slide-over Inspector Drawer */}
        <GraphInspectorDrawer
          node={isDrawerOpen ? inspectedNode : null}
          onClose={handleCloseInspector}
          onInspectNode={handleInspectNode}
          medicines={medicines}
          diseases={diseases}
          links={links}
          history={inspectorHistory}
          onBackHistory={handleBackHistory}
          intersectingMedicineIds={intersectionSummary.intersectingNodeIds}
        />
      </div>

      {/* Add Entity Modal */}
      <AddEntityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        medicines={medicines}
        diseases={diseases}
        onCreated={(newEntity) => {
          handleInspectNode(newEntity);
        }}
      />
    </div>
  );
}
